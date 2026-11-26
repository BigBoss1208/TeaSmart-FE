const assert = require("node:assert/strict");
const { mkdir, readFile } = require("node:fs/promises");
const { join } = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const endpoint = "/api/leaf-classifications/predict";
const tokenKey = "teasmart_access_token";
const fixtures = {
  "image/jpeg": process.env.LEAF_TEST_IMAGE ?? "public/assets/home/thai-nguyen-hill.jpg",
  "image/png": "public/demo/tea/ts-demo-001.png",
  "video/mp4": process.env.LEAF_TEST_VIDEO ?? "public/videos/hero-tea.mp4",
};
const originalLabels = [
  "1. Tea algal leaf spot", "2. Brown Blight", "3. Gray Blight", "4. Helopeltis",
  "5. Red spider", "6. Green mirid bug", "7. Healthy leaf",
];
const descriptions = [
  ["Bệnh đốm rong lá chè", /Đốm gần tròn, hơi gồ/],
  ["Bệnh cháy lá nâu", /Mảng nâu vàng đến nâu sẫm/],
  ["Bệnh cháy lá xám", /Vết có tâm xám, viền nâu/],
  ["Bọ xít muỗi", /Vết chích nhỏ màu nâu đỏ/],
  ["Nhện đỏ", /Vùng màu đồng đỏ trên mặt lá/],
  ["Bọ xít mirid xanh", /Đốm nhỏ nâu đỏ trên búp non/],
  ["Lá chè khỏe mạnh", /Bề mặt lá không có những vết đốm/],
];

function prediction(type, winner, frames, agreement) {
  const remaining = [0.07, 0.065, 0.055, 0.045, 0.035, 0.025];
  const class_probabilities = originalLabels.map((label, index) => ({
    class_index: index,
    label,
    probability: index === winner ? 0.705 : remaining.shift(),
  }));
  return {
    media_type: type, model_id: "mobilenetv2-epoch20", class_index: winner, label: originalLabels[winner],
    prediction_score: 0.705, class_probabilities,
    video: type === "video"
      ? { sampled_frames: frames, agreeing_frames: agreement, agreement_ratio: agreement / frames }
      : null,
    warnings: type !== "video" ? [] : frames === 1 ? ["INSUFFICIENT_FRAMES_FOR_AGREEMENT"]
      : ["INCONSISTENT_VIDEO_PREDICTIONS"],
    notice: "English fixture notice must not be presented",
  };
}

async function run() {
  const screenshotDir = process.env.LEAF_SCREENSHOTS_DIR;
  if (screenshotDir) await mkdir(screenshotDir, { recursive: true });
  const { preview } = await import("vite");
  const server = await preview({
    build: { outDir: process.env.LEAF_PREVIEW_DIST ?? "dist" },
    preview: { host: "127.0.0.1", port: 0, strictPort: true },
  });
  let browser;
  try {
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    browser = await chromium.launch({ channel: "chrome", headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1020 } });
    const requests = [];
    let status = 200;
    let winner = 0;
    let frames = 8;
    let agreement = 5;
    let deferred;
    await page.addInitScript(key => {
      window.activePreviewUrls = new Set();
      const create = URL.createObjectURL.bind(URL);
      const revoke = URL.revokeObjectURL.bind(URL);
      URL.createObjectURL = value => {
        const url = create(value);
        window.activePreviewUrls.add(url);
        return url;
      };
      URL.revokeObjectURL = url => {
        window.activePreviewUrls.delete(url);
        revoke(url);
      };
      sessionStorage.setItem(key, "test-browser-token");
    }, tokenKey);
    await page.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    await page.route("**/api/**", async route => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      if (pathname !== endpoint) {
        const profile = { userId: 1, fullName: "Người kiểm thử", email: "leaf@example.test", role: "CUSTOMER" };
        const data = {
          "/api/users/me": profile,
          "/api/products": { content: [], totalPages: 0 },
          "/api/cart": { items: [] },
        };
        return route.fulfill({ json: data[pathname] ?? [] });
      }
      const headers = request.headers();
      requests.push({ type: headers["content-type"], authorization: headers.authorization, bytes: request.postDataBuffer() });
      const requestStatus = status;
      const response = requestStatus === 200
        ? prediction(headers["content-type"] === "video/mp4" ? "video" : "image", winner, frames, agreement)
        : { message: "PRIVATE_UPSTREAM_MESSAGE" };
      const reply = deferred;
      if (reply) await reply;
      try {
        await route.fulfill({ status: requestStatus, json: response });
      } catch (error) {
        if (!reply) throw error;
      }
    });

    await page.goto(origin + "/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "AI phân loại sâu bệnh lá chè", exact: true }).click();
    await page.waitForURL(origin + "/leaf");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: "Tải ảnh lá chè" }).waitFor();
    await page.getByRole("button", { name: "Mở TeaSmart AI" }).waitFor();
    const select = file => page.locator('input[type="file"]').setInputFiles(file);
    const submit = page.getByRole("button", { name: "Phân tích lá chè", exact: true });
    const result = page.locator(".leaf-analysis-result");
    const chart = result.getByRole("region", { name: "Xác suất của 7 nhóm" });
    const previewCount = () => page.evaluate(() => window.activePreviewUrls.size);
    const drop = page.locator(".leaf-media-drop");
    const media = page.locator(".leaf-media-upload");
    async function replaceFile(mode, files) {
      const dialog = page.waitForEvent("filechooser");
      await page.getByRole("button", { name: `Thay ${mode}`, exact: true }).click();
      await (await dialog).setFiles(files);
    }

    async function checkLayout(isMobile) {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      const left = await media.boundingBox();
      const right = await result.boundingBox();
      const banner = await page.locator(".leaf-analysis-hero").boundingBox();
      const navbar = await page.locator(".header").boundingBox();
      const tabs = await page.getByRole("tablist", { name: "Loại dữ liệu lá chè" }).boundingBox();
      const preview = page.locator(".leaf-media-preview img, .leaf-media-preview video");
      const frame = await preview.boundingBox();
      const controls = await media.locator(".leaf-preview-actions").boundingBox();
      const analyze = await submit.boundingBox();
      assert.ok(banner.y >= navbar.y + navbar.height - 1, "banner begins below navigation");
      if (isMobile) assert.ok(right.y >= left.y + left.height, "mobile has one column");
      else {
        assert.ok(left.x + left.width <= right.x, "desktop has two side-by-side columns");
        assert.ok(Math.abs(right.y - left.y) <= 1, "desktop columns align at the same top edge");
      }
      assert.ok(frame.y >= tabs.y + tabs.height && frame.y < tabs.y + tabs.height + 110,
        "preview begins directly under the tabs");
      assert.ok(frame.width >= left.width * .82, "preview fills most of the upload column");
      assert.equal(await preview.evaluate(el => getComputedStyle(el).objectFit), "contain");
      assert.ok(controls.y >= frame.y + frame.height && analyze.y >= controls.y + controls.height,
        "file actions are between preview and analysis");
      assert.equal(await page.locator(".leaf-analysis-panel").evaluate(node => node.scrollWidth <= node.clientWidth), true);
    }
    assert.equal(await submit.isDisabled(), true);
    await drop.getByRole("button", { name: "Chọn ảnh", exact: true }).waitFor();

    async function capture(name) {
      if (!screenshotDir) return;
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      assert.equal(await page.locator('p.page[role="alert"]').count(), 0);
      const bounds = await page.locator(".leaf-analysis").boundingBox();
      await page.screenshot({
        path: join(screenshotDir, name),
        fullPage: true,
        clip: { x: 0, y: 0, width: page.viewportSize().width, height: Math.ceil(bounds.y + bounds.height) },
        animations: "disabled",
      });
    }

    async function checkPrediction(index) {
      const [name, signs] = descriptions[index];
      await result.getByRole("heading", { name, exact: true }).waitFor();
      const text = await result.innerText();
      assert.doesNotMatch(text, /English fixture notice|Brown Blight|Green mirid bug/);
      assert.deepEqual(await chart.locator("dt").allTextContents(), descriptions.map(([name]) => name));
      assert.equal(await chart.locator(".leaf-probability-selected dt").textContent(), name);
      assert.equal(await chart.locator(".leaf-probability-selected dd").textContent(), "70,50%");
      assert.equal(await chart.locator(".leaf-probability-selected .leaf-probability-track > span").evaluate(el => parseFloat(el.style.width)), 70.5);
      assert.match(await result.getByRole("region", { name: "Mô tả tình trạng" }).innerText(), signs);
      assert.equal(await result.locator(".leaf-recommendations > li").count(), 2);
      await result.getByText("Nguồn tham khảo", { exact: true }).click();
      assert.ok(await result.locator(".leaf-references a").first().isVisible());
      assert.match(await result.locator(".leaf-references a").first().getAttribute("href"), /^https:\/\//);
    }

    await select(fixtures["image/jpeg"]);
    await page.getByText("Tệp đã sẵn sàng để phân tích.").waitFor();
    await page.getByRole("button", { name: "Thay ảnh", exact: true }).waitFor();
    const jpegUrl = await page.getByRole("img", { name: "Ảnh lá chè đã chọn" }).getAttribute("src");
    assert.equal(await drop.count(), 0);
    assert.match(await media.locator(".leaf-file-info").textContent(), /\.jpg.*JPEG.*(?:KB|MB)/);
    let release;
    deferred = new Promise(resolve => { release = resolve; });
    await submit.evaluate(button => { button.click(); button.click(); });
    const loading = page.getByRole("button", { name: "Đang phân tích…" });
    await loading.waitFor();
    assert.equal(await loading.isDisabled(), true);
    release();
    deferred = undefined;
    await checkPrediction(0);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].authorization, "Bearer test-browser-token");
    assert.deepEqual(requests[0].bytes, await readFile(fixtures["image/jpeg"]));
    await checkLayout(false);
    await capture("leaf-desktop.png");
    await page.setViewportSize({ width: 1366, height: 910 });
    await checkLayout(false);
    await capture("leaf-laptop.png");

    await replaceFile("ảnh", []);
    assert.equal(await page.getByRole("img", { name: "Ảnh lá chè đã chọn" }).getAttribute("src"), jpegUrl);
    assert.equal(await previewCount(), 1);
    assert.equal(await chart.count(), 1);
    assert.equal(requests.length, 1);

    const png = await readFile(fixtures["image/png"]);
    await replaceFile("ảnh", { name: "la-che-moi.png", mimeType: "image/png", buffer: png });
    await page.getByText("Tệp đã sẵn sàng để phân tích.").waitFor();
    assert.equal(await chart.count(), 0);
    assert.equal(await page.evaluate(url => window.activePreviewUrls.has(url), jpegUrl), false);
    assert.equal(await previewCount(), 1);
    for (winner = 1; winner < descriptions.length; winner++) {
      await submit.click();
      await checkPrediction(winner);
      if (winner === 5) await result.getByText(/Chưa xác minh được tên tiếng Việt chuyên ngành/).waitFor();
    }
    assert.doesNotMatch(await result.locator(".leaf-recommendations").innerText(), /điều trị|chữa bệnh|thuốc/);
    assert.equal(requests[1].type, "image/png");
    assert.deepEqual(requests[1].bytes, png);
    await media.getByRole("button", { name: "Xóa ảnh", exact: true }).click();
    await drop.getByRole("button", { name: "Chọn ảnh" }).waitFor();
    assert.equal(await chart.count(), 0);
    assert.equal(await media.locator(".leaf-media-preview").count(), 0);
    assert.equal(await previewCount(), 0);
    assert.equal(await submit.isDisabled(), true);

    await drop.evaluate((dropZone, base64) => {
      const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
      const transfer = new DataTransfer();
      transfer.items.add(new File([bytes], "leaf.png", { type: "image/png" }));
      dropZone.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: transfer }));
    }, png.toString("base64"));
    await page.getByText("Tệp đã sẵn sàng để phân tích.").waitFor();
    assert.equal(await drop.count(), 0);

    winner = 0;
    deferred = new Promise(resolve => { release = resolve; });
    const pngRequest = page.waitForRequest(request => request.url().endsWith(endpoint));
    await submit.click();
    await pngRequest;
    await page.getByRole("tab", { name: "Tải video lá chè" }).click();
    release();
    deferred = undefined;
    assert.equal(await chart.count(), 0);
    assert.equal(await previewCount(), 0);
    await page.getByRole("button", { name: "Chọn video", exact: true }).waitFor();
    await select(fixtures["video/mp4"]);
    await page.getByText("Tệp đã sẵn sàng để phân tích.").waitFor();
    const video = page.locator(".leaf-media-preview video");
    await video.evaluate(element => {
      Object.defineProperty(element, "duration", { configurable: true, value: 15.01 });
      element.dispatchEvent(new Event("loadedmetadata"));
    });
    await page.getByRole("alert").filter({ hasText: /tối đa 15 giây/ }).waitFor();
    assert.equal(await submit.isDisabled(), true);

    await page.setViewportSize({ width: 390, height: 844 });
    winner = 5;
    await replaceFile("video", fixtures["video/mp4"]);
    assert.equal(await drop.count(), 0);
    await page.getByRole("button", { name: "Thay video", exact: true }).waitFor();
    await submit.click();
    await checkPrediction(5);
    await result.getByText("Số khung hình đã phân tích", { exact: true }).waitFor();
    await result.getByText("8 khung", { exact: true }).waitFor();
    await result.getByText("Mức độ đồng thuận", { exact: true }).waitFor();
    await result.getByText("5/8 khung (62,50%)", { exact: true }).waitFor();
    await result.getByText("Cảnh báo kết quả chưa nhất quán", { exact: true }).waitFor();
    await result.getByRole("note").filter({ hasText: /Để đánh giá cả cây chè, cần kiểm tra trực tiếp/ }).waitFor();
    assert.equal(await page.locator(".leaf-analysis-panel").evaluate(node => node.scrollWidth <= node.clientWidth), true);
    assert.equal(requests.at(-1).type, "video/mp4");
    assert.deepEqual(requests.at(-1).bytes, await readFile(fixtures["video/mp4"]));
    await checkLayout(true);
    await capture("leaf-mobile.png");
    const videoUrl = await video.getAttribute("src");
    await replaceFile("video", []);
    assert.equal(await video.getAttribute("src"), videoUrl);
    assert.equal(await chart.count(), 1);
    assert.equal(await previewCount(), 1);

    frames = agreement = 1;
    await submit.click();
    await result.getByText("Chưa đủ khung hình để so sánh", { exact: true }).waitFor();
    assert.equal(await result.getByText("Cảnh báo kết quả chưa nhất quán", { exact: true }).count(), 0);

    for (const [failure, message] of [
      [429, /AI đang bận/], [503, /AI chưa sẵn sàng/], [504, /quá thời gian chờ/],
      [401, /Phiên đăng nhập đã hết hạn/],
    ]) {
      status = failure;
      await submit.click();
      await page.getByRole("alert").filter({ hasText: message }).waitFor();
      assert.equal(await submit.isEnabled(), true);
      assert.equal(await page.getByText("PRIVATE_UPSTREAM_MESSAGE").count(), 0);
      assert.equal(await chart.count(), 0);
    }
    assert.equal(await page.evaluate(key => sessionStorage.getItem(key), tokenKey), null);
    await page.getByRole("link", { name: "Đăng nhập" }).waitFor();
    const beforeGuest = requests.length;
    await submit.click();
    await page.getByRole("alert").filter({ hasText: /Vui lòng đăng nhập/ }).waitFor();
    assert.equal(requests.length, beforeGuest);
    await page.getByRole("button", { name: "Xóa video" }).click();
    assert.equal(await previewCount(), 0);
    await drop.getByRole("button", { name: "Chọn video" }).waitFor();
    assert.equal(await submit.isDisabled(), true);
    await page.getByRole("link", { name: "Đăng nhập" }).waitFor({ state: "detached" });
    console.log("PASS Chrome Leaf at 1920, 1366 and 390 px: JPEG/PNG/MP4, hide drop zone, replace/cancel/delete, supported states, layout, 7 predictions, duplicate prevention, URL cleanup, login and HTTP errors.");
  } finally {
    await browser?.close();
    await server.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
