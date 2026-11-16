const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const { createServer } = await import('vite');
  const server = await createServer({server:{host:'127.0.0.1',port:4176,strictPort:true},clearScreen:false});
  await server.listen();
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const page = await browser.newPage();
    let fail=false, delay=0, count=12;
    const calls=[];
    const product={productId:11,name:'Chè kiểm thử widget',slug:'widget-test',price:150000,stockQuantity:8,weightGrams:100,categoryName:'Chè xanh',regionName:'Tân Cương',available:true};
    await page.route('**/api/**', async route => {
      const request=route.request(), path=new URL(request.url()).pathname;
      let data=[];
      if(path==='/api/users/me')data={userId:999,fullName:'UI fixture',email:'fixture@example.invalid',role:'CUSTOMER'};
      else if(path==='/api/products')data={content:[product],totalPages:1,totalElements:1};
      else if(path.startsWith('/api/products/'))data=product;
      else if(path==='/api/cart')data={items:[],totalItems:0,totalAmount:0};
      else if(path==='/api/chatbot/rag') {
        calls.push(request.postDataJSON());
        if(fail)return route.abort('failed');
        if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
        data={method:'READ_ONLY_BUSINESS_V1',reply:'Dạ, bạn có thể tham khảo sản phẩm bên dưới.',businessKind:'PRODUCTS',businessProducts:Array.from({length:count},(_,i)=>({...product,productId:11+i,slug:`widget-${i}`})),preferences:{maxPrice:200000},recommendations:{items:[]},sources:[],llmUsed:false};
      }
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
    });
    await page.addInitScript(()=>sessionStorage.setItem('teasmart_access_token','ui-fixture-only'));
    await page.goto('http://127.0.0.1:4176/');
    await page.getByRole('button',{name:'Mở TeaSmart AI',exact:true}).click();
    const input=page.locator('#widget-message');
    const submit=page.getByRole('button',{name:'Gửi tin nhắn',exact:true});
    const idle=()=>page.locator('.tea-chat-window [role="status"]').waitFor({state:'hidden'});
    assert.equal(await page.locator('.tea-chat-window select').count(),0);
    assert.equal(await page.locator('.tea-chat-disclosure').count(),0);
    await input.fill('chè dưới 200k'); delay=500;
    await page.locator('.tea-chat-window form').evaluate(form=>{form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
    assert.equal(await input.inputValue(),'');
    await input.fill('câu tiếp theo đang soạn');
    await page.locator('.tea-chat-products article').first().waitFor(); await idle();
    assert.equal(await input.inputValue(),'câu tiếp theo đang soạn');
    assert.equal(calls.length,1); assert.equal(Object.hasOwn(calls[0],'allowLlm'),false);
    console.log('PASS accepted send clears input, late response preserves new draft, double submit blocked');
    assert.equal(await page.locator('.tea-chat-products article').count(),4);
    const requestCount=calls.length, messageCount=await page.locator('.tea-chat-user').count();
    await page.getByRole('button',{name:'Xem thêm sản phẩm',exact:true}).click();
    assert.equal(await page.locator('.tea-chat-products article').count(),8);
    await page.getByRole('button',{name:'Xem thêm sản phẩm',exact:true}).click();
    assert.equal(await page.locator('.tea-chat-products article').count(),12);
    assert.equal(await page.getByRole('button',{name:'Xem thêm sản phẩm',exact:true}).count(),0);
    assert.equal(calls.length,requestCount); assert.equal(await page.locator('.tea-chat-user').count(),messageCount);
    console.log('PASS pagination 4/12 -> 8/12 -> 12/12 without requests or chat messages');
    delay=0; fail=true; await input.fill('ít chát'); await input.press('Enter');
    await page.getByRole('button',{name:'Thử lại câu hỏi',exact:true}).waitFor();
    assert.equal(await input.inputValue(),'');
    await input.fill('bản nháp mới'); fail=false;
    await page.getByRole('button',{name:'Thử lại câu hỏi',exact:true}).click(); await idle();
    assert.equal(await input.inputValue(),'bản nháp mới');
    assert.deepEqual(calls.at(-1).suggestedProductIds,[11,12,13,14]);
    console.log('PASS failure leaves input empty; retry uses failed message and preserves new draft/context');
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:900});
      assert(await page.locator('.tea-chat-window').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
      assert(await page.locator('.tea-chat-products').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
    }
    console.log('PASS desktop/mobile cards fit widget');
    await page.getByRole('button',{name:'Làm mới hội thoại',exact:true}).click();
    assert.equal(await page.locator('.tea-chat-products article').count(),0);
    const emptyCount=calls.length; await page.locator('.tea-chat-window form').evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))); assert.equal(calls.length,emptyCount);
    count=4; await input.fill('chè'); await input.dispatchEvent('keydown',{key:'Enter',code:'Enter',isComposing:true}); assert.equal(calls.length,emptyCount); await input.press('Shift+Enter');
    assert.equal(calls.length,3); // Shift+Enter inserts a newline without submitting
    await submit.click(); await idle();
    assert.equal(calls.at(-1).context,undefined);assert.equal(calls.at(-1).suggestedProductIds,undefined);assert.deepEqual(calls.at(-1).history,[]);
    assert.equal(await page.getByRole('button',{name:'Xem thêm sản phẩm',exact:true}).count(),0);
    await page.getByRole('button',{name:'Đóng chatbot',exact:true}).click();
    await page.getByRole('button',{name:'Mở TeaSmart AI',exact:true}).click();
    assert.equal(await page.getByRole('dialog',{name:'TeaSmart AI'}).count(),1);
    console.log('PASS reset, exact four results, close/reopen');
  } finally { await browser.close(); await server.close(); }
})().catch(error=>{console.error(error);process.exit(1);});
