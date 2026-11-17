"use client";
import {AuthLayout,isAuthPage} from "./auth-layout";
import {OrderProgress} from "./order-progress";
import { unread } from "@/lib/collaboration";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  ChevronDown,
  ClipboardList,
  Home,
  MapPin,
  ShoppingBag,
  Sparkles,
  Store,
  UserRound,
  Utensils,
  X,
} from "lucide-react";
import { Suspense, useState, type ReactNode } from "react";
import { useCart } from "./cart-provider";
import { CartPanel } from "./cart-panel";
import { Modal } from "./ui";
import { useDemo } from "./demo-provider";
import {useGovernance} from "./governance-provider";
import {useMerchantCatalog} from "./merchant-catalog";

const customerNav = [
  { href: "/", label: "หน้าแรก", icon: Home },
  { href: "/orders/", label: "ออเดอร์ของฉัน", icon: ClipboardList },
  { href: "/profile/", label: "โปรไฟล์", icon: UserRound },
];
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isMerchantPage = pathname === "/merchant" || pathname.startsWith("/merchant/");
  const { account, orders, ready: accountReady } = useDemo();
  const {ready: governanceReady} = useGovernance();
  const {revision: catalogRevision} = useMerchantCatalog();
  const unreadTotal = orders.reduce((n, o) => n + unread(o, "customer"), 0);
  const { items, mobileOpen, setMobileOpen, ready: cartReady } = useCart();
  const appReady = accountReady && governanceReady && cartReady && catalogRevision > 0;
  const [rolesOpen, setRolesOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const count = items.reduce((sum, x) => sum + x.quantity, 0);
  const isHome = pathname === "/" || (pathname.startsWith("/restaurants") || pathname.startsWith("/store"));
  if (isAuthPage(pathname)) return <AuthLayout>{children}</AuthLayout>;
  return (
    <>
      {!isMerchantPage && <aside className="fixed inset-y-0 left-0 z-30 hidden w-[88px] flex-col border-r border-line bg-white px-4 py-8 md:flex xl:w-[216px] xl:px-6">
        <Link
          href="/"
          aria-label="อิ่มใจ หน้าแรก"
          className="flex items-center gap-3"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-[17px_17px_17px_5px] bg-brand text-white">
            <Utensils size={24} strokeWidth={1.8} />
          </span>
          <span className="hidden text-[27px] leading-8 font-extrabold tracking-tight xl:block">
            อิ่มใจ
            <small className="block text-[8px] font-medium tracking-[2.4px] text-muted">
              IMJAI CAMPUS
            </small>
          </span>
        </Link>
        <p className="mt-12 mb-4 hidden pl-3 text-[10px] text-muted xl:block">
          มื้อดี ๆ เริ่มที่นี่
        </p>
        <nav className="mt-10 space-y-2 xl:mt-0" aria-label="เมนูหลัก">
          {customerNav.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? isHome : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                title={label}
                className={`flex min-h-12 items-center justify-center gap-3 rounded-xl text-xs transition xl:justify-start xl:px-4 ${active ? "bg-peach font-semibold text-brand" : "text-muted hover:bg-paper hover:text-ink"}`}
              >
                <Icon size={19} strokeWidth={1.7} />
                <span className="hidden xl:block">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto">
          <div className="mb-4 hidden rounded-2xl bg-[#f6f4ec] p-4 xl:block">
            <Sparkles className="mb-3 text-brand" size={27} strokeWidth={1.4} />
            <p className="text-sm leading-6 font-semibold">
              สั่งไว้ก่อน
              <br />
              พักเที่ยงก็อิ่มได้เลย
            </p>
            <p className="mt-3 text-[10px] leading-5 text-muted">
              รับอาหารเองที่ร้าน
              <br />
              ไม่ต้องเสียเวลารอคิว
            </p>
          </div>
          <button
            onClick={() => setRolesOpen(true)}
            title="สำหรับร้านและแอดมิน"
            className="flex w-full items-center justify-center gap-2 py-4 text-[10px] text-muted xl:justify-between"
          >
            <span className="hidden xl:block">สำหรับร้านและแอดมิน</span>
            <Store size={17} className="xl:hidden" />
            <ArrowUpRight size={13} className="hidden xl:block" />
          </button>
          <p className="hidden text-[9px] text-muted/70 xl:block">
            ต้นแบบ UI · Phase 6
          </p>
        </div>
      </aside>}
      <div className={isMerchantPage ? "" : "md:ml-[88px] xl:ml-[216px]"}>
        <header className="flex h-[80px] items-center justify-between border-b border-line bg-white px-5 md:h-[88px] md:px-8">
          <button
            onClick={() => setLocationOpen(true)}
            className="flex items-center gap-3 text-left"
          >
            <span className="grid size-10 place-items-center rounded-full bg-peach text-brand">
              <MapPin size={19} strokeWidth={1.7} />
            </span>
            <span>
              <small className="block text-[9px] text-muted">
                จุดรับอาหารของคุณ
              </small>
              <span className="mt-1 flex items-center gap-3 text-[11px] font-semibold">
                โรงอาหารกลาง วิทยาลัย
                <ChevronDown size={12} />
              </span>
            </span>
          </button>
          <div className="flex items-center gap-5">
            {unreadTotal > 0 && (
              <Link
                href="/orders/"
                className="rounded-full bg-peach px-3 py-2 text-[10px] text-brand"
                role="status"
              >
                ข้อความใหม่ {unreadTotal}
              </Link>
            )}
            <span className="hidden text-[10px] text-muted sm:block">
              มื้อดี ๆ ในทุกวันเรียน
            </span>
            <Link
              href="/profile/"
              aria-label="เปิดโปรไฟล์"
              className="grid size-9 place-items-center rounded-full bg-[#eee8da] text-xs font-semibold"
            >
              {account?.name.slice(0, 1) ?? <UserRound size={16} />}
            </Link>
            <button
              onClick={() => setRolesOpen(true)}
              aria-label="เลือกบทบาทผู้ใช้"
              className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-paper"
            >
              <Store size={17} />
            </button>
            <button
              className={`relative grid size-9 place-items-center text-brand ${isHome ? "lg:hidden" : ""}`}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={`เปิดตะกร้า ${count} รายการ`}
            >
              <ShoppingBag size={21} />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[9px] text-white">
                  {count}
                </span>
              )}
            </button>
          </div>
        </header>
        <div className="mx-auto flex max-w-[1600px] items-start">
          <main className="min-w-0 flex-1 px-5 pt-7 pb-28 md:px-8 md:pt-8 lg:pb-14 2xl:px-12">
            {appReady ? <>{!isHome && <Suspense fallback={null}><OrderProgress/></Suspense>}{children}</> : <p role="status" className="py-12 text-center text-sm text-muted">กำลังเตรียมข้อมูลเว็บไซต์…</p>}
          </main>
          <CartPanel showDesktop={isHome} />
        </div>
      </div>
      <nav
        aria-label="เมนูบนมือถือ"
        className="fixed inset-x-0 bottom-0 z-50 flex h-[76px] items-center justify-around border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        {customerNav.slice(0, 2).map(({ href, label, icon: Icon }) => (
          <Link
            onClick={() => setMobileOpen(false)}
            key={href}
            href={href}
            className={`flex min-h-12 min-w-16 flex-col items-center justify-center gap-1 text-[9px] ${!mobileOpen && (href === "/" ? isHome : pathname.startsWith(href)) ? "text-brand" : "text-muted"}`}
          >
            <Icon size={21} strokeWidth={1.7} />
            {label}
          </Link>
        ))}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          className={`relative flex min-h-12 min-w-16 flex-col items-center justify-center gap-1 text-[9px] ${mobileOpen ? "text-brand" : "text-muted"}`}
        >
          {mobileOpen ? (
            <X size={21} />
          ) : (
            <ShoppingBag size={21} strokeWidth={1.7} />
          )}
          ตะกร้า
          {count > 0 && (
            <span className="absolute top-0 right-2 grid size-4 place-items-center rounded-full bg-brand text-[8px] text-white">
              {count}
            </span>
          )}
        </button>
        <Link
          onClick={() => setMobileOpen(false)}
          href="/profile/"
          className={`flex min-h-12 min-w-16 flex-col items-center justify-center gap-1 text-[9px] ${pathname.startsWith("/profile") ? "text-brand" : "text-muted"}`}
        >
          <UserRound size={21} strokeWidth={1.7} />
          โปรไฟล์
        </Link>
      </nav>
      <Modal
        open={rolesOpen}
        onClose={() => setRolesOpen(false)}
        title="เลือกพื้นที่ใช้งาน"
      >
        <div className="p-7 pt-12">
          <p className="mb-2 text-[10px] font-semibold tracking-[2px] text-brand">
            พื้นที่สำหรับแต่ละบทบาท
          </p>
          <h2 className="text-2xl font-bold">เลือกพื้นที่ใช้งาน</h2>
          <p className="mt-2 text-xs leading-6 text-muted">
            โครงนำทางสำหรับต้นแบบ ส่วนจัดการจะทยอยเพิ่มตาม Phase
          </p>
          <div className="mt-6 space-y-3">
            {[
              {
                href: "/",
                name: "ผู้ใช้บริการ",
                sub: "สั่งอาหาร แนบสลิป และติดตามออเดอร์ · Phase 2",
              },
              {
                href: "/merchant/",
                name: "ร้านอาหาร",
                sub: "ตรวจเงิน จัดการเมนู และส่งมอบอาหาร · Phase 3",
              },
              {
                href: "/admin/",
                name: "แอดมิน",
                sub: "ตรวจคำขอร้าน บัญชี ออเดอร์ และสิทธิ์ · Phase 6",
              },
            ].map((r) => (
              <Link
                href={r.href}
                key={r.href}
                onClick={() => {
                  setRolesOpen(false);
                  setMobileOpen(false);
                }}
                className="flex items-center justify-between rounded-xl border border-line p-4 transition hover:border-brand"
              >
                <span className="text-sm font-semibold">
                  {r.name}
                  <small className="mt-1 block text-[10px] font-normal text-muted">
                    {r.sub}
                  </small>
                </span>
                <ArrowUpRight size={16} className="text-brand" />
              </Link>
            ))}
          </div>
        </div>
      </Modal>
      <Modal
        open={locationOpen}
        onClose={() => setLocationOpen(false)}
        title="จุดรับอาหาร"
      >
        <div className="p-7 pt-12">
          <MapPin size={27} className="mb-4 text-brand" />
          <h2 className="text-2xl font-bold">รับเองที่โรงอาหารกลาง</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            เลือกร้านในวิทยาลัย แล้วมารับที่ล็อกของร้านตามเวลาที่เลือก
            เว็บไซต์นี้รองรับการสั่งล่วงหน้าและรับอาหารเองเท่านั้น
          </p>
          <p className="mt-4 rounded-xl bg-paper p-4 text-xs leading-6 text-muted">
            สถานที่และร้านทั้งหมดเป็นข้อมูลตัวอย่างสำหรับต้นแบบ
          </p>
        </div>
      </Modal>
    </>
  );
}
