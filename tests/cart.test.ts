import test from "node:test";
import assert from "node:assert/strict";
import {
  cartReducer,
  cartTotal,
  makeCartItem,
  type CartItem,
} from "../src/lib/cart.ts";

test("recalculates menu options and totals from catalog data", () => {
  const item = makeCartItem("pa-noi", "basil-chicken", ["egg"], 2);
  const state = cartReducer([], { type: "add", item });
  assert.equal(cartTotal(state), 100);
  assert.equal(
    cartReducer(state, { type: "quantity", key: item.key, quantity: 3 })[0]
      .quantity,
    3,
  );
});
test("archived restaurants cannot be added even with replacement confirmed", () => {
  const original = cartReducer([], {
    type: "add",
    item: makeCartItem("pa-noi", "egg-rice", [], 1),
  });
  const other = makeCartItem("sen-suk", "pork-noodle", [], 1);
  assert.equal(cartReducer(original, { type: "add", item: other }), original);
  const replaced = cartReducer(original, {
    type: "add",
    item: other,
    replace: true,
  });
  assert.equal(replaced, original);
});
test("stock limit includes every option variant of the same menu", () => {
  const original = cartReducer([], {
    type: "add",
    item: makeCartItem("pa-noi", "basil-chicken", [], 23),
  });
  const egg = makeCartItem("pa-noi", "basil-chicken", ["egg"], 1);
  const full = cartReducer(original, { type: "add", item: egg });
  assert.equal(full.length, 2);
  assert.equal(cartReducer(full, { type: "add", item: egg }), full);
  assert.equal(
    cartReducer(full, { type: "quantity", key: egg.key, quantity: 2 }),
    full,
  );
});
test("sold-out and closed restaurants cannot be ordered", () => {
  assert.deepEqual(
    cartReducer([], {
      type: "add",
      item: makeCartItem("pa-noi", "basil-pork", [], 1),
    }),
    [],
  );
  assert.deepEqual(
    cartReducer([], {
      type: "add",
      item: makeCartItem("after-class", "beef-burger", [], 1),
    }),
    [],
  );
});
test("zero quantity removes a line and invalid quantities preserve the cart", () => {
  const item = makeCartItem("pa-noi", "egg-rice", [], 1);
  const cart = [item];
  assert.deepEqual(
    cartReducer(cart, { type: "quantity", key: item.key, quantity: 0 }),
    [],
  );
  for (const quantity of [-1, 1.5, NaN, Infinity])
    assert.equal(
      cartReducer(cart, { type: "quantity", key: item.key, quantity }),
      cart,
    );
});
test("restoring local data discards malformed, unavailable and mixed-shop lines", () => {
  const valid = makeCartItem("pa-noi", "egg-rice", [], 2);
  const restored = cartReducer([], {
    type: "restore",
    items: [
      null,
      {},
      valid,
      { ...valid, quantity: 1000 },
      makeCartItem("sen-suk", "pork-noodle", [], 1),
      makeCartItem("pa-noi", "basil-chicken", ["invalid"], 1),
    ],
  });
  assert.deepEqual(restored, [valid]);
  assert.equal(cartTotal(restored), 70);
  assert.deepEqual(
    cartReducer([], { type: "restore", items: { invalid: true } }),
    [],
  );
});


test("protein, portion and spice are separate single choices and prices add up", () => {
  const item = makeCartItem("pa-noi", "basil-chicken", ["protein-pork", "portion-special", "spice-hot", "egg"], 2);
  const cart = cartReducer([], { type: "add", item });
  assert.equal(cart.length, 1);
  assert.equal(cartTotal(cart), 130);
  const mild = makeCartItem("pa-noi", "basil-chicken", ["protein-chicken", "spice-mild"], 1);
  const combined = cartReducer(cart, { type: "add", item: mild });
  assert.equal(combined.length, 2);
  assert.equal(cartTotal(combined), 170);
});
test("contradictory grouped options and unknown choices cannot enter cart", () => {
  for (const choices of [["protein-chicken", "protein-pork"], ["portion-normal", "portion-special"], ["spice-none", "spice-hot"], ["unknown-option"]]) {
    assert.deepEqual(cartReducer([], { type: "add", item: makeCartItem("pa-noi", "basil-chicken", choices, 1) }), []);
  }
});
