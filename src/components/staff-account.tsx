'use client';
import { useState } from 'react';
import { Field, ErrorNotice } from './account-pages';
import { Button } from './ui';
import { clearIdentityCache } from '@/lib/database-client';
export function StaffAccount({email}:{email:string}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function leave(){await fetch('/api/auth/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});clearIdentityCache();window.location.assign('/merchant/login/');}
 return <div className="my-5 rounded-xl border border-line bg-white p-4 text-xs">
  <div className="flex flex-wrap items-center justify-between gap-3"><span>บัญชีร้าน: {email}</span><div className="flex gap-4"><button className="text-brand" onClick={()=>setOpen(!open)}>เปลี่ยนรหัสผ่าน</button><button className="text-brand" onClick={leave}>ออกจากระบบร้าน</button></div></div>
  {open&&<form className="mt-5 space-y-4" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setError('');if(f.get('password')!==f.get('confirm')){setError('ยืนยันรหัสผ่านไม่ตรงกัน');return;}setBusy(true);try{
   const r=await fetch('/api/auth/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'password',current:f.get('current'),password:f.get('password')})});const b=await r.json();if(!r.ok)throw Error(b.error);clearIdentityCache();window.location.assign('/merchant/login/');
  }catch(e){setError((e as Error).message);setBusy(false);}}}><ErrorNotice message={error}/><Field name="current" label="รหัสผ่านปัจจุบัน" type="password" autoComplete="current-password" required/><Field name="password" label="รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)" type="password" minLength={8} maxLength={128} autoComplete="new-password" required/><Field name="confirm" label="ยืนยันรหัสผ่านใหม่" type="password" minLength={8} autoComplete="new-password" required/><Button disabled={busy}>บันทึกและเข้าสู่ระบบใหม่</Button></form>}
 </div>;
}
