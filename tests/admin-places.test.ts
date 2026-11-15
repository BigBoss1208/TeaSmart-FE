import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { placeApi, placeForm, placeFields, placePayload, placeFailure, placeId, type PlaceKind, type AdminPlace, type PlaceTransport } from "../src/lib/adminPlaces.ts";
import { ApiError } from "../src/lib/commerce.ts";
const base = { name: "Fixture chè", description: null, status: "ACTIVE" as const, createdAt: "2026-10-17T00:00:00", updatedAt: "2026-10-17T00:00:00" };
for (const kind of ["region", "store"] as const) {
 const path=kind === "region" ? "/admin/tea-regions" : "/admin/stores";
 const fixture: AdminPlace=kind === "region" ? {...base,regionId:7,location:"Thái Nguyên",imageUrl:null} : {...base,storeId:7,address:"TEST ONLY",phone:"123",email:"fixture@example.invalid",logoUrl:null};
 test(`${kind}: exact payload, nullable fields and schema boundaries`,()=>{
   const payload=placePayload(kind,placeForm(fixture));const {createdAt,updatedAt,...stored}=fixture;delete (stored as any).regionId;delete (stored as any).storeId;
   assert.deepEqual(payload,stored);
   assert.equal(Object.keys(payload).length,kind === "region"?5:7);
   for(const name of [" ","x".repeat(151)]) assert.throws(()=>placePayload(kind,{...placeForm(fixture),name}));
   assert.throws(()=>placePayload(kind,{...placeForm(fixture),description:"ế".repeat(21846)}));
   assert.equal(placePayload(kind,{...placeForm(fixture),description:"ế".repeat(21845)}).description?.length,21845);
   const limits=kind === "region" ? {location:256,imageUrl:501} : {address:256,phone:21,email:256,logoUrl:501};
   for(const [field,count] of Object.entries(limits))assert.throws(()=>placePayload(kind,{...placeForm(fixture),[field]:"x".repeat(count!)}));
   if(kind === "store")assert.throws(()=>placePayload(kind,{...placeForm(fixture),email:"not-email"}));
   const cleared=placePayload(kind,{...placeForm(),name:" Chè mới "});assert.equal(cleared.description,null);assert.equal(cleared.name,"Chè mới");
 });
 test(`${kind}: adapter CRUD, status and abort preserve real server identity`,async()=>{
  const calls:{path:string;init?:RequestInit}[]=[];const client=placeApi(kind,(async(path,init)=>{calls.push({path,init});return fixture;}) as PlaceTransport);const signal=new AbortController().signal;
  await client.list(signal);await client.detail(7,signal);await client.save(null,placePayload(kind,placeForm(fixture)),signal);await client.save(7,placePayload(kind,placeForm(fixture)),signal);await client.status(7,"INACTIVE",signal);await client.status(7,"ACTIVE",signal);
  assert.deepEqual(calls.map(c=>c.init?.method),[undefined,undefined,"POST","PUT","PATCH","PATCH"]);assert.equal(calls[3].path,path+"/7");assert.ok(calls.every(c=>c.init?.signal===signal));assert.deepEqual(JSON.parse(calls[4].init!.body as string),{status:"INACTIVE"});
 });
 test(`${kind}: actual screen handles empty/error, detail, save, duplicate submit, status and refetch`,async()=>{
  const require=createRequire(import.meta.url),slots:any[]=[],effects:(()=>void)[]=[],cleanups:(()=>void)[]=[];let cursor=0,records:AdminPlace[]=[],fail:unknown=null,defer=false,release:(()=>void)|undefined,refreshes=0;
  const calls:{path:string;init:RequestInit}[]=[];
  const transport=async(url:string,init:RequestInit={})=>{calls.push({path:url,init});if(init.method){if(defer)await new Promise<void>(r=>{release=r;});if(fail)throw fail;const body=JSON.parse(init.body as string),id=url===path?8:Number(url.split("/")[3]);const value={...fixture,...records.find(x=>placeId(x)===id),...body,...(kind === "region"?{regionId:id}:{storeId:id})};records=records.filter(x=>placeId(x)!==id).concat(value);return value;}if(fail)throw fail;return url===path?records:records.find(x=>placeId(x)===Number(url.split("/")[3]));};
  const react={useState(initial:any){const i=cursor++;if(!(i in slots))slots[i]=typeof initial === "function"?initial():initial;return [slots[i],(next:any)=>{slots[i]=typeof next === "function"?next(slots[i]):next;}];},useRef(initial:any){const i=cursor++;return slots[i]??(slots[i]={current:initial});},useEffect(fn:()=>any){const i=cursor++;if(!(i in slots)){slots[i]=true;effects.push(()=>{const stop=fn();if(stop)cleanups.push(stop);});}}};
  const compiled=ts.transpileModule(readFileSync("src/pages/AdminPlaces.tsx","utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;const module={exports:{} as any};
  new Function("require","module","exports",compiled)((name:string)=>name === "react"?react:name === "../lib/commerce"?{api:transport}:name === "../lib/adminPlaces"?{placeApi,placeForm,placeFields,placePayload,placeFailure,placeId}:name === "../components/Icon"?{Icon:()=>null}:name === "../components/ImageWithFallback"?{default:()=>null}:name === "../components/ProductGallery"?{AdminGalleryEditor:()=>null}:(name === "../components/Modal" || name === "../components/AdminActionMenu" || name === "../components/AdminPagination")?{default:()=>null}:name.endsWith(".css")?{}:require(name),module,module.exports);
  function render(){cursor=0;return module.exports.default({kind,onPlacesChanged:async()=>{refreshes++;}});}
  function nodes(x:any):any[]{return !x||typeof x!=="object"?[]:[x,...[x.props?.children].flat(Infinity).flatMap(nodes)];}
  function text(x:any):string{return x==null||typeof x==="boolean"?"":typeof x==="string"||typeof x==="number"?String(x):[x.props?.children].flat(Infinity).map(text).join("");}
  const button=(label:string)=>nodes(render()).find(x=>x.type === "button"&&text(x).trim()===label);
  const field=(id:string,value:string)=>nodes(render()).find(x=>x.props?.id===id).props.onChange({target:{value}});
  const submit=()=>nodes(render()).find(x=>x.type === "form").props.onSubmit({preventDefault(){}});
  const settle=()=>new Promise(resolve=>setImmediate(resolve));const old=Object.getOwnPropertyDescriptor(globalThis,"window");Object.defineProperty(globalThis,"window",{configurable:true,value:{confirm:()=>true}});
  try{
   assert.match(text(render()),/Đang tải/);effects.forEach(fn=>fn());await settle();assert.match(text(render()),/Chưa có/);
   button(kind === "region"?"Thêm vùng chè":"Thêm cơ sở / HTX").props.onClick();field("place-name","Fixture mới");
   fail=new ApiError(409,"FIXTURE","Fixture");await submit();assert.equal(nodes(render()).find(x=>x.props?.id==="place-name").props.value,"Fixture mới");assert.match(text(render()),/đã tồn tại/);
   fail=null;defer=true;const first=submit();await settle();const n=calls.filter(c=>c.init.method).length;await submit();assert.equal(calls.filter(c=>c.init.method).length,n);release!();await first;defer=false;assert.equal(refreshes,1);assert.equal(records.length,1);
   button("Xem").props.onClick();await settle();assert.ok(calls.some(c=>c.path===path+"/8"&&!c.init.method));assert.match(text(render()),/Ngày tạo/);button("Đóng").props.onClick();
   button("Sửa").props.onClick();await settle();field("place-name","Tên sửa");await submit();assert.ok(calls.some(c=>c.path===path+"/8"&&c.init.method === "PUT"));
   button("Ngừng sử dụng").props.onClick();await settle();assert.equal(records[0].status,"INACTIVE");button("Mở lại").props.onClick();await settle();assert.equal(records[0].status,"ACTIVE");
   fail=new TypeError("offline");button("Làm mới").props.onClick();await settle();assert.match(text(render()),/Không thể kết nối Backend/);
   fail=null;records=Array.from({length:25},(_,i)=>({...fixture,name:`Kiểm thử ${i}`,status:i===24?"INACTIVE":"ACTIVE",...(kind==="region"?{regionId:100+i}:{storeId:100+i})} as AdminPlace));
   await button("Làm mới").props.onClick();await settle();
   const pager=()=>nodes(render()).find(x=>x.props?.label===(kind==="region"?"vùng chè":"cơ sở / HTX")&&"total" in x.props);
   assert.equal(pager().props.total,25);pager().props.onChange(2);assert.match(text(render()),/Kiểm thử 24/);
   nodes(render()).find(x=>x.props?.["aria-label"]==="Tìm theo tên").props.onChange({target:{value:"  KIỂM THỬ 24  "}});assert.equal(pager().props.total,1);assert.equal(pager().props.page,0);
   nodes(render()).find(x=>x.props?.["aria-label"]==="Lọc trạng thái").props.onChange({target:{value:"ACTIVE"}});assert.equal(pager().props.total,0);assert.match(text(render()),/Không có kết quả phù hợp/);
  }finally{cleanups.forEach(fn=>fn());if(old)Object.defineProperty(globalThis,"window",old);else Reflect.deleteProperty(globalThis,"window");}
 });
}
test("place failures keep session/authorization and map safe errors",()=>{
 for(const [status,expected] of [[400,/không hợp lệ/],[401,/hết hạn/],[403,/không có quyền/],[404,/không còn tồn tại/],[409,/đã tồn tại/]] as const)assert.match(placeFailure(new ApiError(status,"FIXTURE","Fixture")),expected);
 assert.match(placeFailure(new TypeError("offline")),/kết nối Backend/);assert.match(placeFailure(new DOMException("fixture","TimeoutError")),/quá thời gian/);
});
