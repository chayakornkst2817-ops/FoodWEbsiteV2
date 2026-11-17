"use client";
import { ShopAcceptance } from "./shop-acceptance";
import { defaultOptionIds, optionGroups, optionGroupLabels } from "@/lib/menu-options";
import {useGovernance} from "./governance-provider";
import { useMerchantCatalog } from "./merchant-catalog";
import Link from "next/link";
import { ArrowLeft, Clock3, MapPin, Plus, ShoppingBag } from "lucide-react";
import { useState } from "react";
import {
  baht,
  restaurants,
  pickupSlots,
  type Menu,
  type Restaurant,
} from "@/lib/data";
import { useCart } from "./cart-provider";
import { Button, FoodImage, Modal, Quantity } from "./ui";

export function RestaurantDetail({
  restaurant: originalRestaurant,
}: {
  restaurant: Restaurant;
}) {
  useGovernance();
  const catalog = useMerchantCatalog();
  const r =
    restaurants.find((r) => r.id === originalRestaurant.id) ??
    originalRestaurant;
  const { items, addItem, ready } = useCart();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [optionIds, setOptionIds] = useState<string[]>([]);
  const inCart = menu
    ? items
        .filter((x) => x.menuId === menu.id)
        .reduce((sum, x) => sum + x.quantity, 0)
    : 0;
  const available = r.open && !!menu && menu.stock > inCart;
  const unitPrice = menu
    ? menu.price +
      menu.options
        .filter((o) => optionIds.includes(o.id))
        .reduce((sum, o) => sum + o.price, 0)
    : 0;
  const selectMenu = (m: Menu) => {
    setMenu(m);
    setQuantity(1);
    setOptionIds(defaultOptionIds(m));
  };
  return (
    <>
      <Link
        href="/"
        className="mb-5 inline-flex min-h-8 items-center gap-2 text-xs text-muted transition hover:text-brand"
      >
        <ArrowLeft size={15} />
        กลับไปเลือกร้าน
      </Link>
      <div className="relative">
        <FoodImage
          src={r.image}
          alt={`อาหารจาก${r.name}`}
          priority
          className="h-52 rounded-[22px] sm:h-64"
        />
        <span className="absolute bottom-4 left-4 rounded-lg bg-white/95 px-3 py-2 text-[10px] font-medium shadow-sm">
          {r.tag}
        </span>
      </div>
      <div className="mt-6 flex items-start justify-between gap-3">
        <div>
          <p className="mb-2 text-[9px] font-semibold tracking-[1.5px] text-brand">
            {r.category}
          </p>
          <h1 className="text-[27px] font-bold tracking-tight">{r.name}</h1>
          <p className="mt-2 text-xs leading-6 text-muted">{r.description}</p>
        </div>
        <span
          className={`mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[9px] ${r.open ? "bg-sage-light text-sage" : "bg-[#f0ede8] text-muted"}`}
        >
          <span
            className={`size-1.5 rounded-full ${r.open ? "bg-sage" : "bg-muted"}`}
          />
          {r.open ? "เปิดรับออเดอร์" : "พักรับออเดอร์ออนไลน์"}
        </span>
      </div>
      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-muted">
        <span className="flex items-center gap-1.5">
          <MapPin size={13} />
          {r.location} · โรงอาหารกลาง
        </span>
        <span className="flex items-center gap-1.5">
          <Clock3 size={13} />
          เวลาให้บริการที่ร้านแจ้ง {r.hours} น.
        </span>
        <span className="flex items-center gap-1.5">
          <ShoppingBag size={13} />
          รับเองที่ร้าน
        </span>
      </div>
      <section className="my-7 space-y-3">
        <ShopAcceptance open={r.open} reopensAt={catalog.config(r.id).reopensAt}/>
        <p className="text-xs leading-6 text-muted">ระบุวันที่และเวลาที่ต้องการมารับได้ในขั้นตอนยืนยันออเดอร์ ร้านเป็นผู้จัดลำดับการทำอาหารเอง</p>
      </section>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-bold">เมนูของร้าน</h2>
        <span className="text-[10px] text-muted">{r.menus.length} เมนู</span>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:gap-5">
        {r.menus.map((m) => (
          <button
            key={m.id}
            onClick={() => selectMenu(m)}
            className="group overflow-hidden rounded-2xl border border-line bg-white text-left transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="relative">
              <FoodImage
                src={m.image}
                alt={m.name}
                className={`h-36 sm:h-44 ${!m.stock ? "grayscale-50" : ""}`}
              />
              {!m.stock && (
                <span className="absolute top-3 left-3 rounded-md bg-ink/80 px-2 py-1 text-[10px] text-white">
                  หมดวันนี้
                </span>
              )}
            </div>
            <div className="p-3.5 sm:p-4">
              <h3 className="text-sm font-semibold group-hover:text-brand">
                {m.name}
              </h3>
              <p className="mt-2 line-clamp-2 min-h-9 text-[10px] leading-5 text-muted">
                {m.description}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <b className="text-sm">{baht(m.price)}</b>
                {m.stock && r.open ? (
                  <span className="grid size-8 place-items-center rounded-lg bg-peach text-brand">
                    <Plus size={17} />
                  </span>
                ) : (
                  <span className="text-[10px] text-muted">
                    {!m.stock ? "อาหารหมด" : "ร้านปิด"}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
      <p className="mt-6 text-[9px] leading-5 text-muted">
        ข้อมูลตัวอย่างสำหรับต้นแบบ · ภาพอาหารเป็นภาพประกอบ
      </p>
      <Modal
        open={!!menu}
        onClose={() => setMenu(null)}
        title={menu?.name ?? "รายละเอียดเมนู"}
      >
        {menu && (
          <>
            <FoodImage src={menu.image} alt={menu.name} className="h-52" />
            <div className="p-6">
              <p className="mb-2 text-[10px] font-medium text-brand">
                {r.name}
              </p>
              <h2 className="text-2xl font-bold">{menu.name}</h2>
              <p className="mt-3 text-xs leading-6 text-muted">
                {menu.description}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <b className="text-2xl text-brand">{baht(unitPrice)}</b>
                <span className="text-[10px] text-muted">
                  {!r.open
                    ? "ร้านปิดรับออเดอร์"
                    : !menu.stock
                      ? "เมนูนี้หมดแล้ว"
                      : `เหลือ ${menu.stock} จาน`}
                </span>
              </div>
              {optionGroups.map(group => {
                const choices = menu.options.filter(o => o.group === group);
                if (!choices.length) return null;
                return <fieldset key={group} className="mt-6">
                  <legend className="mb-3 text-xs font-semibold">{optionGroupLabels[group]} <span className="font-normal text-muted">· เลือก 1 อย่าง</span></legend>
                  <div className="grid grid-cols-2 gap-2">
                    {choices.map(option => <label key={option.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-xs transition ${optionIds.includes(option.id) ? "border-brand bg-peach/30" : "border-line"}`}>
                      <input type="radio" name={`menu-${menu.id}-${group}`} value={option.id} checked={optionIds.includes(option.id)} className="size-4 accent-brand" onChange={() => setOptionIds(ids => [...ids.filter(id => !choices.some(o => o.id === id)), option.id])}/>
                      <span>{option.name}</span><span className="ml-auto text-[10px] text-muted">{option.price ? `+${baht(option.price)}` : ""}</span>
                    </label>)}
                  </div>
                </fieldset>;
              })}
              {menu.options.some(o => !o.group) && (
                <fieldset className="mt-6">
                  <legend className="mb-3 text-xs font-semibold">
                    ตัวเลือกเพิ่มเติม{" "}
                    <span className="font-normal text-muted">· ไม่บังคับ</span>
                  </legend>
                  {menu.options.filter(o => !o.group).map((option) => (
                    <label
                      key={option.id}
                      className="mb-2 flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 text-xs"
                    >
                      <input
                        type="checkbox"
                        className="size-4 accent-brand"
                        checked={optionIds.includes(option.id)}
                        onChange={(e) =>
                          setOptionIds(
                            e.target.checked
                              ? [...optionIds, option.id]
                              : optionIds.filter((x) => x !== option.id),
                          )
                        }
                      />
                      <span>{option.name}</span>
                      <span className="ml-auto text-muted">
                        +{baht(option.price)}
                      </span>
                    </label>
                  ))}
                </fieldset>
              )}
              {menu.stock > 0 && inCart > 0 && (
                <p className="mt-4 text-[10px] text-muted">
                  เมนูนี้อยู่ในตะกร้าแล้ว {inCart} จาน
                </p>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                <Quantity
                  value={quantity}
                  onChange={setQuantity}
                  max={available ? menu.stock - inCart : 1}
                  label={menu.name}
                />
                <Button
                  className="flex-1 text-xs"
                  disabled={!available || !ready}
                  onClick={() => {
                    addItem(r.id, menu.id, optionIds, quantity);
                    setMenu(null);
                  }}
                >
                  {!r.open
                    ? "ร้านปิดรับออเดอร์"
                    : !menu.stock
                      ? "อาหารหมด"
                      : !available
                        ? "ถึงจำนวนคงเหลือแล้ว"
                        : `เพิ่มลงตะกร้า · ${baht(unitPrice * quantity)}`}
                </Button>
              </div>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
