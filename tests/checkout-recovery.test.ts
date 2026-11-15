import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {ApiError} from '../src/lib/commerce.ts';
function harness(saved:any, transport:(path:string,init:any)=>Promise<any>){
 const memory=new Map<string,string>();if(saved)memory.set('teasmart_checkout_session',JSON.stringify(saved));
 Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v),removeItem:(k:string)=>memory.delete(k)}});
 const slots:any[]=[],effects:any[]=[],pending:any[]=[],calls:string[]=[],opened:number[]=[];let cursor=0;
 const react={useState(v:any){const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return[slots[i],(x:any)=>slots[i]=x]},useEffect(fn:any,deps:any[]){const i=cursor++;if(!effects[i]||deps.some((x,j)=>x!==effects[i].deps[j])){effects[i]?.cleanup?.();pending.push(()=>effects[i]={deps,cleanup:fn()})}}};
 const module={exports:{} as any},require=createRequire(import.meta.url);
 const js=ts.transpileModule(readFileSync('src/pages/PaymentIncomplete.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 new Function('require','module','exports',js)((n:string)=>n==='react'?react:n.endsWith('/commerce')?{ApiError,api:(p:string,i:any)=>{calls.push(p);return transport(p,i)},errorMessage:()=> 'ERROR'}:n.endsWith('/ProductCard')?{money:String}:n.endsWith('.css')?{}:require(n),module,module.exports);
 function render(id:string|null='B',state='ready'){cursor=0;const tree=module.exports.default({userId:id,authState:state,navigate:()=>{},openOrder:(id:number)=>opened.push(id)});pending.splice(0).forEach(fn=>fn());return tree}
 const flush=()=>new Promise(r=>setImmediate(r));return {render,flush,calls,opened,memory,slots};
}
const session={checkoutSessionId:10,sessionCode:'TEST-A',latestAttemptStatus:'UNKNOWN',status:'RECONCILIATION_REQUIRED',reservationStatus:'HELD',reconciliationRequired:true,orderId:null,totalAmount:1290000,items:[]};
test('B ignores A cached checkout and requests only own active list',async()=>{const h=harness({userId:'A',sessionId:10},async()=>[]);h.render();await h.flush();assert.deepEqual(h.calls,['/checkout-sessions/active']);assert.equal(h.slots[0],null)});
test('A restores own UNKNOWN without writing or enabling COD',async()=>{const h=harness({userId:'A',sessionId:10},async()=>session);h.render('A');await h.flush();assert.deepEqual(h.calls,['/checkout-sessions/10']);assert.equal(h.slots[0].latestAttemptStatus,'UNKNOWN');const tree=JSON.stringify(h.render('A'));assert.ok(!tree.includes('Chọn COD'));assert.ok(!tree.includes('Thử lại VNPay'))});
test('late A recovery response cannot restore or redirect after switching to B',async()=>{let release:any;const h=harness({userId:'A',sessionId:10},async p=>p.endsWith('/10')?new Promise(r=>release=r):[]);h.render('A');h.render('B');await h.flush();release({...session,orderId:99});await h.flush();assert.equal(h.slots[0],null);assert.deepEqual(h.opened,[])});
test('stale own reference 404 falls back to own list, without clearing newer cache',async()=>{const h=harness({userId:'B',sessionId:10},async p=>{if(p.endsWith('/10'))throw new ApiError(404,'NOT_FOUND','missing');return []});h.render();await h.flush();assert.deepEqual(h.calls,['/checkout-sessions/10','/checkout-sessions/active']);assert.equal(h.memory.has('teasmart_checkout_session'),false)});
test('guest never reads payment session',async()=>{const h=harness({userId:'A',sessionId:10},async()=>session);h.render(null,'guest');await h.flush();assert.deepEqual(h.calls,[])});
