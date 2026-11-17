import { createHash, randomUUID } from 'node:crypto';
import { database, databaseFailure, localRequest } from '@/server/database';
import { identity } from '@/server/auth';
import { buildCheckoutOrder, CheckoutError, type CheckoutInput } from '@/lib/checkout-order';
import { projectDocument } from '@/lib/tenant-access';
import { SHOP_CLOSED_MESSAGE } from '@/lib/pickup';
import type { Order } from '@/lib/orders';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(!localRequest(request))return new Response(null,{status:403});
 if(Number(request.headers.get('content-length')??0)>65536)return new Response(null,{status:413});
 let input:CheckoutInput;
 try{input=await request.json();}catch{return Response.json({error:'ข้อมูลไม่ถูกต้อง'},{status:400});}
 if(!input||typeof input.requestKey!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.requestKey)||typeof input.restaurantId!=='string'||!Array.isArray(input.items)||JSON.stringify(input).length>65536)return Response.json({error:'ข้อมูลไม่ถูกต้อง'},{status:400});
 let client;
 try{
  const user=await identity(request);
  if(!user)return Response.json({error:'กรุณาเข้าสู่ระบบก่อนยืนยันออเดอร์'},{status:401});
  if(user.role!=='customer')return Response.json({error:'เฉพาะบัญชีลูกค้าสามารถสั่งอาหารได้'},{status:403});
  const hash=createHash('sha256').update(JSON.stringify({restaurantId:input.restaurantId,items:input.items,pickupDate:input.pickupDate,pickupTime:input.pickupTime,phone:input.phone,note:input.note})).digest('hex');
  client=await database().connect();await client.query('BEGIN');
  // Same lock order as catalog writes, accepting-status changes and snapshot updates.
  const rows=(await client.query('SELECT key,revision::text,payload FROM app_state ORDER BY key FOR UPDATE')).rows;
  const demo=rows.find(r=>r.key==='imjai-demo-v2');
  const catalogRecord=rows.find(r=>r.key==='imjai-merchant-catalog');
  const catalog=catalogRecord?.payload;
  const catalogDocument=(orders:Order[])=>catalogRecord?{...catalogRecord,payload:projectDocument(catalogRecord.key,catalog,user,orders)}:undefined;
  const gov=rows.find(r=>r.key==='imjai-governance-v5')?.payload;
  if(!demo)throw new CheckoutError('ไม่พบข้อมูลระบบ',503);
  const replay=(await client.query('SELECT request_hash,order_id FROM order_submissions WHERE customer_id=$1 AND request_key=$2',[user.id,input.requestKey])).rows[0];
  if(replay){
   if(replay.request_hash!==hash)throw new CheckoutError('คำขอนี้ใช้กับรายการอื่นแล้ว กรุณายืนยันใหม่',409,'REQUEST_CHANGED');
   const order=demo.payload.orders.find((o:Order)=>o.id===replay.order_id&&o.userId===user.id);
   if(!order)throw new CheckoutError('ไม่พบออเดอร์เดิม กรุณาติดต่อผู้ดูแล',409);
   await client.query('COMMIT');return Response.json({order,document:{...demo,payload:projectDocument(demo.key,demo.payload,user)},catalogDocument:catalogDocument(demo.payload.orders),replayed:true});
  }
  const defaults=(await client.query('SELECT payload FROM restaurant_defaults WHERE id=$1',[input.restaurantId])).rows[0]?.payload;
  const shop=catalog?.[input.restaurantId];
  const application=gov?.applications.find((a:{id:string})=>a.id===input.restaurantId);
  if(!defaults||!shop||gov?.suspendedShops.includes(input.restaurantId)||(application&&application.status!=='approved'))throw new CheckoutError(SHOP_CLOSED_MESSAGE,409,'SHOP_CLOSED');
  // Read and check open status while locks are held; never trust the client's copy.
  const order=buildCheckoutOrder(input,'IJ-'+randomUUID().toUpperCase(),user.id,shop,defaults,demo.payload.orders,demo.payload.timeoutMinutes);
  const payload={...demo.payload,orders:[order,...demo.payload.orders]};
  const revision=(await client.query("UPDATE app_state SET payload=$1::jsonb,revision=revision+1,updated_at=now() WHERE key='imjai-demo-v2' RETURNING revision::text",[JSON.stringify(payload)])).rows[0].revision;
  await client.query('INSERT INTO order_submissions(customer_id,request_key,request_hash,order_id) VALUES($1,$2,$3,$4)',[user.id,input.requestKey,hash,order.id]);
  await client.query('COMMIT');
  return Response.json({order,document:{key:demo.key,revision,payload:projectDocument(demo.key,payload,user)},catalogDocument:catalogDocument(payload.orders),replayed:false},{status:201});
 }catch(error){
  if(client)await client.query('ROLLBACK');
  return error instanceof CheckoutError?Response.json({error:error.message,code:error.code},{status:error.status}):databaseFailure();
 }finally{client?.release();}
}
