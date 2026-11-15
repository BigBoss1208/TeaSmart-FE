import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import ts from "typescript";
import * as paymentReturn from "../src/lib/paymentReturn.ts";
function harness(file:string, props:any, response:(path:string)=>any){
 const slots:any[]=[],effects:any[]=[],pending:(()=>void)[]=[];let cursor=0;const calls:string[]=[];
 const react={useState(initial:any){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],(v:any)=>slots[i]=typeof v==="function"?v(slots[i]):v]},useRef(v:any){const i=cursor++;return slots[i]??(slots[i]={current:v})},useEffect(fn:any,deps:any[]){const i=cursor++;if(!effects[i]||deps.some((v,j)=>v!==effects[i].deps[j])){pending.push(()=>{effects[i]?.cleanup?.();effects[i]={deps,cleanup:fn()}})}}};
 const compiled=ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const require=createRequire(import.meta.url),module={exports:{} as any};
 new Function("require","module","exports",compiled)((name:string)=>name==="react"?react:name.endsWith("paymentReturn")?paymentReturn:name.endsWith("commerce")?{api:async(path:string)=>{calls.push(path);return response(path)},errorMessage:()=>"Offline",ApiError:class extends Error{status=0}}:name.endsWith("ProductCard")?{money:String}:name.endsWith(".css")?{}:name.startsWith(".")?{default:()=>null}:require(name),module,module.exports);
 function nodes(x:any):any[]{return !x||typeof x!=="object"?[]:[x,...[x.props?.children].flat(Infinity).flatMap(nodes)]}
 const render=()=>{cursor=0;const n=nodes(module.exports.default(props));while(pending.length)pending.shift()!();return n};
 return {render,calls,async settle(){for(let i=0;i<4;i++){render();await new Promise(r=>setImmediate(r))}return render()},close(){effects.forEach(e=>e?.cleanup?.())}};
}
test("Return ignores forged success query and routes unresolved payment to Checkout without creating an order",async()=>{
 Object.defineProperty(globalThis,"window",{configurable:true,value:{location:{search:"?vnp_TxnRef=FIXTURE&vnp_ResponseCode=00&vnp_TransactionStatus=00"}}});
 const destinations:string[]=[];
 const h=harness("src/pages/PaymentReturn.tsx",{authState:"ready",navigate(page:string){destinations.push(page)},openOrder(){},onAuthRetry(){}},path=>path.includes("payment-status")?{checkoutSessionId:8,orderId:null,reference:"FIXTURE",attemptStatus:"PENDING",sessionStatus:"AWAITING_PAYMENT",amount:100,paidAt:null,reconciliationRequired:false}: {accepted:false});
 try{await h.settle();assert.deepEqual(destinations,["checkout"]);assert.equal(h.calls.filter(p=>p.includes("payment-status")).length,1);assert.ok(h.calls.includes("/payments/vnpay/return"));assert.equal(h.calls.filter(p=>p.startsWith("/orders/")).length,0)}finally{h.close()}
});
for(const state of ["FAILED","CANCELLED","ERROR"])test(`Return ${state} never renders payment success`,async()=>{
 Object.defineProperty(globalThis,"window",{configurable:true,value:{location:{search:"?vnp_TxnRef=FIXTURE"}}});
 const h=harness("src/pages/PaymentReturn.tsx",{authState:"ready",navigate(){},openOrder(){},onAuthRetry(){}},path=>{if(state==="ERROR")throw new Error();return path.includes("payment-status")?{orderId:7,paymentStatus:state==="FAILED"?"FAILED":"PENDING",amount:100}:{orderId:7,orderStatus:state,items:[]}});
 try{const n=await h.settle();assert.ok(!n.some(x=>x.type==="h1"&&x.props.children==="Thanh toán thành công"))}finally{h.close()}
});
test("Purchase uses API stock, actual price/weight and requested quantity",async()=>{const adds:any[]=[];const h=harness("src/components/ProductPurchase.tsx",{product:{id:17,slug:"fixture"},onAddToCart:(...args:any[])=>adds.push(args)},()=>({productId:17,stockQuantity:3,price:100,weightGrams:200}));try{let n=await h.settle();n.find(x=>x.type==="input").props.onChange({target:{value:"4"}});n=h.render();assert.ok(n.find(x=>x.type==="button"&&x.props.children==="Thêm vào giỏ").props.disabled);n.find(x=>x.type==="input").props.onChange({target:{value:"3"}});n=h.render();await n.find(x=>x.type==="button"&&x.props.children==="Thêm vào giỏ").props.onClick();assert.equal(adds[0][1],"200g");assert.equal(adds[0][2],3)}finally{h.close()}});
test("Gallery thumbnails, next/previous and lightbox use actual API URLs",async()=>{const h=harness("src/components/ProductGallery.tsx",{id:17,image:"/cover.png",name:"Fixture"},()=>({enabled:true,urls:["/one.png","/two.png"]}));try{let n=await h.settle();assert.equal(n.filter(x=>x.props["aria-pressed"]!==undefined).length,2);n.find(x=>x.props["aria-label"]==="Ảnh sau").props.onClick();n=h.render();assert.equal(n.find(x=>x.props["aria-pressed"]===true).props["aria-label"],"Ảnh 2 của Fixture");n.find(x=>x.props["aria-label"]==="Phóng to ảnh Fixture").props.onClick();n=h.render();assert.ok(n.some(x=>x.props.title==="Fixture"&&x.props.onClose));n.find(x=>x.props.title==="Fixture").props.onClose();assert.ok(!h.render().some(x=>x.props.title==="Fixture"))}finally{h.close()}});
