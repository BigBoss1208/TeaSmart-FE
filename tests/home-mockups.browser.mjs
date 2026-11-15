import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
const context=browser.contexts()[0];
const page=await context.newPage();page.setDefaultTimeout(30000);
const out='artifacts/home-mockups';await mkdir(out,{recursive:true});
const errors=[],consoleErrors=[],networkErrors=[],writes=[],assets=new Map(),results=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
page.on('response',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/assets/home/'))assets.set(u.pathname,r.status());if(r.status()>=400)networkErrors.push({host:u.host,path:u.pathname,status:r.status()})});
page.on('requestfailed',r=>networkErrors.push({path:new URL(r.url()).pathname,error:r.failure()?.errorText}));
await page.route('**/api/**',r=>{if(!['GET','HEAD'].includes(r.request().method())){writes.push(new URL(r.request().url()).pathname);return r.abort()}return r.continue()});
const origin='http://127.0.0.1:3000';
async function home(){await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('.hero-title').waitFor();await page.waitForFunction(()=>document.querySelector('.hero-video')?.currentTime>0);}
async function reveal(selector){await page.locator(selector).first().evaluate(el=>window.scrollTo({top:scrollY+el.getBoundingClientRect().top-100,behavior:'instant'}));await page.waitForFunction(sel=>{const e=document.querySelector(sel)?.closest('.reveal-box');return !e||getComputedStyle(e).opacity==='1'},selector);await page.locator(selector).first().evaluate(e=>Promise.all(e.closest('.reveal-box')?.getAnimations().map(a=>a.finished)||[]));}
try{
 await home();
 for(const [width,height] of [[375,812],[390,844],[768,1024],[1366,768],[1440,900],[1920,1080]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForFunction(()=>document.querySelector('.header-immersive'));assert.equal(await page.locator('.announcement').count(),0);  assert.equal(await page.locator('.hero-video').getAttribute('src'),'/videos/teasmart-hero10.mp4');await page.screenshot({path:`${out}/after-hero-${width}.png`});
  for(const [name,sel] of [['collections','.collections'],['journal','.journal'],['regions','.regions-grid']]){await reveal(sel);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${name} ${width}`);await page.screenshot({path:`${out}/after-${name}-${width}.png`});}
  assert.equal(await page.locator('.collection-card .home-artwork').count(),4);assert.equal(await page.locator('.journal-card .home-artwork').count(),3);
  const size=await page.locator('.collection-card button').first().boundingBox();assert.ok(size.height>=44);
  await page.goto(origin+'/explore',{waitUntil:'domcontentloaded'});await page.locator('.explore-hero-approved').waitFor();assert.equal(await page.locator('.header-home').count(),0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const title=await page.locator('.explore-hero .page-title').boundingBox();const banner=await page.locator('.explore-hero').boundingBox();assert.ok(title.y>=banner.y);await page.screenshot({path:`${out}/after-explore-${width}.png`});results.push({check:'responsive_layout_header_artwork',width,height,status:'PASS'});await home();
 }
 await page.setViewportSize({width:1440,height:900});
 for(const selector of ['.collection-card','.journal-card']){const count=await page.locator(selector).count();for(let i=0;i<count;i++){await reveal(selector);const button=page.locator(selector).nth(i).getByRole('button');await button.click();await page.waitForURL('**/explore',{waitUntil:'domcontentloaded'});await home();}results.push({check:selector+'_existing_cta_routes',count,status:'PASS',destination:'/explore'});}
 await reveal('.collection-grid');await page.locator('.collection-card').first().hover();await page.screenshot({path:`${out}/hover-collection-1440.png`});await reveal('.journal-grid');await page.locator('.journal-card').first().hover();await page.screenshot({path:`${out}/hover-journal-1440.png`});
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Mở menu',exact:true}).click();await page.locator('.nav.open').getByRole('button',{name:'Khám phá chè',exact:true}).click();await page.waitForURL('**/explore',{waitUntil:'domcontentloaded'});results.push({check:'mobile_menu_navigation',status:'PASS'});
 await home();const video=page.locator('.hero-video');assert.ok(await video.evaluate(v=>v.autoplay&&v.muted&&v.loop&&v.playsInline&&!v.controls));await video.evaluate(v=>{v.currentTime=v.duration-.1});await page.waitForFunction(()=>document.querySelector('.hero-video').currentTime<2&&!document.querySelector('.hero-video').paused);results.push({check:'original_video_autoplay_loop',status:'PASS'});
 assert.equal(assets.size,4);assert.ok([...assets.values()].every(s=>s===200||s===304));assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);results.push({check:'local_artwork_network',status:'PASS',assets:[...assets]});
 await writeFile(`${out}/results.json`,JSON.stringify({mode:'LIVE_CHROME_LOCAL_FRONTEND_READ_ONLY_NO_FIXTURES',results,pageErrors:errors,consoleErrors,networkErrors,blockedWrites:writes},null,2));console.log('HOME_MOCKUPS_RESPONSIVE_CTA_ARTWORK_VIDEO_PASS');await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));process.exit(0);
}catch(e){await writeFile(`${out}/failure.json`,JSON.stringify({error:String(e),results,errors,consoleErrors,networkErrors},null,2));console.error(e);process.exit(1)}
