"use client";
import {usePathname} from "next/navigation";
import {isAuthPage} from "./auth-layout";
import { useEffect, useState, type ReactNode } from "react";
import { bootstrapDatabase, databaseStatus, refreshDatabase, retryDatabaseWrites, subscribeDatabase } from "@/lib/database-client";

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const pathname=usePathname();
  const authPage=isAuthPage(pathname);
  const isMerchantPage=pathname === "/merchant" || pathname.startsWith("/merchant/");
  const [ready, setReady] = useState(false), [error, setError] = useState(""), [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState(databaseStatus);
  useEffect(() => subscribeDatabase(setStatus), []);
  useEffect(() => { const changed=(event:StorageEvent)=>{if(event.key==="imjai-auth-change")window.location.reload();};window.addEventListener("storage",changed);return ()=>window.removeEventListener("storage",changed); }, []);
  useEffect(() => {
    let cancelled = false;
    setError("");
    bootstrapDatabase().then(() => { if (!cancelled) setReady(true); }).catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [attempt]);
  useEffect(() => {
    if (!ready) return;
    const refresh = () => { refreshDatabase().catch(() => {}); };
    const interval = setInterval(refresh, 5000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, [ready]);
  if (!ready) return <main className="mx-auto my-16 max-w-lg rounded-2xl border border-line bg-white p-7">
    <h1 className="text-2xl font-bold">อิ่มใจ · ฐานข้อมูลในเครื่อง</h1>
    {error ? <><p role="alert" className="my-5 text-sm leading-7 text-red-700">{error}</p><p className="text-xs leading-7 text-muted">เปิด PostgreSQL แล้วรัน npm run db:migrate ก่อนเริ่มเว็บ</p><button className="mt-5 rounded-xl bg-brand px-5 py-3 text-sm text-white" onClick={() => setAttempt(n => n + 1)}>ลองเชื่อมต่อใหม่</button></> : <p role="status" className="mt-5 text-sm text-muted">กำลังเชื่อมต่อ PostgreSQL…</p>}
  </main>;
  if(authPage)return <>{children}</>;
  return <>{children}<div className={`fixed bottom-20 left-3 z-[90] max-w-[90vw] rounded-xl border bg-white px-3 py-2 text-[10px] shadow-sm md:bottom-3 ${isMerchantPage ? "" : "md:left-[100px] xl:left-[228px]"} ${status.error ? "border-red-300 text-red-700" : "border-line text-sage"}`} role="status">
    {status.error ? <><p>ยังบันทึกฐานข้อมูลไม่สำเร็จ: {status.error}</p>{status.conflict ? <button className="mt-2 underline" onClick={() => window.location.reload()}>โหลดข้อมูลล่าสุด (ยกเลิกการแก้ที่ยังบันทึกไม่ได้)</button> : <button className="mt-2 underline" onClick={() => retryDatabaseWrites()}>ลองบันทึกใหม่</button>}</> : status.pending ? "กำลังบันทึก PostgreSQL…" : "PostgreSQL · บันทึกแล้ว"}
  </div></>;
}
