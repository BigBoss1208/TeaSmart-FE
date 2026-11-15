import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const b=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE});
const out='artifacts/unknown-cross-account';await mkdir(out,{recursive:true});
const c=await b.newContext(),p=await c.newPage();let owner=101;const calls=[],errors=[],checks=[];
const a={checkoutSessionId:9001,sessionCode:'TEST-A-ONLY',status:'RECONCILIATION_REQUIRED',latestAttemptStatus:'UNKNOWN',reservationStatus:'HELD',reconciliationRequired:true,totalAmount:1150000,items:[],orderId:null};
await c.route('**/api/**',async r=>{const path=new URL(r.request().url()).pathname;calls.push({owner,path,method:r.request().method()});if(r.request().method()!=='GET')return r.fulfill({status:405,json:{code:'READ_ONLY_FIXTURE'}});let data=[];
if(path==='/api/users/me')data={userId:owner,fullName:'Synthetic customer',role:'CUSTOMER',createdAt:'2026-11-08'};
else if(path==='/api/products')data={content:[],totalPages:0};
else if(path==='/api/cart')data={items:[],totalItems:0,totalAmount:0};
else if(path==='/api/checkout-sessions/active')data=owner===101?[a]:[];
else if(path==='/api/checkout-sessions/9001'){if(owner!==101)return r.fulfill({status:404,json:{code:'NOT_FOUND'}});data=a}
else if(path==='/api/recommendations')data={items:[]};
return r.fulfill({json:data})});
p.on('pageerror',e=>errors.push(e.message));
try{
await p.goto('http://localhost:3000/login');await p.evaluate(()=>{sessionStorage.setItem('teasmart_access_token','synthetic-fixture');sessionStorage.setItem('teasmart_checkout_session',JSON.stringify({userId:'101',sessionId:9001}))});
await p.goto('http://localhost:3000/payment/incomplete');await p.getByText('TEST-A-ONLY',{exact:true}).waitFor();assert.equal(await p.getByRole('button',{name:'Chọn COD',exact:true}).count(),0);await p.screenshot({path:`${out}/synthetic-A.png`});checks.push('A UNKNOWN protected');
owner=102;const start=calls.length;await p.reload();await p.getByText('Tài khoản này không có phiên thanh toán đang hoạt động.',{exact:true}).waitFor();assert.equal(await p.getByText('TEST-A-ONLY',{exact:true}).count(),0);assert.ok(!calls.slice(start).some(x=>x.path==='/api/checkout-sessions/9001'));await p.screenshot({path:`${out}/synthetic-B.png`});checks.push('B ignores A stale cache');
await p.goto('http://localhost:3000/checkout');await p.getByRole('heading',{name:'Địa chỉ và thanh toán',exact:true}).waitFor();assert.equal(new URL(p.url()).pathname,'/checkout');checks.push('B checkout independent');
await p.getByRole('button',{name:'Tài khoản',exact:true}).click();await p.getByRole('button',{name:'Đăng xuất',exact:true}).click();assert.equal(await p.evaluate(()=>sessionStorage.getItem('teasmart_checkout_session')),null);assert.equal(await p.evaluate(()=>sessionStorage.getItem('teasmart_payment_return')),null);checks.push('Logout clears payment references');
await p.goBack();await p.waitForTimeout(500);assert.equal(await p.getByText('TEST-A-ONLY',{exact:true}).count(),0);assert.deepEqual(errors,[]);checks.push('Back no previous account payment');console.log(checks);
}finally{await writeFile(`${out}/browser-fixture.json`,JSON.stringify({mode:'Synthetic API fixture, Chrome localhost:3000; no real account or DB write',checks,calls,errors},null,2));await b.close()}
