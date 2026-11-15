import test from "node:test";
import assert from "node:assert/strict";
import {dateRangeError,validateDashboard,latestOrders} from "../src/lib/dashboardView.ts";
const data={from:"2026-10-01",to:"2026-10-02",timezone:"Asia/Ho_Chi_Minh",revenue:125000,paidPayments:1,ordersCount:2,productsCount:33,customersCount:9,ordersByStatus:{CONFIRMED:1,CANCELLED:1},revenueByDay:[{date:"2026-10-01",revenue:125000,paymentsCount:1},{date:"2026-10-02",revenue:0,paymentsCount:0}]};
test("calendar validation includes Vietnam-local date strings, leap dates and 366-day API limit",()=>{assert.equal(dateRangeError("2026-10-01","2026-10-02"),"");assert.match(dateRangeError("2026-10-02","2026-10-01"),/không được sau/);assert.match(dateRangeError("2026-02-30","2026-03-01"),/hợp lệ/);assert.match(dateRangeError("2024-01-01","2025-01-01"),/366/);assert.equal(dateRangeError("2024-02-29","2024-02-29"),"")});
test("dashboard rejects invalid/mismatched API response rather than showing zero revenue",()=>{assert.equal(validateDashboard(data,data),data);for(const bad of [{...data,revenue:NaN},{...data,timezone:"UTC"},{...data,from:"2026-09-01"},{...data,ordersByStatus:null},{...data,revenueByDay:[{date:"2026-11-01",revenue:1,paymentsCount:1}]}])assert.throws(()=>validateDashboard(bad as any,data));assert.equal(validateDashboard({...data,revenue:0,paidPayments:0,revenueByDay:[]},data).revenue,0)});
test("recent orders sort by actual creation time, not identifier and preserve source array",()=>{const rows=[{orderId:99,createdAt:"2026-10-01T10:00:00"},{orderId:1,createdAt:"2026-10-27T10:00:00"}];assert.equal(latestOrders(rows,1)[0].orderId,1);assert.equal(rows[0].orderId,99)});

import {dashboardWorkbook,dashboardPdf,dashboardPdfBytes} from "../src/lib/dashboardExport.ts";
test("actual XLSX/PDF contain applied revenue, interval, daily rows and status counts",async()=>{const wb=await dashboardWorkbook(data);const bytes=await wb.xlsx.writeBuffer();const Excel=await import("exceljs");const restored=new (Excel.default??Excel).Workbook();await restored.xlsx.load(bytes);const sheet=restored.worksheets[0];assert.equal(sheet.getCell("B6").value,125000);assert.match(String(sheet.getCell("A3").value),/2026-10-01 — 2026-10-02/);const rows:any[]=[];sheet.eachRow(r=>rows.push(r.values));assert(rows.some(r=>r.includes("Đã xác nhận")&&r.includes(1)));assert(rows.some(r=>r.includes("Đã hủy")&&r.includes(1)));assert.match(JSON.stringify(dashboardPdf(data)),/Đã xác nhận/);const pdf=await dashboardPdfBytes(data);assert.equal(new TextDecoder().decode(pdf.subarray(0,5)),"%PDF-")});

import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {defaultRange,chartHeight} from "../src/lib/adminData.ts";
test("Statistics keeps draft dates separate, distinguishes loading/error/empty and displays actual KPI",()=>{
 const require=createRequire(import.meta.url),slots:any[]=[];let cursor=0;const react={useState(v:any){const i=cursor++;if(!(i in slots))slots[i]=typeof v==="function"?v():v;return[slots[i],(x:any)=>slots[i]=typeof x==="function"?x(slots[i]):x]},useEffect(){}};
 const module={exports:{} as any};const js=ts.transpileModule(readFileSync("src/pages/AdminOverview.tsx","utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 new Function("require","module","exports",js)((name:string)=>name==="react"?react:name.endsWith(".css")?{}:name==="../components/AdminRevenueChart"?{default:()=>null}:name==="../lib/commerce"?{api:()=>{},errorMessage:String,orderLabels:{}}:name==="../lib/adminData"?{defaultRange,chartHeight}:name==="../lib/dashboardView"?{dateRangeError,validateDashboard,latestOrders}:name==="../lib/dashboardExport"?{exportDashboard:()=>{}}:name==="../components/ProductCard"?{money:String}:require(name),module,module.exports);
 const render=()=>{cursor=0;return module.exports.default({statistics:true})};const text=(x:any):string=>typeof x==="string"?x:typeof x==="number"?String(x):!x?"":[x.props?.children].flat(Infinity).map(text).join("");const nodes=(x:any):any[]=>!x||typeof x!=="object"?[]:[x,...[x.props?.children].flat(Infinity).flatMap(nodes)];
 assert.match(text(render()),/Đang tải thống kê/);slots[0]={from:data.from,to:data.to};slots[1]={...slots[0]};slots[2]=data;slots[4]=false;assert.match(text(render()),/125000/);assert.doesNotMatch(text(render()),/Đơn hàng gần đây/);
 const old=slots[0];slots[1]={from:"2026-10-02",to:"2026-10-01"};nodes(render()).find(x=>x.type==="form").props.onSubmit({preventDefault(){}});assert.equal(slots[0],old);assert.match(text(render()),/không được sau/);
 slots[2]=null;slots[3]="Lỗi mạng thử nghiệm";assert.match(text(render()),/Lỗi mạng thử nghiệm/);assert.doesNotMatch(text(render()),/125000/);
 slots[3]="";slots[2]={...data,revenue:0,paidPayments:0,ordersCount:0};assert.match(text(render()),/Chưa có thanh toán PAID/);
});
