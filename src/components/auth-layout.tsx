"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Utensils, GraduationCap, Store, ArrowLeft, Clock3 } from "lucide-react";
import type { ReactNode } from "react";
import { FoodImage } from "./ui";

export const isAuthPage = (path: string) => ["/login", "/register", "/forgot-password", "/reset-password", "/merchant/login", "/admin/login"].includes(path.replace(/\/$/, ""));
export function AuthLayout({ children }: { children: ReactNode }) {
 const pathname = usePathname();
 const merchant = pathname.startsWith("/merchant/");
 const admin = pathname.startsWith("/admin/");
 return <main className="flex min-h-dvh items-center justify-center bg-paper px-4 py-6 sm:px-8 sm:py-10">
  <div className="grid w-full max-w-6xl overflow-hidden rounded-[28px] border border-line bg-white shadow-[0_20px_80px_-35px_rgba(67,52,35,0.18)] lg:grid-cols-2">
   <section className="relative flex flex-col bg-peach p-7 sm:p-10 lg:p-12">
    <Link href="/" aria-label="อิ่มใจ หน้าแรก" className="inline-flex w-fit items-center gap-3">
     <span className="grid size-12 place-items-center rounded-[16px_16px_16px_5px] bg-brand text-white"><Utensils size={25}/></span>
     <span className="text-2xl font-extrabold">อิ่มใจ<small className="mt-0.5 block text-[9px] font-medium tracking-[2px] text-muted">IMJAI CAMPUS</small></span>
    </Link>
    <div className="my-auto pt-7 lg:pt-12">
     <p className="text-xs font-medium text-brand">มื้อดี ๆ ในทุกวันเรียน</p>
     <h2 className="mt-4 text-3xl leading-snug font-bold sm:text-4xl lg:text-[44px]">{merchant ? <>ร้านของคุณ<br/>จัดการได้ในที่เดียว</> : admin ? <>ดูแลอิ่มใจ<br/>ให้ทุกมื้อราบรื่น</> : <>สั่งไว้ก่อน<br/>พักเที่ยงก็อิ่มได้เลย</>}</h2>
     <p className="mt-4 max-w-sm text-sm leading-7 text-muted">{merchant ? "จัดการเมนู ตรวจออเดอร์ และเตรียมอาหารให้พร้อมรับ ด้วยบัญชีของร้านคุณ" : admin ? "เข้าสู่ระบบเพื่อดูแลร้านค้าและการให้บริการภายในวิทยาลัย" : "เลือกร้านที่ชอบ สั่งอาหารล่วงหน้า แล้วมารับที่ร้านตามเวลาที่เลือก"}</p>
    </div>
    <div className="relative mt-9 hidden overflow-hidden rounded-2xl lg:block">
     <FoodImage src="/images/thai.jpg" alt="อาหารพร้อมรับจากร้านในวิทยาลัย" className="h-52"/>
     <div className="absolute right-3 bottom-3 left-3 flex items-center gap-2 rounded-xl bg-white/95 p-3 text-xs"><Clock3 size={18} className="text-brand"/>มื้ออร่อย พร้อมรับตรงเวลา</div>
    </div>
   </section>
   <section className="flex flex-col px-6 py-8 sm:px-10 sm:py-10 lg:px-12">
    {!admin && <nav aria-label="ประเภทบัญชี" className="mb-8 grid grid-cols-2 gap-1 rounded-xl bg-paper p-1">
     {[{href:"/login/",label:"นักเรียน / ครู",icon:GraduationCap,active:!merchant},{href:"/merchant/login/",label:"ร้านอาหาร",icon:Store,active:merchant}].map(({href,label,icon:Icon,active})=><Link key={href} href={href} aria-current={active?"page":undefined} className={`flex min-h-12 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold transition ${active?"bg-white text-brand shadow-sm":"text-muted hover:text-ink"}`}><Icon size={17}/>{label}</Link>)}
    </nav>}
    <div className="my-auto">{children}</div>
    <Link href="/" className="mt-7 inline-flex w-fit items-center gap-2 text-xs text-muted hover:text-brand"><ArrowLeft size={14}/>กลับหน้าแรก</Link>
   </section>
  </div>
 </main>;
}
