const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const { createServer } = await import('vite');
  const server=await createServer({server:{host:'127.0.0.1',port:4177,strictPort:true},clearScreen:false});
  await server.listen();
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    for(const width of [1440,390]) {
      const page=await browser.newPage({viewport:{width,height:900}});
      const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
      let mode='products',delay=0,calls=0;const product={productId:11,name:'Chè fixture',slug:'fixture',price:150000,stockQuantity:8,weightGrams:100,available:true};
      await page.route('**/api/**',async route=>{
        const path=new URL(route.request().url()).pathname;let data=[];
        if(path==='/api/users/me')data={userId:999,fullName:'Fixture',email:'fixture@example.invalid',role:'CUSTOMER'};
        else if(path==='/api/products')data={content:[product],totalPages:1,totalElements:1};
        else if(path.startsWith('/api/products/'))data=product;
        else if(path==='/api/cart')data={items:[],totalItems:0,totalAmount:0};
        else if(path==='/api/recommendations')data={method:'CONTENT_BASED_V1',fallback:true,items:[]};
        else if(path==='/api/chatbot/rag') {
          calls++;const current=mode; if(delay)await new Promise(r=>setTimeout(r,delay));
          if(current==='503')return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({code:'RAG_PROVIDER_UNAVAILABLE'})});
          data={method:current==='products'?'READ_ONLY_BUSINESS_V1':'RAG_NO_EVIDENCE',reply:current==='products'?'Các sản phẩm phù hợp ngân sách.':'Chưa đủ tài liệu để trả lời câu hỏi này.',businessKind:current==='products'?'PRODUCTS':'KNOWLEDGE',preferences:{maxPrice:300000},recommendations:{items:[]},businessProducts:current==='products'?Array.from({length:12},(_,i)=>({...product,productId:11+i,slug:`fixture-${i}`})):[],sources:[],llmUsed:current!=='products'};
        }
        await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
      });
      await page.addInitScript(()=>sessionStorage.setItem('teasmart_access_token','ui-fixture-only'));
      await page.goto('http://127.0.0.1:4177/');
      await page.evaluate(()=>window.scrollTo(0,300));
      await page.getByRole('button',{name:'Mở TeaSmart AI',exact:true}).click();
      const input=page.locator('#widget-message'),send=page.getByRole('button',{name:'Gửi tin nhắn',exact:true});
      const chat=page.locator('.tea-chat-messages');
      const idle=()=>page.locator('.tea-chat-window [role="status"]').waitFor({state:'hidden'});
      const latest=()=>chat.locator('[data-chat-message]').last();
      const assertLatestVisible=async()=>{
        await page.waitForFunction(()=>{
          const c=document.querySelector('.tea-chat-messages');
          const all=c?.querySelectorAll('[data-chat-message]');const last=all?.[all.length-1];
          if(!c||!last)return false;const cr=c.getBoundingClientRect(),r=last.querySelector('p').getBoundingClientRect();
          return r.top>=cr.top-1 && r.bottom<=cr.bottom+1;
        });
      };
      await input.fill('Chè dưới 300k');await send.click();await idle();
      assert.equal(await latest().locator('.tea-chat-products article').count(),4,'cards must belong to their answer');
      await assertLatestVisible();const firstAnswer=chat.locator('[data-chat-message].tea-chat-ai').first();
      await firstAnswer.getByRole('button',{name:'Xem thêm sản phẩm',exact:true}).click();
      assert.equal(await firstAnswer.locator('article').count(),8);
      await firstAnswer.getByRole('button',{name:'Xem thêm sản phẩm',exact:true}).click();
      assert.equal(await firstAnswer.locator('article').count(),12);assert.equal(calls,1);
      const pageY=await page.evaluate(()=>window.scrollY);
      mode='503';delay=300;await input.fill('Cách pha chè');await send.click();await assertLatestVisible();await idle();await assertLatestVisible();
      assert.equal(await latest().locator('.tea-chat-products').count(),0);
      assert.equal(await chat.locator('.tea-chat-products article').count(),12,'old cards remain inside historical answer');
      assert(await firstAnswer.evaluate(e=>Boolean(e.compareDocumentPosition(e.parentElement.lastElementChild)&Node.DOCUMENT_POSITION_FOLLOWING)));
      assert.equal(await page.evaluate(()=>window.scrollY),pageY);
      if(process.env.CHATBOT_SCROLL_ARTIFACT_DIR)await page.screenshot({path:require('node:path').join(process.env.CHATBOT_SCROLL_ARTIFACT_DIR,`chatbot-scroll-${width}.png`)});
      mode='noEvidence';delay=0;await input.fill('Bảo quản chè');await send.click();await idle();await assertLatestVisible();
      assert.equal(await latest().locator('.tea-chat-products').count(),0);
      mode='products';await input.fill('Chè làm quà dưới 300k');await send.click();await idle();await assertLatestVisible();
      assert.equal(await latest().locator('article').count(),4);
      assert.equal(await firstAnswer.locator('article').count(),12,'pagination belongs to each response');
      assert(await chat.evaluate(e=>e.scrollWidth<=e.clientWidth+1));
      // A late answer respects an explicit history scroll while pending.
      mode='503';delay=600;await input.fill('Cách pha chè lần nữa');await send.click();
      await page.waitForTimeout(80);await chat.evaluate(e=>{e.scrollTop=0;e.dispatchEvent(new Event('scroll'));});
      await idle();await page.waitForTimeout(100);
      assert.equal(await chat.evaluate(e=>e.scrollTop),0,'late response must not pull reader away from history');
      // A new explicit send takes precedence over history reading.
      delay=0;mode='noEvidence';await input.fill('Chè Tân Cương');await send.click();await idle();await assertLatestVisible();
      assert.equal(await page.evaluate(()=>window.scrollY),pageY);
      const prompts=page.locator('.tea-chat-prompts');
      assert.equal(await prompts.evaluate(e=>getComputedStyle(e).scrollbarWidth),'none');
      await prompts.evaluate(e=>{e.scrollLeft=e.scrollWidth;});
      assert(await prompts.evaluate(e=>e.scrollLeft>0));
      await page.getByRole('button',{name:'Đóng chatbot',exact:true}).click();await page.getByRole('button',{name:'Mở TeaSmart AI',exact:true}).click();
      await assertLatestVisible();
      const rest=await chat.evaluate(e=>e.scrollTop);await page.waitForTimeout(150);
      assert.equal(await chat.evaluate(e=>e.scrollTop),rest,'no idle scroll jitter');
      await firstAnswer.getByRole('button',{name:'Xem chi tiết',exact:true}).first().click();
      await page.locator('.product-purchase').waitFor({state:'visible'});
      await page.waitForTimeout(100);assert.deepEqual(pageErrors,[],'no browser application errors');
      console.log(`PASS ${width}px: ordered cards, pagination, async fallback, NO_EVIDENCE, history scroll, new send, page position, suggestions, details`);
      await page.close();
    }
  } finally {await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
