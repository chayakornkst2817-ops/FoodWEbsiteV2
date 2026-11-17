'use client';
import { useMerchantCatalog } from './merchant-catalog';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { ArrowLeft,ArrowRight,Clock3,MapPin,ShoppingBag } from 'lucide-react';
import { useCart } from './cart-provider';
import { useDemo,useNow } from './demo-provider';
import { Button,EmptyState,FoodImage } from './ui';
import { ErrorNotice,Field } from './account-pages';
import { ShopAcceptance } from './shop-acceptance';
import { baht,restaurants } from '@/lib/data';
import { cartTotal,resolveItem } from '@/lib/cart';
import { completeCheckout } from '@/lib/checkout-submit';
import { pickupClockFromParts } from '@/lib/pickup';
import { localDate } from '@/lib/orders';
export function Checkout(){
 const catalog=useMerchantCatalog(),cart=useCart(),demo=useDemo(),router=useRouter(),now=useNow();
 const [date,setDate]=useState(''),[hour,setHour]=useState(''),[minute,setMinute]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const time=pickupClockFromParts(hour,minute);
 const lock=useRef(false),submission=useRef<{fingerprint:string;key:string}|null>(null);
 if(!cart.ready||!demo.ready||now===null)return <p role="status" className="py-12 text-center text-sm text-muted">กำลังเตรียมข้อมูลออเดอร์…</p>;
 const restaurant=restaurants.find(r=>r.id===cart.items[0]?.restaurantId);
 if(!restaurant)return <EmptyState icon={<ShoppingBag size={30}/>} title="ตะกร้ายังว่างอยู่" description="เลือกเมนูที่ชอบก่อน แล้วกลับมาระบุเวลาที่ต้องการมารับ"><Link className="rounded-xl bg-brand px-5 py-3 text-sm text-white" href="/">เลือกอาหาร</Link></EmptyState>;
 const config=catalog.config(restaurant.id),selectedDate=date||localDate(now);
 return <div className="mx-auto max-w-3xl">
  <Link className="inline-flex items-center gap-2 text-xs text-muted" href={`/restaurants/${restaurant.id}/`}><ArrowLeft size={14}/>กลับไปเลือกเมนู</Link>
  <p className="mt-6 text-[10px] font-semibold tracking-[2px] text-brand">YOUR ORDER, YOUR TIME</p>
  <h1 className="mt-2 text-3xl font-bold">ยืนยันมื้ออร่อยของคุณ</h1>
  <p className="mt-3 mb-5 text-xs leading-6 text-muted">ระบุวันที่และเวลาที่ต้องการมารับให้ร้านทราบ ร้านเป็นผู้จัดลำดับการทำอาหารตามสถานการณ์</p>
  <ShopAcceptance open={restaurant.open} reopensAt={config.reopensAt}/>
  {!demo.account&&<div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand/20 bg-peach p-5"><p className="text-xs leading-6">เข้าสู่ระบบก่อนยืนยันออเดอร์<br/><span className="text-muted">ตะกร้าของคุณยังถูกเก็บไว้</span></p><Link href="/login/" className="rounded-xl bg-brand px-4 py-3 text-xs font-semibold text-white">เข้าสู่ระบบ →</Link></div>}
  <form className="mt-7 grid gap-6" onSubmit={async e=>{
   e.preventDefault();if(lock.current||!demo.account)return;
   const f=new FormData(e.currentTarget),phone=String(f.get('phone')),note=String(f.get('note')??'');
   const fingerprint=JSON.stringify({items:cart.items,date:selectedDate,time,phone,note});
   if(submission.current?.fingerprint!==fingerprint)submission.current={fingerprint,key:crypto.randomUUID()};
   lock.current=true;setBusy(true);setError('');
   try{
    const requestKey=submission.current.key;
    await completeCheckout(()=>demo.placeOrder(cart.items,selectedDate,time,phone,note,requestKey),cart.clearCart,url=>router.push(url));
   }catch(e){setError((e as Error).message);lock.current=false;setBusy(false);}
  }}>
   <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
    <h2 className="flex items-center gap-2 text-base font-bold"><MapPin size={18} className="text-brand"/>{restaurant.name}</h2>
    <p className="mt-2 text-xs text-muted">รับเองที่ {restaurant.location} · โรงอาหารกลาง</p>
    <div className="mt-5 divide-y divide-line">{cart.items.map(item=>{const info=resolveItem(item);return info&&<div className="flex items-center gap-3 py-4" key={item.key}><FoodImage className="size-14 shrink-0 rounded-xl" src={info.menu.image} alt={info.menu.name}/><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{info.menu.name} <span className="text-muted">×{item.quantity}</span></h3><p className="mt-1 text-xs text-muted">{info.options.map(o=>o.name).join(', ')||'สูตรปกติ'}</p></div><b className="text-sm">{baht(info.price*item.quantity)}</b></div>;})}</div>
    <Link href={`/restaurants/${restaurant.id}/`} className="text-xs text-brand">แก้ไขรายการ / จำนวนในตะกร้า →</Link>
   </section>
   <section className="space-y-5 rounded-2xl border border-line bg-white p-5 sm:p-6">
    <h2 className="flex items-center gap-2 text-base font-bold"><Clock3 size={18} className="text-brand"/>เวลาที่ต้องการมารับ</h2>
    <Field label="วันที่รับอาหาร" name="pickupDate" type="date" min={localDate(now)} value={selectedDate} required onChange={e=>setDate(e.target.value)}/>
    <fieldset className="space-y-3">
     <legend className="mb-3 text-xs font-medium">เวลาที่ต้องการมารับ (24 ชั่วโมง)</legend>
     <div className="grid grid-cols-2 gap-3">
      <Field label="ชั่วโมง (00–23)" name="pickupHour" type="text" inputMode="numeric" maxLength={2} pattern="(?:[01]?[0-9]|2[0-3])" placeholder="เช่น 14" value={hour} required aria-invalid={hour!=='' && Number(hour)>23} onChange={e=>setHour(e.target.value.replace(/[^0-9]/g,'').slice(0,2))} onBlur={()=>{if(hour!==''&&Number(hour)<24)setHour(hour.padStart(2,'0'));}}/>
      <Field label="นาที (00–59)" name="pickupMinute" type="text" inputMode="numeric" maxLength={2} pattern="[0-5]?[0-9]" placeholder="เช่น 10" value={minute} required aria-invalid={minute!=='' && Number(minute)>59} onChange={e=>setMinute(e.target.value.replace(/[^0-9]/g,'').slice(0,2))} onBlur={()=>{if(minute!==''&&Number(minute)<60)setMinute(minute.padStart(2,'0'));}}/>
     </div>
     {(Number(hour)>23||Number(minute)>59)&&<p role="alert" className="text-xs text-red-700">กรุณากรอกชั่วโมง 00–23 และนาที 00–59</p>}
     <p className="rounded-xl bg-paper p-3 text-sm font-semibold" aria-live="polite">{time?`เวลาที่เลือก: ${time} น.`:'กรอกชั่วโมงและนาทีที่ต้องการมารับ'}</p>
    </fieldset>
    <p className="text-[10px] leading-6 text-muted">ตัวอย่าง: บ่ายสองโมงสิบนาที กรอกชั่วโมง 14 และนาที 10 เลือกนาทีใดก็ได้ตามเวลาไทย โดยต้องไม่เป็นเวลาในอดีต</p>
   </section>
   <section className="space-y-5 rounded-2xl border border-line bg-white p-5 sm:p-6">
    <h2 className="text-base font-bold">ข้อมูลติดต่อและหมายเหตุ</h2>
    <Field key={demo.account?.id} label="เบอร์โทรติดต่อ" name="phone" type="tel" required defaultValue={demo.account?.phone??''} maxLength={10} placeholder="0891234567"/>
    <label className="block text-xs font-medium">หมายเหตุถึงร้าน (ไม่บังคับ)<textarea className="mt-2 min-h-24 w-full resize-y rounded-xl border border-line p-4 text-sm" name="note" maxLength={500} placeholder="เช่น ไม่ใส่หอม"/></label>
   </section>
   <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
    <div className="flex items-center justify-between text-lg font-bold"><span>ยอดรวม</span><span>{baht(cartTotal(cart.items))}</span></div>
    <p className="mt-3 text-xs leading-6 text-muted">หลังยืนยันสำเร็จ กรุณาแนบสลิปภายใน {demo.timeoutMinutes} นาที<br/>เวลาที่ระบุเป็นเวลาที่ต้องการมารับ ไม่ใช่การรับประกันเวลารอหรือสิทธิ์ลัดคิว</p>
    <ErrorNotice message={error}/>
    <Button className="mt-6 w-full" type="submit" disabled={!demo.account||!time||busy}>{busy?'กำลังตรวจสอบและสร้างออเดอร์…':'ยืนยันออเดอร์และไปหน้าชำระเงิน'}<ArrowRight size={17}/></Button>
   </section>
  </form>
 </div>;
}
