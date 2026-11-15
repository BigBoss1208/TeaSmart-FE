import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import ts from "typescript";
const require=createRequire(import.meta.url),module={exports:{} as any};let selected:number|null=null;
const js=ts.transpileModule(readFileSync("src/components/AdminRevenueChart.tsx","utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
new Function("require","module","exports",js)((name:string)=>name==="react"?{useState:()=>[selected,(n:number|null)=>selected=n]}:name==="./ProductCard"?{money:(n:number)=>n.toLocaleString("vi-VN")+" ₫"}:require(name),module,module.exports);
const nodes=(x:any):any[]=>!x||typeof x!=="object"?[]:[x,...[x.props?.children].flat(Infinity).flatMap(nodes)];
const text=(x:any):string=>typeof x==="string"?x:typeof x==="number"?String(x):!x?"":[x.props?.children].flat(Infinity).map(text).join("");
test("chart labels distribute real dates and compact amounts without dropping zero days",()=>{
 const {shortVnd,dateTicks,default:Chart}=module.exports;assert.equal(shortVnd(500000),"500 nghìn");assert.equal(shortVnd(2000000),"2 triệu");assert.deepEqual(dateTicks(30),[0,6,12,17,23,29]);assert.deepEqual(dateTicks(1),[0]);assert.deepEqual(dateTicks(0),[]);
 const days=Array.from({length:30},(_,i)=>({date:`2026-10-${String(i+1).padStart(2,"0")}`,revenue:i===29?1234567:0,paymentsCount:i===29?1:0}));
 const tree=Chart({days}),bars=nodes(tree).filter(x=>x.props?.className==="revenue-bar");assert.equal(bars.length,30);assert.equal(bars[0].props.height,0);assert.equal(bars[29].props.height,135);assert(bars[29].props.x>bars[0].props.x);assert.match(text(tree),/01\/10/);assert.match(text(tree),/30\/10/);
 nodes(tree).filter(x=>x.props?.className==="revenue-target")[29].props.onFocus();assert.match(text(Chart({days})),/1\.234\.567 ₫/);assert.match(text(Chart({days})),/2026-10-30/);
});
