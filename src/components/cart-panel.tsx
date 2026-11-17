"use client";
import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  MapPin,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { baht, restaurants } from "@/lib/data";
import { cartTotal, resolveItem } from "@/lib/cart";
import { useCart } from "./cart-provider";
import { Button, EmptyState, FoodImage, Quantity } from "./ui";

export function CartPanel({ showDesktop = true }: { showDesktop?: boolean }) {
  const {
    items,
    ready,
    mobileOpen,
    setMobileOpen,
    changeQuantity,
    removeItem,
  } = useCart();
  const count = items.reduce((sum, x) => sum + x.quantity, 0);
  const restaurant = restaurants.find((r) => r.id === items[0]?.restaurantId);
  return (
    <aside
      aria-label="ตะกร้าของฉัน"
      className={`${mobileOpen ? "fixed inset-x-0 top-0 bottom-[76px] z-40 block overflow-y-auto" : "hidden"} border-l border-line bg-white p-6 ${showDesktop ? 'lg:sticky lg:top-0 lg:block lg:max-h-screen lg:min-h-[calc(100vh-88px)] lg:w-[290px] lg:overflow-y-auto xl:w-[316px] xl:p-7' : ''}`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">ตะกร้าของฉัน</h2>
        <span className="ml-auto rounded-md bg-peach px-2 py-1 text-[10px] font-semibold text-brand">
          {count} รายการ
        </span>
        <button
          onClick={() => setMobileOpen(false)}
          className={`ml-3 grid size-9 place-items-center ${showDesktop ? 'lg:hidden' : ''}`}
          aria-label="ปิดตะกร้า"
        >
          <X size={20} />
        </button>
      </div>
      <div className="my-6 rounded-xl border border-line bg-paper p-4">
        <p className="flex items-center gap-2 text-[10px] text-muted">
          <MapPin size={13} className="text-brand" />
          รับอาหารเองที่ร้าน
        </p>
        <p className="mt-2 text-xs font-semibold">
          {restaurant?.name ?? "โรงอาหารกลาง วิทยาลัย"}
        </p>
        <p className="mt-1 text-[10px] text-muted">
          เลือกเวลารับได้ก่อนยืนยันออเดอร์
        </p>
      </div>
      {!ready ? (
        <div
          role="status"
          aria-label="กำลังโหลดตะกร้า"
          className="animate-pulse space-y-4 py-10"
        >
          <div className="h-14 rounded-xl bg-paper" />
          <div className="h-14 rounded-xl bg-paper" />
        </div>
      ) : !items.length ? (
        <EmptyState
          icon={<ShoppingBag size={31} strokeWidth={1.3} />}
          title="มื้ออร่อยกำลังรอคุณ"
          description="เลือกร้านที่ชอบ แล้วเพิ่มเมนูลงตะกร้า เริ่มต้นมื้อดี ๆ ได้เลย"
        />
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const info = resolveItem(item);
            if (!info) return null;
            const others = items
              .filter((x) => x.menuId === item.menuId && x.key !== item.key)
              .reduce((sum, x) => sum + x.quantity, 0);
            return (
              <div
                key={item.key}
                className="flex gap-3 border-b border-line pb-4"
              >
                <FoodImage
                  src={info.menu.image}
                  alt={info.menu.name}
                  className="size-13 shrink-0 rounded-lg"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <h3 className="text-xs font-semibold">{info.menu.name}</h3>
                    <b className="text-xs tabular-nums">
                      {baht(info.price * item.quantity)}
                    </b>
                  </div>
                  <p className="mt-1 text-[10px] text-muted">
                    {info.options.map((o) => o.name).join(", ") || "สูตรปกติ"}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <Quantity
                      value={item.quantity}
                      min={0}
                      max={info.menu.stock - others}
                      onChange={(n) => changeQuantity(item.key, n)}
                      label={info.menu.name}
                    />
                    <button
                      onClick={() => removeItem(item.key)}
                      aria-label={`ลบ ${info.menu.name}`}
                      className="grid size-9 place-items-center text-muted hover:text-brand"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-6 border-t border-line pt-5">
        <div className="flex justify-between text-xs text-muted">
          <span>ค่าอาหาร</span>
          <span className="tabular-nums">{baht(cartTotal(items))}</span>
        </div>
        <div className="mt-3 flex justify-between text-xs text-muted">
          <span>รูปแบบการรับ</span>
          <span>รับเองที่ร้าน</span>
        </div>
        <div className="my-6 flex justify-between font-bold">
          <span>ยอดรวม</span>
          <span className="tabular-nums">{baht(cartTotal(items))}</span>
        </div>
        {items.length ? (
          <Link
            href="/checkout/"
            onClick={() => setMobileOpen(false)}
            className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-brand text-xs font-semibold text-white transition hover:bg-brand-dark"
          >
            ไปเลือกเวลารับ <ArrowRight size={15} />
          </Link>
        ) : (
          <Button disabled className="w-full text-xs">
            ไปเลือกเวลารับ <ArrowRight size={15} />
          </Button>
        )}
        <p className="mt-3 text-center text-[10px] leading-5 text-muted">
          เลือกเวลารับและยืนยันออเดอร์ได้ในขั้นตอนถัดไป
          <br />
          ต้นแบบสำหรับทดลอง · ไม่มีการโอนเงินจริง
        </p>
      </div>
      <div className="mt-8 border-t border-line pt-5">
        <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold">
          <Clock3 size={14} className="text-brand" />
          มื้ออร่อย ใน 3 ขั้นตอน
        </h3>
        {[
          "เลือกร้านและเมนูที่ชอบ",
          "เลือกเวลารับและแนบสลิป",
          "รอร้านเตรียม แล้วมารับได้เลย",
        ].map((label, i) => (
          <p
            key={label}
            className="mb-3 flex items-center gap-3 text-[10px] text-muted"
          >
            <span className="grid size-5 shrink-0 place-items-center rounded-full border border-line text-[9px]">
              {i + 1}
            </span>
            {label}
          </p>
        ))}
      </div>
    </aside>
  );
}
