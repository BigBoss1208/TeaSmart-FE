// Read-only live API/DB checks and explicitly labelled HTTP-mock edge cases.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require(path.join(process.env.TEMP, 'teasmart-checkout-browser/node_modules/playwright'));
const out = 'docs/TEASMART_MASTER_AUDIT/TASTE_FINDER_2026-10-26';
const base = 'http://localhost:3000';
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = []; let mutations = 0;
  const run = async (mode, name, fn) => {
    try { await fn(); results.push({ mode, name, status: 'PASS' }); }
    catch (error) { results.push({ mode, name, status: 'FAIL', errorType: error.name }); throw error; }
  };
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.route('**/api/**', route => {
      if (route.request().method() !== 'GET') { mutations++; return route.abort(); }
      return route.continue();
    });
    const page = await context.newPage();
    const section = page.locator('.taste-finder-v2');
    await run('REAL_API_READ_ONLY', 'Six choices never show DEV/synthetic or unrelated fallback', async () => {
      await page.goto(base); await section.getByText('Chưa có sản phẩm phù hợp', { exact: true }).waitFor();
      for (const choice of ['Đậm vị', 'Ít chát', 'Hậu ngọt', 'Hương thơm', 'Uống hằng ngày', 'Làm quà']) {
        await section.getByRole('button', { name: choice, exact: true }).click();
        assert.equal(await section.getByRole('button', { name: choice, exact: true }).getAttribute('aria-pressed'), 'true');
        assert.doesNotMatch(await section.innerText(), /DEV |Synthetic|Chưa có dữ liệu:|Hậu vị: 2\/5/);
        if (choice !== 'Làm quà') await section.getByText('Chưa có sản phẩm phù hợp', { exact: true }).waitFor();
        else { await section.locator('.product-card').first().waitFor(); assert.equal(await section.locator('.product-card').count(), 2); }
      }
    });
    for (const width of [390, 768, 1440]) await run('REAL_API_READ_ONLY', 'Gift cards and layout at ' + width, async () => {
      await page.setViewportSize({ width, height: 1000 }); await section.scrollIntoViewIfNeeded();
      await section.locator('img').evaluateAll(images => images.forEach(img => img.loading = 'eager'));
      await page.waitForFunction(() => [...document.querySelectorAll('.taste-finder-v2 .product-image img')].every(img => img.complete && img.naturalWidth > 0));
      assert(await section.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
      const bounds = await section.locator('.product-image').evaluateAll(items => items.map(el => el.getBoundingClientRect().width / el.getBoundingClientRect().height));
      assert(bounds.every(ratio => Math.abs(ratio - (width <= 520 ? 1.25 : 1)) < .03));
      await section.screenshot({ path: out + '/GIFT-' + width + '.png' });
    });
    await run('REAL_API_READ_ONLY', 'Card opens selected actual product and price comes from API', async () => {
      const card = section.locator('.product-card').first();
      const name = await card.locator('.product-name').innerText();
      const price = (await card.locator('.product-price-amount').innerText()).replace(/\D/g, '');
      await card.getByRole('button', { name: 'Xem chi tiết', exact: true }).click();
      await page.getByRole('heading', { name, exact: true }).waitFor();
      assert.equal((await page.locator('.detail-price').innerText()).replace(/\D/g, ''), price);
    });
    await run('REAL_API_READ_ONLY', 'Empty taste state screenshot', async () => {
      await page.goto(base); await section.getByText('Chưa có sản phẩm phù hợp', { exact: true }).waitFor();
      await section.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => {
        const el = document.querySelector('.taste-finder-v2')?.closest('.reveal-box');
        return el && Number(getComputedStyle(el).opacity) > .99;
      });
      await section.screenshot({ path: out + '/EMPTY-1440.png' });
    });
    await context.close();

    const mocked = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    let fail = true, slow = false, gets = 0;
    const sample = { productId: 90001, name: 'Trà mẫu kiểm thử giao diện', slug: 'ui-only', price: 123000, weightGrams: 100,
      imageUrl: '/demo/tea/ts-demo-001.png', categoryName: 'Trà xanh', regionId: 1, regionName: 'Vùng mẫu', tasteNote: null, stockQuantity: 4, aftertasteLevel: 4 };
    await mocked.route('**/api/**', async route => {
      if (route.request().method() !== 'GET') { mutations++; return route.abort(); }
      gets++; const url = new URL(route.request().url());
      if (slow) await new Promise(resolve => setTimeout(resolve, 600));
      if (url.pathname.startsWith('/api/products')) return route.fulfill({ status: fail ? 503 : 200, contentType: 'application/json',
        body: JSON.stringify(fail ? { code: 'UNAVAILABLE', message: 'test-only' } : url.pathname === '/api/products' ? { content: [sample], totalPages: 1 } : sample) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], content: [] }) });
    });
    const mockPage = await mocked.newPage(); const mockSection = mockPage.locator('.taste-finder-v2');
    await run('HTTP_MOCK', 'Network/API error is honest and retry succeeds without creating data', async () => {
      await mockPage.goto(base); await mockSection.getByRole('alert').waitFor();
      assert.equal(await mockSection.locator('.product-card').count(), 0);
      fail = false; await mockSection.getByRole('button', { name: 'Thử lại' }).click();
      await mockSection.locator('.product-card').waitFor(); assert.match(await mockSection.innerText(), /123\.000/);
    });
    await run('HTTP_MOCK', 'Choice updates immediately and reuses facts without refetch', async () => {
      const before = gets;
      await mockSection.getByRole('button', { name: 'Ít chát', exact: true }).click();
      await mockSection.getByText('Chưa có sản phẩm phù hợp', { exact: true }).waitFor();
      await mockSection.getByRole('button', { name: 'Hậu ngọt', exact: true }).click();
      await mockSection.locator('.product-card').waitFor(); assert.equal(gets, before);
    });
    await run('HTTP_MOCK', 'Loading state and AI button open existing tool rather than simulate advice', async () => {
      slow = true; await mockPage.reload(); await mockSection.getByRole('status').waitFor();
      await mockSection.getByRole('button', { name: 'Để TeaSmart AI tư vấn' }).click();
      const dialog = mockPage.getByRole('dialog', { name: 'TeaSmart AI', exact: true });
      await dialog.waitFor();
      assert.match(await dialog.innerText(), /Đăng nhập tài khoản khách hàng/);
    });
    await mocked.close();
    assert.equal(mutations, 0);
    fs.writeFileSync(out + '/browser-results.json', JSON.stringify({ results, nonGetRequests: mutations }, null, 2));
    console.log(JSON.stringify({ pass: results.length, fail: 0, nonGetRequests: mutations }));
  } finally { await browser.close(); }
})().catch(error => { console.error('TASTE_BROWSER_FAILED: ' + error.name + ': ' + error.message); process.exitCode = 1; });
