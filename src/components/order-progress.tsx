'use client';
import Link from 'next/link';
import {usePathname,useSearchParams} from 'next/navigation';
import {useEffect,useState} from 'react';
import {CheckCircle2,AlertCircle,ArrowRight} from 'lucide-react';
import {useDemo} from './demo-provider';
import {useCart} from './cart-provider';
import {statusLabels} from '@/lib/orders';
import {orderProgressSteps,progressIndex,selectProgressOrder} from '@/lib/order-progress';

export function OrderProgress(){
 const pathname=usePathname(),params=useSearchParams(),{orders,account}=useDemo(),{items}=useCart();
 const path=pathname.replace(/\/$/,'');
 const userId=account?.id??null;
 const [tracking,setTracking]=useState<{userId:string|null;id:string|null;ready:boolean}>({userId:null,id:null,ready:false});
 useEffect(()=>{let id:string|null=null;try{if(userId)id=sessionStorage.getItem('imjai-progress-'+userId);}catch{}setTracking({userId,id,ready:true});},[userId]);
 const requestedId=path==='/payment'?(params.get('order')??''):path==='/orders/detail'?(params.get('id')??''):path==='/chat'?(params.get('order')??''):null;
 const shopping=path===''||path==='/checkout'||path.startsWith('/restaurants/')||path==='/store';
 const order=selectProgressOrder({orders,userId,requestedId,trackedId:tracking.userId===userId?tracking.id:null,preferDraft:shopping&&items.length>0});
 useEffect(()=>{
  if(!userId||!order||!tracking.ready||tracking.userId!==userId||tracking.id===order.id)return;
  setTracking({userId,id:order.id,ready:true});try{sessionStorage.setItem('imjai-progress-'+userId,order.id);}catch{}
 },[userId,order?.id,tracking.userId,tracking.id,tracking.ready]);
 if(path.startsWith('/merchant')||path.startsWith('/admin')||(path==='/chat'&&params.has('shop'))||(requestedId!==null&&!order))return null;
 const draftCheckout=path==='/checkout'&&items.length>0;
 const active=progressIndex(order?.status,draftCheckout),cancelled=order?.status==='cancelled',issue=order?.status==='payment_issue',done=order?.status==='received';
 const activeOrders=orders.filter(o=>o.userId===userId&&!['received','cancelled'].includes(o.status));
 const selectable=order?[order,...activeOrders.filter(o=>o.id!==order.id)]:[];
 const message=cancelled?'ออเดอร์นี้ถูกยกเลิกแล้ว':issue?'กรุณาแก้ไขสลิปและส่งให้ร้านตรวจสอบอีกครั้ง':done?'รับอาหารเรียบร้อยแล้ว':order?.status==='ready'?'อาหารพร้อมแล้ว สามารถมารับที่ร้านได้':order?statusLabels[order.status]:draftCheckout?'ระบุเวลาที่ต้องการมารับและตรวจสอบรายการก่อนยืนยัน':'เลือกเมนูที่ต้องการสั่ง';
 const href=order?(['awaiting_payment','payment_issue'].includes(order.status)?'/payment/?order='+encodeURIComponent(order.id):'/orders/detail/?id='+encodeURIComponent(order.id)):null;
 return <section aria-label="ความคืบหน้าออเดอร์" className="mb-7 rounded-2xl border border-line bg-white p-4 sm:p-5">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div className="min-w-0 flex-1"><h2 className="text-sm font-bold">ความคืบหน้าออเดอร์</h2><p className={`mt-2 text-xs leading-6 ${cancelled||issue?'text-red-700':'text-muted'}`} role="status">{(cancelled||issue)&&<AlertCircle size={14} className="mr-1 inline"/>}{message}</p>{order&&<p className="mt-1 break-all text-[10px] text-muted">{order.restaurantName} · #{order.id}</p>}</div>
   {href&&<Link href={href} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-peach px-3 text-xs font-semibold text-brand">{issue?'แก้ไขสลิป':order?.status==='awaiting_payment'?'ไปชำระเงิน':'ดูรายละเอียด'}<ArrowRight size={13}/></Link>}
  </div>
  <div className="mt-5 overflow-x-auto pb-1">
   <ol aria-label="ขั้นตอนการสั่งอาหาร" className="grid min-w-[600px] grid-cols-7 gap-2">
    {orderProgressSteps.map((step,index)=>{
     const complete=done||index<active||(cancelled&&index<2),current=!cancelled&&index===active;
     return <li key={step.id} aria-current={current?'step':undefined} className="relative min-w-0">
      <div className="flex items-center"><span className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full text-xs ${complete||current?'bg-brand text-white':'bg-paper text-muted'}`}>{complete?<CheckCircle2 size={17}/>:index+1}</span>{index<orderProgressSteps.length-1&&<span aria-hidden="true" className={`h-px flex-1 ${complete?'bg-brand/40':'bg-line'}`}/>}</div>
      <span className={`mt-2 block pr-1 text-[10px] leading-5 ${current?'font-semibold text-brand':'text-muted'}`}>{step.label}</span>
     </li>;
    })}
   </ol>
  </div>
  {requestedId===null&&order&&selectable.length>1&&<label className="mt-4 block border-t border-line pt-4 text-xs text-muted">ออเดอร์ที่ติดตาม<select aria-label="ออเดอร์ที่ติดตาม" value={order.id} className="mt-2 block min-h-11 w-full rounded-xl border border-line bg-white px-3 text-xs text-ink" onChange={e=>{setTracking({userId,id:e.target.value,ready:true});try{sessionStorage.setItem('imjai-progress-'+userId,e.target.value);}catch{}}}>{selectable.map(o=><option key={o.id} value={o.id}>{o.restaurantName} · {o.id.slice(-8)} · {statusLabels[o.status]}</option>)}</select></label>}
  {!order&&activeOrders.length>0&&<Link href="/orders/" className="mt-3 inline-block text-xs text-brand">ดูออเดอร์ที่กำลังดำเนินการ {activeOrders.length} รายการ →</Link>}
 </section>;
}
