"use client";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Construction,
  LayoutDashboard,
  LockKeyhole,
} from "lucide-react";
import { useState } from "react";
export function PhasePreview({
  title,
  phase,
  description,
  features,
}: {
  title: string;
  phase: number;
  description: string;
  features: string[];
}) {
  return (
    <section className="mx-auto max-w-lg py-8 sm:py-16">
      <span className="mb-6 grid size-16 place-items-center rounded-2xl bg-peach text-brand">
        <Construction size={29} strokeWidth={1.5} />
      </span>
      <p className="mb-2 text-[10px] font-semibold tracking-[2px] text-brand">
        เตรียมไว้สำหรับ PHASE {phase}
      </p>
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="mt-4 text-sm leading-7 text-muted">{description}</p>
      <div className="my-7 rounded-2xl border border-line bg-white p-5">
        <p className="mb-4 text-xs font-semibold">
          สิ่งที่จะเพิ่มในขั้นตอนถัดไป
        </p>
        {features.map((f) => (
          <p
            className="mt-3 flex items-start gap-3 text-xs leading-6 text-muted"
            key={f}
          >
            <span className="mt-1 size-3 shrink-0 rounded border border-line" />
            {f}
          </p>
        ))}
      </div>
      <p className="mb-5 text-[11px] leading-6 text-muted">
        Phase 1 ทดลองค้นหาร้าน ดูเมนู และจัดตะกร้าได้แล้ว
        ยังไม่มีการสร้างออเดอร์หรือชำระเงินจริง
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white"
      >
        <ArrowLeft size={16} />
        กลับไปเลือกอาหาร
      </Link>
    </section>
  );
}
const roleSections = {
  merchant: [
    "ภาพรวม",
    "ออเดอร์",
    "เมนูอาหาร",
    "ช่วงเวลารับ",
    "แชท",
    "ตั้งค่าร้าน",
  ],
  admin: [
    "ภาพรวม",
    "อนุมัติร้าน",
    "ผู้ใช้และร้านค้า",
    "ออเดอร์และปัญหา",
    "สิทธิ์แอดมิน",
  ],
};
export function RoleFoundation({ role }: { role: "merchant" | "admin" }) {
  const [tab, setTab] = useState("ภาพรวม");
  const phase = role === "merchant" ? 3 : 5;
  return (
    <>
      <p className="mb-2 text-[10px] font-semibold tracking-[2px] text-brand">
        โครงร่างพื้นที่ {role === "merchant" ? "ร้านอาหาร" : "แอดมิน"}
      </p>
      <h1 className="text-3xl font-bold">
        {role === "merchant" ? "จัดการร้านของคุณ" : "ดูแลชุมชนอิ่มใจ"}
      </h1>
      <p className="mt-3 text-xs leading-6 text-muted">
        ต้นแบบการนำทาง · ระบบจัดการจะเริ่มใน Phase {phase}
      </p>
      <div className="mt-7 flex flex-col gap-5 sm:flex-row">
        <nav
          aria-label="เมนูบทบาท"
          className="scrollbar-none flex shrink-0 gap-2 overflow-x-auto sm:w-40 sm:flex-col"
        >
          {roleSections[role].map((label) => (
            <button
              aria-current={label === tab ? "page" : undefined}
              onClick={() => setTab(label)}
              key={label}
              className={`flex min-h-11 shrink-0 items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-xs ${label === tab ? "bg-peach font-semibold text-brand" : "bg-white text-muted"}`}
            >
              {label}
              {label === tab && <ArrowRight size={12} />}
            </button>
          ))}
        </nav>
        <section className="min-w-0 flex-1 rounded-2xl border border-line bg-white p-6">
          <LayoutDashboard
            className="mb-5 text-brand"
            size={28}
            strokeWidth={1.5}
          />
          <h2 className="text-xl font-bold">{tab}</h2>
          <p className="mt-3 text-xs leading-7 text-muted">
            พื้นที่นี้เตรียมโครงร่างไว้สำหรับ Phase {phase}{" "}
            ข้อมูลและการจัดการจริงยังไม่เปิดใช้งาน
          </p>
          <div className="mt-6 flex items-start gap-2 rounded-xl bg-paper p-4 text-[10px] leading-6 text-muted">
            <LockKeyhole size={15} className="mt-1 shrink-0" />
            {role === "merchant"
              ? "ร้านต้องผ่านการอนุมัติก่อนเปิดขาย และยืนยันเงินเข้าด้วยตนเองก่อนเตรียมอาหาร"
              : "ไม่มีการสมัครแอดมินสาธารณะ และจำกัดข้อมูลส่วนบุคคลตามสิทธิ์ที่จำเป็น"}
          </div>
        </section>
      </div>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 text-xs text-brand"
      >
        <ArrowLeft size={14} />
        กลับพื้นที่ผู้ใช้บริการ
      </Link>
    </>
  );
}
