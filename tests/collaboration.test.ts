import test from "node:test";
import assert from "node:assert/strict";
import { createOrder, submitSlip } from "../src/lib/orders.ts";
import { makeCartItem } from "../src/lib/cart.ts";
import { merchantTransition } from "../src/lib/merchant.ts";
import { collaboration, unread } from "../src/lib/collaboration.ts";
test('later menu changes account for money already refunded',()=>{
 let o=base();
 o=collaboration(o,shop,{type:'offer',id:'up',lineIndex:0,menuId:'basil-chicken',reason:'เปลี่ยน'},now);
 o=collaboration(o,customer,{type:'accept',id:'up'},now);
 o=collaboration(o,shop,{type:'settle_extra'},now);
 o=collaboration(o,shop,{type:'offer',id:'down',lineIndex:0,menuId:'egg-rice',reason:'เปลี่ยนกลับ'},now);
 o=collaboration(o,customer,{type:'accept',id:'down'},now);
 assert.throws(()=>merchantTransition(o,'pa-noi','ready',now));
 o=collaboration(o,shop,{type:'refund',id:'r1',amount:5,reason:'คืนส่วนต่าง'},now);
 o=collaboration(o,customer,{type:'agree_refund',id:'r1'},now);
 o=collaboration(o,shop,{type:'complete_refund',id:'r1',proofId:'proof',proofName:'proof.png'},now);
 o=collaboration(o,shop,{type:'offer',id:'up2',lineIndex:0,menuId:'basil-chicken',reason:'เปลี่ยนอีกครั้ง'},now);
 o=collaboration(o,customer,{type:'accept',id:'up2'},now);
 assert.equal(o.extraDue,5);
 o=collaboration(o,shop,{type:'refund',id:'cancel-rest',amount:35,reason:'ยกเลิกและคืนยอดที่รับไว้ทั้งหมด'},now);
 o=collaboration(o,customer,{type:'agree_refund',id:'cancel-rest'},now);
 o=collaboration(o,shop,{type:'complete_refund',id:'cancel-rest',proofId:'proof2',proofName:'proof2.png'},now);
 assert.equal(o.status,'cancelled');assert.equal(o.extraDue,0);
 assert.throws(()=>collaboration(o,shop,{type:'settle_extra'},now));
});
const now = Date.parse("2026-11-10T09:00:00+07:00"),
  shop = { role: "merchant" as const, id: "pa-noi" },
  customer = { role: "customer" as const, id: "student" };
const base = () =>
  merchantTransition(
    submitSlip(
      createOrder({
        id: "TEST-1",
        userId: "student",
        items: [makeCartItem("pa-noi", "egg-rice", [], 1)],
        pickupDate: "2026-11-10",
        pickupTime: "11:30",
        phone: "0891234567",
        note: "",
        timeoutMinutes: 10,
        now,
        existingOrders: [],
      }),
      { id: "slip", name: "slip.png", submittedAt: now, status: "submitted" },
      now,
    ),
    "pa-noi",
    "confirm",
    now,
  );
test("messages and retries do not change order or payment status; unread stays role-specific", () => {
  const o = base();
  const failed = collaboration(
    o,
    customer,
    { type: "message", id: "msg", text: "ไม่เผ็ด", fail: true },
    now,
  );
  assert.equal(failed.status, o.status);
  assert.equal(failed.history.length, o.history.length);
  assert.equal(unread(failed, "merchant"), 0);
  const sent = collaboration(
    failed,
    customer,
    { type: "retry", id: "msg" },
    now + 1,
  );
  assert.equal(unread(sent, "merchant"), 1);
  assert.equal(unread(sent, "customer"), 0);
  assert.equal(
    unread(collaboration(sent, shop, { type: "read" }, now + 2), "merchant"),
    0,
  );
  assert.throws(() =>
    collaboration(sent, shop, { type: "retry", id: "msg" }, now + 3),
  );
  assert.throws(() =>
    collaboration(
      sent,
      { role: "customer", id: "other" },
      { type: "message", id: "bad", text: "x" },
      now,
    ),
  );
});
test("offer leaves original menu untouched and cannot become ready before acceptance", () => {
  const o = base(),
    offer = collaboration(
      o,
      shop,
      {
        type: "offer",
        id: "p",
        lineIndex: 0,
        menuId: "basil-chicken",
        reason: "ข้าวผัดหมด",
      },
      now,
    );
  assert.equal(offer.lines[0].menuId, "egg-rice");
  assert.equal(offer.total, 35);
  assert.throws(() => merchantTransition(offer, "pa-noi", "ready", now));
  assert.throws(() =>
    collaboration(offer, shop, { type: "accept", id: "p" }, now),
  );
  const accepted = collaboration(
    offer,
    customer,
    { type: "accept", id: "p" },
    now,
  );
  assert.equal(accepted.lines[0].menuId, "basil-chicken");
  assert.equal(accepted.total, 40);
  assert.equal(accepted.extraDue, 5);
  assert.throws(() => merchantTransition(accepted, "pa-noi", "ready", now));
  assert.equal(
    merchantTransition(
      collaboration(accepted, shop, { type: "settle_extra" }, now),
      "pa-noi",
      "ready",
      now,
    ).status,
    "ready",
  );
  assert.throws(() =>
    collaboration(accepted, customer, { type: "accept", id: "p" }, now),
  );
});
test("declining preserves original food and merchant can withdraw the proposal", () => {
  const o = collaboration(
    base(),
    shop,
    {
      type: "offer",
      id: "p",
      lineIndex: 0,
      menuId: "basil-chicken",
      reason: "เสนอใหม่",
    },
    now,
  );
  const declined = collaboration(
    o,
    customer,
    { type: "decline", id: "p" },
    now,
  );
  assert.equal(declined.total, 35);
  assert.throws(() => merchantTransition(declined, "pa-noi", "ready", now));
  assert.equal(
    merchantTransition(
      collaboration(declined, shop, { type: "withdraw", id: "p" }, now),
      "pa-noi",
      "ready",
      now,
    ).status,
    "ready",
  );
});
test("refund requires agreement and evidence, cannot exceed paid amount or run twice", () => {
  const o = base();
  assert.throws(() =>
    collaboration(
      o,
      shop,
      { type: "refund", id: "r", amount: 36, reason: "คืนเต็ม" },
      now,
    ),
  );
  const proposed = collaboration(
    o,
    shop,
    { type: "refund", id: "r", amount: 35, reason: "ร้านทำไม่ได้" },
    now,
  );
  assert.equal(proposed.refunds?.[0].status, "awaiting_agreement");
  assert.throws(() =>
    collaboration(
      proposed,
      shop,
      {
        type: "complete_refund",
        id: "r",
        proofId: "f",
        proofName: "proof.png",
      },
      now,
    ),
  );
  assert.throws(() =>
    collaboration(proposed, shop, { type: "agree_refund", id: "r" }, now),
  );
  const agreed = collaboration(
    proposed,
    customer,
    { type: "agree_refund", id: "r" },
    now,
  );
  assert.throws(() =>
    collaboration(
      agreed,
      shop,
      { type: "complete_refund", id: "r", proofId: "", proofName: "" },
      now,
    ),
  );
  const done = collaboration(
    agreed,
    shop,
    {
      type: "complete_refund",
      id: "r",
      proofId: "file",
      proofName: "proof.png",
    },
    now,
  );
  assert.equal(done.refunds?.[0].status, "refunded");
  assert.equal(done.status, "cancelled");
  assert.throws(() =>
    collaboration(
      done,
      shop,
      { type: "complete_refund", id: "r", proofId: "f", proofName: "x" },
      now,
    ),
  );
});

