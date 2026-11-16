// Chrome UI contract smoke. All API traffic is intercepted; this is not a live LLM test.
const assert=require("node:assert/strict"),path=require("node:path"),fs=require("node:fs");
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
(async()=>{
 const {createServer}=await import("vite");
 const server=await createServer({server:{host:"127.0.0.1",port:4173,strictPort:true},clearScreen:false});await server.listen();
 const browser=await chromium.launch({channel:"chrome",headless:false});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 let logged=false,fail=false,empty=false,delay=0;const calls=[],checks=[],errors=[];
 const product={productId:9001,name:"Chè fixture ít chát",slug:"chatbot-fixture",price:165000,stockQuantity:7,weightGrams:100,imageUrl:"/demo/tea/ts-demo-001.png",categoryName:"Chè xanh",regionName:"Tân Cương",available:true};
 const answer={method:"READ_ONLY_BUSINESS_V1",reply:"Sản phẩm từ fixture kiểm thử giao diện",preferences:{maxPrice:300000},notices:[],recommendations:{method:"CONTENT_BASED_V1",fallback:false,items:[]},llmUsed:false,sources:[],businessKind:"PRODUCTS",businessProducts:[{...product,unitsSold:null,averageRating:null,reviewCount:null}]};
 await context.route("**/api/**",async route=>{
  const req=route.request(),url=new URL(req.url());calls.push({path:url.pathname,method:req.method(),body:req.method()==="POST"?req.postDataJSON():null});
  let data=[],status=200;
  if(url.pathname==="/api/users/me"){status=logged?200:401;data=logged?{userId:9001,fullName:"Chatbot UI fixture",email:"chatbot@example.invalid",role:"CUSTOMER"}:{code:"UNAUTHORIZED",message:"Login required"};}
  else if(url.pathname==="/api/products")data={content:[product],page:0,size:50,totalPages:1,totalElements:1};
  else if(url.pathname.startsWith("/api/products/"))data=product;
  else if(url.pathname==="/api/cart")data={items:[],totalItems:0,totalAmount:0};
  else if(url.pathname==="/api/recommendations")data={items:[],fallback:true};
  else if(url.pathname==="/api/chatbot/rag"){
   if(delay)await new Promise(r=>setTimeout(r,delay));
   if(fail)return route.abort("failed");
   const body=req.postDataJSON();
   if(body.message.includes("pha")){data={...answer,method:"KNOWLEDGE_UNAVAILABLE",reply:"Kiến thức RAG/LLM chưa được cấu hình.",businessKind:"KNOWLEDGE",businessProducts:[]};}
   else data=empty?{...answer,reply:"Hiện chưa có sản phẩm phù hợp",businessProducts:[]}:answer;
  }
  await route.fulfill({status,contentType:"application/json",body:JSON.stringify(data)});
 });
 const page=await context.newPage();page.on("pageerror",e=>errors.push(e.message));
 const out=process.env.CHATBOT_SMOKE_OUTPUT||path.join(process.env.TEMP,"teasmart-chatbot-smoke");fs.mkdirSync(out,{recursive:true});
 async function check(name,fn){await fn();checks.push(name);console.log("PASS",name);}
 try{
 await check("Guest /ai shows advisor login guidance",async()=>{await page.goto("http://127.0.0.1:4173/ai");await page.locator(".tea-advisor").waitFor();await page.getByText("Đăng nhập tài khoản khách hàng để sử dụng tư vấn.").waitFor();assert.equal(calls.filter(c=>c.path==="/api/chatbot/rag").length,0);});
 await check("Leaf route remains separate and Back restores advisor",async()=>{await page.locator(".ai-side").getByRole("button",{name:"Phân tích lá chè"}).click();await page.getByText("Phân tích ảnh lá chè",{exact:true}).waitFor();await page.goBack();await page.locator(".tea-advisor").waitFor();await page.reload();await page.locator(".tea-advisor").waitFor();});
 logged=true;await page.evaluate(()=>sessionStorage.setItem("teasmart_access_token","ui-fixture-token"));await page.reload();await page.locator("#tea-message").waitFor();
 await check("Catalog default, double submit creates one request",async()=>{assert.equal(await page.getByLabel("Chế độ tư vấn",{exact:true}).inputValue(),"catalog");await page.locator("#tea-message").fill("Chè dưới 300k");delay=600;const before=calls.length;await page.locator(".ai-compose").evaluate(form=>{form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));});await page.locator(".ai-product").waitFor();delay=0;const requests=calls.slice(before).filter(c=>c.path==="/api/chatbot/rag");assert.equal(requests.length,1);assert.ok(requests[0].body,JSON.stringify(requests));assert.equal(requests[0].body.allowLlm,false);await page.locator(".ai-product img").waitFor();assert.match(await page.locator(".ai-product").innerText(),/165.000/);});
 await check("Product details navigation and Back",async()=>{await page.getByRole("button",{name:"Xem chi tiết sản phẩm",exact:true}).click();await page.getByRole("heading",{name:product.name,exact:true}).waitFor();await page.goBack();await page.locator("#tea-message").waitFor();});
 await check("Network failure retains question and retry works",async()=>{fail=true;await page.locator("#tea-message").fill("ít chát");await page.getByRole("button",{name:"Gửi tư vấn",exact:true}).click();await page.getByRole("alert").filter({hasText:"Kết nối"}).waitFor();assert.equal(await page.locator("#tea-message").inputValue(),"ít chát");fail=false;await page.getByRole("button",{name:"Thử lại",exact:true}).click();await page.locator(".ai-product").waitFor();});
 await check("Empty results and unavailable knowledge are explicit",async()=>{empty=true;await page.locator("#tea-message").fill("Chè dưới 1đ");await page.getByRole("button",{name:"Gửi tư vấn",exact:true}).click();await page.getByText("Không có sản phẩm phù hợp các điều kiện hiện tại.").waitFor();empty=false;await page.getByLabel("Chế độ tư vấn",{exact:true}).selectOption("rag");await page.locator("#tea-message").fill("Cách pha chè");await page.getByRole("button",{name:"Gửi tư vấn",exact:true}).click();await page.getByText("Kiến thức RAG/LLM chưa được cấu hình.",{exact:true}).waitFor();});
 await check("Widget opens, submits, retries and closes",async()=>{await page.getByRole("button",{name:"Mở TeaSmart AI",exact:true}).click();await page.locator("#widget-message").fill("Chè dưới 300k");await page.getByRole("button",{name:"Gửi tin nhắn",exact:true}).click();await page.locator(".tea-chat-products article").waitFor();assert.equal(calls.filter(c=>c.path==="/api/chatbot/rag").at(-1).body.allowLlm,false);fail=true;await page.locator("#widget-message").fill("ít chát");await page.getByRole("button",{name:"Gửi tin nhắn",exact:true}).click();await page.getByRole("button",{name:"Thử lại câu hỏi"}).waitFor();fail=false;await page.getByRole("button",{name:"Thử lại câu hỏi"}).click();await page.waitForFunction(()=>!document.querySelector('#widget-message').disabled);await page.getByRole("button",{name:"Đóng chatbot",exact:true}).click();assert.equal(await page.getByRole("dialog").count(),0);});
 await check("Mobile and desktop fit without horizontal overflow",async()=>{await page.getByLabel("Chế độ tư vấn",{exact:true}).selectOption("catalog");await page.locator("#tea-message").fill("Chè dưới 300k");await page.getByRole("button",{name:"Gửi tư vấn",exact:true}).click();await page.locator(".ai-product").waitFor();for(const width of [1440,390]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(200);await page.screenshot({path:path.join(out,`advisor-${width}.png`),fullPage:true});}});
 assert.deepEqual(errors,[]);assert.equal(calls.filter(c=>c.method!=="GET"&&c.path!=="/api/chatbot/rag").length,0);
 fs.writeFileSync(path.join(out,"result.json"),JSON.stringify({checks,api:"intercepted UI fixtures only",llmReal:false},null,2));
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
