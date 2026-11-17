"use client";
import {unread} from "@/lib/collaboration";
import { CollaborationPanel, chatHref } from "./order-collaboration";
import { useMerchantCatalog } from "./merchant-catalog";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  ImagePlus,
  MapPin,
  MessageCircle,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import { useDemo, useNow } from "./demo-provider";
import { useCart } from "./cart-provider";
import { AccountGate, ErrorNotice } from "./account-pages";
import { Button, EmptyState, FoodImage, Modal } from "./ui";
import { baht } from "@/lib/data";
import {
  dateTime,
  statusLabels,
  type Order,
  type OrderStatus,
} from "@/lib/orders";
import { loadSlipFile, saveSlipFile } from "@/lib/browser-storage";

const statusStyle: Record<OrderStatus, string> = {
  awaiting_payment: "bg-amber-50 text-amber-700",
  payment_review: "bg-blue-50 text-blue-700",
  payment_issue: "bg-red-50 text-red-700",
  preparing: "bg-peach text-brand",
  ready: "bg-sage-light text-sage",
  received: "bg-paper text-muted",
  cancelled: "bg-red-50 text-red-700",
};
export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold ${statusStyle[status]}`}
    >
      <span aria-hidden="true">
        {status === "ready" || status === "received"
          ? "✓"
          : status === "cancelled" || status === "payment_issue"
            ? "!"
            : "◷"}
      </span>
      {statusLabels[status]}
    </span>
  );
}
const detailHref = (id: string) =>
  `/orders/detail/?id=${encodeURIComponent(id)}`;
const paymentHref = (id: string) => `/payment/?order=${encodeURIComponent(id)}`;
export function OrdersList() {
  const { orders, addExamples } = useDemo(),
    { notify } = useCart();
  const [filter, setFilter] = useState("current"),
    [error, setError] = useState("");
  const tabs = [
    { key: "current", label: "ออเดอร์ปัจจุบัน" },
    { key: "history", label: "ประวัติ" },
    ...Object.entries(statusLabels).map(([key, label]) => ({ key, label })),
  ];
  const filtered = orders
    .filter((o) =>
      filter === "current"
        ? !["received", "cancelled"].includes(o.status)
        : filter === "history"
          ? ["received", "cancelled"].includes(o.status)
          : o.status === filter,
    )
    .sort((a, b) => b.createdAt - a.createdAt);
  return (
    <AccountGate>
      <div className="mx-auto max-w-3xl">
        <p className="mb-2 text-[10px] font-semibold tracking-[2px] text-brand">
          MY ORDERS
        </p>
        <h1 className="text-3xl font-bold">ออเดอร์ของฉัน</h1>
        <p className="mt-3 text-xs text-muted">
          ติดตามมื้ออร่อยตั้งแต่ชำระเงินจนถึงรับอาหาร
        </p>
        <div
          className="scrollbar-none my-7 flex gap-2 overflow-x-auto pb-2"
          role="group"
          aria-label="กรองสถานะออเดอร์"
        >
          {tabs.map((tab) => (
            <button
              className={`min-h-10 shrink-0 rounded-full border px-4 py-2 text-xs ${filter === tab.key ? "border-brand bg-brand font-semibold text-white" : "border-line bg-white text-muted"}`}
              aria-pressed={filter === tab.key}
              key={tab.key}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <ErrorNotice message={error} />
        {!filtered.length ? (
          <section className="rounded-2xl border border-line bg-white">
            <EmptyState
              icon={<ClipboardList size={30} />}
              title="ยังไม่มีออเดอร์ในสถานะนี้"
              description="เลือกร้านและเมนูที่ชอบ แล้วมื้ออร่อยของคุณจะปรากฏที่นี่"
            >
              <Link
                className="inline-block rounded-xl bg-brand px-5 py-3 text-sm text-white"
                href="/"
              >
                เลือกอาหาร
              </Link>
            </EmptyState>
          </section>
        ) : (
          <div className="space-y-4">
            {filtered.map((order) => (
              <Link
                key={order.id}
                href={detailHref(order.id)}
                className="block rounded-2xl border border-line bg-white p-5 transition hover:border-brand/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[10px] text-muted">#{order.id}</span>
                  <StatusBadge status={order.status} />{unread(order,"customer")>0&&<span className="text-xs font-semibold text-brand">ข้อความใหม่ {unread(order,"customer")}</span>}
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <FoodImage
                    src={order.lines[0].image}
                    alt={order.lines[0].name}
                    className="size-16 shrink-0 rounded-xl"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-bold">
                      {order.restaurantName}
                    </h2>
                    <p className="mt-1 truncate text-xs text-muted">
                      {order.lines
                        .map((l) => `${l.name} ×${l.quantity}`)
                        .join(", ")}
                    </p>
                    <p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted">
                      <Clock3 size={12} />
                      รับ {order.pickupDate} · {order.pickupTime}
                    </p>
                  </div>
                  <b className="text-base">{baht(order.total)}</b>
                  <ArrowRight
                    size={16}
                    className="hidden shrink-0 text-brand sm:block"
                  />
                </div>
                {order.demoExample && (
                  <p className="mt-4 text-[10px] text-muted">
                    ออเดอร์ตัวอย่างสำหรับทดลองสถานะ
                  </p>
                )}
                {order.status === "ready" && (
                  <p className="mt-4 rounded-xl bg-sage-light p-3 text-xs text-sage">
                    พร้อมรับแล้ว · รหัสรับอาหาร{" "}
                    <b className="ml-2 tracking-widest">{order.pickupCode}</b>
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}

      </div>
    </AccountGate>
  );
}
function SlipHistory({ order }: { order: Order }) {
  const [src, setSrc] = useState<string | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState<string | null>(null);
  useEffect(
    () => () => {
      if (src) URL.revokeObjectURL(src);
    },
    [src],
  );
  return (
    <section className="mt-6 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 className="text-base font-bold">ประวัติการชำระเงิน</h2>
      <p className="mt-2 text-[11px] leading-6 text-muted">
        ภาพสลิปเป็นหลักฐานที่แนบ ยังไม่ใช่การยืนยันว่าเงินเข้าจริง
      </p>
      <ErrorNotice message={error} />
      {!order.slips.length ? (
        <p className="mt-5 text-xs text-muted">
          ยังไม่มีภาพสลิปที่แนบในออเดอร์นี้
        </p>
      ) : (
        order.slips.map((slip, i) => (
          <div
            key={slip.id}
            className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold">สลิปครั้งที่ {i + 1}</p>
              <p className="mt-1 max-w-52 truncate text-[10px] text-muted">
                {slip.name}
              </p>
              <p className="mt-1 text-[10px] text-muted">
                {dateTime(slip.submittedAt)}
              </p>
              <p className="mt-1 text-[10px] text-muted">
                {slip.status === "issue"
                  ? slip.reason || "ร้านแจ้งปัญหา"
                  : "ส่งตรวจแล้ว"}
              </p>
            </div>
            <Button
              variant="secondary"
              className="text-xs"
              disabled={!!loading}
              onClick={async () => {
                setLoading(slip.id);
                setError("");
                try {
                  const blob = await loadSlipFile(slip.id);
                  if (!blob)
                    throw new Error(
                      "ไม่พบไฟล์สลิปในเบราว์เซอร์นี้ อาจถูกลบจากพื้นที่จัดเก็บ",
                    );
                  setSrc(URL.createObjectURL(blob));
                } catch (ex) {
                  setError((ex as Error).message);
                } finally {
                  setLoading(null);
                }
              }}
            >
              {loading === slip.id ? "กำลังโหลด…" : "ดูภาพสลิป"}
            </Button>
          </div>
        ))
      )}
      <Modal
        open={!!src}
        onClose={() => setSrc(null)}
        title="ภาพสลิปที่ส่งตรวจ"
        wide
      >
        {src && (
          <div className="p-5 pt-16">
            <img
              src={src}
              alt="ภาพสลิปที่แนบกับออเดอร์"
              className="max-h-[70vh] w-full object-contain"
            />
          </div>
        )}
      </Modal>
    </section>
  );
}
function OrderLines({ order }: { order: Order }) {
  return (
    <section className="mt-6 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 className="text-base font-bold">รายการอาหาร</h2>
      <div className="mt-3 divide-y divide-line">
        {order.lines.map((line, i) => (
          <div key={i} className="flex items-center gap-3 py-4">
            <FoodImage
              src={line.image}
              alt={line.name}
              className="size-14 shrink-0 rounded-xl"
            />
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-semibold">
                {line.name} ×{line.quantity}
              </h3>
              <p className="mt-1 text-[10px] text-muted">
                {line.options.join(", ") || "สูตรปกติ"}
              </p>
            </div>
            <b className="text-sm">{baht(line.price * line.quantity)}</b>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between border-t border-line pt-4 font-bold">
        <span>ยอดรวม</span>
        <span>{baht(order.total)}</span>
      </div>
    </section>
  );
}
function OrderTimeline({ order }: { order: Order }) {
  return (
    <section className="mt-6 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 className="text-base font-bold">ประวัติสถานะ</h2>
      <ol className="mt-4 space-y-5">
        {order.history.map((event, i) => (
          <li key={`${event.at}-${i}`} className="flex gap-3">
            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand/60" />
            <div>
              <p className="text-xs font-medium">
                {statusLabels[event.status]}
              </p>
              <p className="mt-1 text-[10px] text-muted">
                {dateTime(event.at)}
              </p>
              {event.note && (
                <p className="mt-1 text-[11px] leading-6 text-muted">
                  {event.note}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
function MockQr() {
  return (
    <div
      className="relative mx-auto size-44 rounded-xl border border-line bg-white p-3"
      aria-label="ภาพ QR ตัวอย่าง ไม่สามารถใช้โอนเงินจริง"
    >
      <svg viewBox="0 0 25 25" className="h-full w-full" aria-hidden="true">
        {Array.from({ length: 625 }, (_, i) => {
          const x = i % 25,
            y = Math.floor(i / 25);
          const finder = (ox: number, oy: number) =>
            x >= ox &&
            x < ox + 7 &&
            y >= oy &&
            y < oy + 7 &&
            (x === ox ||
              y === oy ||
              x === ox + 6 ||
              y === oy + 6 ||
              (x >= ox + 2 && x <= ox + 4 && y >= oy + 2 && y <= oy + 4));
          return finder(0, 0) ||
            finder(18, 0) ||
            finder(0, 18) ||
            ((x * 7 + y * 11) % 5 < 2 && x > 7 && y > 7) ? (
            <rect key={i} x={x} y={y} width={1} height={1} fill="#aaa" />
          ) : null;
        })}
      </svg>
      <span className="absolute inset-x-0 top-[40%] -rotate-12 border-y-4 border-white bg-brand px-2 py-2 text-center text-lg font-extrabold tracking-widest text-white">
        DEMO
      </span>
    </div>
  );
}
function PaymentForm({ order }: { order: Order }) {
  const shopConfig = useMerchantCatalog().config(order.restaurantId);
  const { sendSlip } = useDemo(),
    { notify } = useCart(),
    now = useNow();
  const [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState<string | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false),
    input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const canSend =
    order.status === "awaiting_payment" || order.status === "payment_issue";
  const seconds =
    now === null
      ? null
      : Math.max(0, Math.ceil((order.expiresAt - now) / 1000));
  const expired =
    order.status === "cancelled" ||
    (order.status === "awaiting_payment" && seconds === 0);
  if (expired)
    return (
      <section className="mt-7 rounded-2xl border border-red-100 bg-red-50 p-6">
        <h2 className="text-xl font-bold text-red-700">หมดเวลาส่งสลิปแล้ว</h2>
        <p className="mt-3 text-xs leading-6 text-red-700">
          ออเดอร์นี้ถูกยกเลิกเพราะยังไม่ได้ส่งสลิป
          กรุณาเลือกอาหารและสร้างออเดอร์ใหม่
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex rounded-xl bg-brand px-5 py-3 text-xs font-semibold text-white"
        >
          กลับไปเลือกอาหาร
        </Link>
      </section>
    );
  if (!canSend)
    return (
      <section className="mt-7 rounded-2xl border border-sage/20 bg-sage-light p-6">
        <ShieldCheck size={29} className="text-sage" />
        <h2 className="mt-4 text-xl font-bold text-sage">
          {order.status === "payment_review"
            ? "รอร้านตรวจสอบการชำระเงิน"
            : statusLabels[order.status]}
        </h2>
        <p className="mt-3 text-xs leading-7 text-sage">
          {order.status === "payment_review"
            ? "ส่งภาพสลิปแล้ว ร้านต้องตรวจยอดเงินเข้าเองก่อนเริ่มเตรียมอาหาร ออเดอร์จะไม่ถูกยกเลิกอัตโนมัติเพราะร้านตรวจช้า"
            : "ดูความคืบหน้าและเวลารับได้ที่รายละเอียดออเดอร์"}
        </p>
        {order.status === "payment_review" && (
          <p className="mt-3 text-[11px] leading-6 text-sage">
            หลังส่งสลิปแล้วเปลี่ยนภาพเองไม่ได้ หากต้องแก้ไข
            ให้ติดต่อร้านและรอร้านแจ้งปัญหาเพื่อส่งภาพใหม่ ประวัติเดิมจะยังอยู่
          </p>
        )}
        <Link
          href={detailHref(order.id)}
          className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-sage"
        >
          ดูรายละเอียดออเดอร์
          <ArrowRight size={14} />
        </Link>
      </section>
    );
  return (
    <>
      <section className="mt-7 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold">ข้อมูลชำระเงินของร้าน</h2>
          <span className="rounded-lg bg-peach px-3 py-2 text-xs font-bold text-brand">
            {baht(order.total)}
          </span>
        </div>
        <div className="grid items-center gap-6 sm:grid-cols-[190px_1fr]">
          <div>
            {shopConfig.qr ? (
              <FoodImage
                src={shopConfig.qr}
                alt="QR ร้าน ข้อมูลทดลอง"
                className="mx-auto size-44"
              />
            ) : (
              <MockQr />
            )}
            <p className="mt-3 text-center text-[10px] font-semibold text-red-600">
              QR ตัวอย่าง · ห้ามใช้โอนเงินจริง
            </p>
          </div>
          <dl className="space-y-3 text-xs">
            <div>
              <dt className="text-muted">ชื่อบัญชีตัวอย่าง</dt>
              <dd className="mt-1 font-semibold">
                {shopConfig.recipient} (บัญชีสาธิต)
              </dd>
            </div>
            <div>
              <dt className="text-muted">ธนาคาร / เลขบัญชี</dt>
              <dd className="mt-1">
                {shopConfig.bank} · {shopConfig.account}
              </dd>
            </div>
            <div>
              <dt className="text-muted">ยอดที่ต้องจ่ายตามออเดอร์</dt>
              <dd className="mt-1 text-xl font-bold text-brand">
                {baht(order.total)}
              </dd>
            </div>
            <div className="rounded-xl bg-paper p-3 text-[10px] leading-6 text-muted">
              ทดลองแนบภาพแทนสลิปได้ ไม่มีการโอนเงิน ตรวจธนาคาร หรืออ่านสลิปด้วย
              AI ในขั้นตอนนี้
            </div>
          </dl>
        </div>
      </section>
      <section className="mt-6 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold">แนบสลิปการชำระเงิน</h2>
          {order.status === "awaiting_payment" && (
            <span
              role="timer"
              aria-label="เวลาที่เหลือส่งสลิป"
              className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700 tabular-nums"
            >
              <Clock3 size={15} />
              {seconds === null
                ? "--:--"
                : `${Math.floor(seconds / 60)
                    .toString()
                    .padStart(
                      2,
                      "0",
                    )}:${(seconds % 60).toString().padStart(2, "0")}`}
            </span>
          )}
        </div>
        {order.status === "payment_issue" && (
          <p className="mt-4 rounded-xl bg-red-50 p-4 text-xs leading-6 text-red-700">
            {order.history.at(-1)?.note ||
              "ร้านแจ้งปัญหาการชำระเงิน กรุณาตรวจสอบและส่งสลิปใหม่"}{" "}
            · ประวัติสลิปเดิมจะยังถูกเก็บไว้
          </p>
        )}
        <ErrorNotice message={error} />
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="เลือกภาพสลิป"
          className="sr-only"
          disabled={busy}
          onChange={async (e) => {
            const next = e.target.files?.[0];
            e.target.value = "";
            setError("");
            if (!next) return;
            if (
              !["image/jpeg", "image/png", "image/webp"].includes(next.type)
            ) {
              setError("รองรับเฉพาะ JPG, PNG หรือ WebP");
              return;
            }
            if (next.size > 5 * 1024 * 1024) {
              setError("ภาพต้องมีขนาดไม่เกิน 5 MB");
              return;
            }
            try {
              const bitmap = await createImageBitmap(next);
              bitmap.close();
              setFile(next);
            } catch {
              setError("อ่านภาพนี้ไม่ได้ กรุณาเลือกไฟล์รูปภาพอื่น");
            }
          }}
        />
        {preview ? (
          <div className="mt-5 rounded-2xl border border-line bg-paper p-4">
            <img
              src={preview}
              alt="ตัวอย่างภาพสลิปก่อนส่ง"
              className="mx-auto max-h-80 w-full rounded-xl object-contain"
            />
            <p className="mt-3 truncate text-center text-[10px] text-muted">
              {file?.name}
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <Button
                disabled={busy}
                variant="secondary"
                onClick={() => input.current?.click()}
              >
                <RotateCcw size={14} />
                เปลี่ยนรูป
              </Button>
              <Button
                disabled={busy}
                variant="secondary"
                onClick={() => setFile(null)}
              >
                <X size={14} />
                นำรูปออก
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => input.current?.click()}
            className="mt-5 flex min-h-44 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-brand/30 bg-peach/30 px-5 py-7 text-brand"
          >
            <UploadCloud size={31} strokeWidth={1.5} />
            <b className="text-sm">เลือกภาพสลิป</b>
            <span className="text-[10px] text-muted">
              JPG, PNG หรือ WebP · ไม่เกิน 5 MB
            </span>
          </button>
        )}
        <Button
          className="mt-5 w-full"
          disabled={
            !file || busy || (order.status === "awaiting_payment" && !seconds)
          }
          onClick={async () => {
            if (!file || lock.current) return;
            lock.current = true;
            setBusy(true);
            setError("");
            try {
              const slipId = crypto.randomUUID();
              await saveSlipFile(slipId, file);
              sendSlip(order.id, slipId, file.name);
              setFile(null);
              notify("ส่งสลิปแล้ว รอร้านตรวจสอบการชำระเงิน");
            } catch (ex) {
              setError(
                (ex as Error).message || "ส่งสลิปไม่สำเร็จ กรุณาลองใหม่",
              );
            } finally {
              lock.current = false;
              setBusy(false);
            }
          }}
        >
          {busy ? "กำลังบันทึกสลิป…" : "ส่งสลิปให้ร้านตรวจสอบ"}
          <ArrowRight size={15} />
        </Button>
        <p className="mt-3 text-[10px] leading-6 text-muted">
          ก่อนส่งเปลี่ยนภาพได้ หลังส่งให้ตรวจประวัติด้านล่าง
          ภาพถูกเก็บบนเซิร์ฟเวอร์ในเครื่องนี้
        </p>
      </section>
    </>
  );
}
export function OrderScreen({ payment = false }: { payment?: boolean }) {
  const search = useSearchParams(),
    { orders, ready, account } = useDemo();
  const id = search.get(payment ? "order" : "id");
  const order = orders.find((o) => o.id === id);

  return (
    <AccountGate>
      {ready &&
        account &&
        (!order ? (
          <EmptyState
            icon={<ReceiptText size={30} />}
            title="ไม่พบออเดอร์ของคุณ"
            description="ออเดอร์นี้อาจอยู่ในบัญชีหรือเบราว์เซอร์อื่น กรุณากลับไปที่รายการออเดอร์"
          >
            <Link href="/orders/" className="text-sm font-semibold text-brand">
              กลับออเดอร์ของฉัน
            </Link>
          </EmptyState>
        ) : (
          <div className="mx-auto max-w-3xl">
            <Link
              href="/orders/"
              className="inline-flex items-center gap-2 text-xs text-muted"
            >
              <ArrowLeft size={14} />
              ออเดอร์ของฉัน
            </Link>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[10px] font-semibold tracking-[1px] text-brand">
                #{order.id}
              </p>
              <StatusBadge status={order.status} />
            </div>
            <h1 className="mt-3 text-3xl font-bold">
              {payment ? "ชำระเงินและแนบสลิป" : order.restaurantName}
            </h1>
            {order.demoExample && (
              <p className="mt-3 text-xs text-muted">
                ออเดอร์ตัวอย่างสำหรับทดลองสถานะ
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
              <span className="flex items-center gap-2">
                <Clock3 size={14} />
                รับ {order.pickupDate} · {order.pickupTime}
              </span>
              <span className="flex items-center gap-2">
                <MapPin size={14} />
                {order.location} · รับเองที่ร้าน
              </span>
            </div>
            {payment ? (
              <PaymentForm order={order} />
            ) : (
              <>
                <div className="mt-6 rounded-2xl border border-line bg-white p-5 sm:p-6">
                  <h2 className="text-base font-bold">ข้อมูลการรับอาหาร</h2>
                  <dl className="mt-4 grid gap-4 text-xs sm:grid-cols-2">
                    <div>
                      <dt className="text-muted">เบอร์โทรติดต่อ</dt>
                      <dd className="mt-1 font-semibold">{order.phone}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">ยอดรวม</dt>
                      <dd className="mt-1 font-semibold">
                        {baht(order.total)}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-muted">หมายเหตุถึงร้าน</dt>
                      <dd className="mt-1 leading-6">
                        {order.note || "ไม่มีหมายเหตุ"}
                      </dd>
                    </div>
                  </dl>
                  {order.status === "ready" && (
                    <div className="mt-5 rounded-xl border border-sage/20 bg-sage-light p-5 text-center text-sage">
                      <p className="text-xs">
                        อาหารพร้อมแล้ว แสดงรหัสนี้ที่ร้าน
                      </p>
                      <p className="mt-3 text-3xl font-extrabold tracking-[6px]">
                        {order.pickupCode}
                      </p>
                      <p className="mt-3 text-[10px]">
                        ให้ร้านตรวจรหัสก่อนบันทึกรับอาหาร
                      </p>
                    </div>
                  )}
                  <div className="mt-5 flex flex-wrap gap-3">
                    {["awaiting_payment", "payment_issue"].includes(
                      order.status,
                    ) && (
                      <Link
                        href={paymentHref(order.id)}
                        className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-xs font-semibold text-white"
                      >
                        {order.status === "payment_issue"
                          ? "แก้ไขสลิป"
                          : "ไปชำระเงิน / แนบสลิป"}
                        <ArrowRight size={14} />
                      </Link>
                    )}
                    <Link
                      className="inline-flex items-center gap-2 rounded-xl border border-line px-5 py-3 text-xs"
                      href={chatHref(order.id)}
                    >
                      <MessageCircle size={15} />
                      แชทกับร้าน
                    </Link>
                    {order.status === "cancelled" && (
                      <Link
                        className="inline-flex items-center rounded-xl bg-brand px-5 py-3 text-xs text-white"
                        href="/"
                      >
                        กลับไปเลือกอาหาร
                      </Link>
                    )}
                  </div>
                  {order.status === "payment_review" && (
                    <p className="mt-4 rounded-xl bg-blue-50 p-4 text-xs leading-6 text-blue-700">
                      รอร้านตรวจสอบเงินเข้า
                      ออเดอร์นี้จะไม่ยกเลิกอัตโนมัติระหว่างรอตรวจ
                    </p>
                  )}
                </div>
                <OrderLines order={order} />
                <OrderTimeline order={order} />
              </>
            )}
            <SlipHistory order={order} />
            <CollaborationPanel order={order} />
            {payment && (
              <Link
                className="mt-6 inline-flex items-center gap-2 text-xs text-brand"
                href={detailHref(order.id)}
              >
                ดูรายการอาหารและประวัติออเดอร์
                <ArrowRight size={14} />
              </Link>
            )}
          </div>
        ))}
    </AccountGate>
  );
}
