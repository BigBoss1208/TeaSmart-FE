const assert = require("node:assert/strict");
const { mkdir } = require("node:fs/promises");
const { join } = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const port = 4182;
const origin = "http://127.0.0.1:" + port;
const screenshots = process.env.TEASMART_DESIGN_SCREENSHOTS;
const orderCode = "TS-DESIGN-776c43aeeb1d424faf98e1f37c235f48";
const reference = "DESIGN81";
const callbackUrl = "/payment/vnpay-return?vnp_TxnRef=" + reference + "&vnp_ResponseCode=00";
const product = {
  productId: 5, name: "Trà nõn tôm minh họa", slug: "tra-non-tom-minh-hoa",
  price: 999000, weightGrams: 250, imageUrl: "/demo/tea/ts-demo-014.png",
  regionId: 1, regionName: "Tân Cương", categoryName: "Trà xanh",
};

function pageData(content = []) {
  return { content, page: 0, size: 20, totalPages: content.length ? 1 : 0, totalElements: content.length };
}

async function mockTeaSmart(browser, seedReceipt = false) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 }, timezoneId: "America/Los_Angeles",
    permissions: ["clipboard-read", "clipboard-write"], serviceWorkers: "block",
  });
  const requests = [];
  const state = {
    method: seedReceipt ? "COD" : "ONLINE",
    payment: seedReceipt ? "PENDING" : "PAID",
    orderStatus: "PENDING", receiptPayment: null, returnMode: "verified", emptySeller: false,
  };
  await context.addInitScript(({ seedReceipt }) => {
    sessionStorage.setItem("teasmart_access_token", "design-fixture-only");
    if (seedReceipt && !sessionStorage.getItem("design-fixture-seeded")) {
      sessionStorage.setItem("teasmart_checkout_receipt", JSON.stringify({ userId: "71", orderId: 81 }));
      sessionStorage.setItem("design-fixture-seeded", "1");
    }
  }, { seedReceipt });
  await context.route("**/*", route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith("/api/")) return route.continue();
    requests.push({ path: url.pathname, method: request.method() });

    const payment = {
      orderId: 81, amount: 268000, paidAt: "2026-11-18T22:25:29",
      paymentMethod: state.method, gateway: state.method === "COD" ? null : "VNPAY",
      paymentStatus: state.receiptPayment ?? state.payment, reconciliationRequired: false,
    };
    const order = {
      orderId: 81, orderCode, orderStatus: state.orderStatus, createdAt: "2026-11-18T22:18:06",
      paymentMethod: state.method, paymentStatus: state.payment, recipientName: "Khách minh họa",
      recipientPhone: "0900000000", shippingAddress: "Địa chỉ minh họa, Thái Nguyên",
      subtotal: 246000, shippingFee: 22000, totalAmount: 268000,
      items: [{ productId: product.productId, productName: product.name, unitPrice: 123000, quantity: 2 }],
    };
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const statusCounts = state.emptySeller
      ? { PENDING: 0, CONFIRMED: 0, SHIPPING: 0, DELIVERED: 0, CANCELLED: 0 }
      : { PENDING: 1, CONFIRMED: 0, SHIPPING: 1, DELIVERED: 1, CANCELLED: 0 };
    const shopName = "Chè Minh Họa";
    let status = 200;
    let json;
    switch (url.pathname) {
      case "/api/users/me":
        json = { userId: 71, fullName: "Khách minh họa", role: "CUSTOMER", sellerEnabled: true, createdAt: "2026-01-01" };
        break;
      case "/api/products":
        json = pageData([product]);
        break;
      case "/api/cart":
        json = { items: [], totalItems: 0, totalAmount: 0 };
        break;
      case "/api/orders/81":
        json = order;
        break;
      case "/api/orders/81/payment":
        json = payment;
        break;
      case "/api/payments/vnpay/return":
        json = { accepted: state.returnMode === "verified", reference };
        break;
      case "/api/checkout-sessions/payment-status":
        if (state.returnMode === "offline") {
          status = 503;
          json = { code: "UNAVAILABLE", message: "Mất kết nối kiểm thử" };
        } else {
          json = {
            reference, checkoutSessionId: 2, amount: 268000,
            orderId: state.returnMode === "cancelled" ? null : 81,
            attemptStatus: { verified: "SUCCEEDED", pending: "PENDING", failed: "FAILED_FINAL", cancelled: "FAILED_FINAL" }[state.returnMode],
            sessionStatus: { verified: "COMPLETED", pending: "AWAITING_PAYMENT", failed: "READY", cancelled: "CANCELLED" }[state.returnMode],
            reconciliationRequired: false,
          };
        }
        break;
      case "/api/seller-applications/me":
        json = { status: "ACTIVE", shop: { shopId: 7, name: shopName }, productsEnabled: true };
        break;
      case "/api/seller/statistics":
        json = {
          from, to, timezone: "Asia/Ho_Chi_Minh", shopId: 7, shopName,
          revenue: state.emptySeller ? 0 : 812000, paidPayments: state.emptySeller ? 0 : 1,
          ordersCount: state.emptySeller ? 0 : 3, productsCount: state.emptySeller ? 0 : 9,
          customersCount: state.emptySeller ? 0 : 2, ordersByStatus: statusCounts,
          revenueByDay: [{ date: from, revenue: state.emptySeller ? 0 : 812000, paymentsCount: state.emptySeller ? 0 : 1 }],
          totalOrderValue: 978000, unpaidOrderValue: 166000, itemsSold: 1,
          topProducts: state.emptySeller ? [] : [{ productId: 5, name: product.name, quantity: 1, orderValue: 268000 }],
        };
        break;
      case "/api/seller/orders":
        json = state.emptySeller ? pageData() : pageData([order]);
        break;
      case "/api/seller/products/options":
        json = { categories: [{ id: 1, name: "Trà xanh" }], regions: [{ id: 1, name: "Tân Cương" }], archiveEnabled: false };
        break;
      case "/api/seller/products":
      case "/api/orders":
        json = pageData();
        break;
      default:
        json = [];
    }
    return route.fulfill({ status, json });
  });
  return { context, state, requests };
}

async function checkLayout(page, selector, shotName) {
  for (const [width, height] of [[1920, 1080], [1440, 900], [820, 1000], [390, 844]]) {
    await page.setViewportSize({ width, height });
    const element = page.locator(selector);
    await element.waitFor();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    assert.ok(fits, shotName + " must not overflow at " + width);
    if (screenshots && (width === 1440 || width === 390)) {
      if (shotName.startsWith("receipt")) await page.locator(".order-success-items img").first().evaluate(img => img.decode());
      await page.screenshot({ path: join(screenshots, shotName + "-" + width + ".png"), fullPage: true });
    }
  }
}

async function confirmReceipt(page, title, badge, method) {
  await page.getByRole("heading", { name: title, exact: true }).waitFor();
  const receipt = page.locator(".order-success-page");
  assert.equal(await receipt.locator(".receipt-payment-badge").textContent(), badge);
  assert.equal(await receipt.locator(".receipt-code").textContent(), orderCode);
  assert.match(await receipt.locator(".receipt-method").textContent(), method);
  const item = receipt.locator(".order-success-items li");
  const image = item.getByRole("img", { name: product.name });
  await image.waitFor();
  await image.evaluate(img => img.decode());
  assert.ok((await image.boundingBox()).height >= 80, "receipt product artwork is large enough to recognize");
  const shipping = await receipt.locator(".order-success-shipping").boundingBox();
  const paymentFacts = await receipt.locator(".order-success-facts").boundingBox();
  assert.ok(Math.abs(shipping.width - paymentFacts.width) <= 1, "shipping and payment blocks align");
  assert.match(await item.textContent(), /250g.*Số lượng: 2.*Đơn giá: 123\.000₫.*246\.000₫/s);
  assert.match(await receipt.locator(".order-success-totals").textContent(), /Tạm tính246\.000₫Phí vận chuyển22\.000₫/);
  assert.equal(await receipt.locator(".order-success-total strong").textContent(), "268.000₫");
  assert.match(await receipt.locator("[aria-current=step]").textContent(), /Đã đặt hàng|Đã thanh toán/);
  assert.match(await receipt.locator(".receipt-timeline-heading").textContent(), /Chờ xử lý/);
  assert.equal(await receipt.getByText("Đã giao hàng", { exact: true }).count(), 0);
}

(async () => {
  const { createServer } = await import("vite");
  const server = await createServer({
    server: { host: "127.0.0.1", port, strictPort: true, hmr: false, proxy: { "/api": "http://127.0.0.1:1" } },
    clearScreen: false,
  });
  await server.listen();
  let browser;
  try {
    browser = await chromium.launch({ channel: "chrome", headless: true });
    if (screenshots) await mkdir(screenshots, { recursive: true });

    const cod = await mockTeaSmart(browser, true);
    try {
      const page = await cod.context.newPage();
      await page.goto(origin + "/checkout");
      await confirmReceipt(page, "Đặt hàng thành công!", "Chưa thanh toán", /\(COD\)/);
      await page.getByText("18/11/2026 - 22:18", { exact: true }).waitFor();
      await page.getByRole("button", { name: "Sao chép mã đơn hàng" }).click();
      await page.getByText("Đã sao chép mã đơn hàng.", { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), orderCode);
      await page.reload();
      await confirmReceipt(page, "Đặt hàng thành công!", "Chưa thanh toán", /\(COD\)/);
      await checkLayout(page, ".order-success-grid", "receipt-cod");
      await page.getByRole("button", { name: "Xem chi tiết đơn hàng", exact: true }).click();
      await page.waitForURL("**/account/orders/81");
      await page.goBack();
      await page.getByRole("heading", { name: "Đặt hàng thành công!", exact: true }).waitFor();
      await page.getByRole("button", { name: "Tiếp tục mua sắm", exact: true }).click();
      await page.waitForURL("**/explore");
      assert.ok(cod.requests.every(r => r.method === "GET"), "COD receipt only reads the backend");
      console.log("PASS COD details, copy, refresh, actions and responsive layout");
    } finally {
      await cod.context.close();
    }

    const vnpay = await mockTeaSmart(browser);
    try {
      const page = await vnpay.context.newPage();
      const loadReturn = () => page.goto(origin + callbackUrl);
      await loadReturn();
      await confirmReceipt(page, "Thanh toán thành công!", "Đã thanh toán", /Thanh toán trực tuyến qua VNPay/);
      await page.getByText("18/11/2026 - 22:25", { exact: true }).waitFor();
      await checkLayout(page, ".order-success-grid", "receipt-vnpay");
      await page.getByRole("button", { name: "Về trang chủ", exact: true }).click();
      await page.waitForURL(origin + "/");
      await loadReturn();
      await confirmReceipt(page, "Thanh toán thành công!", "Đã thanh toán", /VNPay/);

      vnpay.state.orderStatus = "SHIPPING";
      await page.getByRole("button", { name: "Kiểm tra lại trạng thái", exact: true }).click();
      await page.locator("[aria-current=step]").filter({ hasText: "Đang giao hàng" }).waitFor();
      assert.equal(await page.getByText("Đã giao hàng", { exact: true }).count(), 0);

      for (const [mode, heading] of [["pending", "Đang xác minh thanh toán"], ["failed", "Thanh toán chưa thành công"]]) {
        vnpay.state.returnMode = mode;
        vnpay.state.payment = mode === "pending" ? "PENDING" : "FAILED";
        await loadReturn();
        await page.getByRole("heading", { name: heading, exact: true }).waitFor();
        assert.equal(await page.locator(".order-success-page").count(), 0);
      }
      vnpay.state.returnMode = "cancelled";
      await loadReturn();
      await page.waitForURL("**/checkout");
      assert.equal(await page.locator(".order-success-page").count(), 0);

      vnpay.state.returnMode = "offline";
      await loadReturn();
      await page.getByRole("alert").filter({ hasText: "Mất kết nối kiểm thử" }).waitFor();
      assert.equal(await page.locator(".order-success-page").count(), 0);

      Object.assign(vnpay.state, { returnMode: "verified", payment: "PAID", receiptPayment: "PENDING" });
      await loadReturn();
      await page.getByRole("heading", { name: "Đang xác minh thanh toán", exact: true }).waitFor();
      await page.getByText("Mã đơn hàng: " + orderCode, { exact: true }).waitFor();
      assert.equal(await page.locator(".order-success-page").count(), 0);
      assert.ok(vnpay.requests.every(r => r.method === "GET" || r.path === "/api/payments/vnpay/return"));
      console.log("PASS VNPay PAID, shipping, pending, failure, cancellation, network error and mismatched receipt");
    } finally {
      await vnpay.context.close();
    }

    const seller = await mockTeaSmart(browser);
    try {
      const page = await seller.context.newPage();
      await page.goto(origin + "/seller");
      const banner = page.locator(".seller-welcome-banner");
      await banner.getByRole("heading", { name: "Chè Minh Họa" }).waitFor();
      const kpis = page.locator(".sc-kpi strong");
      await page.waitForFunction(() => document.querySelector(".sc-kpi strong")?.textContent === "812.000₫");
      assert.deepEqual(await kpis.allTextContents(), ["812.000₫", "3", "9", "2"]);
      await page.getByRole("img", { name: "3 đơn hàng trong kỳ" }).waitFor();
      await page.locator(".revenue-target").focus();
      await page.locator(".revenue-tooltip").getByText(/812\.000₫/).waitFor();
      assert.ok(await banner.evaluate(el => getComputedStyle(el, "::before").backgroundImage.includes("tan-cuong-original.jpeg")));
      assert.equal(await banner.evaluate(el => getComputedStyle(el).borderTopWidth), "0px");
      await checkLayout(page, ".sc-dashboard", "seller-dashboard");
      const menu = page.getByRole("button", { name: "Mở hoặc đóng menu người bán" });
      await menu.click();
      const nav = page.getByRole("navigation", { name: "Quản lý gian hàng" });
      await nav.getByRole("button", { name: "Tổng quan", exact: true }).waitFor();
      await menu.click();

      const change = page.waitForRequest(request => {
        const url = new URL(request.url());
        const params = url.searchParams;
        return url.pathname === "/api/seller/statistics" &&
          (Date.parse(params.get("to")) - Date.parse(params.get("from"))) / 86400000 === 6;
      });
      await page.getByLabel("Khoảng thời gian thống kê").selectOption("7");
      await change;
      await page.getByRole("button", { name: "Thêm sản phẩm mới", exact: true }).click();
      await page.getByRole("heading", { name: "Thêm sản phẩm", exact: true }).waitFor();
      await page.getByRole("option", { name: "Trà xanh", exact: true }).waitFor({ state: "attached" });
      await page.setViewportSize({ width: 1440, height: 900 });
      for (const [quickAction, heading] of [
        ["Quản lý sản phẩm", "Sản phẩm của gian hàng"],
        ["Xem đơn hàng", "Đơn hàng"],
        ["Xem thống kê", "Thống kê & Báo cáo"],
      ]) {
        await nav.getByRole("button", { name: "Tổng quan", exact: true }).click();
        await page.locator(".sc-quick").getByRole("button", { name: quickAction, exact: true }).click();
        await page.getByRole("heading", { name: heading, exact: true }).waitFor();
      }

      seller.state.emptySeller = true;
      await page.goto(origin + "/seller");
      await page.getByText("Chưa có đơn hàng nào", { exact: true }).waitFor();
      await page.getByText("Chưa có dữ liệu sản phẩm bán chạy", { exact: true }).waitFor();
      assert.deepEqual(await kpis.allTextContents(), ["0₫", "0", "0", "0"]);
      assert.ok(seller.requests.every(r => r.method === "GET"), "Seller fixture does not write data");
      console.log("PASS Seller API values, empty states, chart keyboard focus, period, quick action and responsive banner");
    } finally {
      await seller.context.close();
    }
  } finally {
    await browser?.close();
    await server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
