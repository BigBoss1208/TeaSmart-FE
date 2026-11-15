import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
const {SELLER_TEST_SCHEMA:schema,SELLER_TEST_PORT:port,SELLER_TEST_TOKEN:token}=process.env;
assert.match(schema??'',/^teasmart_seller_test_[a-f0-9]{32}$/);assert.ok(token&&port&&port!=='8080');
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const server=await createServer({server:{watch:{ignored:["**/artifacts/**","**/backend/target/**"]},host:'127.0.0.1',port:3110,strictPort:true,proxy:{'/api':{target:'http://127.0.0.1:'+port,changeOrigin:true}}}});await server.listen();
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE});
try{
 const page=await browser.newPage({viewport:{width:1366,height:1000}});page.on('pageerror',e=>console.error('PAGE_ERROR',e.message));
 await page.addInitScript(t=>sessionStorage.setItem('teasmart_access_token',t),token);
 async function shots(name){await mkdir('artifacts/seller-ui/'+name,{recursive:true});for(const width of [375,390,768,1366,1920]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+name+' '+width);await page.screenshot({path:`artifacts/seller-ui/${name}/${width}.png`,fullPage:true});}}
 await page.goto('http://127.0.0.1:3110/account',{waitUntil:'domcontentloaded',timeout:60000});await page.getByRole('button',{name:'Đăng ký kênh người bán',exact:true}).waitFor();await shots('profile');
 await page.getByRole('button',{name:'Đăng ký kênh người bán',exact:true}).click();await page.getByRole('heading',{name:'Đăng ký mở gian hàng'}).waitFor();
 await page.getByLabel('Tên gian hàng',{exact:false}).fill('Gian hàng kiểm thử giao diện');await page.getByLabel('Loại hình kinh doanh').selectOption('COOPERATIVE');await page.getByLabel('Mô tả gian hàng').fill('Hồ sơ tổng hợp kiểm thử trên database độc lập.');await page.getByLabel('Số điện thoại',{exact:false}).fill('0912345678');await page.getByRole('combobox',{name:'Tỉnh/Thành phố',exact:true}).fill('Thái Nguyên');await page.getByRole('listbox').getByRole('option',{name:'Tỉnh Thái Nguyên',exact:true}).click();await page.getByRole('combobox',{name:'Phường/Xã',exact:true}).fill('Tân Cương');await page.getByRole('listbox').getByRole('option',{name:'Xã Tân Cương',exact:true}).click();await page.getByLabel('Địa chỉ chi tiết').fill('Địa chỉ thử nghiệm');
 await shots('registration');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Gửi đăng ký',exact:true}).click();await page.getByRole('heading',{name:'Đăng ký mở gian hàng thành công'}).waitFor();await shots('pending');console.log('PROFILE_REGISTRATION_REAL_API_BROWSER_PASS');
}finally{await browser.close();await server.close();}