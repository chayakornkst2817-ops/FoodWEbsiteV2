import assert from 'node:assert/strict';import fs from 'node:fs/promises';import crypto from 'node:crypto';import pg from 'pg';import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const client=new pg.Client({connectionString:process.env.DATABASE_URL||(await fs.readFile(process.env.DATABASE_URL_FILE,'utf8')).trim()});
const base='http://127.0.0.1:3000',prefix='qa-auth-'+crypto.randomUUID(),a=prefix+'-a',b=prefix+'-b',password=crypto.randomBytes(16).toString('hex');
const emailA=a+'@imjai.test',emailB=b+'@imjai.test',emailC=prefix+'-customer@imjai.test';let customerId;
const config=id=>({name:id,phone:'private-phone-'+id,bank:'private-bank-'+id,account:'private-account-'+id,recipient:'private-recipient-'+id,qr:'private-qr-'+id,menus:[],slots:[],hours:'08:00–14:00',open:true,orderStart:'07:00',orderEnd:'23:59'});
const fixtureOrder=id=>({id,restaurantId:id,userId:'test-customer-'+id,restaurantName:id,location:'test',phone:'0891234567',note:'private-note-'+id,lines:[],history:[],slips:[],total:40,status:'awaiting_payment',createdAt:Date.now(),expiresAt:Date.now()+3600000,pickupDate:'2099-01-01',pickupTime:'12:00–12:15',pickupCode:'TEST'});
const headers=cookie=>({'Content-Type':'application/json',Origin:base,...(cookie?{Cookie:cookie}:{})});
const api=(path,cookie,body)=>fetch(base+path,{...(body?{method:'POST',body:JSON.stringify(body)}:{}),headers:headers(cookie),redirect:'manual'});
const login=async(email,pass=password,role='merchant')=>{const r=await api('/api/auth/',null,{action:'login',role,email,password:pass});assert.equal(r.status,200,'login');assert.match(r.headers.get('set-cookie'),/HttpOnly/i);assert.match(r.headers.get('set-cookie'),/SameSite=strict/i);return r.headers.get('set-cookie').split(';')[0];};
const documents=async cookie=>{const r=await api('/api/persistence/',cookie);assert.equal(r.status,200);return r.json();};
const put=(cookie,doc,payload=doc.payload,revision=Number(doc.revision))=>fetch(base+'/api/persistence/',{method:'PUT',headers:headers(cookie),body:JSON.stringify({key:doc.key,revision,payload})});
const getDoc=(data,key)=>data.documents.find(d=>d.key===key);
await client.connect();
try{
 assert.equal((await api('/api/health/database/')).status,200);
 const guest=await documents();assert.equal(guest.identity,null);assert.deepEqual(getDoc(guest,'imjai-demo-v2').payload.accounts,[]);assert.deepEqual(getDoc(guest,'imjai-demo-v2').payload.orders,[]);
 assert.equal((await put(null,getDoc(guest,'imjai-demo-v2'))).status,401);
 for(const role of ['merchant','admin']){const guarded=await fetch(base+'/'+role+'/',{redirect:'manual'});if(guarded.status===307)assert.equal(guarded.headers.get('location'),'/'+role+'/login/');else assert.ok((await guarded.text()).includes('NEXT_REDIRECT;replace;/'+role+'/login/;307;'));}
 for(const id of [a,b]){
  await client.query('INSERT INTO restaurant_defaults(id,payload) VALUES($1,$2::jsonb)',[id,JSON.stringify(config(id))]);
  const salt=crypto.randomBytes(16).toString('hex');
  await client.query("INSERT INTO auth_accounts(id,email,name,salt,password_hash,role,subject_id,restaurant_id) VALUES($1,$2,$1,$3,$4,'merchant',$1,$1)",[id,id+'@imjai.test',salt,crypto.scryptSync(password,salt,64).toString('hex')]);
 }
 await client.query("UPDATE app_state SET payload=payload||$1::jsonb,revision=revision+1 WHERE key='imjai-merchant-catalog'",[JSON.stringify({[a]:config(a),[b]:config(b)})]);
 await client.query("UPDATE app_state SET payload=jsonb_set(payload,'{orders}',payload->'orders'||$1::jsonb),revision=revision+1 WHERE key='imjai-demo-v2'",[JSON.stringify([fixtureOrder(a),fixtureOrder(b)])]);
 let cookieA=await login(emailA),cookieB=await login(emailB);
 let own=await documents(cookieA),demo=getDoc(own,'imjai-demo-v2');
 assert.equal(own.identity.restaurantId,a);assert.equal(demo.payload.accounts.length,0);assert.ok(demo.payload.orders.every(o=>o.restaurantId===a));
 assert.ok(!JSON.stringify(own).includes('private-account-'+b));assert.ok(!JSON.stringify(own).includes('private-note-'+b));
 const query=await (await api('/api/persistence/?shop='+b,cookieA)).json();assert.ok(getDoc(query,'imjai-demo-v2').payload.orders.every(o=>o.restaurantId===a));
 assert.equal((await put(cookieA,demo,demo.payload,0)).status,409);
 assert.equal((await put(cookieA,demo,{...demo.payload,orders:[{...demo.payload.orders[0],id:b}]})).status,403);
 assert.equal((await put(cookieA,demo,{...demo.payload,orders:[{...demo.payload.orders[0],restaurantId:b}]})).status,403);
 assert.equal((await put(cookieA,demo,{...demo.payload,orders:[{...demo.payload.orders[0],note:'own edit'}]})).status,200);
 assert.equal((await client.query('SELECT snapshot FROM orders WHERE id=$1',[b])).rows[0].snapshot.note,'private-note-'+b);
 let catalog=getDoc(await documents(cookieA),'imjai-merchant-catalog');
 assert.equal((await put(cookieA,catalog,{...catalog.payload,[b]:{...catalog.payload[b],phone:'hacked'}})).status,403);
 assert.equal((await put(cookieA,catalog,{...catalog.payload,[a]:{...catalog.payload[a],name:'Own shop updated'}})).status,200);
 assert.equal((await client.query("SELECT payload->$1 AS shop FROM app_state WHERE key='imjai-merchant-catalog'",[b])).rows[0].shop.account,'private-account-'+b);
 const gov=getDoc(await documents(cookieA),'imjai-governance-v5');assert.equal((await put(cookieA,gov)).status,403);
 const foreign=await fetch(base+'/api/persistence/',{method:'PUT',headers:{...headers(cookieA),Origin:'https://foreign.invalid'},body:JSON.stringify({key:gov.key,revision:Number(gov.revision),payload:gov.payload})});assert.equal(foreign.status,403);
 const bytes=await fs.readFile('public/images/rice.jpg'),fileId=prefix+'-file';const form=new FormData();form.append('file',new Blob([bytes],{type:'image/jpeg'}),'qa-image.jpg');
 let r=await fetch(base+'/api/files/'+fileId+'/',{method:'PUT',headers:{Cookie:cookieA,Origin:base},body:form});assert.equal(r.status,200);
 r=await api('/api/files/'+fileId+'/',cookieA);assert.equal(r.status,200);assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes);
 assert.equal((await api('/api/files/'+fileId+'/',cookieB)).status,403);assert.equal((await api('/api/files/'+fileId+'/')).status,401);
 const bDemo=getDoc(await documents(cookieB),'imjai-demo-v2');assert.equal((await put(cookieB,bDemo,{...bDemo.payload,orders:[{...bDemo.payload.orders[0],slips:[{id:fileId,status:'submitted',name:'forged',submittedAt:Date.now()}]}]})).status,403);
 const bCatalog=getDoc(await documents(cookieB),'imjai-merchant-catalog');assert.equal((await put(cookieB,bCatalog,{...bCatalog.payload,[b]:{...bCatalog.payload[b],menus:[{id:'forged',image:'/api/files/'+fileId+'/'}]}})).status,403);
 const bad=new FormData();bad.append('file',new Blob(['bad'],{type:'image/jpeg'}),'fake.jpg');assert.equal((await fetch(base+'/api/files/'+fileId+'/',{method:'PUT',headers:{Cookie:cookieA,Origin:base},body:bad})).status,400);
 r=await api('/api/auth/',null,{action:'register',role:'customer',name:'Security test',email:emailC,phone:'0891234567',password});assert.equal(r.status,200);customerId=(await r.json()).id;let customerCookie=r.headers.get('set-cookie').split(';')[0];
 const customer=await documents(customerCookie);assert.equal(customer.identity.role,'customer');assert.equal(getDoc(customer,'imjai-demo-v2').payload.accounts.length,1);assert.equal(getDoc(customer,'imjai-demo-v2').payload.accounts[0].passwordHash,'');
 assert.equal((await put(customerCookie,getDoc(customer,'imjai-merchant-catalog'))).status,403);
 assert.equal((await api('/api/auth/',cookieA,{action:'register',role:'merchant',name:'forged',email:'forged@imjai.test',phone:'0891234567',password})).status,403);
 r=await api('/api/auth/',cookieA,{action:'password',current:password,password:password+'-new'});assert.equal(r.status,200);assert.equal((await documents(cookieA)).identity,null);
 assert.equal((await api('/api/auth/',null,{action:'login',role:'merchant',email:emailA,password})).status,401);cookieA=await login(emailA,password+'-new');
 await api('/api/auth/',cookieA,{action:'logout'});assert.equal((await documents(cookieA)).identity,null);
 await client.query('UPDATE auth_sessions SET expires_at=now()-interval \'1 minute\' WHERE account_id=$1',[b]);assert.equal((await documents(cookieB)).identity,null);
 console.log('PASS: two-shop isolation, private data redaction, direct URL/API guards, scoped writes, private files, customer registration, password rotation, logout and expired sessions.');
}finally{
 await client.query('BEGIN');
 await client.query('DELETE FROM auth_sessions WHERE account_id=ANY($1::text[]) OR customer_id=$2',[[a,b],customerId??'']);
 await client.query('DELETE FROM auth_accounts WHERE id=ANY($1::text[])',[[a,b]]);
 await client.query('DELETE FROM auth_attempts WHERE key=ANY($1::text[])',[[...['merchant','customer'].flatMap(role=>[emailA,emailB,emailC].map(email=>crypto.createHash('sha256').update(role+':'+email).digest('hex')))]]);
 await client.query('DELETE FROM uploaded_files WHERE id LIKE $1',[prefix+'%']);
 await client.query("UPDATE app_state SET payload=(payload-$1)-$2,revision=revision+1 WHERE key='imjai-merchant-catalog'",[a,b]);
 await client.query(`UPDATE app_state SET payload=jsonb_set(jsonb_set(payload,'{orders}',coalesce((SELECT jsonb_agg(o) FROM jsonb_array_elements(payload->'orders') o WHERE o->>'id'<>ALL($1::text[])),'[]'::jsonb)),'{accounts}',coalesce((SELECT jsonb_agg(u) FROM jsonb_array_elements(payload->'accounts') u WHERE u->>'id'<>$2),'[]'::jsonb)),revision=revision+1 WHERE key='imjai-demo-v2'`,[[a,b],customerId??'']);
 await client.query('DELETE FROM restaurant_defaults WHERE id=ANY($1::text[])',[[a,b]]);
 await client.query('COMMIT');await client.end();
}
