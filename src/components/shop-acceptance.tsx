'use client';
import { useEffect, useState } from 'react';
import { useMerchantCatalog } from './merchant-catalog';
import { Button } from './ui';
import { ErrorNotice, Field } from './account-pages';
import { formatReopensAt } from '@/lib/pickup';
export function ShopAcceptance({open,reopensAt}:{open:boolean;reopensAt?:string|null}){
 const reopening=!open?formatReopensAt(reopensAt):'';
 return <div className={`rounded-xl border p-4 text-xs leading-6 ${open?'border-line bg-sage-light text-sage':'border-amber-200 bg-amber-50 text-amber-900'}`} role="status">
  <p className="font-semibold">{open?'เปิดรับออเดอร์ออนไลน์':'พักรับออเดอร์ออนไลน์'}</p>
  {reopening&&<p>ร้านแจ้งเปิดรับอีกครั้ง: {reopening} น. (เวลาไทย)</p>}
 </div>;
}
export function AcceptanceControls({shopId}:{shopId:string}){
 const catalog=useMerchantCatalog(),config=catalog.config(shopId);
 const [reopening,setReopening]=useState(config.reopensAt??''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>setReopening(config.reopensAt??''),[config.reopensAt,shopId]);
 async function change(open:boolean){setBusy(true);setError('');try{await catalog.setAcceptance(shopId,open,open?null:reopening||null);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="my-5 space-y-4 rounded-2xl border border-line bg-white p-5">
  <h2 className="font-bold">การรับออเดอร์ออนไลน์</h2>
  <ShopAcceptance open={config.open} reopensAt={config.reopensAt}/>
  <p className="text-xs leading-6 text-muted">พักรับเฉพาะออเดอร์ออนไลน์ใหม่ ร้านยังขายหน้าร้านและดำเนินการออเดอร์ที่รับไว้แล้วต่อได้ตามปกติ</p>
  <Field label="วันเวลาเปิดรับอีกครั้งที่ร้านต้องการแจ้ง (ไม่บังคับ · เวลาไทย)" type="datetime-local" lang="en-GB" step={60} value={reopening} onChange={e=>setReopening(e.target.value)} disabled={busy}/>
  <p className="text-[10px] leading-5 text-muted">ระบุเฉพาะเมื่อทราบจริง ช่องนี้ใช้แจ้งลูกค้าเท่านั้น ร้านเป็นผู้กดเปิดรับอีกครั้งเอง</p>
  <ErrorNotice message={error}/>
  <div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={()=>change(true)}>เปิดรับออเดอร์</Button><Button variant="secondary" disabled={busy} onClick={()=>change(false)}>{busy?'กำลังบันทึก…':'พักรับออเดอร์'}</Button></div>
 </section>;
}
