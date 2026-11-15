import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

test("homepage taste finder uses product facts, strict filters and shared cards", async t => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: "custom" });
  const oldFetch = globalThis.fetch;
  const oldStorage = globalThis.sessionStorage;
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: { getItem: () => null } });
  try {
    const helpers = await server.ssrLoadModule("/src/lib/tasteCatalog.ts");
    const product = { productId: 41, name: "Trà xanh", slug: "tra-xanh", price: 210000, weightGrams: 200,
      imageUrl: "/demo/tea/ts-demo-001.png", tasteNote: null, categoryName: "Trà xanh", regionId: 1, regionName: "Tân Cương", stockQuantity: 5 };
    await t.test("all six choices require matching evidence, no similarity fallback", () => {
      const samples = [
        { strengthLevel: 4 }, { astringencyLevel: 2 }, { aftertasteLevel: 5 }, { aromaLevel: 4 },
        { tasteNote: "Phù hợp dùng hằng ngày." }, { categoryName: "Trà Quà Tặng" },
      ];
      assert.equal(helpers.tasteChoices.length, 6);
      helpers.tasteChoices.forEach((choice: string, i: number) => {
        assert.equal(helpers.matchesTaste({ ...product, ...samples[i] }, choice), true, choice);
        assert.equal(helpers.matchesTaste(product, choice), false, choice);
      });
      assert.equal(helpers.matchesTaste({ ...product, aftertasteLevel: 2 }, "Hậu ngọt"), false);
      assert.equal(helpers.matchesTaste({ ...product, astringencyLevel: 4 }, "Ít chát"), false);
      assert.equal(helpers.matchesTaste({ ...product, tasteNote: "Không phù hợp dùng hằng ngày" }, "Uống hằng ngày"), false);
    });
    await t.test("missing, invalid, unavailable and synthetic data never becomes a match", () => {
      for (const value of [null, undefined, 0, 6, "5", NaN]) {
        assert.equal(helpers.matchesTaste({ ...product, aftertasteLevel: value }, "Hậu ngọt"), false);
      }
      for (const bad of [{ name: "DEV Green One" }, { name: "PRODUCT-TEST Baseline Tea" }, { tasteNote: "Synthetic test taste note" }, { description: "fixture only" }]) {
        assert.equal(helpers.matchesTaste({ ...product, aftertasteLevel: 5, ...bad }, "Hậu ngọt"), false);
      }
      assert.equal(helpers.matchesTaste({ ...product, aftertasteLevel: 5, stockQuantity: 0 }, "Hậu ngọt"), false);
      assert.equal(helpers.matchesTaste({ ...product, aftertasteLevel: 5, price: NaN }, "Hậu ngọt"), false);
      assert.equal(helpers.matchesTaste({ ...product, name: "Trà Đinh Ngọc Tân Cương", description: "Dữ liệu demo phục vụ đồ án", categoryName: "Trà Quà Tặng" }, "Làm quà"), true);
    });
    await t.test("reads all public pages and detail attributes; test products are not requested", async () => {
      const requests: string[] = [];
      globalThis.fetch = async input => {
        const path = String(input); requests.push(path);
        if (path === "/api/products?size=50") return Response.json({ content: [product, { ...product, productId: 9, name: "DEV Black Three", slug: "dev" }], totalPages: 2 });
        if (path === "/api/products?size=50&page=1") return Response.json({ content: [{ ...product, productId: 42, slug: "tea-two" }], totalPages: 2 });
        return Response.json({ ...product, productId: path.endsWith("tea-two") ? 42 : 41, aftertasteLevel: 4 });
      };
      const rows = await helpers.loadTasteCatalog(new AbortController().signal);
      assert.equal(rows.length, 2);
      assert.equal(requests.length, 4);
      assert.ok(requests.every(p => !p.includes("recommendations") && !p.endsWith("/dev")));
      assert.equal(rows[0].price, 210000);
    });
    await t.test("offline errors reject rather than returning example products", async () => {
      globalThis.fetch = async () => { throw new TypeError("offline"); };
      await assert.rejects(helpers.loadTasteCatalog(new AbortController().signal));
    });
    await t.test("six accessible choices and honest loading are rendered", async () => {
      const component = await server.ssrLoadModule("/src/components/TasteFinder.tsx");
      const html = renderToString(createElement(component.default, { onAi() {}, onSelectProduct() {} }));
      assert.equal((html.match(/aria-pressed=/g) ?? []).length, 6);
      assert.match(html, /Đang kiểm tra dữ liệu sản phẩm/);
      assert.match(html, /không phải phản hồi AI/);
      assert.doesNotMatch(html, /DEV |Synthetic|tea-reason/);
    });
    await t.test("details-only card retains API price and normal card keeps cart actions", async () => {
      const component = await server.ssrLoadModule("/src/components/ProductCard.tsx");
      const p = { id: 41, name: "Trà xanh", image: product.imageUrl, price: product.price, weight: "200g", type: "Trà xanh", taste: [], note: "", rating: 0 };
      const props = { product: p, onView() {}, onAdd() {} };
      const onlyDetails = renderToString(createElement(component.ProductCard, { ...props, detailsOnly: true }));
      assert.match(onlyDetails, /product-card/); assert.match(onlyDetails, /210\.000/); assert.match(onlyDetails, /product-details-link/);
      assert.doesNotMatch(onlyDetails, /btn-card-add|btn-card-buy/);
      const normal = renderToString(createElement(component.ProductCard, props));
      assert.match(normal, /btn-card-add/); assert.match(normal, /btn-card-buy/);
    });
  } finally {
    globalThis.fetch = oldFetch;
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: oldStorage });
    await server.close();
  }
});
