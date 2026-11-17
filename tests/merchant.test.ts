import test from "node:test";
import assert from "node:assert/strict";
import { createOrder, submitSlip } from "../src/lib/orders.ts";
import { makeCartItem } from "../src/lib/cart.ts";
import { merchantTransition } from "../src/lib/merchant.ts";
const now = Date.parse("2026-11-10T09:00:00+07:00");
const review = () =>
  submitSlip(
    createOrder({
      id: "TEST-ABC123",
      userId: "test",
      items: [makeCartItem("pa-noi", "egg-rice", [], 1)],
      pickupDate: "2026-11-10",
      pickupTime: "11:30",
      phone: "0891234567",
      note: "",
      timeoutMinutes: 10,
      now,
      existingOrders: [],
    }),
    { id: "slip", name: "test.png", submittedAt: now, status: "submitted" },
    now,
  );
test("merchant confirmation transitions once, without AI as authority", () => {
  const o = review();
  const p = merchantTransition(o, "pa-noi", "confirm", now + 1);
  assert.equal(p.status, "preparing");
  assert.equal(o.status, "payment_review");
  assert.throws(() => merchantTransition(p, "pa-noi", "confirm", now + 2));
});
test("wrong shop cannot change an order", () => {
  assert.throws(() => merchantTransition(review(), "sen-suk", "confirm", now));
});
test("payment problem requires reason and preserves slip history for correction", () => {
  const o = review();
  assert.throws(() => merchantTransition(o, "pa-noi", "issue", now, " "));
  const issue = merchantTransition(o, "pa-noi", "issue", now, "ภาพอ่านไม่ชัด");
  assert.equal(issue.slips[0].status, "issue");
  assert.equal(issue.history.at(-1)?.note, "ภาพอ่านไม่ชัด");
  const again = submitSlip(
    issue,
    { id: "new", name: "new.png", submittedAt: now, status: "submitted" },
    now + 999999,
  );
  assert.equal(again.status, "payment_review");
  assert.equal(again.slips.length, 2);
});
test("cannot skip preparation or accept food with wrong code", () => {
  assert.throws(() => merchantTransition(review(), "pa-noi", "ready", now));
  const p = merchantTransition(review(), "pa-noi", "confirm", now);
  const r = merchantTransition(p, "pa-noi", "ready", now);
  assert.throws(() =>
    merchantTransition(r, "pa-noi", "received", now, "WRONG"),
  );
  const done = merchantTransition(r, "pa-noi", "received", now, r.pickupCode);
  assert.equal(done.status, "received");
  assert.throws(() =>
    merchantTransition(done, "pa-noi", "received", now, r.pickupCode),
  );
});
