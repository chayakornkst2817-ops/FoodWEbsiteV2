import { database, databaseFailure, localRequest } from '@/server/database';
import { identity } from '@/server/auth';
import { projectDocument } from '@/lib/tenant-access';
import { validReopensAt } from '@/lib/pickup';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}){
 if(!localRequest(request))return new Response(null,{status:403});
 if(Number(request.headers.get('content-length')??0)>2048)return new Response(null,{status:413});
 const {id}=await context.params;let input;
 try{input=await request.json();}catch{return new Response(null,{status:400});}
 if(!input||typeof input.open!=='boolean'||(!input.open&&input.reopensAt&& !validReopensAt(input.reopensAt)))return Response.json({error:'กรุณาตรวจสอบสถานะและวันเวลาเปิดรับอีกครั้ง ตามเวลาไทย'},{status:400});
 let client;
 try{
  const user=await identity(request);if(!user)return new Response(null,{status:401});
  if(user.role!=='admin'&&(user.role!=='merchant'||user.restaurantId!==id))return new Response(null,{status:403});
  client=await database().connect();await client.query('BEGIN');
  const rows=(await client.query('SELECT key,revision::text,payload FROM app_state ORDER BY key FOR UPDATE')).rows;
  const catalog=rows.find(r=>r.key==='imjai-merchant-catalog'),gov=rows.find(r=>r.key==='imjai-governance-v5')?.payload;
  if(user.role==='admin'&&!gov?.admins.some((a:{id:string;permissions:string[]})=>a.id===user.id&&a.permissions.includes('manage_accounts'))){await client.query('ROLLBACK');return new Response(null,{status:403});}
  if(!catalog?.payload[id]){await client.query('ROLLBACK');return new Response(null,{status:404});}
  const application=gov?.applications.find((a:{id:string})=>a.id===id);
  if(input.open&&(gov?.suspendedShops.includes(id)||(application&&application.status!=='approved'))){await client.query('ROLLBACK');return Response.json({error:'ร้านยังไม่ผ่านอนุมัติหรือถูกระงับ'},{status:403});}
  const payload={...catalog.payload,[id]:{...catalog.payload[id],open:input.open,reopensAt:input.open?null:(input.reopensAt||null)}};
  const revision=(await client.query("UPDATE app_state SET payload=$1::jsonb,revision=revision+1,updated_at=now() WHERE key='imjai-merchant-catalog' RETURNING revision::text",[JSON.stringify(payload)])).rows[0].revision;
  await client.query('COMMIT');
  return Response.json({document:{key:catalog.key,revision,payload:projectDocument(catalog.key,payload,user)}});
 }catch{if(client)await client.query('ROLLBACK');return databaseFailure();}finally{client?.release();}
}
