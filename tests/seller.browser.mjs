// Browser acceptance with synthetic HTTP fixtures only. No real API request leaves the browser.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createServer } from "vite";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const server = await createServer({ cacheDir: "node_modules/.vite-seller-browser", server: { host: "127.0.0.1", port: 3107, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
let application = null, shop = null;
let submissions = 0, updates = 0;
const errors = [];
const profile = { shopName: "Chè thử nghiệm", representativeName: "Người bán thử nghiệm", phone: "0912345678", businessAddress: "Địa chỉ thử nghiệm", description: "Gian hàng chè dùng cho kiểm thử giao diện." };
const state = () => ({ enabled: true, status: shop?.status ?? application?.status ?? "NONE", application, shop });
async function context(role, viewport = { width: 1366, height: 900 }) {
  const ctx = await browser.newContext({ viewport });
  await ctx.addInitScript(() => sessionStorage.setItem("teasmart_access_token", "synthetic-browser-token"));
  await ctx.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1") return route.abort();
    if (!url.pathname.startsWith("/api/")) return route.continue();
    const path = url.pathname.slice(4), method = route.request().method();
    let data = [], status = 200;
    if (path === "/users/me") data = { userId: role === "ADMIN" ? 1 : 2, fullName: "Synthetic User", email: "test@example.invalid", role, sellerEnabled: true, authorities: role === "ADMIN" ? ["ADMIN"] : shop?.status === "ACTIVE" ? ["CUSTOMER", "SELLER"] : ["CUSTOMER"], createdAt: "2026-11-04" };
    else if (path === "/seller-applications/me") data = state();
    else if (path === "/seller-applications" && method === "POST") {
      submissions++; const payload = route.request().postDataJSON();
      assert.deepEqual(Object.keys(payload).sort(), Object.keys(profile).sort());
      application = { ...payload, applicationId: 10, applicantUserId: 2, status: "PENDING", rejectionReason: null, createdAt: "2026-11-04" };
      data = application; status = 201;
    } else if (path === "/admin/seller-applications") data = { content: application?.status === url.searchParams.get("status") ? [application] : [], totalPages: 1 };
    else if (path === "/admin/seller-applications/10/reject") {
      application.status = "REJECTED"; application.rejectionReason = route.request().postDataJSON().reason; data = application;
    } else if (path === "/admin/seller-applications/10/approve") {
      application.status = "APPROVED";
      shop = { ...profile, name: application.shopName, shopId: 20, ownerUserId: 2, approvedApplicationId: 10, status: "ACTIVE", logoUrl: null, statusReason: null };
      data = shop;
    } else if (path === "/admin/shops") data = { content: shop?.status === url.searchParams.get("status") ? [shop] : [], totalPages: 1 };
    else if (path === "/admin/shops/20/status") {
      const request = route.request().postDataJSON(); shop.status = request.status; shop.statusReason = request.reason; data = shop;
    } else if (path === "/seller/shop" && method === "PATCH") {
      updates++; const payload = route.request().postDataJSON();
      assert.deepEqual(Object.keys(payload).sort(), Object.keys(profile).sort());
      shop = { ...shop, ...payload, name: payload.shopName }; data = shop;
    } else if (path === "/products") data = { content: [], totalPages: 0 };
    else if (path === "/cart") data = { items: [] };
    return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  });
  const page = await ctx.newPage(); page.on("pageerror", error => errors.push(error.message));
  return { ctx, page };
}
try {
  await mkdir("artifacts/seller-phase1", { recursive: true });
  const customer = await context("CUSTOMER"); const admin = await context("ADMIN");
  await customer.page.goto("http://127.0.0.1:3107/seller");
  try { await customer.page.getByRole("heading", { name: "Thông tin đăng ký", exact: true }).waitFor(); } catch (e) { console.log("Page errors:", errors); console.log(await customer.page.locator("body").innerText()); await customer.page.screenshot({path:"artifacts/seller-phase1/browser-failure.png",fullPage:true}); throw e; }
  for (const [label, value] of [["Tên gian hàng", profile.shopName], ["Họ tên người đại diện", profile.representativeName], ["Số điện thoại", profile.phone], ["Địa chỉ kinh doanh", profile.businessAddress], ["Mô tả gian hàng", profile.description]]) await customer.page.getByLabel(label, { exact: true }).fill(value);
  await customer.page.getByRole("button", { name: "Gửi đăng ký", exact: true }).click();
  await customer.page.getByRole("heading", { name: "Đăng ký mở gian hàng thành công" }).waitFor();
  assert.equal(submissions, 1);
  assert.equal(await customer.page.getByRole("button", { name: "Gửi đăng ký", exact: true }).count(), 0);
  await admin.page.goto("http://127.0.0.1:3107/admin/sellers");
  await admin.page.getByRole("button").filter({ hasText: "Chè thử nghiệm" }).click();
  await admin.page.getByLabel("Lý do từ chối / khóa").fill("Bổ sung thông tin nguồn chè");
  await admin.page.getByRole("button", { name: "Từ chối", exact: true }).click();
  await customer.page.getByRole("button", { name: "Kiểm tra trạng thái" }).click();
  await customer.page.getByRole("heading", { name: "Cập nhật và gửi lại hồ sơ" }).waitFor();
  await customer.page.getByRole("button", { name: "Gửi đăng ký", exact: true }).click();
  await customer.page.getByRole("heading", { name: "Đăng ký mở gian hàng thành công" }).waitFor();
  await admin.page.getByRole("button", { name: "Tải lại", exact: true }).click();
  await admin.page.getByRole("button").filter({ hasText: "Chè thử nghiệm" }).click();
  await admin.page.getByRole("button", { name: "Duyệt hồ sơ", exact: true }).click();
  await customer.page.getByRole("button", { name: "Kiểm tra trạng thái" }).click();
  await customer.page.getByRole("heading", { name: "Seller Center", exact: true }).waitFor();
  await customer.page.getByLabel("Tên gian hàng", { exact: true }).fill("Chè thử nghiệm đã sửa");
  await customer.page.getByRole("button", { name: "Lưu thông tin", exact: true }).click();
  await customer.page.getByRole("heading", { name: "Chè thử nghiệm đã sửa", exact: true }).waitFor();
  assert.equal(updates, 1);
  await customer.page.screenshot({ path: "artifacts/seller-phase1/center-desktop.png", fullPage: true });
  const mobile = await context("CUSTOMER", { width: 390, height: 844 });
  await mobile.page.goto("http://127.0.0.1:3107/seller");
  await mobile.page.getByRole("heading", { name: "Seller Center", exact: true }).waitFor();
  await mobile.page.screenshot({ path: "artifacts/seller-phase1/center-mobile.png", fullPage: true });
  console.log("overflow",await mobile.page.evaluate(() => ({innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth,children:[...document.body.children].map(e=>({tag:e.tagName,cls:e.className,scroll:e.scrollWidth,client:e.clientWidth,rect:e.getBoundingClientRect().toJSON()})),wide:[...document.querySelectorAll("body *")].filter(e => e.scrollWidth > e.clientWidth + 2).slice(0,15).map(e=>({tag:e.tagName,cls:typeof e.className==="string"?e.className:"",scroll:e.scrollWidth,client:e.clientWidth,rect:e.getBoundingClientRect().toJSON()}))})));
  assert.ok(await mobile.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await mobile.page.screenshot({ path: "artifacts/seller-phase1/center-mobile.png", fullPage: true });
  await admin.page.getByRole("button", { name: "Đang hoạt động", exact: true }).click();
  await admin.page.getByRole("button").filter({ hasText: "Chè thử nghiệm đã sửa" }).click();
  await admin.page.screenshot({ path: "artifacts/seller-phase1/admin-desktop.png", fullPage: true });
  await admin.page.getByLabel("Lý do từ chối / khóa").fill("Kiểm tra thông tin");
  await admin.page.getByRole("button", { name: "Khóa gian hàng", exact: true }).click();
  await customer.page.getByRole("button", { name: "Kiểm tra trạng thái" }).click();
  await customer.page.getByRole("heading", { name: "Gian hàng đang bị khóa", exact: true }).waitFor();
  assert.equal(await customer.page.getByRole("button", { name: "Lưu thông tin", exact: true }).count(), 0);
  assert.deepEqual(errors, []);
  console.log("PASS browser fixtures: submit, pending, reject, resubmit, approve, edit, suspend, desktop/mobile layout; no real API calls.");
} finally { await browser.close(); await server.close(); }
