import { pickupTimestamp, validPickupClock, SHOP_CLOSED_MESSAGE } from "./pickup.ts";
import { matchesMenu } from "./menu-options.ts";
import type { Message, Proposal, Refund } from "./collaboration.ts";
import {
  pickupSlots,
  restaurants,
  configuredSlots,
} from "./data.ts";
import { cartReducer, resolveItem, type CartItem } from "./cart.ts";

export type OrderStatus =
  | "awaiting_payment"
  | "payment_review"
  | "payment_issue"
  | "preparing"
  | "ready"
  | "received"
  | "cancelled";
export const statusLabels: Record<OrderStatus, string> = {
  awaiting_payment: "รอชำระเงิน",
  payment_review: "รอตรวจสอบการชำระเงิน",
  payment_issue: "การชำระเงินมีปัญหา",
  preparing: "กำลังเตรียมอาหาร",
  ready: "พร้อมรับ",
  received: "รับแล้ว",
  cancelled: "ยกเลิกแล้ว",
};
export type OrderLine = {
  menuId: string;
  name: string;
  image: string;
  options: string[];
  price: number;
  quantity: number;
};
export type Slip = {
  id: string;
  name: string;
  submittedAt: number;
  status: "submitted" | "issue";
  reason?: string;
};
export type Order = {
  messages?: Message[];
  chatRead?: Partial<Record<"customer" | "merchant", number>>;
  proposals?: Proposal[];
  refunds?: Refund[];
  paidTotal?: number;
  extraDue?: number;
  id: string;
  userId: string;
  restaurantId: string;
  restaurantName: string;
  location: string;
  lines: OrderLine[];
  total: number;
  pickupDate: string;
  pickupTime: string;
  phone: string;
  note: string;
  createdAt: number;
  expiresAt: number;
  status: OrderStatus;
  pickupCode: string;
  history: { status: OrderStatus; at: number; note?: string }[];
  slips: Slip[];
  demoExample?: boolean;
};
export const localDate = (at = Date.now()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
export const dateTime = (at: number) =>
  new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(at);
export const phoneValid = (phone: string) => /^0\d{8,9}$/.test(phone);
export const validClock = (time: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);
export function validPickupTime(time: string) {
  if(validPickupClock(time))return true;
  const [start, end, extra] = time.split("–");
  return !!end && !extra && validClock(start) && validClock(end) && start < end;
}
export function pickupSlotPast(date:string,time:string,now:number) {
  if(!validPickupTime(time))return true;
  const at=pickupTimestamp(date,time.split("–")[0]);
  return !Number.isFinite(at)||at<=now;
}
// A free pickup time never rolls the requested date forward based on legacy slots.
export const nextPickupDate=(now:number,_legacySlots=pickupSlots)=>localDate(now);
// Legacy quota helper retained only for historical data; new orders have no time-slot quota.
export function remainingCapacity(
  orders: Order[],
  restaurantId: string,
  date: string,
  time: string,
) {
  const slot = (configuredSlots[restaurantId] ?? pickupSlots).find(
    (s) => s.time === time,
  );
  if (!slot) return 0;
  return Math.max(
    0,
    slot.available -
      orders.filter(
        (o) =>
          o.restaurantId === restaurantId &&
          o.pickupDate === date &&
          o.pickupTime === time &&
          o.status !== "cancelled" &&
          !o.demoExample,
      ).length,
  );
}
export function expireOrders(orders: Order[], now: number): Order[] {
  let changed = false;
  const next = orders.map((order) => {
    if (order.status !== "awaiting_payment" || now < order.expiresAt)
      return order;
    changed = true;
    return {
      ...order,
      status: "cancelled" as const,
      history: [
        ...order.history,
        {
          status: "cancelled" as const,
          at: order.expiresAt,
          note: "หมดเวลาส่งสลิปก่อนชำระเงิน",
        },
      ],
    };
  });
  return changed ? next : orders;
}
export function createOrder(input: {
  id: string;
  userId: string;
  items: CartItem[];
  pickupDate: string;
  pickupTime: string;
  phone: string;
  note: string;
  timeoutMinutes: number;
  now: number;
  existingOrders: Order[];
}): Order {
  const clean = cartReducer([], { type: "restore", items: input.items });
  if (
    !clean.length ||
    clean.length !== input.items.length ||
    clean.some(
      (x, i) =>
        x.key !== input.items[i].key || x.quantity !== input.items[i].quantity,
    )
  )
    throw new Error("เมนูหรือจำนวนในตะกร้าไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง");
  const restaurant = restaurants.find((r) => r.id === clean[0].restaurantId)!;
  if(!restaurant.open)throw Error(SHOP_CLOSED_MESSAGE);
  if(!validPickupClock(input.pickupTime))throw Error("กรุณาระบุเวลาที่ต้องการมารับแบบ HH:mm");
  if (!phoneValid(input.phone))
    throw new Error("กรุณากรอกเบอร์โทร 9–10 หลัก เริ่มต้นด้วย 0");
  if (input.pickupDate < localDate(input.now))
    throw new Error("กรุณาเลือกวันที่รับอาหารใหม่");
  if (pickupSlotPast(input.pickupDate, input.pickupTime, input.now))
    throw new Error("ช่วงเวลานี้ผ่านไปแล้ว กรุณาเลือกเวลารับใหม่");
  if (
    !Number.isInteger(input.timeoutMinutes) ||
    input.timeoutMinutes < 1 ||
    input.timeoutMinutes > 30
  )
    throw new Error("เวลาส่งสลิปต้องอยู่ระหว่าง 1–30 นาที");
  const lines = clean.map((item) => {
    const info = resolveItem(item)!;
    return {
      menuId: item.menuId,
      name: info.menu.name,
      image: info.menu.image,
      options: info.options.map((o) => o.name),
      price: info.price,
      quantity: item.quantity,
    };
  });
  for (const menu of restaurant.menus) {
    const reserved = expireOrders(input.existingOrders, input.now)
      .filter(
        (o) =>
          o.restaurantId === restaurant.id &&
          o.pickupDate === input.pickupDate &&
          o.status !== "cancelled" &&
          !o.demoExample,
      )
      .flatMap((o) => o.lines)
      .filter((l) => matchesMenu(menu, l.menuId))
      .reduce((n, l) => n + l.quantity, 0);
    if (
      reserved +
        lines
          .filter((l) => matchesMenu(menu, l.menuId))
          .reduce((n, l) => n + l.quantity, 0) >
      menu.stock
    )
      throw new Error(`จำนวน ${menu.name} คงเหลือไม่เพียงพอ กรุณาแก้ไขตะกร้า`);
  }
  return {
    id: input.id,
    userId: input.userId,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    location: restaurant.location,
    lines,
    total: lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
    pickupDate: input.pickupDate,
    pickupTime: input.pickupTime,
    phone: input.phone,
    note: input.note.trim().slice(0, 500),
    createdAt: input.now,
    expiresAt: input.now + input.timeoutMinutes * 60_000,
    status: "awaiting_payment",
    pickupCode: input.id.slice(-6).toUpperCase(),
    history: [{ status: "awaiting_payment", at: input.now }],
    slips: [],
  };
}
export function submitSlip(order: Order, slip: Slip, now: number): Order {
  if (order.status !== "awaiting_payment" && order.status !== "payment_issue")
    throw new Error("ออเดอร์นี้ไม่อยู่ในสถานะที่ส่งสลิปได้");
  if (order.status === "awaiting_payment" && now >= order.expiresAt)
    throw new Error("หมดเวลาส่งสลิปแล้ว ออเดอร์ถูกยกเลิก");
  if (order.slips.some((s) => s.id === slip.id))
    throw new Error("ส่งสลิปนี้แล้ว");
  return {
    ...order,
    status: "payment_review",
    slips: [...order.slips, { ...slip, submittedAt: now }],
    history: [
      ...order.history,
      {
        status: "payment_review",
        at: now,
        note: order.slips.length
          ? "ส่งสลิปแก้ไขตามที่ร้านแจ้ง"
          : "ส่งสลิปแล้ว รอร้านตรวจสอบเงินเข้า",
      },
    ],
  };
}
