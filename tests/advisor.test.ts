import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createServer } from "vite";

test("advisor contract, budget validation, authentication and truthful UI states", async t => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: "custom" });
  const oldFetch = globalThis.fetch; const oldStorage = globalThis.sessionStorage;
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: {
    getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k) } });
  try {
    const helpers = await server.ssrLoadModule("/src/lib/teaAdvisor.ts");
    await t.test("empty, long, contradictory or overprecision preferences rejected", () => {
      assert.ok(helpers.validateTeaForm(" ", "", "")); assert.ok(helpers.validateTeaForm("x".repeat(1001), "", ""));
      assert.ok(helpers.validateTeaForm("chè", "300000", "100000")); assert.ok(helpers.validateTeaForm("chè", "", "0"));
      assert.ok(helpers.validateTeaForm("chè", "", "12.123")); assert.equal(helpers.validateTeaForm("ít chát", "0", "200000"), null);
    });
    await t.test("credentials are not accepted as chat text", () => { assert.ok(helpers.validateTeaForm("Bearer not-a-real-token", "", "")); });
    await t.test("public recommendation URL uses the selected real ID", () => {
      assert.equal(helpers.recommendationPath(42), "/recommendations?limit=4&productId=42");assert.equal(helpers.recommendationPath(), "/recommendations?limit=4"); assert.equal(helpers.recommendationPath(undefined, "SWEET"), "/recommendations?limit=4&profile=SWEET");
    });
    await t.test("chat sends only preference context and keeps Bearer outside JSON", async () => {
      values.set("teasmart_access_token", "test-double-token");
      globalThis.fetch = async (path, init) => {
        assert.equal(path, "/api/chatbot/advice"); assert.equal(init?.method, "POST");
        assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-double-token");
        const body = JSON.parse(String(init?.body));assert.deepEqual(body, { message: "ít chát", preferences: { maxPrice: 200000 }, context: { regionId: 3 } });
        assert.doesNotMatch(String(init?.body), /test-double-token|userId|password/);
        return new Response(JSON.stringify({ method: "RULE_BASED_CATALOG_V1", reply: "Không có sản phẩm", preferences: {}, notices: [], recommendations: { items: [], fallback: true } }), { status: 200 });
      };
      const answer = await helpers.requestTeaAdvice(" ít chát ", { maxPrice: 200000 }, { regionId: 3 }, new AbortController().signal);
      assert.equal(answer.recommendations.items.length, 0);
    });
    await t.test("locked account 401 clears old token, no fabricated fallback", async () => {
      globalThis.fetch = async () => new Response(JSON.stringify({ code: "UNAUTHORIZED", message: "Authentication required" }), { status: 401 });
      await assert.rejects(helpers.requestTeaAdvice("chè", {}, undefined, new AbortController().signal), (e: { status: number }) => e.status === 401);
      assert.equal(values.has("teasmart_access_token"), false);
    });
    await t.test("offline error stays an error instead of returning example products", async () => {
      globalThis.fetch = async () => { throw new TypeError("offline-test-double"); };
      await assert.rejects(helpers.requestTeaAdvice("chè", {}, undefined, new AbortController().signal));
    });
    await t.test("guest sees sign-in; customer sees real input, no invented match percentage", async () => {
      const page = await server.ssrLoadModule("/src/pages/TeaAdvisor.tsx");const props = { navigate: () => {}, onAddToCart: () => {}, onSelectProduct: () => {}, customer: false };
      const guest = renderToString(createElement(page.default, props));assert.match(guest, /Đăng nhập tài khoản khách hàng/);
      const customer = renderToString(createElement(page.default, { ...props, customer: true }));assert.match(customer, /textarea/);assert.match(customer, /Ngân sách/);
      assert.doesNotMatch(customer, /96%|phù hợp 9[0-9]%/);assert.match(customer, /Không dùng LLM/);
    });
    await t.test("shared product card has no empty image URL or invented review count", async () => {
      const card = await server.ssrLoadModule("/src/components/ProductCard.tsx");
      const p = { id: 42, name: "Test-only fixture", image: "", price: 100000, weight: "100g", type: "Chè", taste: [], note: "", rating: 0 };
      const html = renderToString(createElement(card.ProductCard, { product: p, onView: () => {}, onAdd: () => {}, onToggleFavorite: () => {} }));
      assert.doesNotMatch(html, /src=""|\(85\)/); assert.match(html, /Chưa có ảnh sản phẩm/); assert.match(html, /div class="product-image"/);
    });
    await t.test("recommendation begins loading without rendering seed/example cards", async () => {
      const component = await server.ssrLoadModule("/src/components/TeaRecommendations.tsx");
      const html = renderToString(createElement(component.default, { productId: 42, onSelectProduct: () => {}, onAddToCart: () => {} }));
      assert.match(html, /Đang tìm sản phẩm gợi ý/);assert.doesNotMatch(html, /product-card/);
    });
  } finally { globalThis.fetch = oldFetch;Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: oldStorage });await server.close(); }
});
