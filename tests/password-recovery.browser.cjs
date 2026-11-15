// Real React + Spring Boot + MySQL test + loopback SMTP. No API mocks.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const backend = process.env.RESET_TEST_BACKEND;
  assert.match(backend || '', /^http:\/\/127\.0\.0\.1:[0-9]+$/);
  assert(!backend.endsWith(':8080'));
  const artifacts = process.env.BROWSER_ARTIFACT_DIR;
  assert(artifacts); fs.mkdirSync(artifacts, { recursive: true });
  const net = require('node:net');
  await new Promise((resolve,reject)=>{const probe=net.createServer();probe.once('error',reject);probe.listen(3001,'127.0.0.1',()=>probe.close(resolve));});
  const frontend = spawn(process.execPath, ['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','3001','--strictPort'], {
    env: { ...process.env, TEASMART_BACKEND_URL: backend }, stdio: ['ignore','pipe','pipe'], windowsHide: true,
  });
  let exited=false; frontend.on('exit',()=>exited=true);
  frontend.stdout.on('data',()=>{}); frontend.stderr.on('data',()=>{});
  console.log('Browser E2E: waiting for frontend 3001');
  let browser;
  try {
    let ready=false;
    for(let i=0;i<60;i++) {
      if(exited)throw new Error('Test frontend did not start; port 3001 must be free');
      try { const res=await fetch('http://127.0.0.1:3001/quen-mat-khau', {signal:AbortSignal.timeout(2000)}); if(res.ok){ready=true;break;} }catch{}
      await new Promise(r=>setTimeout(r,250));
    }
    assert(ready);
    console.log('Browser E2E: launching Chrome');
    browser=await chromium.launch({channel:'chrome',headless:false});
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    page.setDefaultTimeout(60000); page.setDefaultNavigationTimeout(60000);
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    console.log('Browser E2E: login to forgot page');
    await page.goto('http://127.0.0.1:3001/dang-nhap');
    await page.getByRole('button',{name:'Quên mật khẩu?'}).click();
    await page.getByRole('heading',{name:'Quên mật khẩu?'}).waitFor();
    await page.screenshot({path:path.join(artifacts,'password-forgot-desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    await page.screenshot({path:path.join(artifacts,'password-forgot-mobile.png'),fullPage:true});
    await page.getByLabel('Email đã đăng ký').fill('reset-browser@example.invalid');
    let sends=0;page.on('request',r=>{if(r.url().endsWith('/api/auth/forgot-password'))sends++;});
    await page.getByRole('button',{name:'Gửi mã OTP'}).evaluate(el=>{el.click();el.click();});
    await page.getByRole('heading',{name:'Nhập mã xác minh'}).waitFor();
    await page.screenshot({path:path.join(artifacts,'password-email-sent.png'),fullPage:true});
    assert.equal(sends,1);
    await page.getByLabel('Mã OTP 6 số').fill('12ab34');
    assert.equal(await page.getByLabel('Mã OTP 6 số').inputValue(),'1234');
    let otp='';for(let i=0;i<100;i++){otp=fs.readFileSync(process.env.RESET_TEST_OTP_FILE,'utf8').trim();if(otp)break;await new Promise(r=>setTimeout(r,100));}
    assert.match(otp,/^[0-9]{6}$/);
    await page.getByLabel('Mã OTP 6 số').fill(otp==='000000'?'000001':'000000');
    await page.getByRole('button',{name:'Xác nhận OTP',exact:true}).click();
    await page.getByRole('alert').filter({hasText:'Mã OTP không hợp lệ'}).waitFor();
    await page.getByLabel('Mã OTP 6 số').fill(otp);
    let verifications=0;page.on('request',r=>{if(r.url().endsWith('/api/auth/reset-password/verify'))verifications++;});
    await page.getByRole('button',{name:'Xác nhận OTP',exact:true}).evaluate(el=>{el.click();el.click();});
    await page.getByLabel('Mật khẩu mới',{exact:true}).waitFor();
    await page.screenshot({path:path.join(artifacts,'password-reset-mobile.png'),fullPage:true});
    await page.getByLabel('Mật khẩu mới',{exact:true}).fill('BrowserNew123!');
    await page.getByLabel('Nhập lại mật khẩu',{exact:true}).fill('Mismatch123!');
    await page.getByRole('button',{name:'Đặt lại mật khẩu',exact:true}).click();
    await page.getByRole('alert').filter({hasText:'Mật khẩu phải khớp'}).waitFor();
    await page.getByLabel('Nhập lại mật khẩu',{exact:true}).fill('BrowserNew123!');
    let posts=0;page.on('request',r=>{if(r.url().endsWith('/api/auth/reset-password')&&r.method()==='POST')posts++;});
    await page.getByRole('button',{name:'Đặt lại mật khẩu',exact:true}).evaluate(el=>{el.click();el.click();});
    await page.getByRole('heading',{name:'Đặt lại mật khẩu thành công!'}).waitFor();assert.equal(posts,1);assert.equal(verifications,1);
    assert(!page.url().includes('#')); assert.equal(await page.evaluate(()=>sessionStorage.getItem('teasmart_access_token')),null);
    await page.setViewportSize({width:1440,height:900});
    await page.screenshot({path:path.join(artifacts,'password-reset-success.png'),fullPage:true});
    await page.getByRole('button',{name:'← Quay lại đăng nhập'}).click();
    await page.getByLabel('Email hoặc số điện thoại').fill('reset-browser@example.invalid');
    await page.getByLabel('Mật khẩu',{exact:true}).fill('Original123!');
    await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
    await page.getByText('Tài khoản hoặc mật khẩu không chính xác.',{exact:true}).waitFor();
    await page.getByLabel('Mật khẩu',{exact:true}).fill('BrowserNew123!');
    await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
    await page.waitForFunction(()=>!!sessionStorage.getItem('teasmart_access_token'));
    await page.goto('http://127.0.0.1:3001/dat-lai-mat-khau#token='+'legacy-link');
    await page.getByRole('button',{name:'Gửi mã OTP'}).waitFor();
    assert.equal(await page.getByLabel('Mật khẩu mới',{exact:true}).count(),0);
    assert.deepEqual(errors,[]);
    console.log('Chrome PASS: forgot, SMTP-issued OTP, responsive, mismatch, double-click, reset, old/new login, old link rejection; no page errors.');
  } catch(error) { if(browser){ const pages=browser.contexts().flatMap(c=>c.pages()); if(pages[0])await pages[0].screenshot({path:path.join(artifacts,'password-recovery-failure.png'),fullPage:true}).catch(()=>{}); } throw error;
  } finally {if(browser)await browser.close();frontend.kill();}
})().catch(error=>{console.error(String(error.message).replaceAll(process.env.RESET_TEST_TOKEN || 'NO_TOKEN', '[REDACTED]'));process.exitCode=1;});
