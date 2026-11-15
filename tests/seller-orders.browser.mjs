import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { createServer } from "vite";
import { mkdir } from "node:fs/promises";

const { SELLER_TEST_SCHEMA: schema, SELLER_TEST_PORT: port, SELLER_TEST_TOKEN: token } = process.env;
assert.match(schema ?? "", /^teasmart_seller_test_[0-9a-f]{32}$/);
assert.ok(Number(port) > 0 && port !== "8080" && token);
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const server = await createServer({ server:{watch:{ignored:["**/artifacts/**","**/backend/target/**"]},host: "127.0.0.1", port: 3109, strictPort: true, proxy: { "/api": { target: `http://127.0.0.1:${port}`, changeOrigin: true } } } });
await server.listen();
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE });
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await page.route("**/*", route => new URL(route.request().url()).origin === "http://127.0.0.1:3109" ? route.continue() : route.abort());
  await page.addInitScript(value => sessionStorage.setItem("teasmart_access_token", value), token);
  await page.goto("http://127.0.0.1:3109/seller", {waitUntil:"domcontentloaded",timeout:60000});
  const navigation = page.getByRole("navigation", { name: "Quản lý gian hàng" });
  await navigation.getByRole("button", { name: "Đơn hàng" }).click();
  const panel = page.locator(".seller-orders");
  await panel.getByLabel("Tìm mã đơn").fill("BROWSER-SELLER-ORDERS");
  await panel.getByText("BROWSER-SELLER-ORDERS", { exact: true }).waitFor();
  await panel.getByRole("button", { name: "Xem chi tiết" }).click();
  await panel.getByRole("heading", { name: "BROWSER-SELLER-ORDERS" }).waitFor();
  await panel.getByRole("heading", { name: "Sản phẩm" }).waitFor();
  const directory = "artifacts/seller-orders";
  await mkdir(directory, { recursive: true });
  for (const [width, height, name] of [[1366, 900, "desktop"], [768, 1024, "tablet"], [390, 844, "mobile"]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(120);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `horizontal overflow at ${width}px`);
    await page.screenshot({ path: `${directory}/${name}.png`, fullPage: true });
  }
  console.log("Seller Orders browser desktop/tablet/mobile against synthetic database PASS");
} finally {
  await browser.close();
  await server.close();
}
