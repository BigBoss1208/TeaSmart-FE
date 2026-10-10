import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createServer } from "vite";
import { vietnamToday, defaultRange, customerQuery, chartHeight } from "../src/lib/adminData.ts";
test("Vietnam reporting date crosses midnight before UTC", () => {
  assert.equal(vietnamToday(new Date("2026-10-01T17:30:00Z")), "2026-10-02");
  assert.equal(vietnamToday(new Date("2026-10-01T16:59:59Z")), "2026-10-01");
});
test("default report is thirty Vietnam calendar days including today", () => {
  assert.deepEqual(defaultRange(new Date("2026-10-01T17:30:00Z")), { from: "2026-09-03", to: "2026-10-02" });
});
test("customer search encodes punctuation and resets/retains requested pagination", () => {
  const result = new URL(customerQuery(" a+b%@example.invalid ", "INACTIVE", 2), "http://localhost");
  assert.equal(result.pathname, "/admin/customers"); assert.equal(result.searchParams.get("keyword"), "a+b%@example.invalid");
  assert.equal(result.searchParams.get("status"), "INACTIVE"); assert.equal(result.searchParams.get("page"), "2"); assert.equal(result.searchParams.get("size"), "12");
  assert.equal(new URL(customerQuery(" ", "", 0), "http://localhost").searchParams.has("keyword"), false);
});
test("zero revenue has zero chart height, actual revenue uses consistent scale", () => {
  assert.equal(chartHeight(0, 0), 0); assert.equal(chartHeight(50, 100), 75); assert.equal(chartHeight(100, 100), 150);
});
test("real Admin screens render loading and filters before API data, no mock revenue", async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: "custom" });
  try {
    const dashboard = await server.ssrLoadModule("/src/pages/AdminOverview.tsx");
    const customers = await server.ssrLoadModule("/src/pages/AdminCustomers.tsx");
    const dashboardHtml = renderToString(createElement(dashboard.default));
    const customerHtml = renderToString(createElement(customers.default));
    assert.match(dashboardHtml, /Đang tải thống kê/); assert.match(dashboardHtml, /type="date"/);
    assert.doesNotMatch(dashboardHtml, /428\.500\.000|1\.284\.500\.000/);
    assert.match(customerHtml, /Đang tải khách hàng/); assert.match(customerHtml, /Tìm khách hàng/); assert.match(customerHtml, /INACTIVE/);
  } finally { await server.close(); }
});
