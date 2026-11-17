'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Field, ErrorNotice } from './account-pages';
import { Button } from './ui';
import { clearIdentityCache } from '@/lib/database-client';
export function StaffLogin({role='merchant'}:{role?:'merchant'|'admin'}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 return <section className="mx-auto w-full max-w-md">
  <p className="mb-3 text-xs font-semibold tracking-widest text-brand">IMJAI {role==='merchant'?'MERCHANT':'ADMIN'}</p>
  <h1 className="text-3xl font-bold">เข้าสู่ระบบ{role==='merchant'?'ร้านอาหาร':'แอดมิน'}</h1>
  <p className="mt-3 text-xs leading-6 text-muted">{role==='merchant'?'ใช้บัญชีของร้านเพื่อจัดการออเดอร์ เมนู และข้อมูลร้านของคุณ':'ใช้บัญชีและรหัสผ่านของแอดมิน'}</p>
  <ErrorNotice message={error}/>
  <form className="mt-6 space-y-5" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{
   const f=new FormData(e.currentTarget);const response=await fetch('/api/auth/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'login',role,email:f.get('email'),password:f.get('password')})});
   const body=await response.json();if(!response.ok)throw Error(body.error);
   clearIdentityCache();window.location.assign(role==='merchant'?'/merchant/':'/admin/');
  }catch(e){setError((e as Error).message);setBusy(false);}}}>
   <Field label="อีเมล" name="email" type="email" autoComplete="username" required/>
   <Field label="รหัสผ่าน" name="password" type="password" autoComplete="current-password" required minLength={8} maxLength={128}/>
   <Button className="w-full" disabled={busy}>{busy?'กำลังเข้าสู่ระบบ…':'เข้าสู่ระบบ'}</Button>
  </form>
  <p className="mt-5 text-xs leading-6 text-muted">ขณะนี้ผู้ดูแลเป็นผู้สร้างบัญชีให้ร้าน กรุณาติดต่อผู้ดูแลหากยังไม่มีบัญชี</p>

 </section>;
}
