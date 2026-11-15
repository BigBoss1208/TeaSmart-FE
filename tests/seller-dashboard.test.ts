import test from "node:test";
import assert from "node:assert/strict";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {createServer} from "vite";

test("Seller status donut represents empty and actual backend statuses without fabricated orders", async()=>{
 const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true},appType:"custom"});
 try {
  const {SellerStatusChart,sellerPeriod}=await server.ssrLoadModule("/src/pages/SellerDashboard.tsx");
  const empty=renderToStaticMarkup(createElement(SellerStatusChart,{counts:{PENDING:0,CONFIRMED:0,SHIPPING:0,DELIVERED:0,CANCELLED:0}}));
  assert.match(empty,/0 đơn hàng trong kỳ/);assert.doesNotMatch(empty,/NaN|Infinity/);
  const populated=renderToStaticMarkup(createElement(SellerStatusChart,{counts:{PENDING:2,DELIVERED:3}}));
  assert.match(populated,/5 đơn hàng trong kỳ/);assert.match(populated,/40/);assert.match(populated,/60/);assert.match(populated,/Đã giao/);
  for(const days of [7,30]){const range=sellerPeriod(days);assert.equal((Date.parse(range.to)-Date.parse(range.from))/86400000,days-1);}
 } finally {await server.close()}
});
