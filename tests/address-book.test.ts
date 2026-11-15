import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import ts from "typescript";
import * as phone from "../src/lib/phone.ts";
import * as administrativeUnits from "../src/lib/administrativeUnits.ts";
const dataset = JSON.parse(readFileSync("public/data/vietnam-administrative-units-2026-11-08.json", "utf8"));
function harness(){const slots:any[]=[],effects:any[]=[];let cursor=0;const calls:any[]=[];let locked=false;const address={addressId:1,recipientName:"Fixture",phone:"0912345678",province:"Province",district:"District",ward:"Ward",detailAddress:"Road",isDefault:true};let note="Gói quà";
const react={useState(v:any){const i=cursor++;if(!(i in slots))slots[i]=typeof v==="function"?v():v;return [slots[i],(v:any)=>slots[i]=typeof v==="function"?v(slots[i]):v]},useRef(v:any){const i=cursor++;return slots[i]??(slots[i]={current:v})},useEffect(fn:any){const i=cursor++;if(!effects[i])effects[i]={cleanup:fn()}}};
const api=async(path:string,init:any={})=>{calls.push({path,init});return init.method?address:[address]};const require=createRequire(import.meta.url),module={exports:{} as any};
const code=ts.transpileModule(readFileSync("src/components/AddressBook.tsx","utf8"),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function("require","module","exports",code)((name:string)=>name==="react"?react:name.endsWith("phone")?phone:name.endsWith("commerce")?{api,errorMessage:()=>"Error"}:name.endsWith("administrativeUnits")?{...administrativeUnits,loadAdministrativeDataset:async()=>dataset}:require(name),module,module.exports);
function nodes(x:any):any[]{return !x||typeof x!=="object"?[]:[x,...[x.props?.children].flat(Infinity).flatMap(nodes)]}const render=()=>{cursor=0;return nodes(module.exports.default({onSelect(){},locked,note,onNoteChange:(value:string)=>{note=value}}))};
return {calls,render,lock:()=>{locked=true},async settle(){render();await new Promise(r=>setImmediate(r));return render()},close(){effects.forEach(e=>e.cleanup?.())}}}
test("Address editor keeps the controlled checkout note after cancel and reopen",async()=>{const h=harness();try{
 let n=await h.settle();assert.equal(n[0].type,"section");
 n.find(x=>x.type==="button"&&x.props.children==="Sửa").props.onClick();
 n=h.render();const field=n.find(x=>x.type==="textarea"&&x.props.value==="Gói quà");assert.ok(field);
 field.props.onChange({target:{value:"Đóng gói cẩn thận"}});
 n=h.render();n.find(x=>x.type==="button"&&x.props.children==="Hủy chỉnh sửa").props.onClick();
 n=h.render();n.find(x=>x.type==="button"&&x.props.children==="Sửa").props.onClick();
 assert.ok(h.render().some(x=>x.type==="textarea"&&x.props.value==="Đóng gói cẩn thận"));
 assert.equal(h.calls.some(x=>x.init.method),false);
 }finally{h.close()}});
test("Address save normalizes shipping phone but never sends order note",async()=>{const h=harness();try{let n=await h.settle();n.find(x=>x.type==="button"&&x.props.children==="Sửa").props.onClick();n=h.render();n.find(x=>x.type==="input"&&x.props.maxLength===20).props.onChange({target:{value:"+84 912-345-678"}});n=h.render();n.find(x=>x.type==="button"&&x.props.children==="Lưu địa chỉ").props.onClick();await new Promise(r=>setImmediate(r));const request=h.calls.find(x=>x.init.method==="PUT");assert.ok(request);const body=JSON.parse(request.init.body);assert.equal(body.phone,"0912345678");assert.equal("note" in body,false)}finally{h.close()}});
test("Locked checkout prevents address save even through handler",async()=>{const h=harness();try{let n=await h.settle();n.find(x=>x.type==="button"&&x.props.children==="Sửa").props.onClick();h.lock();n=h.render();assert.equal(n.find(x=>x.type==="fieldset").props.disabled,true);n.find(x=>x.type==="button"&&x.props.children==="Lưu địa chỉ").props.onClick();await new Promise(r=>setImmediate(r));assert.ok(!h.calls.some(x=>x.init.method))}finally{h.close()}});
