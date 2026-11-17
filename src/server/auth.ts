import 'server-only';
import { cookies } from 'next/headers';
import { createHash, randomBytes, pbkdf2Sync, scryptSync, timingSafeEqual } from 'node:crypto';
import { database } from './database';
import type { Identity } from '@/lib/access';
export const sessionCookie='imjai-session';
export const tokenHash=(token:string)=>createHash('sha256').update(token).digest('hex');
export function passwordMatches(password:string,salt:string,hash:string,customer=false) {
 const actual=customer?pbkdf2Sync(password,salt,100000,32,'sha256'):scryptSync(password,salt,64);
 const expected=Buffer.from(hash,'hex');
 return actual.length===expected.length && timingSafeEqual(actual,expected);
}
export async function identity(request?:Request):Promise<Identity|null> {
 const token=request ? request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(sessionCookie+'='))?.slice(sessionCookie.length+1) : (await cookies()).get(sessionCookie)?.value;
 if(!token || !/^[a-f0-9]{64}$/.test(token))return null;
 const result=await database().query(`SELECT a.id,a.email,a.name,a.role,a.subject_id,a.restaurant_id,s.customer_id
 FROM auth_sessions s LEFT JOIN auth_accounts a ON a.id=s.account_id
 WHERE s.token_hash=$1 AND s.expires_at>now() AND (a.active OR s.customer_id IS NOT NULL)`,[tokenHash(token)]);
 const row=result.rows[0];if(!row)return null;
 const data=await database().query("SELECT key,payload FROM app_state WHERE key IN ('imjai-demo-v2','imjai-governance-v5')");
 const demo=data.rows.find(r=>r.key==='imjai-demo-v2')?.payload;
 const gov=data.rows.find(r=>r.key==='imjai-governance-v5')?.payload;
 if(row.customer_id){const a=demo?.accounts.find((a:{id:string})=>a.id===row.customer_id);return a&&!gov?.suspendedUsers.includes(a.id)?{id:a.id,name:a.name,email:a.email,role:'customer'}:null;}
 if(row.role==='admin' && !gov?.admins.some((a:{id:string;active:boolean;pending?:boolean})=>a.id===row.subject_id&&a.active&&!a.pending))return null;
 if(row.role==='merchant'&&gov?.suspendedShops.includes(row.restaurant_id))return null;
 return {id:row.subject_id,name:row.name,email:row.email,role:row.role,restaurantId:row.restaurant_id??undefined};
}
export async function createSession(accountId:string|null,customerId:string|null,request:Request) {
 const token=randomBytes(32).toString('hex');
 await database().query("INSERT INTO auth_sessions(token_hash,account_id,customer_id,expires_at) VALUES($1,$2,$3,now()+interval '8 hours')",[tokenHash(token),accountId,customerId]);
 (await cookies()).set(sessionCookie,token,{httpOnly:true,sameSite:'strict',secure:new URL(request.url).protocol==='https:',path:'/',maxAge:8*60*60});
}
