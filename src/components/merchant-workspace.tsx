"use client";
import { AcceptanceControls } from "./shop-acceptance";
import { StaffAccount } from "./staff-account";
import { matchesMenu, optionGroups, optionGroupLabels } from "@/lib/menu-options";
import {useGovernance} from "./governance-provider";
import { CollaborationPanel, ChatInbox } from "./order-collaboration";
import { unread } from "@/lib/collaboration";
import { useEffect, useState } from "react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import { useDemo } from "./demo-provider";
import { useMerchantCatalog, type ShopConfig } from "./merchant-catalog";
import { restaurants, baht, type Menu } from "@/lib/data";
import {
  dateTime,
  localDate,
  statusLabels,
  type OrderStatus,
} from "@/lib/orders";
import { paymentWarningText, paymentWarningTitle } from "@/lib/merchant";
import { loadSlipFile } from "@/lib/browser-storage";
import { Button, Modal, FoodImage } from "./ui";
import { ErrorNotice, Field } from "./account-pages";
import { StatusBadge } from "./order-pages";
const sections = [
  "ภาพรวม",
  "ออเดอร์",
  "เมนูอาหาร",
  "การรับออเดอร์ออนไลน์",
  "แชท",
  "ตั้งค่าร้าน",
];
export function MerchantWorkspace({restaurantId,email}:{restaurantId:string;email:string}) {
  const governance=useGovernance();
  const params = useSearchParams();
  const demo = useDemo(),
    catalog = useMerchantCatalog();
  const shop = restaurantId;
  const [section, setSection] = useState("ภาพรวม"),
    [filter, setFilter] = useState("all"),
    [sort, setSort] = useState("pickup"),
    [pickupDateFilter, setPickupDateFilter] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [warning, setWarning] = useState(false),
    [ack, setAck] = useState(false),
    [money, setMoney] = useState(false),
    [ai, setAi] = useState("อ่านข้อมูลไม่ชัด"),
    [reason, setReason] = useState(""),
    [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [slip, setSlip] = useState<string | null>(null),
    [zoom, setZoom] = useState(false),
    [editing, setEditing] = useState<Menu | null>(null),
    [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!governance.ready || !demo.ready) return;
    const linked = demo.allOrders.find(o => o.id === params.get("order") && o.restaurantId === params.get("shop"));
    if (linked && linked.restaurantId === restaurantId) { setSelected(linked.id); setSection("ออเดอร์"); }
  }, [governance.ready, demo.ready, params]);
  useEffect(() => {
    setError("");
    setAck(false);
    setMoney(false);
  }, [selected, demo.allOrders.find((o) => o.id === selected)?.status]);
  const config = catalog.config(shop),
    orders = demo.allOrders.filter((o) => o.restaurantId === shop),
    order = orders.find((o) => o.id === selected);
  useEffect(() => {
    let url: string | null = null,
      cancel = false;
    setSlip(null);
    if (order?.slips.length) {
      const last = order.slips.at(-1)!;
      if (last.id.startsWith("demo-")) setSlip(order.lines[0].image);
      else
        loadSlipFile(last.id)
          .then((blob) => {
            if (blob && !cancel) {
              url = URL.createObjectURL(blob);
              setSlip(url);
            }
          })
          .catch(() => setError("เปิดภาพสลิปไม่สำเร็จ ลองเปิดออเดอร์ใหม่"));
    }
    return () => {
      cancel = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [order?.id, order?.slips.length]);
  async function upload(e: React.ChangeEvent<HTMLInputElement>, field: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (
      file.size > 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      setError("รูปต้องเป็น JPG/PNG/WebP ไม่เกิน 1 MB");
      return;
    }
    const input = e.currentTarget.form?.elements.namedItem(
      field,
    ) as HTMLInputElement;
    try {
      const bitmap = await createImageBitmap(file);
      bitmap.close();
      const reader = new FileReader();
      reader.onload = () => {
        input.value = String(reader.result);
        setNotice("เลือกรูปแล้ว กดบันทึกเพื่อใช้งาน");
      };
      reader.readAsDataURL(file);
    } catch {
      setError("อ่านรูปนี้ไม่ได้");
    }
  }
  function save(c: ShopConfig) {
    try {
      catalog.save(shop, c);
      setNotice("บันทึกข้อมูลร้านแล้ว");
      setError("");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }
  function act(action: "confirm" | "issue" | "ready" | "received") {
    if (!order) return;
    try {
      if (action === "confirm" && (!ack || !money))
        throw Error("ต้องรับทราบคำเตือนและตรวจเงินจริงก่อนยืนยัน");
      demo.merchantAct(
        order.id,
        shop,
        action,
        action === "issue" ? reason : action === "received" ? code : "",
      );
      setNotice("บันทึกสถานะออเดอร์แล้ว");
      setMoney(false);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function open(id: string, review = false) {
    setSelected(id);
    setAck(false);
    setMoney(false);
    setReason("");
    setCode("");
    setError("");
    setAi("อ่านข้อมูลไม่ชัด");
    setWarning(review);
  }
  const filtered = orders
    .filter((o) => (filter === "all" || o.status === filter) && (!pickupDateFilter || o.pickupDate === pickupDateFilter))
    .sort((a, b) =>
      sort === "newest"
        ? b.createdAt - a.createdAt
        : `${a.pickupDate} ${a.pickupTime}`.localeCompare(
            `${b.pickupDate} ${b.pickupTime}`,
          ),
    );
  const confirmed = orders
    .filter((o) => o.history.some(h=>h.status==="preparing"))
    .reduce((s, o) => s + (o.paidTotal??o.total), 0);
  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-xs font-semibold tracking-widest text-brand">
        MERCHANT · PHASE 6
      </p>
      <h1 className="mt-2 text-3xl font-bold">จัดการร้านอาหาร</h1>{governance.state.applications.find(a=>a.id===shop)?.status!==undefined&&governance.state.applications.find(a=>a.id===shop)?.status!=="approved"&&<p className="mt-4 rounded-xl bg-amber-50 p-4 text-xs text-amber-800">ร้านนี้ยังไม่ผ่านอนุมัติ จัดเตรียมเมนูได้ แต่เปิดขายไม่ได้ ดูเหตุผลและแก้ไขได้ที่สถานะคำขอร้าน</p>}
      <p className="mt-3 text-xs leading-6 text-muted">จัดการได้เฉพาะร้านที่ผูกกับบัญชีของคุณ</p>
      <StaffAccount email={email}/>
      <AcceptanceControls shopId={shop}/>
      <p className="mt-5 text-sm font-semibold">ร้านที่กำลังจัดการ: {config.name}</p>

      <div className="mt-6 flex flex-col gap-5 md:flex-row">
        <nav
          aria-label="เมนูร้านอาหาร"
          className="flex gap-2 overflow-x-auto md:w-40 md:shrink-0 md:flex-col"
        >
          {sections.map((s) => (
            <button
              key={s}
              onClick={() => {
                setSection(s);
                setSelected(null);
                setError("");
              }}
              className={`shrink-0 rounded-xl px-4 py-3 text-left text-xs ${section === s ? "bg-brand text-white" : "bg-white text-muted"}`}
            >
              {s}
            </button>
          ))}
        </nav>
        <div className="min-w-0 flex-1">
          <ErrorNotice message={error} />
          {notice && (
            <p
              role="status"
              className="mb-4 rounded-xl bg-sage-light p-4 text-xs text-sage"
            >
              {notice}
            </p>
          )}
          {section === "ภาพรวม" && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                {(["payment_review", "preparing", "ready"] as const).map(
                  (status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setFilter(status);
                        setSection("ออเดอร์");
                      }}
                      className="rounded-2xl border border-line bg-white p-5 text-left"
                    >
                      <p className="text-xs text-muted">
                        {statusLabels[status]}
                      </p>
                      <p className="mt-3 text-3xl font-bold text-brand">
                        {orders.filter((o) => o.status === status).length}
                      </p>
                    </button>
                  ),
                )}
              </div>
              <div className="my-5 rounded-2xl border border-line bg-white p-6">
                <h2 className="font-bold">ยอดที่ร้านยืนยันรับเงินแล้ว</h2>
                <p className="mt-3 text-3xl font-bold">{baht(confirmed)}</p>
                <p className="mt-3 text-xs text-muted">
                  คืนเงินที่บันทึกแล้ว: {baht(orders.flatMap(o=>o.refunds??[]).filter(r=>r.status==='refunded').reduce((n,r)=>n+r.amount,0))} · ร้านดำเนินการคืนเงินเอง
                </p>
              </div>
              <h2 className="mb-3 font-semibold">ใกล้ถึงเวลารับ</h2>
              {orders
                .filter((o) => ["preparing", "ready"].includes(o.status))
                .sort((a, b) =>
                  (a.pickupDate + a.pickupTime).localeCompare(
                    b.pickupDate + b.pickupTime,
                  ),
                )
                .slice(0, 5)
                .map((o) => (
                  <button
                    key={o.id}
                    className="mb-2 flex w-full justify-between rounded-xl bg-white p-4 text-xs"
                    onClick={() => {
                      open(o.id);
                      setSection("ออเดอร์");
                    }}
                  >
                    <span>{o.id}</span>
                    <span>
                      {o.pickupDate} {o.pickupTime}
                    </span>
                  </button>
                ))}
              <p className="mt-4 text-xs text-muted">
                ข้อความยังไม่อ่าน:{" "}
                {orders.reduce((n, o) => n + unread(o, "merchant"), 0)}
              </p>

            </>
          )}
          {section === "ออเดอร์" && (
            <>
              <h2 className="text-xl font-bold">ออเดอร์ของร้าน</h2>
              <div className="my-4 flex gap-2 overflow-x-auto">
                <button
                  onClick={() => setFilter("all")}
                  className="shrink-0 rounded-lg bg-white p-3 text-xs"
                >
                  ทั้งหมด ({orders.length})
                </button>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <button
                    key={key}
                    aria-pressed={filter === key}
                    onClick={() => setFilter(key)}
                    className={`shrink-0 rounded-lg p-3 text-xs ${filter === key ? "bg-brand text-white" : "bg-white"}`}
                  >
                    {label} ({orders.filter((o) => o.status === key).length})
                  </button>
                ))}
              </div>
              <label className="text-xs">
                เรียงตาม
                <select
                  className="ml-3 rounded-lg border border-line bg-white p-2"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="pickup">เวลารับอาหาร</option>
                  <option value="newest">ใหม่ล่าสุด</option>
                </select>
              </label>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <Field label="กรองวันที่รับอาหาร" type="date" value={pickupDateFilter} onInput={e => setPickupDateFilter(e.currentTarget.value)} onChange={e => setPickupDateFilter(e.target.value)}/>
                {pickupDateFilter && <Button variant="secondary" onClick={() => setPickupDateFilter("")}>ทุกวันที่รับอาหาร</Button>}
              </div>
              <div className="mt-4 space-y-3">
                {!filtered.length && (
                  <p className="rounded-xl bg-white p-8 text-center text-sm text-muted">
                    ยังไม่มีออเดอร์ในสถานะนี้
                  </p>
                )}
                {filtered.map((o) => (
                  <article
                    key={o.id}
                    className="rounded-2xl border border-line bg-white p-5"
                  >
                    <div className="flex flex-wrap justify-between gap-3">
                      <h3 className="text-xs font-semibold">#{o.id}</h3>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="mt-3 text-sm">
                      {o.lines
                        .map((l) => `${l.name} ×${l.quantity}`)
                        .join(", ")}
                    </p>
                    <p className="my-3 text-xs text-muted">
                      วันที่รับ {o.pickupDate} · {baht(o.total)}
                      <strong className="mt-2 block text-base text-brand">เวลาที่ต้องการมารับ {o.pickupTime} น.</strong>
                    </p>
                    <Button
                      variant="secondary"
                      onClick={() => open(o.id, o.status === "payment_review")}
                    >
                      {o.status === "payment_review"
                        ? "เปิดตรวจการชำระเงิน"
                        : "ดูรายละเอียด / จัดการ"}
                    </Button>
                  </article>
                ))}
              </div>
              {order && (
                <section className="mt-6 rounded-2xl border-2 border-brand/30 bg-white p-5">
                  <h2 className="text-xl font-bold">#{order.id}</h2>
                  <p className="my-3 text-xs text-muted">
                    เบอร์ติดต่อ {order.phone} · หมายเหตุ {order.note || "ไม่มี"}
                  </p>
                  <p className="mb-4 rounded-xl bg-peach p-4 text-sm font-semibold text-brand">วันที่รับ {order.pickupDate} · เวลาที่ต้องการมารับ {order.pickupTime} น.</p>
                  <StatusBadge status={order.status} />
                  <ul className="my-4 space-y-2 text-sm">
                    {order.lines.map((l, i) => (
                      <li key={i}>
                        {l.name} ×{l.quantity} · {l.options.join(", ")}{" "}
                        <b>{baht(l.price * l.quantity)}</b>
                      </li>
                    ))}
                  </ul>
                  <p className="font-bold">ยอดรวม {baht(order.total)}</p>
                  {order.status === "payment_review" &&
                    (!ack ? (
                      <Button className="mt-5" onClick={() => setWarning(true)}>
                        เปิดตรวจการชำระเงิน
                      </Button>
                    ) : (
                      <>
                        <h3 className="mt-6 font-semibold">สลิปล่าสุด</h3>
                        {slip ? (
                          <button
                            className="mt-3"
                            onClick={() => setZoom(true)}
                          >
                            <img
                              src={slip}
                              alt="ภาพหลักฐานที่ลูกค้าแนบ"
                              className="max-h-64 max-w-full rounded-xl object-contain"
                            />
                            <span className="block text-xs text-brand">
                              ขยายภาพ
                            </span>
                          </button>
                        ) : (
                          <p className="mt-3 text-xs text-muted">
                            ไม่มีภาพที่เปิดได้ในเบราว์เซอร์นี้
                            ร้านยังตรวจเงินด้วยตนเองได้
                          </p>
                        )}
                        <div className="mt-5 rounded-xl bg-paper p-4">
                          <h3 className="text-sm font-semibold">
                            ผลอ่านภาพจาก AI · จำลอง
                          </h3>
                          <p className="mt-2 text-xs leading-6 text-muted">
                            เลือกผลสาธิต ไม่ได้อ่านภาพหรือเชื่อมธนาคารจริง
                          </p>
                          <select
                            aria-label="ผลอ่านภาพจำลอง"
                            value={ai}
                            onChange={(e) => setAi(e.target.value)}
                            className="mt-3 w-full rounded-lg border border-line bg-white p-3 text-xs"
                          >
                            {[
                              "ข้อมูลบนภาพตรงกับออเดอร์",
                              "ข้อมูลไม่ตรง",
                              "อ่านข้อมูลไม่ชัด",
                            ].map((x) => (
                              <option key={x}>{x}</option>
                            ))}
                          </select>
                          <table className="mt-4 w-full text-left text-xs">
                            <thead>
                              <tr>
                                <th>ข้อมูล</th>
                                <th>คาดหวัง</th>
                                <th>อ่านได้ (จำลอง)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[
                                ["ยอดเงิน", baht(order.total)],
                                ["ผู้รับ", config.recipient],
                                ["วันเวลา", dateTime(order.createdAt)],
                              ].map(([label, value]) => (
                                <tr
                                  key={label}
                                  className="border-t border-line"
                                >
                                  <td className="py-3">{label}</td>
                                  <td>{value}</td>
                                  <td>
                                    {ai === "อ่านข้อมูลไม่ชัด"
                                      ? "อ่านไม่ได้"
                                      : ai === "ข้อมูลไม่ตรง"
                                        ? "ไม่ตรงกับที่คาดหวัง"
                                        : value}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <label className="mt-5 flex items-start gap-3 text-xs leading-6">
                          <input
                            type="checkbox"
                            checked={money}
                            onChange={(e) => setMoney(e.target.checked)}
                            className="mt-1 accent-brand"
                          />
                          ตรวจยอดเงินเข้าบัญชีร้านด้วยตนเองแล้ว
                          (จำลองการยืนยันในต้นแบบ)
                        </label>
                        <Button
                          className="mt-4"
                          disabled={!money}
                          onClick={() => act("confirm")}
                        >
                          ตรวจสอบแล้ว ได้รับเงินจริง เริ่มเตรียมอาหาร
                        </Button>
                        <label className="mt-6 block text-xs">
                          เหตุผลปัญหาการชำระเงิน
                          <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="mt-2 w-full rounded-xl border border-line p-3"
                            maxLength={500}
                          />
                        </label>
                        <Button
                          className="mt-3"
                          variant="secondary"
                          disabled={!reason.trim()}
                          onClick={() => act("issue")}
                        >
                          แจ้งปัญหาการชำระเงิน
                        </Button>
                        <p className="mt-3 text-xs text-muted">
                          ลูกค้าจะเห็นเหตุผลและส่งสลิปใหม่ได้
                          ติดต่อผ่านส่วนแชทตามออเดอร์ได้
                        </p>
                      </>
                    ))}
                  {order.status === "preparing" && (
                    <Button className="mt-5" onClick={() => act("ready")}>
                      เตรียมเสร็จแล้ว · พร้อมรับ
                    </Button>
                  )}
                  {order.status === "ready" && (
                    <div className="mt-5 space-y-4">
                      <Field
                        label="รหัสที่ลูกค้าแสดงตอนรับอาหาร"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        autoComplete="off"
                      />
                      <Button
                        disabled={!code.trim()}
                        onClick={() => act("received")}
                      >
                        ตรวจรหัสและบันทึกรับแล้ว
                      </Button>
                      <p className="text-xs text-muted">
                        ดูรหัสจากหน้ารายละเอียดฝั่งลูกค้า
                        ระบบจะตรวจว่าตรงกันก่อนบันทึก
                      </p>
                    </div>
                  )}
                  <CollaborationPanel order={order} merchant />
                  <h3 className="mt-6 font-semibold">ประวัติสถานะ</h3>
                  {order.history.map((h, i) => (
                    <p key={i} className="mt-3 text-xs leading-6 text-muted">
                      {dateTime(h.at)} · {statusLabels[h.status]} {h.note}
                    </p>
                  ))}
                </section>
              )}
            </>
          )}
          {section === "เมนูอาหาร" && (
            <>
              <div className="flex justify-between">
                <h2 className="text-xl font-bold">เมนูอาหาร</h2>
                <Button
                  onClick={() => {
                    setEditing(null);
                    setMenuOpen(true);
                  }}
                >
                  เพิ่มเมนู
                </Button>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {config.menus.map((m) => (
                  <article
                    key={m.id}
                    className="rounded-2xl border border-line bg-white p-4"
                  >
                    <FoodImage
                      src={m.image}
                      alt={m.name}
                      className="h-36 rounded-xl"
                    />
                    <h3 className="mt-3 font-bold">{m.name}</h3>
                    <p className="my-2 text-xs text-muted">
                      {baht(m.price)} · เหลือวันนี้{" "}
                      {Math.max(
                        0,
                        m.stock -
                          orders
                            .filter(
                              (o) =>
                                o.pickupDate === localDate() &&
                                o.status !== "cancelled" &&
                                !o.demoExample,
                            )
                            .flatMap((o) => o.lines)
                            .filter((l) => matchesMenu(m, l.menuId))
                            .reduce((n, l) => n + l.quantity, 0),
                      )}{" "}
                      ·{" "}
                      {m.stock === 0
                        ? "หมด"
                        : m.enabled === false
                          ? "ปิดเมนู"
                          : "เปิดขาย"}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setEditing(m);
                          setMenuOpen(true);
                        }}
                      >
                        แก้ไข
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() =>
                          save({
                            ...config,
                            menus: config.menus.map((x) =>
                              x.id === m.id
                                ? { ...x, enabled: x.enabled === false }
                                : x,
                            ),
                          })
                        }
                      >
                        {m.enabled === false ? "เปิดขาย" : "ปิดเมนู"}
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
          {section === "การรับออเดอร์ออนไลน์" && <div className="space-y-3 rounded-2xl border border-line bg-white p-6"><h2 className="text-xl font-bold">เวลาที่ลูกค้าต้องการมารับ</h2><p className="text-sm leading-7 text-muted">ลูกค้าระบุวันที่และเวลาได้เป็นรายนาที รวมถึงช่วง 11:45–12:00 โดยไม่ผูกกับโควตาช่วงเวลา ใช้ปุ่มเปิดรับหรือพักรับด้านบนเพื่อควบคุมเฉพาะออเดอร์ออนไลน์ใหม่</p><p className="text-xs leading-6 text-muted">ออเดอร์ที่รับไว้แล้วดำเนินการต่อได้ ร้านเป็นผู้จัดลำดับงานตามสถานการณ์หน้าร้าน</p></div>}
          {section === "ตั้งค่าร้าน" && (
            <form
              key={shop + catalog.revision}
              className="space-y-5 rounded-2xl border border-line bg-white p-6"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                save({
                  ...config,
                  name: String(f.get("name")),
                  phone: String(f.get("phone")),
                  hours: String(f.get("hours")),
                  bank: String(f.get("bank")),
                  account: String(f.get("account")),
                  recipient: String(f.get("recipient")),
                  qr: String(f.get("qr")),
                });
              }}
            >
              <h2 className="text-xl font-bold">ตั้งค่าร้าน</h2>
              {[
                ["name", "ชื่อร้าน", config.name],
                ["phone", "เบอร์ติดต่อ", config.phone],
                ["hours", "เวลาเปิด–ปิด", config.hours],
                ["bank", "ธนาคาร (ข้อมูลทดลอง)", config.bank],
                ["account", "เลขบัญชี (ข้อมูลทดลอง)", config.account],
                ["recipient", "ชื่อผู้รับเงิน (ข้อมูลทดลอง)", config.recipient],
                ["qr", "URL รูป QR ของร้าน (ข้อมูลทดลอง)", config.qr],
              ].map(([name, label, value]) => (
                <Field
                  key={name}
                  name={name}
                  label={label}
                  defaultValue={value}
                  required={name !== "qr"}
                />
              ))}

              <label className="block text-xs">
                อัปโหลดรูป QR ทดลอง
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => upload(e, "qr")}
                  className="mt-2 block"
                />
              </label>
              <Button>บันทึกข้อมูลร้าน</Button>
            </form>
          )}
          {section === "แชท" && <ChatInbox shop={shop} />}
        </div>
      </div>
      <Link className="mt-8 inline-block text-xs text-brand" href="/orders/">
        ไปดูออเดอร์ฝั่งลูกค้า →
      </Link>
      <Modal
        open={warning}
        title={paymentWarningTitle}
        onClose={() => {
          setWarning(false);
        }}
      >
        <div className="p-7 pt-14">
          <h2 className="text-xl font-bold text-brand">
            {paymentWarningTitle}
          </h2>
          <p className="mt-4 text-sm leading-8">{paymentWarningText}</p>
          <Button
            className="mt-6 w-full"
            onClick={() => {
              setAck(true);
              setWarning(false);
            }}
          >
            รับทราบ ไปตรวจสอบ
          </Button>
        </div>
      </Modal>
      <Modal
        open={zoom}
        title="ขยายภาพสลิป"
        onClose={() => setZoom(false)}
        wide
      >
        {slip && (
          <img
            className="max-h-[80vh] w-full object-contain p-5 pt-14"
            src={slip}
            alt="ภาพสลิปที่แนบ"
          />
        )}
      </Modal>
      <Modal
        open={menuOpen}
        title={editing ? "แก้ไขเมนู" : "เพิ่มเมนู"}
        onClose={() => setMenuOpen(false)}
      >
        <form
          className="space-y-4 p-6 pt-14"
          key={editing?.id ?? "new"}
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            try {
              const options = String(f.get("options"))
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .map((line, i) => {
                  const [name, price] = line.split(":");
                  if (
                    !name ||
                    !Number.isFinite(Number(price)) ||
                    Number(price) < 0
                  )
                    throw Error("ตัวเลือกต้องเป็น ชื่อ:ราคา");
                  const existing = editing?.options.find(o => !o.group && o.name === name);
                  return { id: existing?.id ?? `option-${i}`, name, price: Number(price) };
                });
              const m: Menu = {
                id: editing?.id ?? crypto.randomUUID(),
                name: String(f.get("name")),
                description: String(f.get("description")),
                image: String(f.get("image")),
                price: Number(f.get("price")),
                stock: Number(f.get("stock")),
                legacyIds: editing?.legacyIds,
                options: [...(editing?.options.filter(o => o.group).map(o => ({...o, price: Number(f.get(`option-price-${o.id}`))})) ?? []), ...options],
                enabled: editing?.enabled ?? true,
              };
              if (
                save({
                  ...config,
                  menus: editing
                    ? config.menus.map((x) => (x.id === m.id ? m : x))
                    : [...config.menus, m],
                })
              )
                setMenuOpen(false);
            } catch (ex) {
              setError((ex as Error).message);
            }
          }}
        >
          <ErrorNotice message={error} />
          <h2 className="text-xl font-bold">
            {editing ? "แก้ไขเมนู" : "เพิ่มเมนู"}
          </h2>
          <Field
            label="ชื่อเมนู"
            name="name"
            required
            defaultValue={editing?.name}
          />
          <Field
            label="รายละเอียด"
            name="description"
            defaultValue={editing?.description}
          />
          <Field
            label="URL รูปอาหาร หรือ /images/rice.jpg"
            name="image"
            required
            defaultValue={editing?.image ?? "/images/rice.jpg"}
          />
          <label className="block text-xs">
            อัปโหลดรูปอาหาร
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => upload(e, "image")}
              className="mt-2 block"
            />
          </label>
          <Field
            label="ราคา"
            type="number"
            min={0}
            step="0.01"
            name="price"
            required
            defaultValue={editing?.price}
          />
          <Field
            label="จำนวนอาหารตั้งต้นต่อวัน"
            type="number"
            min={0}
            step="1"
            name="stock"
            required
            defaultValue={editing?.stock}
          />
          <Field
            label="ตัวเลือกเพิ่มเติม เช่น ไข่ดาว:10"
            name="options"
            defaultValue={editing?.options.filter(o => !o.group)
              .map((o) => `${o.name}:${o.price}`)
              .join(",")}
          />
          {optionGroups.map(group => {
            const choices = editing?.options.filter(o => o.group === group) ?? [];
            if (!choices.length) return null;
            return <fieldset key={group} className="space-y-3 rounded-xl border border-line p-4"><legend className="px-1 text-xs font-semibold">{optionGroupLabels[group]} · ราคาเพิ่ม (บาท)</legend>{choices.map(o => <Field key={o.id} label={o.name} name={`option-price-${o.id}`} type="number" min={0} step="0.01" required defaultValue={o.price}/>)}</fieldset>;
          })}
          <Button>บันทึกเมนู</Button>
        </form>
      </Modal>
    </div>
  );
}
