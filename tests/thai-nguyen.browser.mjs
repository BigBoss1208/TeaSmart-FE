import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const out='artifacts/thai-nguyen-real';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE});
const errors=[],network=[],checks=[];const context=await browser.newContext();const p=await context.newPage();
p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)network.push({url:r.url(),status:r.status()})});
async function go(path){await p.goto('http://localhost:3000'+path,{waitUntil:'networkidle'});assert.match(await p.title(),/TeaSmart/)}
try{
 for(const route of ['/','/tea-regions','/shops','/about']){
 await go(route);if(route==='/tea-regions'){await p.waitForFunction(()=>document.querySelector('.hero-video')?.currentTime>0);assert.equal(await p.locator('.region-card').count(),5);const v=await p.locator('.hero-video').evaluate(v=>({duration:v.duration,muted:v.muted,loop:v.loop,playsInline:v.playsInline,preload:v.preload,controls:v.controls,width:v.videoWidth,height:v.videoHeight}));checks.push({video:v});await p.locator('.hero-video').evaluate(v=>v.currentTime=v.duration-.2);await p.waitForFunction(()=>document.querySelector('.hero-video').currentTime<2);checks.push({loop:'PASS'})}
 for(const [width,height] of [[375,812],[390,844],[768,1024],[1366,768],[1440,900],[1920,1080]]){
 await p.setViewportSize({width,height});await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=700){scrollTo({top:y,behavior:"instant"});await new Promise(r=>setTimeout(r,160))}scrollTo({top:0,behavior:"instant"})});await p.waitForTimeout(900);
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${route} ${width}`);
 await p.screenshot({path:`${out}/${route==='/'?'home':route.slice(1)}-${width}.png`,fullPage:true});
 if(route==='/'){await p.locator('.collection-grid').scrollIntoViewIfNeeded();await p.waitForTimeout(1000);await p.locator('.collection-grid').screenshot({path:`${out}/cards-${width}.png`})}
 checks.push({route,width,height,overflow:'PASS'});
 }
 }
 await go('/');for(const n of [1,2,3]){await p.locator(`.collection-card.c${n} button`).click();assert.equal(new URL(p.url()).pathname,'/explore');await go('/')};checks.push({cardCTA:'PASS'});
 await go('/tea-regions');await p.getByRole('searchbox').fill('tan cuong');assert.equal(await p.locator('.region-card').count(),1);await p.locator('.region-card button').click();assert.match(p.url(),/id=55022/);await p.reload({waitUntil:'networkidle'});assert.equal(await p.locator('.place-detail h1').innerText(),'Tân Cương');await p.getByRole('button',{name:'← Tất cả vùng chè'}).click();await p.getByRole('searchbox').fill('zzzz');assert.equal(await p.locator('.region-card').count(),0);await p.getByRole('searchbox').fill('');await p.getByRole('combobox').selectOption({index:1});assert.equal(await p.locator('.region-card').count(),1);checks.push({regionSearchFilterDetailReload:'PASS'});
 await go('/shops');assert.equal(await p.locator('.region-card').count(),0);assert.match(await p.locator('.places-empty').innerText(),/thử nghiệm/);await p.getByRole('searchbox').fill('test02');assert.equal(await p.locator('.region-card').count(),0);checks.push({storeTestDataExcluded:'PASS',realStoreSearch:'DEFERRED: no real store records'});
 const reduced=await browser.newContext({reducedMotion:'reduce',viewport:{width:390,height:844}});const rp=await reduced.newPage();await rp.goto('http://localhost:3000/tea-regions',{waitUntil:'networkidle'});assert.equal(await rp.locator('.hero-video').count(),0);assert.ok(await rp.locator('.hero-poster').evaluate(i=>i.complete&&i.naturalWidth>0));await rp.screenshot({path:`${out}/reduced-motion.png`});checks.push({reducedMotion:'PASS'});
 const fallback=await browser.newContext();await fallback.route('**/Vungchemoi.mp4',r=>r.abort());const fp=await fallback.newPage();await fp.goto('http://localhost:3000/tea-regions',{waitUntil:'networkidle'});assert.equal(await fp.locator('.hero-video').count(),0);assert.ok(await fp.locator('.hero-poster').evaluate(i=>i.complete&&i.naturalWidth>0));checks.push({posterOnVideoFailure:'PASS'});
 await context.route('**/api/tea-regions',r=>r.fulfill({status:503,json:{message:'Test failure'}}));await go('/tea-regions');await p.getByRole('alert').waitFor();await p.screenshot({path:`${out}/api-error.png`});await context.unroute('**/api/tea-regions');await p.getByRole('button',{name:'Thử lại',exact:true}).click();await p.locator('.region-card').first().waitFor();checks.push({apiErrorRetry:'PASS'});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,errors,network},null,2));
}finally{await writeFile(`${out}/results.json`,JSON.stringify({checks,errors,network},null,2));await browser.close()}
