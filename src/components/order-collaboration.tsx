"use client";
import Link from "next/link";
import { useEffect, useState, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useDemo } from "./demo-provider";
import { Button, Modal } from "./ui";
import { AccountGate, ErrorNotice, Field } from "./account-pages";
import { restaurants, baht } from "@/lib/data";
import { dateTime, statusLabels, type Order } from "@/lib/orders";
import { unread, type Role, type Action } from "@/lib/collaboration";
import { loadSlipFile, saveSlipFile } from "@/lib/browser-storage";
import { useMerchantCatalog } from "./merchant-catalog";
export const chatHref = (id: string, shop?: string) =>
  `/chat/?order=${encodeURIComponent(id)}${shop ? `&shop=${encodeURIComponent(shop)}` : ""}`;
async function saveImage(file: File) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  )
    throw Error("ใช้รูป JPG/PNG/WebP ไม่เกิน 5 MB");
  const bitmap = await createImageBitmap(file);
  bitmap.close();
  const id = crypto.randomUUID();
  await saveSlipFile(id, file);
  return id;
}
export function Evidence({ id, name }: { id: string; name: string }) {
  const [src, setSrc] = useState<string | null>(null),
    [error, setError] = useState("");
  useEffect(
    () => () => {
      if (src) URL.revokeObjectURL(src);
    },
    [src],
  );
  return (
    <>
      <button
        className="text-xs text-brand underline"
        onClick={async () => {
          try {
            const blob = await loadSlipFile(id);
            if (!blob) throw Error("ไม่พบรูปแนบในฐานข้อมูลหรือข้อมูลเดิมของเครื่องนี้");
            setSrc(URL.createObjectURL(blob));
            setError("");
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        ดูรูป: {name}
      </button>
      <ErrorNotice message={error} />
      <Modal open={!!src} onClose={() => setSrc(null)} title="ภาพแนบ" wide>
        {src && (
          <img
            src={src}
            alt={name}
            className="max-h-[80vh] w-full object-contain p-5 pt-14"
          />
        )}
      </Modal>
    </>
  );
}
export function CollaborationPanel({
  order,
  merchant = false,
}: {
  order: Order;
  merchant?: boolean;
}) {
  const { collaborate } = useDemo();
  useMerchantCatalog();
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [checked, setChecked] = useState(false);
  useEffect(() => { setChecked(false); setError(''); setNotice(''); }, [order.id, order.extraDue]);
  const p = order.proposals?.at(-1),
    shop = restaurants.find((r) => r.id === order.restaurantId)!;
  const run = (action: Action) => {
    try {
      collaborate(order.id, action, merchant ? order.restaurantId : undefined);
      setError("");
      setNotice("บันทึกรายการแล้ว");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  };
  return (
    <section className="mt-6 space-y-5 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 className="text-lg font-bold">เปลี่ยนเมนูและคืนเงิน</h2>
      <ErrorNotice message={error} />
      {notice && (
        <p role="status" className="text-xs text-sage">
          {notice}
        </p>
      )}
      <Link
        className="inline-block rounded-lg bg-peach px-4 py-3 text-xs font-semibold text-brand"
        href={chatHref(order.id, merchant ? order.restaurantId : undefined)}
      >
        แชทเกี่ยวกับออเดอร์นี้ →
      </Link>
      {(order.proposals ?? []).map((proposal) => (
        <article
          key={proposal.id}
          className="rounded-xl border border-line bg-paper p-4 text-xs leading-7"
        >
          <b>
            ข้อเสนอเปลี่ยนเป็น {proposal.replacement.name} ×
            {proposal.replacement.quantity}
          </b>
          <p>เหตุผล: {proposal.reason}</p>
          <p>
            ส่วนต่าง {proposal.delta > 0 ? "+" : ""}
            {baht(proposal.delta)}{" "}
            {proposal.delta < 0 ? "· ร้านต้องบันทึกคืนส่วนต่างแยกต่างหาก" : ""}
          </p>
          <p className="font-semibold text-brand">
            {
              {
                pending: "รอตกลงกับลูกค้า",
                accepted: "ลูกค้ายอมรับแล้ว",
                declined: "ลูกค้าไม่ยอมรับ",
                withdrawn: "ยกเลิกข้อเสนอแล้ว",
              }[proposal.status]
            }
          </p>
          {proposal.status === "pending" && !merchant && (
            <div className="mt-3 flex flex-wrap gap-3">
              <Button onClick={() => run({ type: "accept", id: proposal.id })}>
                ยอมรับเมนูใหม่
              </Button>
              <Button
                variant="secondary"
                onClick={() => run({ type: "decline", id: proposal.id })}
              >
                ไม่ยอมรับ
              </Button>
            </div>
          )}
          {merchant && ["pending", "declined"].includes(proposal.status) && (
            <Button
              variant="secondary"
              onClick={() => run({ type: "withdraw", id: proposal.id })}
            >
              ยกเลิกข้อเสนอ / กลับรายการเดิม
            </Button>
          )}
        </article>
      ))}
      {merchant && order.status === "preparing" && p?.status !== "pending" && (
        <form
          className="space-y-3 rounded-xl bg-paper p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            run({
              type: "offer",
              id: crypto.randomUUID(),
              lineIndex: Number(f.get("line")),
              menuId: String(f.get("menu")),
              reason: String(f.get("reason")),
            });
          }}
        >
          <h3 className="font-semibold">เสนอเปลี่ยนเมนู</h3>
          <label className="block text-xs">
            รายการเดิม
            <select
              name="line"
              className="mt-2 w-full rounded-lg border border-line bg-white p-3"
            >
              {order.lines.map((l, i) => (
                <option key={i} value={i}>
                  {l.name} ×{l.quantity}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            เมนูใหม่
            <select
              name="menu"
              required
              className="mt-2 w-full rounded-lg border border-line bg-white p-3"
            >
              {shop.menus
                .filter((m) => m.stock > 0 && m.enabled !== false)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · {baht(m.price)}
                  </option>
                ))}
            </select>
          </label>
          <Field
            name="reason"
            label="เหตุผลการเปลี่ยนเมนู"
            required
            maxLength={500}
          />
          <Button>ส่งข้อเสนอให้ลูกค้า</Button>
          <p className="text-xs leading-6 text-muted">
            ยังไม่เปลี่ยนรายการอาหารจนกว่าลูกค้าจะยอมรับ
            เมนูใหม่ใช้สูตรปกติและจำนวนเท่ารายการเดิม
          </p>
        </form>
      )}
      {!!order.extraDue && (
        <div className="rounded-xl bg-amber-50 p-4 text-xs leading-7 text-amber-800">
          <b>ส่วนต่างค้างชำระ {baht(order.extraDue)}</b>
          <p>ยังทำเป็นพร้อมรับไม่ได้จนกว่าร้านตรวจเงินส่วนต่าง</p>
          {merchant && (
            <>
              <label className="my-3 flex gap-2">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                />
                ตรวจเงินส่วนต่างเข้าจริงแล้ว (จำลอง)
              </label>
              <Button
                disabled={!checked}
                onClick={() => {
                  if (run({ type: "settle_extra" })) setChecked(false);
                }}
              >
                บันทึกตรวจเงินส่วนต่าง
              </Button>
            </>
          )}
        </div>
      )}
      {(order.refunds ?? []).map((refund) => (
        <article
          key={refund.id}
          className="space-y-3 rounded-xl border border-line p-4 text-xs leading-7"
        >
          <h3 className="font-bold">คืนเงิน {baht(refund.amount)}</h3>
          <p>{refund.reason}</p>
          <p className="font-semibold text-brand">
            {
              {
                awaiting_agreement: "รอตกลงกับลูกค้า",
                awaiting_refund: "รอคืนเงิน",
                refunded: "คืนเงินแล้ว",
              }[refund.status]
            }
          </p>
          <p className="text-muted">{dateTime(refund.at)}</p>
          {!merchant && refund.status === "awaiting_agreement" && (
            <Button
              onClick={() => run({ type: "agree_refund", id: refund.id })}
            >
              ยอมรับยอดและเหตุผลคืนเงิน
            </Button>
          )}
          {refund.proofId && (
            <Evidence
              id={refund.proofId}
              name={refund.proofName ?? "หลักฐานคืนเงิน"}
            />
          )}
          {merchant && refund.status === "awaiting_refund" && (
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (busy) return;
                const f = new FormData(e.currentTarget),
                  file = f.get("proof") as File;
                setBusy(true);
                try {
                  const id = await saveImage(file);
                  run({
                    type: "complete_refund",
                    id: refund.id,
                    proofId: id,
                    proofName: file.name,
                  });
                } catch (ex) {
                  setError((ex as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label className="block">
                หลักฐานคืนเงิน
                <input
                  required
                  name="proof"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="block w-full py-3"
                />
              </label>
              <label className="flex gap-2">
                <input type="checkbox" required />
                ร้านดำเนินการคืนเงินเองแล้ว (จำลอง)
              </label>
              <Button disabled={busy}>
                {busy ? "กำลังบันทึก…" : "บันทึกคืนเงินแล้วและแนบหลักฐาน"}
              </Button>
            </form>
          )}
        </article>
      ))}
      {merchant &&
        ["preparing", "ready", "received"].includes(order.status) && (
          <form
            className="space-y-3 rounded-xl bg-paper p-4"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              run({
                type: "refund",
                id: crypto.randomUUID(),
                amount: Number(f.get("amount")),
                reason: String(f.get("reason")),
              });
            }}
          >
            <h3 className="font-semibold">บันทึกข้อเสนอคืนเงิน</h3>
            <p className="text-xs text-muted">
              ยอดที่ร้านรับไว้ {baht(order.paidTotal ?? order.total)} ·
              ยอดอาหารปัจจุบัน {baht(order.total)}
            </p>
            <Field
              label="ยอดคืนเงิน"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
            />
            <Field label="เหตุผล" name="reason" required maxLength={500} />
            <Button>ส่งยอดคืนเงินให้ลูกค้าตกลง</Button>
          </form>
        )}
      <p className="text-[11px] leading-6 text-muted">
        ระบบบันทึกข้อตกลงและหลักฐานเท่านั้น ร้านดำเนินการรับหรือคืนเงินเอง
        ไม่มีการโอนเงินอัตโนมัติ
      </p>
    </section>
  );
}
export function ChatInbox({ shop }: { shop: string }) {
  const { allOrders } = useDemo();
  const orders = allOrders
    .filter((o) => o.restaurantId === shop)
    .sort(
      (a, b) =>
        (b.messages?.at(-1)?.at ?? b.createdAt) -
        (a.messages?.at(-1)?.at ?? a.createdAt),
    );
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold">แชทตามออเดอร์</h2>
      {!orders.length && (
        <p className="rounded-xl bg-white p-6 text-sm text-muted">
          ยังไม่มีออเดอร์สำหรับเปิดแชท
        </p>
      )}
      {orders.map((o) => (
        <Link
          key={o.id}
          href={chatHref(o.id, shop)}
          className="block rounded-xl border border-line bg-white p-5"
        >
          <p className="text-sm font-semibold">
            #{o.id}{" "}
            {unread(o, "merchant") > 0 && (
              <span className="ml-2 rounded-full bg-brand px-2 py-1 text-xs text-white">
                {unread(o, "merchant")} ใหม่
              </span>
            )}
          </p>
          <p className="mt-2 truncate text-xs text-muted">
            {o.messages?.filter((m) => m.status === "sent").at(-1)?.text ||
              "ยังไม่มีข้อความ · เปิดบทสนทนา"}
          </p>
        </Link>
      ))}
    </div>
  );
}
export function ChatPage() {
  const params = useSearchParams(),
    demo = useDemo();
  const id = params.get("order"),
    shop = params.get("shop"),
    role: Role = shop ? "merchant" : "customer";
  const order = demo.allOrders.find(
    (o) =>
      o.id === id &&
      (shop ? o.restaurantId === shop : o.userId === demo.account?.id),
  );
  const [text, setText] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [fail, setFail] = useState(false);
  const count = order ? unread(order, role) : 0;
  useEffect(() => { setText(''); setFile(null); setError(''); setFail(false); }, [order?.id, role]);
  useEffect(() => {
    if (order && count > 0) {
      try {
        demo.collaborate(order.id, { type: "read" }, shop ?? undefined);
      } catch {}
    }
  }, [order?.id, count, role]);
  if (!demo.ready) return <p role="status">กำลังโหลดบทสนทนา…</p>;
  if (!shop && !demo.account) return <AccountGate><span/></AccountGate>;
  if (!order)
    return (
      <div className="rounded-xl bg-white p-6">
        <h1 className="text-xl font-bold">ไม่พบบทสนทนาที่เกี่ยวข้องกับคุณ</h1>
        <Link className="mt-4 inline-block text-brand" href="/orders/">
          กลับออเดอร์ของฉัน
        </Link>
      </div>
    );
  return (
    <section className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-line bg-white p-5">
        <p className="text-xs text-brand">
          แชทตามออเดอร์ ·{" "}
          {role === "merchant" ? "พื้นที่ร้านจำลอง" : "ผู้ใช้บริการ"}
        </p>
        <h1 className="mt-2 text-xl font-bold">#{order.id}</h1>
        <p className="mt-3 text-xs text-muted">
          {order.restaurantName} · {statusLabels[order.status]}
        </p>
        <Link
          className="mt-3 inline-block text-xs text-brand"
          href={
            shop
              ? `/merchant/?shop=${encodeURIComponent(order.restaurantId)}&order=${encodeURIComponent(order.id)}`
              : `/orders/detail/?id=${encodeURIComponent(order.id)}`
          }
        >
          ดูรายละเอียดออเดอร์ →
        </Link>
      </div>
      <div
        role="log"
        aria-label="บทสนทนาออเดอร์"
        aria-live="polite"
        className="my-5 max-h-[55vh] min-h-52 space-y-4 overflow-y-auto rounded-2xl bg-white p-5"
      >
        {!order.messages?.length && (
          <p className="py-10 text-center text-xs text-muted">
            เริ่มพูดคุยกับ{role === "customer" ? "ร้าน" : "ลูกค้า"}ได้เลย
          </p>
        )}
        {(order.messages ?? [])
          .filter((m) => m.status === "sent" || m.role === role)
          .map((m) => (
            <article
              key={m.id}
              className={`max-w-[90%] rounded-xl p-4 text-sm ${m.role === role ? "ml-auto bg-peach" : "bg-paper"}`}
            >
              <p className="mb-2 text-[10px] text-muted">
                {m.role === role
                  ? "คุณ"
                  : m.role === "merchant"
                    ? "ร้านอาหาร"
                    : "ลูกค้า"}
              </p>
              <p className="whitespace-pre-wrap break-words">{m.text}</p>
              {m.fileId && (
                <div className="mt-2">
                  <Evidence id={m.fileId} name={m.fileName ?? "ภาพแนบ"} />
                </div>
              )}
              <p className="mt-2 text-[9px] text-muted">{dateTime(m.at)}</p>
              {m.status === "failed" && (
                <button
                  className="mt-2 text-xs text-red-600 underline"
                  onClick={() => {
                    try {
                      demo.collaborate(
                        order.id,
                        { type: "retry", id: m.id },
                        shop ?? undefined,
                      );
                      setError("");
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  ส่งไม่สำเร็จ · ลองใหม่
                </button>
              )}
            </article>
          ))}
      </div>
      <ErrorNotice message={error} />
      <form
        className="space-y-3 rounded-2xl border border-line bg-white p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy || (!text.trim() && !file)) return;
          setBusy(true);
          setError("");
          try {
            const fileId = file ? await saveImage(file) : undefined;
            demo.collaborate(
              order.id,
              {
                type: "message",
                id: crypto.randomUUID(),
                text,
                fileId,
                fileName: file?.name,
                fail,
              },
              shop ?? undefined,
            );
            setText("");
            setFile(null);
          } catch (ex) {
            setError((ex as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block text-xs">
          ข้อความ
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            className="mt-2 min-h-24 w-full rounded-xl border border-line p-3 text-sm"
            placeholder="พิมพ์ข้อความเกี่ยวกับออเดอร์นี้"
          />
        </label>
        <label className="block text-xs">
          แนบรูป (ไม่เกิน 5 MB)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
            className="mt-2 block w-full"
            disabled={busy}
          />
        </label>
        {file && (
          <p className="text-xs">
            {file.name}{" "}
            <button
              type="button"
              className="text-brand"
              onClick={() => setFile(null)}
            >
              นำออก
            </button>
          </p>
        )}
        <Button disabled={busy || (!text.trim() && !file)}>
          {busy ? "กำลังส่ง…" : "ส่งข้อความ"}
        </Button>
        <details className="text-[10px] text-muted">
          <summary className="cursor-pointer">ทดลองกรณีส่งไม่สำเร็จ</summary>
          <label className="mt-3 flex gap-2">
            <input
              type="checkbox"
              checked={fail}
              onChange={(e) => setFail(e.target.checked)}
            />
            จำลองส่งข้อความล้มเหลว แล้วใช้ปุ่มลองใหม่
          </label>
        </details>
        <p className="text-[10px] leading-6 text-muted">
          ข้อความไม่เปลี่ยนสถานะออเดอร์ การรับเงิน เปลี่ยนเมนู
          และคืนเงินต้องบันทึกผ่านส่วนจัดการออเดอร์ ·
          ข้อมูลและรูปแนบเก็บใน PostgreSQL ของเครื่องนี้
        </p>
      </form>
    </section>
  );
}
