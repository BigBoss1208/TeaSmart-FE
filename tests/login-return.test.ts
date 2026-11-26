import assert from "node:assert/strict";
import test from "node:test";
import { parseLoginReturn } from "../src/lib/loginReturn.ts";

const origin = "http://localhost:3000";

test("login return preserves an internal pathname, encoded query and hash", () => {
  const raw = "/products/901/?from=t%C3%ACm%20ki%E1%BA%BFm&stock=1#mo-ta";
  const target = parseLoginReturn(raw, origin);
  assert.ok(target);
  assert.equal(target.pathname + target.search + target.hash, raw);
  assert.equal(parseLoginReturn("/gio-hang?tab=1#items", origin)?.origin, origin);
});

test("login return rejects absolute, protocol-relative, rewritten and unsafe paths", () => {
  for (const target of [
    null, "", "products/901", "https://elsewhere.invalid/", origin + "/cart", "//elsewhere.invalid/",
    "/\\elsewhere.invalid", " /cart", "/\n/cart", "/a/../cart", "/a/%2e%2e/cart",
  ]) assert.equal(parseLoginReturn(target, origin), null, JSON.stringify(target));
});

test("login return rejects sensitive parameters in the query or fragment", () => {
  for (const target of [
    "/products/901?access_token=fixture", "/products/901?%70assword=fixture", "/cart?resetKey=fixture",
    "/cart#refresh_token=fixture", "/cart#items?id_token=fixture", "/cart?authorization=fixture",
  ]) assert.equal(parseLoginReturn(target, origin), null, target);
});
