import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { productApi, productForm, productPayload, type AdminProduct, type ProductTransport } from "../src/lib/adminProducts.ts";
import { ApiError, errorMessage } from "../src/lib/commerce.ts";

const fixture: AdminProduct = { productId: 7, slug: "fixture-product", name: "Fixture chè", categoryId: 2, regionId: 3, storeId: 4,
  price: 250000.25, stockQuantity: 17, weightGrams: 200, description: "Fixture description retained", imageUrl: null, tasteNote: "Fixture note",
  strengthLevel: 5, astringencyLevel: null, aromaLevel: 3, aftertasteLevel: 4, status: "ACTIVE",
  categoryName: "Fixture category", categoryStatus: "ACTIVE", regionName: "Fixture region", regionStatus: "INACTIVE", storeName: "Fixture store", storeStatus: "ACTIVE",
  createdAt: "2026-10-10T12:00:00", updatedAt: "2026-10-10T12:00:00" };

test("full PUT preserves nullable fields, FK IDs, stock, description and taste scores, excluding immutable metadata", () => {
  const form = productForm(fixture); form.name = "Tên mới";
  const payload = productPayload(form);
  const { productId, slug, createdAt, updatedAt, categoryName, categoryStatus, regionName, regionStatus, storeName, storeStatus, ...expected } = fixture;
  assert.deepEqual(payload, { ...expected, name: "Tên mới" });
  form.imageUrl = ""; form.description = ""; form.aftertasteLevel = "";
  const cleared = productPayload(form);
  assert.equal(cleared.description, null); assert.equal(cleared.imageUrl, null); assert.equal(cleared.aftertasteLevel, null);
});

test("frontend rejects invalid schema values before writes and accepts SQL boundaries/zero stock", () => {
  for (const [key, value] of Object.entries({ categoryId: "0", regionId: "", storeId: "-1", name: " ", price: "0", stockQuantity: "4294967296", weightGrams: "1.5", strengthLevel: "6", status: "Còn hàng" })) {
    assert.throws(() => productPayload({ ...productForm(fixture), [key]: value }), key);
  }
  for (const price of ["1.001", "10000000000", "1e3", "-1"]) assert.throws(() => productPayload({ ...productForm(fixture), price }));
  assert.throws(() => productPayload({ ...productForm(fixture), name: "!!!" }));
  assert.throws(() => productPayload({ ...productForm(fixture), description: "ế".repeat(22000) }));
  assert.throws(() => productPayload({ ...productForm(fixture), imageUrl: "x".repeat(501) }));
  const valid = productPayload({ ...productForm(fixture), price: "9999999999.99", stockQuantity: "0", weightGrams: "4294967295", status: "INACTIVE" });
  assert.equal(valid.stockQuantity, 0); assert.equal(valid.status, "INACTIVE");
});

test("Admin list fetches every page including INACTIVE, and status changes use PATCH only", async () => {
  const calls: { path: string; init?: RequestInit }[] = [];
  const transport = (async (path: string, init?: RequestInit) => {
    calls.push({ path, init });
    if (path.endsWith("/status")) return { ...fixture, status: "INACTIVE" };
    return { content: [path.includes("page=1") ? { ...fixture, productId: 8, status: "INACTIVE" } : fixture], totalPages: 2 };
  }) as ProductTransport;
  const client = productApi(transport);
  assert.equal((await client.list())[1].status, "INACTIVE");
  await client.status(7, "INACTIVE"); await client.status(7, "ACTIVE");
  assert.deepEqual(calls.slice(2).map(c => [c.path, c.init?.method, JSON.parse(c.init?.body as string)]), [
    ["/admin/products/7/status", "PATCH", { status: "INACTIVE" }], ["/admin/products/7/status", "PATCH", { status: "ACTIVE" }],
  ]);
  assert.equal(calls.some(c => c.init?.method === "DELETE"), false);
});

test("real Product screen submits CRUD contract, reloads after success, preserves form on errors and prevents duplicate submits", async () => {
  // Explicit offline transport and hook doubles; no MySQL or HTTP connection.
  const require = createRequire(import.meta.url);
  const helper = { productApi, productForm, productPayload, tasteFields: ["strengthLevel", "astringencyLevel", "aromaLevel", "aftertasteLevel"] };
  let records = [fixture, { ...fixture, productId: 8, status: "INACTIVE" as const }];
  const calls: { path: string; init: RequestInit }[] = [];
  let fail: Error | null = null, refreshes = 0, hold: (() => void) | null = null, defer = false;
  const transport = async (path: string, init: RequestInit = {}) => {
    calls.push({ path, init });
    if (init.method) {
      if (defer) await new Promise<void>(resolve => { hold = resolve; });
      if (fail) throw fail;
      const body = JSON.parse(init.body as string);
      const id = path === "/admin/products" ? 9 : Number(path.split("/")[3]);
      const saved = { ...(records.find(p => p.productId === id) ?? fixture), ...body, productId: id };
      records = records.filter(p => p.productId !== id).concat(saved); return saved;
    }
    if (path === "/admin/categories") return [{ categoryId: 2, name: "Fixture category", status: "ACTIVE" }];
    if (path === "/admin/tea-regions") return [{ regionId: 3, name: "Fixture region", status: "INACTIVE" }];
    if (path === "/admin/stores") return [{ storeId: 4, name: "Fixture store", status: "ACTIVE" }];
    if (path.includes("?")) return { content: records, totalPages: 1 };
    return records.find(p => p.productId === Number(path.split("/")[3]));
  };
  const slots: any[] = []; let cursor = 0; const effects: (() => void)[] = []; const cleanup: (() => void)[] = [];
  const react = {
    useState(initial: any) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial; return [slots[i], (next: any) => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }]; },
    useRef(initial: any) { const i = cursor++; return slots[i] ?? (slots[i] = { current: initial }); },
    useEffect(fn: () => any) { const i = cursor++; if (!(i in slots)) { slots[i] = true; effects.push(() => { const stop = fn(); if (stop) cleanup.push(stop); }); } },
  };
  const compiled = ts.transpileModule(readFileSync("src/pages/AdminProducts.tsx", "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} as any };
  new Function("require", "module", "exports", compiled)((name: string) => name === "react" ? react : name === "../lib/adminProducts" ? helper
    : name === "../lib/commerce" ? { api: transport, ApiError, errorMessage }
    : name === "../components/Icon" ? { Icon: () => null } : name === "../components/ProductCard" ? { money: String } : name === "../components/ImageWithFallback" ? {default:()=>null} : name === "../components/ProductGallery" ? {AdminGalleryEditor:()=>null} : ((name === "../components/Modal" || name === "../components/AdminActionMenu" || name === "../components/AdminPagination") ? {default:()=>null} : name.endsWith(".css") ? {} : require(name)), module, module.exports);
  function render() { cursor = 0; return module.exports.default({ onProductsChanged: async () => { refreshes++; } }); }
  function nodes(tree: any): any[] { if (!tree || typeof tree !== "object") return []; return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)]; }
  function text(tree: any): string { if (tree == null || typeof tree === "boolean") return ""; if (typeof tree === "string" || typeof tree === "number") return String(tree); return [tree?.props?.children].flat(Infinity).map(text).join(""); }
  function button(label: string, index = 0) { return nodes(render()).filter(n => n.type === "button" && text(n).trim() === label)[index]; }
  function set(key: string, value: string) { nodes(render()).find(n => n.props?.id === `product-${key}`).props.onChange({ target: { value } }); }
  function submit() { return nodes(render()).find(n => n.type === "form").props.onSubmit({ preventDefault() {} }); }
  async function settle() { await new Promise(resolve => setImmediate(resolve)); }
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { confirm: () => true } });
  try {
    assert.match(text(render()), /Đang tải sản phẩm/); effects.forEach(e => e()); await settle();
    assert.match(text(render()), /17 gói/); assert.match(text(render()), /Ngừng kinh doanh/);
    button("Thêm sản phẩm").props.onClick();
    for (const [key, value] of Object.entries({ name: "Fixture mới", categoryId: "2", regionId: "3", storeId: "4", price: "123456.78", weight: "200" })) set(key, value);
    await submit();
    assert.equal(calls.filter(c => c.init.method === "POST").length, 1); assert.equal(refreshes, 1);
    assert.match(text(render()), /Đã thêm sản phẩm/); assert.equal(nodes(render()).some(n => n.type === "form"), false);
    button("Sửa").props.onClick(); await settle(); set("name", "Fixture đổi tên"); await submit();
    const put = calls.find(c => c.init.method === "PUT")!;
    assert.equal(JSON.parse(put.init.body as string).stockQuantity, 17);
    assert.equal(JSON.parse(put.init.body as string).description, fixture.description);
    assert.equal(JSON.parse(put.init.body as string).aromaLevel, 3);
    assert.equal(JSON.parse(put.init.body as string).slug, undefined);
    button("Ngừng bán").props.onClick(); await settle();
    assert.equal(calls.filter(c => c.init.method === "PATCH").length, 1); assert.equal(calls.some(c => c.init.method === "DELETE"), false);
    assert.match(text(render()), /dữ liệu được giữ nguyên/);
    for (const error of [new ApiError(409, "PRODUCT_CONFLICT", "Conflict"), new ApiError(400, "VALIDATION_ERROR", "Invalid"), new ApiError(403, "FORBIDDEN", "Forbidden"), new TypeError("offline")]) {
      button("Sửa").props.onClick(); await settle(); fail = error; await submit();
      assert.ok(nodes(render()).some(n => n.props?.role === "alert")); assert.ok(nodes(render()).some(n => n.type === "form"));
      fail = null;
    }
    defer = true; const first = submit(); const count = calls.filter(c => c.init.method === "PUT").length;
    await submit(); assert.equal(calls.filter(c => c.init.method === "PUT").length, count);
    assert.equal(nodes(render()).find(n => n.type === "fieldset").props.disabled, true);
    hold!(); await first; defer = false;
    assert.equal(nodes(render()).some(n => n.type === "form"), false);
    const search=nodes(render()).find(n=>n.props?.placeholder==="Tìm kiếm sản phẩm theo tên...");search.props.onChange({target:{value:" KHÔNG TỒN TẠI "}});
    const pager=()=>nodes(render()).find(n=>n.props?.label==="sản phẩm"&&"total" in n.props);
    assert.equal(pager().props.total,0);assert.match(text(render()),/Không có sản phẩm phù hợp/);
    search.props.onChange({target:{value:""}});
    nodes(render()).find(n=>n.props?.["aria-label"]==="Lọc trạng thái sản phẩm").props.onChange({target:{value:"ACTIVE"}});
    nodes(render()).find(n=>n.props?.["aria-label"]==="Lọc danh mục sản phẩm").props.onChange({target:{value:"999999"}});assert.equal(pager().props.total,0);assert.equal(pager().props.page,0);
    assert.ok(calls.every(c => !c.path.startsWith("/products") && !c.path.includes("quiz_app")));
  } finally { cleanup.forEach(fn => fn()); if (original) Object.defineProperty(globalThis, "window", original); else delete (globalThis as any).window; }
});
