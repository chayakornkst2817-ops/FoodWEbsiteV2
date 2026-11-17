import { defaultOptionIds, matchesMenu } from "./menu-options.ts";
import type { Order, OrderLine } from "./orders.ts";
import { restaurants } from "./data.ts";
export type Role = "customer" | "merchant";
export type Message = {
  id: string;
  role: Role;
  text: string;
  at: number;
  status: "sent" | "failed";
  fileId?: string;
  fileName?: string;
};
export type Proposal = {
  id: string;
  lineIndex: number;
  replacement: OrderLine;
  reason: string;
  delta: number;
  at: number;
  status: "pending" | "accepted" | "declined" | "withdrawn";
};
export type Refund = {
  id: string;
  amount: number;
  reason: string;
  at: number;
  status: "awaiting_agreement" | "awaiting_refund" | "refunded";
  proofId?: string;
  proofName?: string;
  completedAt?: number;
};
export type Action =
  | {
      type: "message";
      id: string;
      text: string;
      fileId?: string;
      fileName?: string;
      fail?: boolean;
    }
  | { type: "retry"; id: string }
  | { type: "read" }
  | {
      type: "offer";
      id: string;
      lineIndex: number;
      menuId: string;
      reason: string;
    }
  | { type: "accept" | "decline" | "withdraw"; id: string }
  | { type: "settle_extra" }
  | { type: "refund"; id: string; amount: number; reason: string }
  | { type: "agree_refund"; id: string }
  | { type: "complete_refund"; id: string; proofId: string; proofName: string };
export function unread(order: Order, role: Role) {
  return (order.messages ?? []).filter(
    (m) =>
      m.role !== role &&
      m.status === "sent" &&
      m.at > (order.chatRead?.[role] ?? 0),
  ).length;
}
export function collaboration(
  order: Order,
  actor: { role: Role; id: string },
  a: Action,
  now: number,
  orders: Order[] = [],
): Order {
  if (
    actor.role === "customer"
      ? actor.id !== order.userId
      : actor.id !== order.restaurantId
  )
    throw Error("ไม่มีสิทธิ์จัดการออเดอร์นี้");
  const merchant = () => {
      if (actor.role !== "merchant") throw Error("เฉพาะร้านอาหารเท่านั้น");
    },
    customer = () => {
      if (actor.role !== "customer") throw Error("เฉพาะเจ้าของออเดอร์เท่านั้น");
    };
  const log = (note: string) => [
    ...order.history,
    { status: order.status, at: now, note },
  ];
  if (a.type === "message") {
    if (!(a.text.trim() || a.fileId) || a.text.length > 2000)
      throw Error("ข้อความต้องไม่ว่างและยาวไม่เกิน 2,000 ตัวอักษร");
    if (order.messages?.some((m) => m.id === a.id))
      throw Error("ส่งข้อความนี้แล้ว");
    return {
      ...order,
      messages: [
        ...(order.messages ?? []),
        {
          id: a.id,
          role: actor.role,
          text: a.text.trim(),
          at: now,
          status: a.fail ? "failed" : "sent",
          fileId: a.fileId,
          fileName: a.fileName,
        },
      ],
    };
  }
  if (a.type === "retry") {
    const m = order.messages?.find((m) => m.id === a.id);
    if (!m || m.role !== actor.role || m.status !== "failed")
      throw Error("ข้อความนี้ลองใหม่ไม่ได้");
    return {
      ...order,
      messages: order.messages!.map((m) =>
        m.id === a.id ? { ...m, status: "sent", at: now } : m,
      ),
    };
  }
  if (a.type === "read")
    return { ...order, chatRead: { ...order.chatRead, [actor.role]: now } };
  if (a.type === "offer") {
    merchant();
    if (order.status !== "preparing")
      throw Error("ต้องตรวจเงินและอยู่ระหว่างเตรียมอาหารก่อนเสนอเปลี่ยนเมนู");
    if (
      order.proposals?.at(-1)?.status === "pending" ||
      order.refunds?.some((r) => r.status !== "refunded")
    )
      throw Error("กรุณาจัดการรายการที่รออยู่ก่อน");
    const old = order.lines[a.lineIndex],
      r = restaurants.find((r) => r.id === order.restaurantId),
      m = r?.menus.find((m) => m.id === a.menuId);
    if (
      !old ||
      !m ||
      m.enabled === false ||
      m.stock < old.quantity ||
      !a.reason.trim()
    )
      throw Error("เมนู จำนวนคงเหลือ หรือเหตุผลไม่ถูกต้อง");
    const replacement = {
      menuId: m.id,
      name: m.name,
      image: m.image,
      options: m.options.filter(o => defaultOptionIds(m).includes(o.id)).map(o => o.name),
      price: m.price + m.options.filter(o => defaultOptionIds(m).includes(o.id)).reduce((sum, o) => sum + o.price, 0),
      quantity: old.quantity,
    };
    return {
      ...order,
      paidTotal: order.paidTotal ?? order.total,
      proposals: [
        ...(order.proposals ?? []),
        {
          id: a.id,
          lineIndex: a.lineIndex,
          replacement,
          reason: a.reason.trim(),
          delta: Math.round((replacement.price - old.price) * old.quantity * 100) / 100,
          at: now,
          status: "pending",
        },
      ],
      history: log("ร้านเสนอเปลี่ยนเมนู รอลูกค้ายอมรับ"),
    };
  }
  if (a.type === "accept" || a.type === "decline" || a.type === "withdraw") {
    const p = order.proposals?.at(-1);
    if (
      !p ||
      p.id !== a.id ||
      !(a.type === "withdraw"
        ? ["pending", "declined"].includes(p.status)
        : p.status === "pending")
    )
      throw Error("ข้อเสนอนี้ไม่อยู่ระหว่างรอตอบรับ");
    if (a.type === "withdraw") merchant();
    else customer();
    if (order.status !== "preparing")
      throw Error("ออเดอร์ไม่ได้อยู่ระหว่างเตรียมอาหาร");
    if (a.type === "accept") {
      const m = restaurants
        .find((r) => r.id === order.restaurantId)
        ?.menus.find((m) => m.id === p.replacement.menuId);
      const used =
        orders
          .filter(
            (o) =>
              o.id !== order.id &&
              o.restaurantId === order.restaurantId &&
              o.pickupDate === order.pickupDate &&
              o.status !== "cancelled" &&
              !o.demoExample,
          )
          .flatMap((o) => o.lines)
          .filter((l) => !!m && matchesMenu(m, l.menuId))
          .reduce((n, l) => n + l.quantity, 0) +
        order.lines
          .filter((l, i) => i !== p.lineIndex && !!m && matchesMenu(m, l.menuId))
          .reduce((n, l) => n + l.quantity, 0);
      if (!m || m.enabled === false || used + p.replacement.quantity > m.stock)
        throw Error("เมนูใหม่คงเหลือไม่พอ กรุณาให้ร้านเสนอใหม่");
    }
    const accepted = a.type === "accept";
    return {
      ...order,
      proposals: order.proposals!.map((x) =>
        x.id === p.id
          ? {
              ...x,
              status: accepted
                ? "accepted"
                : a.type === "decline"
                  ? "declined"
                  : "withdrawn",
            }
          : x,
      ),
      lines: accepted
        ? order.lines.map((l, i) => (i === p.lineIndex ? p.replacement : l))
        : order.lines,
      total: accepted
        ? Math.round((order.total + p.delta) * 100) / 100
        : order.total,
      extraDue: accepted
        ? Math.max(0, order.total + p.delta - (order.paidTotal ?? order.total) + (order.refunds??[]).filter(r=>r.status==='refunded').reduce((n,r)=>n+r.amount,0))
        : order.extraDue,
      history: log(
        accepted
          ? "ลูกค้ายอมรับเมนูใหม่แล้ว"
          : a.type === "decline"
            ? "ลูกค้าไม่ยอมรับข้อเสนอ"
            : "ร้านยกเลิกข้อเสนอ กลับใช้รายการเดิม",
      ),
    };
  }
  if (a.type === "settle_extra") {
    merchant();
    if(order.status!=='preparing') throw Error('ออเดอร์นี้ไม่อยู่ระหว่างเตรียมอาหาร');
    if (!(order.extraDue && order.extraDue > 0))
      throw Error("ไม่มีส่วนต่างค้างชำระ");
    return {
      ...order,
      paidTotal: (order.paidTotal ?? order.total) + order.extraDue,
      extraDue: 0,
      history: log("ร้านบันทึกตรวจเงินส่วนต่างเข้าด้วยตนเอง (จำลอง)"),
    };
  }
  if (a.type === "refund") {
    merchant();
    if (!["preparing", "ready", "received"].includes(order.status))
      throw Error("ต้องยืนยันเงินเข้าแล้วก่อนบันทึกคืนเงิน");
    if (order.proposals?.at(-1)?.status === "pending")
      throw Error("ยกเลิกข้อเสนอที่รออยู่ก่อน");
    if (order.refunds?.some((r) => r.status !== "refunded"))
      throw Error("มีรายการคืนเงินที่รออยู่แล้ว");
    const used = (order.refunds ?? []).reduce((n, r) => n + r.amount, 0);
    if (
      !Number.isFinite(a.amount) ||
      a.amount <= 0 ||
      Math.abs(Math.round(a.amount * 100) - a.amount * 100) > 0.00001 ||
      Math.round(a.amount * 100) + Math.round(used * 100) >
        Math.round((order.paidTotal ?? order.total) * 100) ||
      !a.reason.trim()
    )
      throw Error("ยอดคืนเงินหรือเหตุผลไม่ถูกต้อง หรือเกินยอดที่รับไว้");
    return {
      ...order,
      refunds: [
        ...(order.refunds ?? []),
        {
          id: a.id,
          amount: a.amount,
          reason: a.reason.trim(),
          at: now,
          status: "awaiting_agreement",
        },
      ],
      history: log("ร้านเสนอคืนเงิน รอตกลงกับลูกค้า"),
    };
  }
  const refund = order.refunds?.find((r) => r.id === a.id);
  if (!refund) throw Error("ไม่พบรายการคืนเงิน");
  if (a.type === "agree_refund") {
    customer();
    if (refund.status !== "awaiting_agreement")
      throw Error("รายการนี้ตอบรับแล้ว");
    return {
      ...order,
      refunds: order.refunds!.map((r) =>
        r.id === a.id ? { ...r, status: "awaiting_refund" } : r,
      ),
      history: log("ลูกค้าตกลงแล้ว รอร้านดำเนินการคืนเงิน"),
    };
  }
  if (a.type !== "complete_refund") throw Error("คำสั่งไม่ถูกต้อง");
  merchant();
  if (refund.status !== "awaiting_refund" || !a.proofId || !a.proofName)
    throw Error("ต้องได้รับการยอมรับและแนบหลักฐานก่อนบันทึกคืนเงิน");
  const next = order.refunds!.map((r) =>
    r.id === a.id
      ? {
          ...r,
          status: "refunded" as const,
          proofId: a.proofId,
          proofName: a.proofName,
          completedAt: now,
        }
      : r,
  );
  const full =
    next
      .filter((r) => r.status === "refunded")
      .reduce((n, r) => n + r.amount, 0) >= (order.paidTotal ?? order.total);
  return {
    ...order,
    refunds: next,
    extraDue: full ? 0 : order.extraDue,
    status: full && order.status !== "received" ? "cancelled" : order.status,
    history: [
      ...order.history,
      {
        status:
          full && order.status !== "received" ? "cancelled" : order.status,
        at: now,
        note: "ร้านบันทึกคืนเงินและแนบหลักฐานแล้ว ระบบไม่ได้โอนเงินอัตโนมัติ",
      },
    ],
  };
}
