import type { Order, OrderStatus } from "./orders.ts";
export const paymentWarningTitle = "กรุณาตรวจสอบเงินเข้าก่อนเริ่มทำอาหาร";
export const paymentWarningText =
  "ผลจาก AI เป็นเพียงการอ่านข้อมูลบนภาพสลิป ไม่สามารถยืนยันว่าโอนเงินจริงได้ กรุณาตรวจสอบยอดเงินเข้าในบัญชีร้าน พร้อมเทียบจำนวนเงิน วันเวลา และรายการโอนให้ตรงกับออเดอร์ก่อนเริ่มเตรียมอาหาร";
export function merchantTransition(
  order: Order,
  restaurantId: string,
  action: "confirm" | "issue" | "ready" | "received",
  now: number,
  detail = "",
): Order {
  if (order.restaurantId !== restaurantId)
    throw new Error("ออเดอร์นี้ไม่ใช่ของร้านที่เลือก");
  let status: OrderStatus;
  if (action === "confirm") {
    if (order.status !== "payment_review")
      throw new Error("รายการนี้ยืนยันแล้วหรือไม่ได้รอตรวจเงิน");
    status = "preparing";
  } else if (action === "issue") {
    if (order.status !== "payment_review")
      throw new Error("รายการนี้ไม่ได้รอตรวจเงิน");
    if (!detail.trim()) throw new Error("กรุณาระบุเหตุผล");
    status = "payment_issue";
  } else if (action === "ready") {
    if (order.status !== "preparing")
      throw new Error("ต้องยืนยันเงินและเริ่มเตรียมก่อน");
    if (
      order.proposals?.at(-1) &&
      ["pending", "declined"].includes(order.proposals.at(-1)!.status)
    )
      throw Error("ต้องตกลงเมนูใหม่กับลูกค้าก่อน");
    if (order.extraDue && order.extraDue > 0)
      throw Error("ต้องตรวจเงินส่วนต่างก่อน");
    if (order.refunds?.some((r) => r.status !== "refunded"))
      throw Error("มีรายการคืนเงินที่ยังไม่เสร็จ");
    const credit =
      (order.paidTotal ?? order.total) -
      order.total -
      (order.refunds ?? [])
        .filter((r) => r.status === "refunded")
        .reduce((n, r) => n + r.amount, 0);
    if (credit > 0.005) throw Error("ต้องบันทึกคืนส่วนต่างให้เสร็จก่อน");
    status = "ready";
  } else {
    if (order.status !== "ready") throw new Error("อาหารยังไม่พร้อมรับ");
    if (detail.trim().toUpperCase() !== order.pickupCode)
      throw new Error("รหัสรับอาหารไม่ตรงกัน");
    status = "received";
  }
  return {
    ...order,
    status,
    slips:
      action === "issue"
        ? order.slips.map((s, i) =>
            i === order.slips.length - 1
              ? { ...s, status: "issue" as const, reason: detail.trim() }
              : s,
          )
        : order.slips,
    history: [
      ...order.history,
      {
        status,
        at: now,
        note:
          action === "confirm"
            ? "ร้านบันทึกตรวจสอบเงินเข้าด้วยตนเอง (ต้นแบบ)"
            : action === "received"
              ? "ตรวจรหัสรับอาหารแล้ว"
              : detail.trim() || undefined,
      },
    ],
  };
}
