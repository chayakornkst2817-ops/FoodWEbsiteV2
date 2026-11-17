import test from "node:test";
import assert from "node:assert/strict";
import { makeCartItem } from "../src/lib/cart.ts";
import {
  createOrder,
  expireOrders,
  pickupSlotPast,
  remainingCapacity,
  submitSlip,
} from "../src/lib/orders.ts";
const now = Date.parse("2026-11-10T09:00:00+07:00");
const input = () => ({
  id: "TEST-000001",
  userId: "student-1",
  items: [makeCartItem("pa-noi", "basil-chicken", ["egg"], 2)],
  pickupDate: "2026-11-10",
  pickupTime: "11:30",
  phone: "0891234567",
  note: "ไม่เผ็ด",
  timeoutMinutes: 10,
  now,
  existingOrders: [],
});
test("order snapshots options and prices and starts a ten-minute payment deadline", () => {
  const order = createOrder(input());
  assert.equal(order.total, 100);
  assert.equal(order.lines[0].price, 50);
  assert.deepEqual(order.lines[0].options, ["ไก่", "ธรรมดา", "เผ็ดปกติ", "เพิ่มไข่ดาว"]);
  assert.equal(order.expiresAt - order.createdAt, 600000);
  assert.equal(order.status, "awaiting_payment");
});
test("accepts any future minute, including the old zero-quota period", () => {
  for(const pickupTime of ["11:30","11:49","12:07","12:10"]) assert.equal(createOrder({...input(),pickupTime}).pickupTime,pickupTime);
});
test("rejects past pickup times and invalid contact fields", () => {
  assert.throws(()=>createOrder({...input(),now:Date.parse("2026-11-10T11:30:00+07:00")}),/ผ่าน/);
  assert.throws(()=>createOrder({...input(),pickupTime:"08:59"}),/ผ่าน/);
  assert.throws(()=>createOrder({...input(),pickupTime:"11:30–11:45"}),/HH:mm/);
  assert.throws(()=>createOrder({...input(),phone:"1234"}),/เบอร์โทร/);
  assert.throws(()=>createOrder({...input(),timeoutMinutes:0}),/1–30/);
});
test("new orders are not constrained by legacy per-slot quotas", () => {
  const old=createOrder(input());const existingOrders=Array.from({length:6},(_,i)=>({...old,id:'OLD-'+i}));
  assert.equal(createOrder({...input(),existingOrders}).total,100);
});
test("unsubmitted orders cancel exactly at the deadline, and only once", () => {
  const order = createOrder(input());
  assert.equal(
    expireOrders([order], order.expiresAt - 1)[0].status,
    "awaiting_payment",
  );
  const cancelled = expireOrders([order], order.expiresAt);
  assert.equal(cancelled[0].status, "cancelled");
  assert.equal(cancelled[0].history.length, 2);
  assert.equal(expireOrders(cancelled, order.expiresAt + 99999), cancelled);
  assert.throws(
    () =>
      submitSlip(
        order,
        { id: "slip-1", name: "test.png", submittedAt: 0, status: "submitted" },
        order.expiresAt,
      ),
    /หมดเวลา/,
  );
});
test("submitted slips wait indefinitely for merchant review without automatic payment confirmation", () => {
  const order = createOrder(input());
  const review = submitSlip(
    order,
    { id: "slip-1", name: "test.png", submittedAt: 0, status: "submitted" },
    now + 30000,
  );
  const later = expireOrders([review], now + 86400000);
  assert.equal(later[0].status, "payment_review");
  assert.equal(later[0].slips.length, 1);
  assert.throws(
    () =>
      submitSlip(
        review,
        {
          id: "slip-2",
          name: "test2.png",
          submittedAt: 0,
          status: "submitted",
        },
        now + 60000,
      ),
    /สถานะ/,
  );
});
test("merchant payment issue permits resubmission after the original deadline while retaining history", () => {
  const order = createOrder(input());
  const first = submitSlip(
    order,
    { id: "slip-1", name: "first.png", submittedAt: 0, status: "submitted" },
    now + 1000,
  );
  const issue = { ...first, status: "payment_issue" as const };
  const fixed = submitSlip(
    issue,
    { id: "slip-2", name: "fixed.png", submittedAt: 0, status: "submitted" },
    now + 3600000,
  );
  assert.equal(fixed.status, "payment_review");
  assert.equal(fixed.slips.length, 2);
  assert.equal(fixed.slips[0].name, "first.png");
  assert.throws(() => submitSlip(issue, issue.slips[0], now + 3600000), /แล้ว/);
});
test("existing non-cancelled orders reserve daily stock across all menu options", () => {
  const previous = createOrder({
    ...input(),
    items: [makeCartItem("pa-noi", "basil-chicken", [], 23)],
  });
  assert.throws(
    () => createOrder({ ...input(), existingOrders: [previous] }),
    /คงเหลือ/,
  );
  assert.equal(
    createOrder({
      ...input(),
      existingOrders: [{ ...previous, status: "cancelled" }],
    }).total,
    100,
  );
});


test("order snapshots chosen protein, special portion and spice with their price", () => {
  const order = createOrder({...input(), items: [makeCartItem("pa-noi", "basil-chicken", ["protein-pork", "portion-special", "spice-none", "egg"], 1)]});
  assert.equal(order.total, 65);
  assert.deepEqual(order.lines[0].options, ["หมูสับ", "พิเศษ", "ไม่เผ็ด", "เพิ่มไข่ดาว"]);
});
test("old minced pork orders count against the merged basil stock", () => {
  const old = createOrder({...input(), items: [makeCartItem("pa-noi", "basil-chicken", [], 23)]});
  old.lines[0].menuId = "basil-pork";
  assert.throws(() => createOrder({...input(), existingOrders: [old]}), /คงเหลือ/);
});
