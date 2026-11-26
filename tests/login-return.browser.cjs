const assert = require("node:assert/strict");
const { mkdir } = require("node:fs/promises");
const { join } = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const returnKey = "teasmart_login_return";
const products = [
  { productId: 901, name: "Chè kiểm thử A", slug: "fixture-tea-a", imageUrl: "/demo/tea/ts-demo-001.png" },
  { productId: 902, name: "Chè kiểm thử B", slug: "fixture-tea-b", imageUrl: "/demo/tea/ts-demo-002.png" },
].map(product => ({ ...product, price: 120000, weightGrams: 100, stockQuantity: 10,
  categoryName: "Chè xanh", regionId: 1, regionName: "Thái Nguyên" }));
const user = { userId: 111, fullName: "Khách kiểm thử", email: "leaf-buyer@example.invalid", role: "CUSTOMER" };
const pathA = "/products/901?from=t%C3%ACm%20ki%E1%BA%BFm#mo-ta";
const pathB = "/products/902";

async function main() {
  const { preview } = await import("vite");
  const server = await preview({
    build: { outDir: process.env.LOGIN_PREVIEW_DIST ?? "dist" },
    preview: { host: "127.0.0.1", port: 0, strictPort: true },
  });
  const origin = "http://127.0.0.1:" + server.httpServer.address().port;
  const screenshotDir = process.env.LOGIN_SCREENSHOTS_DIR;
  if (screenshotDir) await mkdir(screenshotDir, { recursive: true });
  let browser;
  let passed = 0;
  try {
    browser = await chromium.launch({ channel: "chrome", headless: true });
    async function check(name, run) {
      const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
      const writes = [];
      await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
      await context.route("**/api/**", async route => {
        const request = route.request();
        const { pathname } = new URL(request.url());
        const method = request.method();
        if (pathname === "/api/auth/login") {
          if (request.postDataJSON().password !== "Fixture-valid-password!") {
            return route.fulfill({ status: 401, json: { code: "UNAUTHORIZED" } });
          }
          return route.fulfill({ json: { accessToken: "offline-fixture-jwt", user } });
        }
        if (pathname === "/api/auth/register") {
          return route.fulfill({ status: 201, json: user });
        }
        if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
          writes.push({ method, pathname });
          return route.fulfill({ status: 403, json: { code: "UNEXPECTED_WRITE" } });
        }
        if (pathname === "/api/users/me") return route.fulfill({ json: user });
        if (pathname === "/api/products") return route.fulfill({ json: { content: products, totalPages: 1 } });
        if (pathname.startsWith("/api/products/")) {
          const product = products.find(item => pathname.endsWith("/" + item.slug));
          if (product) return route.fulfill({ json: product });
          return route.fulfill({ status: 404, json: { code: "NOT_FOUND" } });
        }
        if (pathname === "/api/cart") return route.fulfill({ json: { items: [], totalItems: 0, totalAmount: 0 } });
        if (pathname === "/api/recommendations") return route.fulfill({ json: { items: [], fallback: true } });
        return route.fulfill({ json: [] });
      });
      const page = await context.newPage();
      try {
        await run(page);
        assert.deepEqual(writes, []);
        assert.deepEqual(await page.evaluate(() => Object.keys(sessionStorage).filter(key =>
          /^teasmart_(?:buy_now|buy_again|checkout(?:$|_session|_buy_now))/.test(key))), []);
        passed++;
        console.log("PASS " + name);
      } finally {
        await context.unrouteAll({ behavior: "wait" });
        await context.close();
      }
    }

    const visit = (page, path) => page.goto(origin + path, { waitUntil: "domcontentloaded" });
    const waitFor = (page, path) => page.waitForURL(origin + path);
    const returnValue = page => page.evaluate(key => sessionStorage.getItem(key), returnKey);
    async function login(page, password = "Fixture-valid-password!") {
      await page.locator("#login-email").fill(user.email);
      await page.locator("#login-password").fill(password);
      await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    }
    async function showProduct(page, path, index) {
      await visit(page, path);
      await page.getByRole("heading", { name: products[index].name, exact: true }).waitFor();
    }
    async function buy(page) {
      await page.getByRole("button", { name: "Mua ngay", exact: true }).click();
      await page.getByRole("button", { name: "Tiếp tục mua hàng", exact: true }).click();
      await waitFor(page, "/dang-nhap");
    }
    async function resumedProduct(page, path, index) {
      await waitFor(page, path);
      await page.getByRole("heading", { name: products[index].name, exact: true }).waitFor();
      assert.equal(await returnValue(page), null);
    }

    await check("Buy A preserves query and hash across failed login and refresh", async page => {
      await showProduct(page, pathA, 0);
      await buy(page);
      assert.equal(await returnValue(page), pathA);
      await login(page, "wrong-password");
      await page.getByText("Tài khoản hoặc mật khẩu không chính xác.", { exact: true }).waitFor();
      assert.equal(await returnValue(page), pathA);
      await page.reload({ waitUntil: "domcontentloaded" });
      await login(page);
      await resumedProduct(page, pathA, 0);
      if (screenshotDir) await page.screenshot({ path: join(screenshotDir, "return-after-login.png") });
      await page.goBack({ waitUntil: "domcontentloaded" });
      await waitFor(page, pathA);
      assert.equal(await page.locator("#login-email").count(), 0);
    });

    await check("Buy B resumes B after passing through registration", async page => {
      await showProduct(page, pathB, 1);
      await buy(page);
      await page.getByRole("button", { name: "Đăng ký ngay", exact: true }).click();
      await waitFor(page, "/dang-ky");
      assert.equal(await returnValue(page), pathB);
      await page.locator("#reg-name").fill(user.fullName);
      await page.locator("#reg-email").fill(user.email);
      await page.locator("#reg-phone").fill("0912345678");
      await page.locator("#reg-pass").fill("Fixture-valid-password!");
      await page.locator("#reg-repass").fill("Fixture-valid-password!");
      await page.locator(".auth-form button[type=submit]").click();
      await waitFor(page, "/dang-nhap");
      await login(page);
      await resumedProduct(page, pathB, 1);
    });

    await check("Guest Add to Cart resumes product without adding an item", async page => {
      await showProduct(page, pathB, 1);
      await page.getByRole("button", { name: "Thêm vào giỏ", exact: true }).click();
      await waitFor(page, "/dang-nhap");
      assert.equal(await returnValue(page), pathB);
      await login(page);
      await resumedProduct(page, pathB, 1);
    });

    await check("Direct guest cart preserves its alias, query and hash without a Back loop", async page => {
      const cart = "/gio-hang?from=header#items";
      await visit(page, "/explore");
      await page.evaluate(path => { location.href = path; }, cart);
      await waitFor(page, "/dang-nhap");
      assert.equal(await returnValue(page), cart);
      await login(page);
      await waitFor(page, cart);
      assert.equal(await returnValue(page), null);
      await page.goBack({ waitUntil: "domcontentloaded" });
      await waitFor(page, "/explore");
    });

    await check("Guest cart opened from the menu restores the cart", async page => {
      await showProduct(page, pathB, 1);
      await page.getByRole("button", { name: "Giỏ hàng", exact: true }).click();
      await waitFor(page, "/dang-nhap");
      assert.equal(await returnValue(page), "/cart");
      await login(page);
      await waitFor(page, "/cart");
      await page.getByRole("heading", { name: "Giỏ hàng của bạn", exact: true }).waitFor();
      assert.equal(await returnValue(page), null);
    });

    await check("Abandoned purchase followed by menu login uses the home default", async page => {
      await showProduct(page, pathA, 0);
      await buy(page);
      await page.goBack({ waitUntil: "domcontentloaded" });
      await waitFor(page, pathA);
      await page.getByRole("button", { name: "Tài khoản", exact: true }).click();
      await waitFor(page, "/dang-nhap");
      assert.equal(await returnValue(page), null);
      await login(page);
      await waitFor(page, "/");
    });

    for (const invalid of [
      "https://elsewhere.invalid/", "//elsewhere.invalid/", "/dang-ky", "/invalid-path", "/products/901?access_token=fixture",
    ]) {
      await check("Direct login ignores unsafe or unknown destination " + invalid, async page => {
        await visit(page, "/dang-nhap");
        await page.evaluate(({ key, value }) => sessionStorage.setItem(key, value), { key: returnKey, value: invalid });
        await login(page);
        await waitFor(page, "/");
        assert.equal(await returnValue(page), null);
      });
    }
    console.log("Chrome login return: " + passed + " PASS; zero cart/order/payment writes and no purchase drafts.");
  } finally {
    await browser?.close();
    await server.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
