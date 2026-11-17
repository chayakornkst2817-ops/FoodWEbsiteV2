import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {randomBytes,randomUUID,scryptSync} from 'node:crypto';
import path from 'node:path';
import nextEnv from '@next/env';import pg from 'pg';
nextEnv.loadEnvConfig(process.cwd());
const [role,subject,emailInput]=process.argv.slice(2),email=emailInput?.trim().toLowerCase();
if(!['merchant','admin'].includes(role)||!subject||!/^\S+@\S+\.\S+$/.test(email??''))throw Error('Usage: node scripts/create-staff-account.mjs merchant pa-noi panoi@imjai.local (or admin owner owner@imjai.local)');
const client=new pg.Client({connectionString:process.env.DATABASE_URL||(await readFile(process.env.DATABASE_URL_FILE,'utf8')).trim()});
try{
 await client.connect();await client.query('BEGIN');
 if((await client.query('SELECT id FROM auth_accounts WHERE email=$1',[email])).rowCount){console.log('Account already exists; credentials were not changed.');await client.query('ROLLBACK');process.exitCode=0;}
 else{
  let name,restaurant=null;
  if(role==='merchant'){const shop=(await client.query('SELECT payload FROM restaurant_defaults WHERE id=$1',[subject])).rows[0];if(!shop)throw Error('Restaurant not found');name=shop.payload.name;restaurant=subject;}
  else{const gov=(await client.query("SELECT payload FROM app_state WHERE key='imjai-governance-v5'")).rows[0];const admin=gov?.payload.admins.find(a=>a.id===subject&&a.active&&!a.pending);if(!admin)throw Error('Active administrator not found');name=admin.name;}
  const password=randomBytes(18).toString('base64url'),salt=randomBytes(16).toString('hex'),id=randomUUID();
  await client.query('INSERT INTO auth_accounts(id,email,name,salt,password_hash,role,subject_id,restaurant_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,email,name,salt,scryptSync(password,salt,64).toString('hex'),role,role==='merchant'?id:subject,restaurant]);
  const dir=path.join(process.env.USERPROFILE,'Documents','Codex','imjai-account-secrets');await mkdir(dir,{recursive:true});
  const file=path.join(dir,`${role}-${subject}-${Date.now()}.txt`);
  await writeFile(file,`บัญชีทดสอบอิ่มใจ\nชื่อ: ${name}\nบทบาท: ${role}\nร้าน / ผู้ดูแล: ${subject}\nอีเมล: ${email}\nรหัสผ่านเริ่มต้น: ${password}\nเข้าสู่ระบบ: http://127.0.0.1:3000/${role}/login/\n`,{flag:'wx',mode:0o600});
  await client.query('COMMIT');console.log(`Created ${role} account. Initial credentials saved in ${file}`);
 }
}catch(e){await client.query('ROLLBACK');console.error('Account creation failed:',e.code??e.message);process.exitCode=1;}finally{await client.end();}
