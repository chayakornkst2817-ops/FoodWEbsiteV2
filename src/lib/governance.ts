import {restaurants} from './data.ts';
export type Permission='approve_shops'|'manage_accounts'|'audit_orders'|'read_phone'|'read_slips'|'read_chat'|'manage_admins';
export const permissions:Record<Permission,string>={approve_shops:'อนุมัติร้าน',manage_accounts:'จัดการบัญชี',audit_orders:'ตรวจออเดอร์',read_phone:'ดูเบอร์โทร',read_slips:'ดูสลิป',read_chat:'ดูบทสนทนา',manage_admins:'จัดการแอดมิน'};
export type Admin={id:string;name:string;email:string;permissions:Permission[];active:boolean;pending?:boolean;token?:string;expiresAt?:number};
export type Application={id:string;ownerId:string;ownerName:string;email:string;name:string;phone:string;bank:string;account:string;recipient:string;qr:string;status:'pending'|'needs_changes'|'approved';reason:string;submittedAt:number;history:{at:number;note:string}[]};
export type Governance={admins:Admin[];applications:Application[];suspendedShops:string[];suspendedUsers:string[];audit:{at:number;actor:string;note:string}[]};
export const seededAdmins:Admin[]=[{id:'owner',name:'ผู้ดูแลหลัก (ตัวอย่าง)',email:'owner@imjai.test',active:true,permissions:Object.keys(permissions) as Permission[]},{id:'reviewer',name:'ผู้ตรวจคำขอร้าน (ตัวอย่าง)',email:'reviewer@imjai.test',active:true,permissions:['approve_shops']},{id:'support',name:'เจ้าหน้าที่ดูออเดอร์ (ตัวอย่าง)',email:'support@imjai.test',active:true,permissions:['audit_orders']}];
export const shopAccess:Record<string,{approved:boolean;suspended:boolean}>={};
export const applicationPayout:Record<string,Application>={};
export const desiredOpen:Record<string,boolean>={};
export const suspendedUsers=new Set<string>();
export function allowed(s:Governance,id:string|null,p:Permission){return !!s.admins.find(a=>a.id===id&&a.active&&!a.pending&&a.permissions.includes(p))}
export type GovernanceAction={type:'review';id:string;approve:boolean;reason:string}|{type:'shop_suspend'|'user_suspend';id:string;suspended:boolean;reason:string}|{type:'invite';admin:Admin}|{type:'edit_admin';id:string;permissions:Permission[];active:boolean};
export function govern(state:Governance,actor:string,action:GovernanceAction,now:number):Governance{
 const permission:Permission=action.type==='review'?'approve_shops':action.type==='invite'||action.type==='edit_admin'?'manage_admins':'manage_accounts';if(!allowed(state,actor,permission))throw Error('ไม่มีสิทธิ์ดำเนินการนี้');let next={...state};let note='';
 if(action.type==='review'){const app=state.applications.find(a=>a.id===action.id);if(!app||app.status!=='pending')throw Error('คำขอไม่ได้อยู่ระหว่างรอตรวจ');if(!action.approve&&!action.reason.trim())throw Error('กรุณาระบุเหตุผลที่ให้แก้ไข');note=`${action.approve?'อนุมัติร้าน':'ส่งกลับแก้ไข'} ${app.name}: ${action.reason}`;next.applications=state.applications.map(a=>a.id===action.id?{...a,status:action.approve?'approved':'needs_changes',reason:action.approve?'':action.reason.trim(),history:[...a.history,{at:now,note}]}:a)}
 else if(action.type==='shop_suspend'||action.type==='user_suspend'){if(!action.reason.trim())throw Error('ต้องบันทึกเหตุผล');const key=action.type==='shop_suspend'?'suspendedShops':'suspendedUsers';if(action.type==='shop_suspend'&&!restaurants.some(r=>r.id===action.id))throw Error('ไม่พบร้าน');next[key]=action.suspended?[...new Set([...state[key],action.id])]:state[key].filter(id=>id!==action.id);note=`${action.suspended?'ระงับ':'คืนสถานะ'} ${action.id}: ${action.reason.trim()}`}
 else if(action.type==='invite'){if(state.admins.some(a=>a.email.toLowerCase()===action.admin.email.toLowerCase()))throw Error('อีเมลนี้มีอยู่แล้ว');if(!action.admin.name.trim()||!action.admin.permissions.length||action.admin.permissions.some(p=>!permissions[p]))throw Error('ข้อมูลแอดมินไม่ถูกต้อง');next.admins=[...state.admins,{...action.admin,pending:true,active:false}];note=`สร้างคำเชิญแอดมิน ${action.admin.email}`}
 else if(action.type==='edit_admin'){if(!state.admins.some(a=>a.id===action.id))throw Error('ไม่พบแอดมิน');if(action.permissions.some(p=>!permissions[p]))throw Error('สิทธิ์ไม่ถูกต้อง');next.admins=state.admins.map(a=>a.id===action.id?{...a,permissions:action.permissions,active:action.active}:a);if(!next.admins.some(a=>a.active&&!a.pending&&a.permissions.includes('manage_admins')))throw Error('ต้องเหลือผู้ดูแลสิทธิ์อย่างน้อยหนึ่งคน');note=`แก้ไขสิทธิ์แอดมิน ${action.id}`}
 return {...next,audit:[...state.audit,{at:now,actor,note}]};
}

