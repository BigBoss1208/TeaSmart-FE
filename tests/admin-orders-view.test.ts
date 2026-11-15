import test from "node:test";
import assert from "node:assert/strict";
import {filterOrders,nextOrderStatus} from "../src/lib/adminOrderView.ts";
const rows=Array.from({length:30},(_,i)=>({orderStatus:i%2?"CONFIRMED":"PENDING",orderCode:`TS-${i}`,customerName:i===24?"Nguyễn Văn Test":"Khách thử",customerEmail:"fixture@example.invalid",createdAt:i<20?"2026-10-01T12:00:00":"2026-10-27T15:00:00",payment:{paymentStatus:i%2?"PAID":"PENDING"}}));
test("order filters combine name/status/payment/dates across all pages and keep confirmed separate",()=>{
 assert.equal(filterOrders(rows,"","","","","").length,30);
 assert.equal(filterOrders(rows," NGUYỄN ","PENDING","PENDING","2026-10-27","2026-10-27")[0].orderCode,"TS-24");
 assert.equal(filterOrders(rows,"NGUYỄN","CONFIRMED","","","").length,0);
 assert.equal(filterOrders(rows,"","CONFIRMED","PAID","2026-10-27","").length,5);
 assert.equal(filterOrders(rows,"","","","2026-10-28","").length,0);
});
test("only existing forward order transitions are offered",()=>{assert.equal(nextOrderStatus("PENDING"),"CONFIRMED");assert.equal(nextOrderStatus("CONFIRMED"),"SHIPPING");assert.equal(nextOrderStatus("SHIPPING"),"DELIVERED");assert.equal(nextOrderStatus("CANCELLED"),undefined);assert.equal(nextOrderStatus("DELIVERED"),undefined)});
