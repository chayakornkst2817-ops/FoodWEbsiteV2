import { isDeepStrictEqual as equal } from 'node:util';
import { ownsOrder, publicAccount, publicShop, type Identity } from './access.ts';
import type { Order } from './orders.ts';
type Document = Record<string, any>;
export class AccessDenied extends Error { constructor(){super('ไม่มีสิทธิ์เข้าถึงข้อมูลร้านหรือบัญชีนี้');} }
export function projectDocument(key:string,data:Document,user:Identity|null,orders:Order[]=[]) : Document {
 if(key==='imjai-demo-v2')return {...data,accounts:(user?.role==='admin'?data.accounts:user?.role==='customer'?data.accounts.filter((a:{id:string})=>a.id===user.id):[]).map(publicAccount),orders:data.orders.filter((o:Order)=>ownsOrder(user,o))};
 if(key==='imjai-merchant-catalog')return Object.fromEntries(Object.entries(data).map(([id,config])=>[id,
   user?.role==='admin'||(user?.role==='merchant'&&id===user.restaurantId)||(user?.role==='customer'&&orders.some(o=>o.restaurantId===id&&o.userId===user.id))?config:publicShop(config as Document)]));
 if(key==='imjai-governance-v5'){
  if(user?.role==='admin')return data;
  return {admins:[],applications:user?.role==='merchant'?data.applications.filter((a:{id:string})=>a.id===user.restaurantId):[],suspendedShops:data.suspendedShops,suspendedUsers:[],audit:[]};
 }
 throw new AccessDenied();
}
export function mergeDocument(key:string,current:Document,incoming:Document,user:Identity|null,orders:Order[]=[],governance?:Document):Document {
 if(!user)throw new AccessDenied();
 if(key==='imjai-merchant-catalog'){
  for(const id of new Set([...Object.keys(current),...Object.keys(incoming)])){
   if(incoming[id]?.open!==current[id]?.open || (incoming[id]?.reopensAt??null)!==(current[id]?.reopensAt??null))throw new AccessDenied();
  }
  if(user.role==='admin')return incoming;
  if(user.role!=='merchant'||!user.restaurantId)throw new AccessDenied();
  const visible=projectDocument(key,current,user,orders);
  for(const [id,value] of Object.entries(incoming))if(id!==user.restaurantId&&!equal(value,visible[id]))throw new AccessDenied();
  if(!incoming[user.restaurantId])throw new AccessDenied();
  if(incoming[user.restaurantId].open!==current[user.restaurantId]?.open || (incoming[user.restaurantId].reopensAt??null)!==(current[user.restaurantId]?.reopensAt??null))throw new AccessDenied();
  return {...current,[user.restaurantId]:incoming[user.restaurantId]};
 }
 if(key==='imjai-governance-v5'){
  if(user.role!=='admin')throw new AccessDenied();
  const permissions=governance?.admins.find((a:{id:string})=>a.id===user.id)?.permissions??[];
  for(const field of ['admins','applications','suspendedUsers','suspendedShops','audit']){
   if(equal(current[field],incoming[field]))continue;
   const needed=field==='admins'?'manage_admins':field==='applications'?'approve_shops':field==='audit'?null:'manage_accounts';
   if(needed&&!permissions.includes(needed))throw new AccessDenied();
  }
  return incoming;
 }
 if(key!=='imjai-demo-v2')throw new AccessDenied();
 if(user.role!=='admin'&&incoming.timeoutMinutes!==current.timeoutMinutes)throw new AccessDenied();
 if(user.role==='admin')return {...incoming,accounts:current.accounts.map((a:Document)=>{const edit=incoming.accounts.find((x:{id:string})=>x.id===a.id);return edit?{...a,name:edit.name,phone:edit.phone}:a;})};
 const editable=current.orders.filter((o:Order)=>ownsOrder(user,o));
 const seen=new Set<string>();
 for(const order of incoming.orders as Order[]){
  if(seen.has(order.id)||!ownsOrder(user,order))throw new AccessDenied();seen.add(order.id);
  const old:Order|undefined=current.orders.find((o:Order)=>o.id===order.id);
  if(old&&(!ownsOrder(user,old)||old.restaurantId!==order.restaurantId||old.userId!==order.userId))throw new AccessDenied();
  if(!old&&user.role==='merchant')throw new AccessDenied();
  if(!old&&order.restaurantId!=='pa-noi')throw new AccessDenied();
  if(user.role==='customer'){
   if(!old&&(order.status!=='awaiting_payment'||order.demoExample))throw new AccessDenied();
   if(old){
    const mutable=new Set(['status','slips','history','messages','chatRead','proposals','refunds','lines','total','extraDue']);
    for(const key of new Set([...Object.keys(old),...Object.keys(order)]))if(!mutable.has(key)&&!equal((old as any)[key],(order as any)[key]))throw new AccessDenied();
    if(!equal(old.chatRead?.merchant,order.chatRead?.merchant))throw new AccessDenied();
    if((order.proposals??[]).length!==(old.proposals??[]).length)throw new AccessDenied();
    for(const [index,proposal] of (order.proposals??[]).entries()){
     const previous=old.proposals![index];
     if(!equal(previous,proposal)&&!(previous.status==='pending'&&['accepted','declined'].includes(proposal.status)&&equal({...previous,status:proposal.status},proposal)))throw new AccessDenied();
    }
    if((order.refunds??[]).length!==(old.refunds??[]).length)throw new AccessDenied();
    if(!equal(old.slips,order.slips.slice(0,old.slips.length))||order.slips.slice(old.slips.length).some(s=>s.status!=='submitted')||(order.slips.length>old.slips.length&&order.status!=='payment_review'))throw new AccessDenied();
    if((old.messages??[]).some(m=>!(order.messages??[]).some(n=>n.id===m.id)))throw new AccessDenied();
    if(!equal(old.history,order.history.slice(0,old.history.length)))throw new AccessDenied();
    const allowed=order.status===old.status||((old.status==='awaiting_payment'||old.status==='payment_issue')&&order.status==='payment_review')||(old.status==='awaiting_payment'&&order.status==='cancelled'&&Date.now()>=old.expiresAt);
    if(!allowed||!equal(old.paidTotal,order.paidTotal))throw new AccessDenied();
    if(!equal(old.lines,order.lines)||old.total!==order.total){
     const proposal=old.proposals?.at(-1),accepted=order.proposals?.at(-1);
     if(!proposal||!accepted||proposal.status!=='pending'||accepted.id!==proposal.id||accepted.status!=='accepted')throw new AccessDenied();
     const lines=old.lines.map((line,index)=>index===proposal.lineIndex?proposal.replacement:line);
     if(!equal(lines,order.lines)||order.total!==lines.reduce((n,line)=>n+line.price*line.quantity,0))throw new AccessDenied();
    }
    for(const refund of order.refunds??[]){const prior=old.refunds?.find(r=>r.id===refund.id);if(!prior||(!equal(prior,refund)&&!(prior.status==='awaiting_agreement'&&refund.status==='awaiting_refund'&&equal({...prior,status:'awaiting_refund'},refund))))throw new AccessDenied();}
    for(const message of order.messages??[]){const prior=old.messages?.find(m=>m.id===message.id);if(message.role==='merchant'&&!equal(prior,message))throw new AccessDenied();}
   }
  }
 }
 // A scoped snapshot cannot remove orders, even by omitting their IDs.
 if(editable.some((o:Order)=>!seen.has(o.id)))throw new AccessDenied();
 if(user.role==='merchant'&&incoming.accounts.length)throw new AccessDenied();
 if(user.role==='customer'&&incoming.accounts.some((a:{id:string})=>a.id!==user.id))throw new AccessDenied();
 const accounts=current.accounts.map((a:Document)=>{
  if(user.role!=='customer'||a.id!==user.id)return a;
  const edit=incoming.accounts.find((x:{id:string})=>x.id===user.id);
  if(!edit)return a;
  if(edit.email!==a.email)throw new AccessDenied();
  return {...a,name:String(edit.name).trim().slice(0,80),phone:String(edit.phone)};
 });
 return {...current,accounts,orders:[...current.orders.filter((o:Order)=>!ownsOrder(user,o)),...incoming.orders]};
}
