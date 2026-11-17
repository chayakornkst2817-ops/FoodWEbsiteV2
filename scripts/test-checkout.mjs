import assert from 'node:assert/strict';import fs from 'node:fs/promises';import crypto from 'node:crypto';import pg from 'pg';import nextEnv from '@next/env';
import {bangkokDate,SHOP_CLOSED_MESSAGE} from '../src/lib/pickup.ts';
import {submitSlip} from '../src/lib/orders.ts';import {merchantTransition} from '../src/lib/merchant.ts';
nextEnv.loadEnvConfig(process.cwd());
const db=new pg.Client({connectionString:process.env.DATABASE_URL||(await fs.readFile(process.env.DATABASE_URL_FILE,'utf8')).trim()});
const base='http://127.0.0.1:3000',prefix='qa-checkout-'+crypto.randomUUID(),a=prefix+'-a',b=prefix+'-b',password=crypto.randomBytes(18).toString('hex'),customers=[];
const headers=cookie=>({'Content-Type':'application/json',Origin:base,...cookie?{Cookie:cookie}:{}});
const request=(path,cookie,body,method='POST')=>fetch(base+path,{method,headers:headers(cookie),...body?{body:JSON.stringify(body)}:{}});
const docs=async cookie=>{const r=await request('/api/persistence/',cookie,null,'GET');assert.equal(r.status,200);return r.json();};
const doc=(data,key)=>data.documents.find(d=>d.key===key);
const change=(cookie,id,open,reopensAt=null)=>request(`/api/shops/${id}/accepting/`,cookie,{open,reopensAt},'PATCH');
const pickupDate=bangkokDate(Date.now()+86400000);
const config=id=>({name:id,open:true,phone:'0891234567',bank:'test-bank',account:'test-account',recipient:'test',qr:'',hours:'08:00–14:00',orderStart:'11:45',orderEnd:'12:00',slots:[{time:'11:45–12:00',available:0}],menus:[{id:'rice',name:'ข้าวผัดไข่',description:'test',image:'/images/rice.jpg',price:35,stock:100,options:[]}]});
const body=(key=crypto.randomUUID(),shop=a)=>({requestKey:key,restaurantId:shop,items:[{key:`${shop}:rice:`,restaurantId:shop,menuId:'rice',optionIds:[],quantity:1}],pickupDate,pickupTime:'11:49',phone:'0891234567',note:'QA checkout'});
const login=async(email,role)=>{const r=await request('/api/auth/',null,{action:'login',role,email,password});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];};
const submit=(cookie,payload)=>request('/api/orders/',cookie,payload);
const save=async(cookie,key,fn)=>{const row=doc(await docs(cookie),key);return request('/api/persistence/',cookie,{key,revision:Number(row.revision),payload:fn(row.payload)},'PUT');};
await db.connect();
const originalCounts=(await db.query('SELECT (SELECT count(*) FROM orders)::int AS orders,(SELECT count(*) FROM users)::int AS users,(SELECT count(*) FROM restaurants)::int AS restaurants,(SELECT count(*) FROM uploaded_files)::int AS files')).rows[0];
try{
 for(const id of [a,b]){const c=config(id),salt=crypto.randomBytes(16).toString('hex');await db.query('INSERT INTO restaurant_defaults(id,payload) VALUES($1,$2::jsonb)',[id,JSON.stringify({...c,id,location:'QA test'})]);await db.query("INSERT INTO auth_accounts(id,email,name,salt,password_hash,role,subject_id,restaurant_id) VALUES($1,$2,$1,$3,$4,'merchant',$1,$1)",[id,id+'@imjai.test',salt,crypto.scryptSync(password,salt,64).toString('hex')]);}
 await db.query("UPDATE app_state SET payload=payload||$1::jsonb,revision=revision+1 WHERE key='imjai-merchant-catalog'",[JSON.stringify({[a]:config(a),[b]:config(b)})]);
 const merchantA=await login(a+'@imjai.test','merchant'),merchantB=await login(b+'@imjai.test','merchant');
 for(let i=0;i<2;i++){const r=await request('/api/auth/',null,{action:'register',role:'customer',email:prefix+'-customer-'+i+'@imjai.test',password,name:'QA customer',phone:'0891234567'});assert.equal(r.status,200);customers.push({id:(await r.json()).id,cookie:r.headers.get('set-cookie').split(';')[0]});}
 const customer=customers[0].cookie,second=customers[1].cookie;
 assert.equal((await change(customer,a,false)).status,403);assert.equal((await change(merchantB,a,false)).status,403);assert.equal((await change(null,a,false)).status,401);
 const firstBody=body(),first=await submit(customer,firstBody);assert.equal(first.status,201);const accepted=(await first.json()).order;assert.equal(accepted.pickupTime,'11:49');
 const payment=await fetch(base+'/payment/?order='+accepted.id,{headers:{Cookie:customer}});assert.equal(payment.status,200);
 const old={...accepted,id:prefix+'-legacy',pickupTime:'11:30–11:45',pickupCode:'LEGACY'};
 await db.query("UPDATE app_state SET payload=jsonb_set(payload,'{orders}',payload->'orders'||$1::jsonb),revision=revision+1 WHERE key='imjai-demo-v2'",[JSON.stringify([old])]);
 const staleView=doc(await docs(second),'imjai-merchant-catalog').payload[a];assert.equal(staleView.open,true);
 const otherBefore=JSON.stringify((await db.query("SELECT payload->$1 AS config FROM app_state WHERE key='imjai-merchant-catalog'",[b])).rows[0].config);
 assert.equal((await change(merchantA,a,false)).status,200);
 const before=(await db.query("SELECT payload FROM app_state WHERE key='imjai-demo-v2'")).rows[0].payload;
 const rejectedBody=body(),rejected=await submit(second,rejectedBody);assert.equal(rejected.status,409);assert.equal((await rejected.json()).error,SHOP_CLOSED_MESSAGE);
 assert.deepEqual((await db.query("SELECT payload FROM app_state WHERE key='imjai-demo-v2'")).rows[0].payload,before);
 assert.equal((await db.query('SELECT count(*)::int AS count FROM order_submissions WHERE request_key=$1',[rejectedBody.requestKey])).rows[0].count,0);
 assert.equal(doc(await docs(second),'imjai-merchant-catalog').payload[a].open,false);
 assert.equal(JSON.stringify((await db.query("SELECT payload->$1 AS config FROM app_state WHERE key='imjai-merchant-catalog'",[b])).rows[0].config),otherBefore);
 assert.equal((await change(merchantA,a,false,pickupDate+'T12:10')).status,200);assert.equal(doc(await docs(null),'imjai-merchant-catalog').payload[a].reopensAt,pickupDate+'T12:10');
 assert.equal((await change(merchantA,a,false)).status,200);assert.equal(doc(await docs(null),'imjai-merchant-catalog').payload[a].reopensAt,null);
 const replay=await submit(customer,firstBody);assert.equal(replay.status,200);assert.equal((await replay.json()).order.id,accepted.id);
 const changed=await submit(customer,{...firstBody,pickupTime:'12:07'});assert.equal(changed.status,409);
 const fileId=prefix+'-proof',image=await fs.readFile('public/images/rice.jpg'),form=new FormData();form.append('file',new Blob([image],{type:'image/jpeg'}),'qa-slip.jpg');assert.equal((await fetch(base+'/api/files/'+fileId+'/',{method:'PUT',headers:{Cookie:customer,Origin:base},body:form})).status,200);
 assert.equal((await save(customer,'imjai-demo-v2',payload=>({...payload,orders:payload.orders.map(o=>o.id===accepted.id?submitSlip(o,{id:fileId,name:'qa-slip.jpg',status:'submitted',submittedAt:Date.now()},Date.now()):o)}))).status,200);
 for(const action of ['confirm','ready','received'])assert.equal((await save(merchantA,'imjai-demo-v2',payload=>({...payload,orders:payload.orders.map(o=>o.id===accepted.id?merchantTransition(o,a,action,Date.now(),action==='received'?o.pickupCode:''):o)}))).status,200);
 const paid=doc(await docs(customer),'imjai-demo-v2').payload.orders;assert.equal(paid.find(o=>o.id===accepted.id).status,'received');assert.equal(paid.find(o=>o.id===old.id).pickupTime,'11:30–11:45');
 const forged={...old,id:prefix+'-forged'};assert.equal((await save(customer,'imjai-demo-v2',payload=>({...payload,orders:[forged,...payload.orders]}))).status,403);
 for(const [date,time] of [[pickupDate,'11:45–12:00'],['2026-02-30','12:10'],[bangkokDate(Date.now()-86400000),'12:10']]){await change(merchantA,a,true);assert.equal((await submit(customer,{...body(),pickupDate:date,pickupTime:time})).status,400);}
 for(let round=0;round<8;round++){
  assert.equal((await change(merchantA,a,true)).status,200);const payload=body();
  const responses=await Promise.all([submit(customer,payload),submit(customer,payload),change(merchantA,a,false)]);assert.equal(responses[2].status,200);
  const outcomes=await Promise.all(responses.slice(0,2).map(async r=>({status:r.status,body:await r.json()})));
  const records=(await db.query('SELECT order_id FROM order_submissions WHERE customer_id=$1 AND request_key=$2',[customers[0].id,payload.requestKey])).rows;
  assert.ok(records.length<=1);
  if(records.length){assert.ok(outcomes.every(o=>[200,201].includes(o.status)&&o.body.order.id===records[0].order_id));}
  else assert.ok(outcomes.every(o=>o.status===409&&o.body.error===SHOP_CLOSED_MESSAGE));
 }
 assert.equal((await change(merchantA,a,true)).status,200);const simultaneous=body();const duplicates=await Promise.all(Array.from({length:8},()=>submit(customer,simultaneous)));const orderIds=await Promise.all(duplicates.map(async r=>{assert.ok([200,201].includes(r.status));return(await r.json()).order.id;}));assert.equal(new Set(orderIds).size,1);
 const raw=(await db.query("SELECT payload->$1 AS shop FROM app_state WHERE key='imjai-merchant-catalog'",[a])).rows[0].shop;assert.equal(raw.menus[0].stock,100);
 console.log('PASS checkout: open/paused, stale client, exact rejection with no writes, per-shop permissions and cross-session status, explicit reopening, existing slip/payment flow while paused, legacy history, arbitrary minutes, invalid dates, snapshot bypass blocked, 8 pause/create races, 8 concurrent duplicate submissions.');
}finally{
 await db.query('BEGIN');await db.query('SELECT key FROM app_state ORDER BY key FOR UPDATE');
 const ids=customers.map(c=>c.id);
 await db.query('DELETE FROM order_submissions WHERE customer_id=ANY($1::text[])',[ids]);
 await db.query('DELETE FROM auth_sessions WHERE customer_id=ANY($1::text[]) OR account_id=ANY($2::text[])',[ids,[a,b]]);
 await db.query('DELETE FROM auth_accounts WHERE id=ANY($1::text[])',[[a,b]]);
 await db.query('DELETE FROM uploaded_files WHERE id LIKE $1',[prefix+'%']);
 await db.query("UPDATE app_state SET payload=(payload-$1)-$2,revision=revision+1 WHERE key='imjai-merchant-catalog'",[a,b]);
 await db.query("UPDATE app_state SET payload=jsonb_set(jsonb_set(payload,'{orders}',coalesce((SELECT jsonb_agg(o) FROM jsonb_array_elements(payload->'orders') o WHERE NOT(o->>'restaurantId'=ANY($1::text[]))),'[]'::jsonb)),'{accounts}',coalesce((SELECT jsonb_agg(u) FROM jsonb_array_elements(payload->'accounts') u WHERE NOT(u->>'id'=ANY($2::text[]))),'[]'::jsonb)),revision=revision+1 WHERE key='imjai-demo-v2'",[[a,b],ids]);
 await db.query('DELETE FROM restaurant_defaults WHERE id=ANY($1::text[])',[[a,b]]);await db.query('COMMIT');
 const after=(await db.query('SELECT (SELECT count(*) FROM orders)::int AS orders,(SELECT count(*) FROM users)::int AS users,(SELECT count(*) FROM restaurants)::int AS restaurants,(SELECT count(*) FROM uploaded_files)::int AS files')).rows[0];assert.deepEqual(after,originalCounts,'Real data counts must remain unchanged');await db.end();
}
