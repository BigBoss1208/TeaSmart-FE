import test from "node:test";
import assert from "node:assert/strict";
import { api, ApiError, mapCart, mapOrder, readPendingCheckout, sandboxRedirect, errorMessage } from "../src/lib/commerce.ts";

const storage = new Map<string, string>();
Object.defineProperty(globalThis, "sessionStorage", { value: {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, v),
  removeItem: (k: string) => storage.delete(k),
} });
test("API sends Bearer and idempotency key, uses same-origin API", async () => {
  storage.set("teasmart_access_token", "offline-test-token");
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "/api/orders");
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("Authorization"), "Bearer offline-test-token");
    assert.equal(headers.get("Idempotency-Key"), "offline-request-key");
    return new Response(JSON.stringify({ orderId: 1 }), { status: 201 });
  };
  assert.deepEqual(await api("/orders", { method: "POST", headers: { "Idempotency-Key": "offline-request-key" }, body: "{}" }), { orderId: 1 });
});
test("401 clears expired token and surfaces authentication error", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ code: "UNAUTHORIZED", message: "Unauthorized" }), { status: 401 });
  await assert.rejects(api("/orders"), e => e instanceof ApiError && e.status === 401);
  assert.equal(storage.has("teasmart_access_token"), false);
});
test("uncertain transport errors do not claim payment failure", async () => {
  globalThis.fetch = async () => { throw new TypeError("offline"); };
  await assert.rejects(api("/orders"));
  assert.match(errorMessage(new TypeError()), /cùng yêu cầu/);
});
test("pending checkout is scoped to authenticated user", () => {
  storage.set("teasmart_checkout", JSON.stringify({ userId: "1", key: "request", method: "COD", request: {} }));
  assert.equal(readPendingCheckout("2"), null);
  assert.equal(readPendingCheckout("1")?.key, "request");
  storage.set("teasmart_checkout", "invalid-json"); assert.equal(readPendingCheckout("1"), null);
});
test("redirect accepts only Sandbox payment destination", () => {
  let destination = "";
  Object.defineProperty(globalThis, "window", { value: { location: { assign: (url: string) => { destination = url; } } } });
  for (const url of ["javascript:alert(1)", "https://example.invalid/paymentv2/vpcpay.html", "https://sandbox.vnpayment.vn/other", "http://sandbox.vnpayment.vn/paymentv2/vpcpay.html"])
    assert.throws(() => sandboxRedirect(url));
  sandboxRedirect("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=test");
  assert.match(destination, /^https:\/\/sandbox.vnpayment.vn\//);
});
test("cart adapter preserves stock availability and backend price", () => {
  const result = mapCart({ totalItems: 2, totalAmount: 600, items: [{ cartItemId: 8, productId: 1, name: "Tea", slug: "tea",
    imageUrl: null, unitPrice: 300, quantity: 2, subtotal: 600, stockQuantity: 1, available: false, availabilityReason: "INSUFFICIENT_STOCK" }] });
  assert.equal(result[0].cartItemId, 8); assert.equal(result[0].available, false); assert.equal(result[0].product.price, 300);
});
test("order adapter uses server IDs, amounts and independent payment status", () => {
  const result = mapOrder({ orderId: 7, orderCode: "TS-server", orderStatus: "DELIVERED", recipientName: "Test",
    recipientPhone: "0912345678", shippingAddress: "Test", totalAmount: 999, createdAt: "2026-10-09T12:00:00",
    paymentMethod: "COD", paymentStatus: "PENDING", items: [] });
  assert.equal(result.backendId, 7); assert.equal(result.total, 999); assert.equal(result.status, "Đã giao"); assert.equal(result.paymentStatus, "PENDING");
});
