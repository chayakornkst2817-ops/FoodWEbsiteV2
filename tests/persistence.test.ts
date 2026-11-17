import test from "node:test";
import assert from "node:assert/strict";
import { validDocument } from "../src/lib/persistence.ts";
import { isLocalRequest } from "../src/lib/local-request.ts";
test("database only accepts supported prototype document shapes", () => {
  assert.equal(validDocument("imjai-demo-v2", { accounts: [], orders: [], timeoutMinutes: 10 }), true);
  assert.equal(validDocument("imjai-demo-v2", { accounts: [], orders: [], timeoutMinutes: 0 }), false);
  assert.equal(validDocument("imjai-demo-v2", { accounts: [], orders: null, timeoutMinutes: 10 }), false);
  assert.equal(validDocument("imjai-merchant-catalog", { shop: { menus: [], slots: [] } }), true);
  assert.equal(validDocument("imjai-merchant-catalog", { shop: null }), false);
  assert.equal(validDocument("unknown", {}), false);
  assert.equal(validDocument("imjai-governance-v5", { admins: [], applications: [], suspendedShops: [], suspendedUsers: [], audit: [] }), true);
});
test("local guard supports Next localhost alias while rejecting foreign origins", () => {
  const request = (url: string, origin?: string, site = "same-origin") => new Request(url, { headers: { ...(origin ? { origin } : {}), "sec-fetch-site": site } });
  assert.equal(isLocalRequest(request("http://localhost:3000/api/persistence/", "http://127.0.0.1:3000"), true), true);
  assert.equal(isLocalRequest(request("http://127.0.0.1:3000/api/persistence/", "https://evil.test"), true), false);
  assert.equal(isLocalRequest(request("http://127.0.0.1:3000/api/persistence/", "http://127.0.0.1:4000"), true), false);
  assert.equal(isLocalRequest(request("http://remote.test/api/persistence/"), true), false);
  assert.equal(isLocalRequest(request("http://localhost:3000/api/persistence/", undefined, "cross-site"), true), false);
  assert.equal(isLocalRequest(request("http://localhost:3000/api/persistence/"), false), false);
});
