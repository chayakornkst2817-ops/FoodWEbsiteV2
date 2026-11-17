import { randomBytes, randomUUID, pbkdf2Sync, scryptSync } from 'node:crypto';
import { cookies } from 'next/headers';
import { database, databaseFailure, localRequest } from '@/server/database';
import { createSession, identity, passwordMatches, sessionCookie, tokenHash } from '@/server/auth';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){
 if(!localRequest(request))return new Response(null,{status:403});
 try{return Response.json({identity:await identity(request)},{headers:{'Cache-Control':'private, no-store'}});}catch{return databaseFailure();}
}
export async function POST(request:Request){
 if(!localRequest(request))return new Response(null,{status:403});
 if(Number(request.headers.get('content-length')??0)>8192)return new Response(null,{status:413});
 try{
 const input=await request.json();
 if(input.action==='logout'){
  const token=(await cookies()).get(sessionCookie)?.value;
  if(token)await database().query('DELETE FROM auth_sessions WHERE token_hash=$1',[tokenHash(token)]);
  (await cookies()).delete(sessionCookie);return Response.json({ok:true});
 }
 if(input.action==='password'){
  const user=await identity(request);if(!user)return Response.json({error:'กรุณาเข้าสู่ระบบ'},{status:401});
  if(typeof input.current!=='string'||typeof input.password!=='string'||input.password.length<8||input.password.length>128)return Response.json({error:'รหัสผ่านใหม่ต้องมี 8–128 ตัวอักษร'},{status:400});
  const client=await database().connect();
  try{
   await client.query('BEGIN');
   if(user.role==='customer'){
    const row=(await client.query("SELECT payload FROM app_state WHERE key='imjai-demo-v2' FOR UPDATE")).rows[0];
    const a=row.payload.accounts.find((a:{id:string})=>a.id===user.id);
    if(!a||!passwordMatches(input.current,a.salt,a.passwordHash,true))throw Error('PASSWORD');
    const salt=randomBytes(16).toString('hex');a.salt=salt;a.passwordHash=pbkdf2Sync(input.password,salt,100000,32,'sha256').toString('hex');
    await client.query("UPDATE app_state SET payload=$1::jsonb,revision=revision+1,updated_at=now() WHERE key='imjai-demo-v2'",[JSON.stringify(row.payload)]);
    await client.query('DELETE FROM auth_sessions WHERE customer_id=$1',[user.id]);
   }else{
    const a=(await client.query('SELECT * FROM auth_accounts WHERE role=$1 AND subject_id=$2 FOR UPDATE',[user.role,user.id])).rows[0];
    if(!a||!passwordMatches(input.current,a.salt,a.password_hash))throw Error('PASSWORD');
    const salt=randomBytes(16).toString('hex');await client.query('UPDATE auth_accounts SET salt=$1,password_hash=$2 WHERE id=$3',[salt,scryptSync(input.password,salt,64).toString('hex'),a.id]);
    await client.query('DELETE FROM auth_sessions WHERE account_id=$1',[a.id]);
   }
   await client.query('COMMIT');(await cookies()).delete(sessionCookie);return Response.json({ok:true});
  }catch(e){await client.query('ROLLBACK');if((e as Error).message==='PASSWORD')return Response.json({error:'รหัสผ่านปัจจุบันไม่ถูกต้อง'},{status:400});throw e;}finally{client.release();}
 }
 const role=input.role??'customer',email=String(input.email??'').trim().toLowerCase(),password=input.password;
 if(!['customer','merchant','admin'].includes(role)||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||typeof password!=='string'||password.length<8||password.length>128)return Response.json({error:'กรุณากรอกอีเมลและรหัสผ่านอย่างน้อย 8 ตัวอักษร'},{status:400});
 if(input.action==='register'){
  if(role!=='customer')return Response.json({error:'บัญชีร้านค้าและแอดมินสร้างได้โดยผู้ดูแลเท่านั้น'},{status:403});
  if(!String(input.name??'').trim()||!/^0\d{8,9}$/.test(input.phone??''))return Response.json({error:'ชื่อและเบอร์โทรไม่ถูกต้อง'},{status:400});
  const client=await database().connect();const id=randomUUID();
  try{
   await client.query('BEGIN');
   const row=(await client.query("SELECT payload FROM app_state WHERE key='imjai-demo-v2' FOR UPDATE")).rows[0];
   const payload=row?.payload??{accounts:[],orders:[],timeoutMinutes:10};
   if(payload.accounts.some((a:{email:string})=>a.email.toLowerCase()===email)){await client.query('ROLLBACK');return Response.json({error:'อีเมลนี้มีบัญชีแล้ว'},{status:409});}
   const salt=randomBytes(16).toString('hex');payload.accounts.push({id,name:input.name.trim().slice(0,80),email,phone:input.phone,salt,passwordHash:pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex')});
   await client.query("INSERT INTO app_state(key,revision,payload) VALUES('imjai-demo-v2',1,$1::jsonb) ON CONFLICT(key) DO UPDATE SET payload=EXCLUDED.payload,revision=app_state.revision+1,updated_at=now()",[JSON.stringify(payload)]);
   await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  await createSession(null,id,request);return Response.json({id});
 }
 if(input.action!=='login')return new Response(null,{status:400});
 const key=tokenHash(role+':'+email);
 const attempt=(await database().query('SELECT blocked_until FROM auth_attempts WHERE key=$1',[key])).rows[0];
 if(attempt?.blocked_until>new Date())return Response.json({error:'ลองเข้าสู่ระบบมากเกินไป กรุณารอ 15 นาที'},{status:429});
 let id:string|undefined,accountId:string|null=null;
 if(role==='customer'){
  const rows=await database().query("SELECT payload FROM app_state WHERE key='imjai-demo-v2'");
  const a=rows.rows[0]?.payload.accounts.find((a:{email:string})=>a.email.toLowerCase()===email);
  if(passwordMatches(password,a?.salt??'invalid',a?.passwordHash??'00'.repeat(32),true)&&a)id=a.id;
 }else{
  const a=(await database().query('SELECT * FROM auth_accounts WHERE email=$1 AND role=$2 AND active',[email,role])).rows[0];
  if(passwordMatches(password,a?.salt??'invalid',a?.password_hash??'00'.repeat(64))&&a){id=a.subject_id;accountId=a.id;}
 }
 if(!id){await database().query(`INSERT INTO auth_attempts(key,failures) VALUES($1,1) ON CONFLICT(key) DO UPDATE SET
 failures=CASE WHEN auth_attempts.updated_at<now()-interval '15 minutes' THEN 1 ELSE auth_attempts.failures+1 END,
 blocked_until=CASE WHEN auth_attempts.failures>=4 AND auth_attempts.updated_at>=now()-interval '15 minutes' THEN now()+interval '15 minutes' ELSE NULL END,updated_at=now()`,[key]);return Response.json({error:'อีเมลหรือรหัสผ่านไม่ถูกต้อง'},{status:401});}
 await database().query('DELETE FROM auth_attempts WHERE key=$1',[key]);
 await createSession(accountId,role==='customer'?id:null,request);
 return Response.json({id});
 }catch(error){if(error instanceof SyntaxError)return Response.json({error:'ข้อมูลไม่ถูกต้อง'},{status:400});return databaseFailure();}
}
