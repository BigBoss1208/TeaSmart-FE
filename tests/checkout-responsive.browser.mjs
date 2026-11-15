import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const origin = "http://127.0.0.1:3001";
const backend = "http://127.0.0.1:8081";
const { TEST_EMAIL, TEST_PASSWORD, PLAYWRIGHT_MODULE } = process.env;
assert.ok(TEST_EMAIL && TEST_PASSWORD && PLAYWRIGHT_MODULE, "Provide isolated test credentials and Playwright module path");
const direct = await (await fetch(backend + "/api/products?size=50")).json();
const proxied = await (await fetch(origin + "/api/products?size=50")).json();
assert.deepEqual(proxied, direct, "Test frontend must proxy the isolated backend");
const response = await fetch(backend + "/api/auth/login", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
});
assert.equal(response.status, 200);
const { accessToken } = await response.json();
const { chromium } = await import(pathToFileURL(PLAYWRIGHT_MODULE).href);
const browser = await chromium.launch({ channel: "chrome", headless: false });
try {
  const context = await browser.newContext();
  await context.addInitScript(token => sessionStorage.setItem("teasmart_access_token", token), accessToken);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/**", route => ["GET", "HEAD", "OPTIONS"].includes(route.request().method()) ? route.continue() : route.abort());
  await page.goto(origin);
  await page.getByRole("button", { name: "Khám phá chè", exact: true }).click();
  await page.getByText("Trà Móc Câu Phúc Xuân", { exact: true }).first().click();
  await page.locator(".product-purchase").getByRole("button", { name: "Mua ngay", exact: true }).click();
  await page.locator(".purchase-dialog").getByRole("button", { name: "Tiếp tục mua hàng", exact: true }).click();
  await page.getByRole("heading", { name: "Thông tin thanh toán", exact: true }).waitFor();
  await mkdir("artifacts/checkout-responsive", { recursive: true });
  for (const width of [375, 390, 768, 1366, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Checkout overflow at " + width);
    const payment = await page.locator(".checkout-single-page > .form-section").boundingBox();
    assert.ok(payment && payment.x >= 0 && payment.x + payment.width <= width, "Payment panel outside viewport");
    await page.screenshot({ path: `artifacts/checkout-responsive/${width}.png`, fullPage: true });
  }
  assert.deepEqual(errors, []);
  console.log("CHECKOUT_RESPONSIVE_REAL_CHROME_PASS: 375,390,768,1366,1920");
} finally { await browser.close(); }
