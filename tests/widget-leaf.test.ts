import test from "node:test";
import assert from "node:assert/strict";
import { IMAGE_LIMIT, isLeafVideoDurationValid, validateLeafMedia, VIDEO_LIMIT } from "../src/lib/leafMedia.ts";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

test("leaf upload accepts the supported types at the exact byte limits", () => {
  assert.equal(IMAGE_LIMIT, 10_485_760);
  assert.equal(VIDEO_LIMIT, 30_000_000);
  assert.deepEqual(validateLeafMedia({ name: "leaf.JPG", type: "image/jpeg", size: IMAGE_LIMIT }, "image"),
    { contentType: "image/jpeg" });
  assert.deepEqual(validateLeafMedia({ name: "leaf.png", type: "image/png", size: 200 }, "image"),
    { contentType: "image/png" });
  assert.deepEqual(validateLeafMedia({ name: "clip.mp4", type: "video/mp4", size: VIDEO_LIMIT }, "video"),
    { contentType: "video/mp4" });
  assert.deepEqual(validateLeafMedia({ name: "leaf.jpeg", type: "", size: 200 }, "image"),
    { contentType: "image/jpeg" });
});

test("leaf upload rejects empty, mismatched, unsupported and oversized files", () => {
  for (const file of [
    { name: "payload.exe", type: "image/jpeg", size: 100 },
    { name: "leaf.jpg", type: "image/png", size: 100 },
    { name: "leaf.png", type: "text/html", size: 100 },
    { name: "leaf.png", type: "image/png", size: IMAGE_LIMIT + 1 },
    { name: "leaf.png", type: "image/png", size: 0 },
  ]) assert.ok("error" in validateLeafMedia(file, "image"), file.name);
  for (const file of [
    { name: "clip.mov", type: "video/quicktime", size: 200 },
    { name: "clip.mp4", type: "video/mp4", size: VIDEO_LIMIT + 1 },
  ]) assert.ok("error" in validateLeafMedia(file, "video"), file.name);
});

test("video duration accepts 15 seconds and rejects missing or longer metadata", () => {
  assert.equal(isLeafVideoDurationValid(15), true);
  for (const seconds of [0, NaN, Infinity, 15.001]) assert.equal(isLeafVideoDurationValid(seconds), false);
});

test("leaf page shows both tabs and disables analysis before media is selected", async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: "custom" });
  try {
    const page = await server.ssrLoadModule("/src/pages/LeafAnalysis.tsx");
    const html = renderToString(createElement(page.default)).replace(/<!-- -->/g, "");
    assert.match(html, /Tải ảnh lá chè/);
    assert.match(html, /Tải video lá chè/);
    assert.match(html, /<button[^>]*leaf-analyze-button[^>]*disabled[^>]*>[\s\S]*?Phân tích lá chè<\/button>/);
    assert.match(html, /class="leaf-media-drop"/);
    assert.doesNotMatch(html, /Thay ảnh|Xóa ảnh|class="leaf-media-preview"/);
    assert.match(html, /Chưa có kết quả phân tích/);
    assert.doesNotMatch(html, /92%|Bệnh đốm lá|Backend chưa có mô hình/);
  } finally {
    await server.close();
  }
});

test("widget starts as accessible TeaSmart leaf launcher without full page navigation", async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: "custom" });
  try {
    const component = await server.ssrLoadModule("/src/components/ChatbotWidget.tsx");
    const html = renderToString(createElement(component.default, { customer: false, onLogin() {}, onProduct() {} }));
    assert.match(html, /Mở TeaSmart AI/);
    assert.match(html, /aria-expanded="false"/);
    assert.doesNotMatch(html, /iframe|role="dialog"/);
  } finally {
    await server.close();
  }
});
