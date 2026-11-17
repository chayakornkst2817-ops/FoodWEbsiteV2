"use client";
import {shopAccess} from "@/lib/governance";
import {useGovernance} from "./governance-provider";
import { useMerchantCatalog } from "./merchant-catalog";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Beef,
  Check,
  ChefHat,
  Clock3,
  Coffee,
  CookingPot,
  Leaf,
  Search,
  SlidersHorizontal,
  Soup,
  Sun,
  Utensils,
  X,
} from "lucide-react";
import {
  baht,
  categories,
  foodImages,
  restaurants,
  type Category,
  type Restaurant,
} from "@/lib/data";
import { Button, EmptyState, FoodImage } from "./ui";
const categoryIcons = {
  ทั้งหมด: Utensils,
  อาหารตามสั่ง: CookingPot,
  ก๋วยเตี๋ยว: Soup,
  อาหารสุขภาพ: Leaf,
  ทานเล่น: Beef,
  เครื่องดื่ม: Coffee,
};
function RestaurantCard({ restaurant: r }: { restaurant: Restaurant }) {
  return (
    <Link
      href={r.registered?`/store/?id=${encodeURIComponent(r.id)}`:`/restaurants/${r.id}/`}
      className="group overflow-hidden rounded-2xl border border-line bg-white transition duration-200 hover:-translate-y-1 hover:shadow-[0_12px_28px_#302c2110]"
    >
      <div className="relative">
        <FoodImage
          src={r.image}
          alt={`อาหารจากร้าน${r.name}`}
          className={`h-36 sm:h-44 lg:h-36 xl:h-40 2xl:h-48 ${!r.open ? "saturate-70" : ""}`}
        />
        <span className="absolute top-3 left-3 rounded-md bg-white/95 px-2 py-1.5 text-[9px] font-medium shadow-sm">
          {r.tag}
        </span>
        <span className="absolute right-3 bottom-3 rounded-md bg-ink/80 px-2 py-1 text-[9px] text-white backdrop-blur">
          {r.location}
        </span>
      </div>
      <div className="p-3.5 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold transition group-hover:text-brand">
            {r.name}
          </h3>
          <ArrowUpRight
            size={14}
            className="shrink-0 text-muted/50 transition group-hover:text-brand"
          />
        </div>
        <p className="mt-1 truncate text-[10px] text-muted">{r.description}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[9px]">
          <span
            className={`flex items-center gap-1.5 ${r.open ? "text-sage" : "text-muted"}`}
          >
            <span
              className={`size-1.5 rounded-full ${r.open ? "bg-sage" : "bg-muted/60"}`}
            />
            {r.open ? "เปิดรับออเดอร์" : "ปิดรับออเดอร์"}
          </span>
          <span className="text-muted">
            {r.menus.length ? `เริ่ม ${baht(Math.min(...r.menus.map((m) => m.price)))}` : "กำลังจัดเตรียมเมนู"}
          </span>
        </div>

      </div>
    </Link>
  );
}
export function Catalog() {
  const { revision } = useMerchantCatalog();
 const governance=useGovernance();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("ทั้งหมด");
  const [openOnly, setOpenOnly] = useState(false);
  const list = useMemo(
    () =>
      restaurants.filter(
        (r) =>
          (shopAccess[r.id]?.approved ?? !r.registered) &&
          (!openOnly || r.open) &&
          (category === "ทั้งหมด" || r.category === category) &&
          `${r.name} ${r.description} ${r.menus.map((m) => m.name).join(" ")}`
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
      ),
    [search, category, openOnly, revision, governance.state],
  );
  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="mb-2 text-[9px] font-semibold tracking-[2px] text-brand">
            GOOD FOOD, GOOD DAY
          </p>
          <h1 className="flex items-center gap-3 text-[26px] leading-tight font-bold tracking-tight sm:text-3xl">
            วันนี้ อยากกินอะไรดี
            <Sun
              size={25}
              className="shrink-0 text-[#dc9c4c]"
              strokeWidth={1.5}
            />
          </h1>
          <p className="mt-2 text-[11px] text-muted">
            มื้ออร่อยจากร้านโปรด สั่งไว้แล้วไปรับได้เลย
          </p>
        </div>
        <span className="hidden items-center gap-1.5 whitespace-nowrap rounded-full bg-sage-light px-3 py-2 text-[9px] text-sage 2xl:flex">
          <span className="size-1 rounded-full bg-sage" />
          โรงอาหารเปิดให้บริการ
        </span>
      </div>
      <div className="mb-6 flex min-h-12 items-center gap-3 rounded-xl border border-[#e7e7df] bg-white px-4">
        <Search size={17} className="shrink-0 text-muted" />
        <input
          aria-label="ค้นหาร้านอาหารหรือเมนู"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาร้านอาหาร หรือเมนูที่อยากกิน..."
          className="min-w-0 flex-1 bg-transparent py-3 text-xs outline-none! placeholder:text-muted/65"
        />
        {search && (
          <button
            aria-label="ล้างคำค้นหา"
            className="grid size-8 place-items-center text-muted"
            onClick={() => setSearch("")}
          >
            <X size={14} />
          </button>
        )}
        <span className="h-5 border-l border-line" />
        <button
          aria-label="แสดงเฉพาะร้านที่เปิดรับออเดอร์"
          aria-pressed={openOnly}
          onClick={() => setOpenOnly(!openOnly)}
          className={`grid size-8 place-items-center rounded-lg transition ${openOnly ? "bg-peach text-brand" : "text-muted hover:bg-paper"}`}
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>
      <section
        className="relative isolate mb-8 min-h-[242px] overflow-hidden rounded-[22px] bg-[#f3e8d8] sm:min-h-[270px] lg:min-h-[245px] 2xl:min-h-[290px]"
        aria-label="สั่งล่วงหน้า รับตรงเวลา"
      >
        <FoodImage
          src={foodImages.rice}
          alt="ข้าวผัดและผักสำหรับมื้อกลางวัน"
          priority
          className="absolute! inset-y-0 right-0 w-[57%] [mask-image:linear-gradient(to_right,transparent,black_35%)]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#f3e8d8] via-[#f3e8d8]/35 to-transparent" />
        <div className="relative z-10 w-[75%] px-6 py-7 sm:w-[65%] sm:px-8 sm:py-8 lg:px-6 xl:px-8">
          <p className="mb-3 text-[8px] font-semibold tracking-[1.8px] text-[#9b7857]">
            YOUR LUNCH, YOUR TIME
          </p>
          <h2 className="text-[29px] leading-[1.5] font-bold tracking-tight sm:text-[34px] lg:text-[29px] 2xl:text-[38px]">
            พักเที่ยงมีน้อย
            <br />
            <span className="text-brand">ให้มื้ออร่อยรอคุณ</span>
          </h2>
          <p className="mt-2 max-w-48 text-[10px] leading-6 text-[#8b7965] sm:max-w-none">
            เลือกร้าน สั่งล่วงหน้า แล้วมารับเองที่โรงอาหาร
          </p>
          <button
            onClick={() =>
              document
                .getElementById("restaurants")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="mt-5 inline-flex min-h-10 items-center gap-4 rounded-lg bg-brand px-4 py-2.5 text-[11px] font-semibold text-white transition hover:bg-brand-dark"
          >
            เลือกร้านอร่อย <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="absolute right-4 bottom-5 hidden items-center gap-2 rounded-xl border border-white/50 bg-white/90 p-3 shadow-md backdrop-blur sm:flex lg:hidden xl:flex">
          <span className="grid size-7 place-items-center rounded-full bg-sage-light text-sage">
            <Check size={14} />
          </span>
          <span className="text-[9px] font-semibold">
            สั่งไว้ก่อน อิ่มตรงเวลา
            <small className="mt-0.5 block text-[8px] font-normal text-muted">
              ไม่ต้องเสียเวลารอคิว
            </small>
          </span>
        </div>
      </section>
      <div
        className="scrollbar-none -mx-1 mb-5 flex justify-between gap-3 overflow-x-auto px-1 pb-2"
        role="group"
        aria-label="หมวดอาหาร"
      >
        {categories.map((name) => {
          const Icon = categoryIcons[name];
          return (
            <button
              onClick={() => setCategory(name)}
              aria-pressed={category === name}
              key={name}
              className={`flex min-w-[64px] shrink-0 flex-col items-center gap-2.5 text-[10px] transition ${category === name ? "font-semibold text-brand" : "text-muted"}`}
            >
              <span
                className={`grid size-[54px] place-items-center rounded-2xl border transition sm:size-[60px] ${category === name ? "border-brand bg-brand text-white shadow-[0_7px_15px_#ee672b25]" : "border-line bg-white text-[#8b8c77] hover:border-brand/40 hover:text-brand"}`}
              >
                <Icon size={25} strokeWidth={1.4} />
              </span>
              {name}
            </button>
          );
        })}
      </div>
      <section id="restaurants" className="scroll-mt-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              ร้านอร่อยในวิทยาลัย
            </h2>
            <p aria-live="polite" className="mt-1 text-[10px] text-muted">
              {list.length} ร้านให้เลือกอิ่ม
              {category !== "ทั้งหมด" ? ` · ${category}` : ""}
            </p>
          </div>
          <button
            onClick={() => setOpenOnly(!openOnly)}
            aria-pressed={openOnly}
            className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg border px-2.5 text-[9px] transition ${openOnly ? "border-brand/30 bg-peach text-brand" : "border-line bg-white text-muted"}`}
          >
            <span
              className={`size-1.5 rounded-full ${openOnly ? "bg-brand" : "bg-sage"}`}
            />
            เฉพาะร้านที่เปิด
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3.5 sm:gap-5">
          {list.map((r) => (
            <RestaurantCard key={r.id} restaurant={r} />
          ))}
        </div>
        {!list.length && (
          <div className="rounded-2xl border border-dashed border-line bg-white">
            <EmptyState
              icon={<Search size={30} strokeWidth={1.4} />}
              title="ยังไม่เจอร้านที่ตรงใจ"
              description="ลองค้นหาคำอื่น หรือเลือกดูอาหารทุกหมวด"
            >
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch("");
                  setCategory("ทั้งหมด");
                  setOpenOnly(false);
                }}
              >
                ล้างตัวกรอง
              </Button>
            </EmptyState>
          </div>
        )}
      </section>
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-dashed border-[#dfddcf] p-4">
        <ChefHat size={19} className="shrink-0 text-brand" strokeWidth={1.5} />
        <p className="text-[10px] leading-6 text-muted">
          ทุกมื้อรับเองที่ร้าน · เลือกเวลารับได้ในขั้นตอนยืนยันออเดอร์
          <br />
          <span className="text-[9px] text-muted/70">
            ร้าน เมนู และเวลารับเป็นข้อมูลตัวอย่าง ภาพอาหารใช้ประกอบต้นแบบ
          </span>
        </p>
        <ArrowDown size={14} className="mt-1 ml-auto shrink-0 text-muted/40" />
      </div>
    </>
  );
}
