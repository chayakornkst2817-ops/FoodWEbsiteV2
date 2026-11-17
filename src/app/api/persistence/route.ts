import { database, databaseFailure, localRequest } from '@/server/database';
import { identity } from '@/server/auth';
import { documentKeys, validDocument } from '@/lib/persistence';
import { AccessDenied, mergeDocument, projectDocument } from '@/lib/tenant-access';
import { fileReferences } from '@/lib/access';
import type { Order } from '@/lib/orders';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){
 if(!localRequest(request))return new Response(null,{status:403});
 try{
  const user=await identity(request);
  const result=await database().query('SELECT key,revision::text,payload FROM app_state ORDER BY key');
  const orders=result.rows.find(r=>r.key==='imjai-demo-v2')?.payload.orders??[];
  return Response.json({identity:user,documents:result.rows.map(r=>({...r,payload:projectDocument(r.key,r.payload,user,orders)}))},{headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
 }catch{return databaseFailure();}
}
export async function PUT(request:Request){
 if(!localRequest(request))return new Response(null,{status:403});
 if(Number(request.headers.get('content-length')??0)>8*1024*1024)return new Response(null,{status:413});
 let input;try{input=await request.json();}catch{return new Response(null,{status:400});}
 if(!documentKeys.includes(input?.key)||!validDocument(input.key,input.payload)||!Number.isSafeInteger(input.revision)||input.revision<0||JSON.stringify(input.payload).length>8*1024*1024)return Response.json({error:'รูปแบบข้อมูลไม่ถูกต้อง'},{status:400});
 const client=await database().connect();
 try{
  const user=await identity(request);if(!user)return Response.json({error:'กรุณาเข้าสู่ระบบ'},{status:401});
  await client.query('BEGIN');
  const rows=(await client.query('SELECT key,revision::text,payload FROM app_state ORDER BY key FOR UPDATE')).rows;
  const row=rows.find(r=>r.key===input.key);if(!row)throw new AccessDenied();
  if(Number(row.revision)!==input.revision){await client.query('ROLLBACK');return Response.json({error:'มีข้อมูลใหม่ กรุณาโหลดข้อมูลล่าสุดก่อนทำต่อ'},{status:409});}
  const demo=rows.find(r=>r.key==='imjai-demo-v2')?.payload;
  const gov=rows.find(r=>r.key==='imjai-governance-v5')?.payload;
  const next=mergeDocument(input.key,row.payload,input.payload,user,demo?.orders??[],gov);
  // Prevent attaching another account's private file to an otherwise accessible order.
  const newRefs:string[]=[];
  if(input.key==='imjai-demo-v2'){
   const catalog=rows.find(r=>r.key==='imjai-merchant-catalog')?.payload??{};
   for(const order of next.orders as Order[]){
    const previous=demo.orders.find((o:Order)=>o.id===order.id);
    if(!previous)throw new AccessDenied(); // New orders must use the atomic /api/orders endpoint.
    const old=new Set(previous?fileReferences(previous):[]);
    newRefs.push(...fileReferences(order).filter(id=>!old.has(id)));
   }
  }
  if(input.key==='imjai-merchant-catalog'){
   for(const [id,c] of Object.entries(next) as [string,any][]){
    const old=row.payload[id];const oldUrls=new Set([old?.qr,...(old?.menus??[]).map((m:{image:string})=>m.image)]);
    for(const url of [c.qr,...c.menus.map((m:{image:string})=>m.image)]){
     if(typeof url!=='string'||oldUrls.has(url))continue;
     const match=url.match(/^\/api\/files\/([a-zA-Z0-9_-]+)\/?$/);if(match)newRefs.push(match[1]);
    }
   }
  }
  for(const id of newRefs){
   const owner=(await client.query('SELECT owner_id,restaurant_id FROM uploaded_files WHERE id=$1',[id])).rows[0];
   if(!owner||(user.role!=='admin'&&owner.owner_id!==user.id&&!(user.role==='merchant'&&owner.restaurant_id===user.restaurantId)))throw new AccessDenied();
  }
  const result=await client.query('UPDATE app_state SET payload=$1::jsonb,revision=revision+1,updated_at=now() WHERE key=$2 RETURNING revision::text',[JSON.stringify(next),input.key]);
  await client.query('COMMIT');return Response.json({revision:Number(result.rows[0].revision)});
 }catch(e){await client.query('ROLLBACK');return e instanceof AccessDenied?Response.json({error:e.message},{status:403}):databaseFailure();}finally{client.release();}
}
