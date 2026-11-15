import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { categoryApi, categoryForm, categoryPayload, categoryFailure, type AdminCategory, type CategoryTransport } from "../src/lib/adminCategories.ts";
import { ApiError } from "../src/lib/commerce.ts";
const fixture: AdminCategory = { categoryId: 7, name: "Chè thử", description: null, status: "ACTIVE", slug: "che-thu", createdAt: "2026-10-11T00:00:00", updatedAt: "2026-10-11T00:00:00" };
test("Category payload validates name/UTF-8 boundaries, preserves status and excludes server fields", () => {
  assert.deepEqual(categoryPayload(categoryForm(fixture)), { name: fixture.name, description: null, status: "ACTIVE" });
  for (const name of [" ", "x".repeat(101)]) assert.throws(() => categoryPayload({ ...categoryForm(), name }));
  assert.throws(() => categoryPayload({ ...categoryForm(fixture), description: "ế".repeat(21846) }));
  assert.equal(categoryPayload({ ...categoryForm(fixture), description: "ế".repeat(21845) }).description?.length, 21845);
  assert.equal(categoryPayload({ ...categoryForm(fixture), name: " Chè mới ", description: " " }).name, "Chè mới");
});
test("Category adapter uses actual IDs and POST/PUT/PATCH; forwards abort and never DELETE", async () => {
  const calls: { path: string; init?: RequestInit }[] = [];
  const client = categoryApi((async (path, init) => { calls.push({ path, init }); return fixture; }) as CategoryTransport);
  const signal = new AbortController().signal;
  await client.list(signal); await client.detail(7, signal); await client.save(null, categoryPayload(categoryForm(fixture)), signal);
  await client.save(7, categoryPayload(categoryForm(fixture)), signal); await client.status(7, "INACTIVE", signal); await client.status(7, "ACTIVE", signal);
  assert.deepEqual(calls.map(c => c.init?.method), [undefined, undefined, "POST", "PUT", "PATCH", "PATCH"]);
  assert.equal(calls[3].path, "/admin/categories/7"); assert.deepEqual(JSON.parse(calls[4].init?.body as string), { status: "INACTIVE" });
  assert.ok(calls.every(c => c.init?.signal === signal));
});
test("Category errors distinguish validation, session, authorization, missing, duplicate and network", () => {
  for (const [status, expected] of [[400, /không hợp lệ/], [401, /hết hạn/], [403, /không có quyền/], [404, /không còn tồn tại/], [409, /đã tồn tại/]] as const) assert.match(categoryFailure(new ApiError(status, "FIXTURE", "Fixture")), expected);
  assert.match(categoryFailure(new TypeError("offline")), /kết nối Backend/);
});
test("real Category screen retains failed form, serializes duplicate submits, refetches and toggles status", async () => {
  const require = createRequire(import.meta.url); const slots: any[] = []; let cursor = 0; const effects: (() => void)[] = [];
  let records = [fixture], fail: unknown = null, hold: (() => void) | undefined, defer = false, refreshes = 0;
  const calls: { path: string; init: RequestInit }[] = [];
  const transport = async (path: string, init: RequestInit = {}) => {
    calls.push({ path, init });
    if (init.method) {
      if (defer) await new Promise<void>(resolve => { hold = resolve; });
      if (fail) throw fail;
      const body = JSON.parse(init.body as string), id = path === "/admin/categories" ? 8 : Number(path.split("/")[3]);
      const saved = { ...fixture, ...(records.find(x => x.categoryId === id) ?? {}), ...body, categoryId: id };
      records = records.filter(x => x.categoryId !== id).concat(saved); return saved;
    }
    return path === "/admin/categories" ? records : records.find(x => x.categoryId === Number(path.split("/")[3]));
  };
  const react = {
    useState(initial: any) { const i=cursor++; if (!(i in slots)) slots[i]=typeof initial === "function" ? initial() : initial; return [slots[i], (next: any) => { slots[i]=typeof next === "function" ? next(slots[i]) : next; }]; },
    useRef(initial: any) { const i=cursor++; return slots[i] ?? (slots[i]={current:initial}); },
    useEffect(fn: () => void) { const i=cursor++; if (!(i in slots)) {slots[i]=true;effects.push(fn);} },
  };
  const compiled=ts.transpileModule(readFileSync("src/pages/AdminCategories.tsx","utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const module={exports:{} as any};
  new Function("require","module","exports",compiled)((name:string)=>name === "react" ? react : name === "../lib/commerce" ? {api:transport} : name === "../lib/adminCategories" ? {categoryApi,categoryForm,categoryPayload,categoryFailure} : name === "../components/Icon" ? {Icon:()=>null} : ((name === "../components/Modal" || name === "../components/AdminActionMenu" || name === "../components/AdminPagination") ? {default:()=>null} : name.endsWith(".css") ? {} : require(name)),module,module.exports);
  function render(){cursor=0;return module.exports.default({onCategoriesChanged:async()=>{refreshes++;}});}
  function nodes(x:any):any[]{return !x||typeof x!=="object"?[]:[x,...[x.props?.children].flat(Infinity).flatMap(nodes)];}
  function text(x:any):string{return x==null||typeof x==="boolean"?"":typeof x==="string"||typeof x==="number"?String(x):[x.props?.children].flat(Infinity).map(text).join("");}
  function button(label:string){return nodes(render()).find(x=>x.type === "button"&&text(x).trim()===label);}
  function field(id:string,value:string){nodes(render()).find(x=>x.props?.id===id).props.onChange({target:{value}});}
  function submit(){return nodes(render()).find(x=>x.type === "form").props.onSubmit({preventDefault(){}});}
  const settle=()=>new Promise(resolve=>setImmediate(resolve));
  const old=Object.getOwnPropertyDescriptor(globalThis,"window");Object.defineProperty(globalThis,"window",{configurable:true,value:{confirm:()=>true}});
  try {
    assert.match(text(render()),/Đang tải danh mục/);effects.forEach(fn=>fn());await settle();
    button("Thêm danh mục").props.onClick();field("category-name","Danh mục mới");
    fail=new ApiError(409,"CATEGORY_CONFLICT","Fixture");await submit();assert.equal(nodes(render()).find(x=>x.props?.id==="category-name").props.value,"Danh mục mới");assert.match(text(render()),/đã tồn tại/);
    fail=null;defer=true;const first=submit();await settle();const writes=calls.filter(x=>x.init.method).length;await submit();assert.equal(calls.filter(x=>x.init.method).length,writes);hold!();await first;defer=false;
    assert.equal(records.length,2);assert.equal(refreshes,1);assert.ok(calls.filter(x=>x.path==="/admin/categories"&&!x.init.method).length>=2);
    button("Sửa").props.onClick();await settle();field("category-name","Tên sửa");await submit();assert.ok(calls.some(x=>x.path==="/admin/categories/7"&&x.init.method==="PUT"));
    button("Ngừng sử dụng").props.onClick();await settle();assert.ok(records.some(x=>x.status==="INACTIVE"));assert.ok(button("Mở lại"), text(render())); button("Mở lại").props.onClick();await settle();assert.ok(records.every(x=>x.status==="ACTIVE"));
    records=Array.from({length:25},(_,i)=>({...fixture,categoryId:100+i,name:`Danh mục ${i}`,description:i===24?"Mô tả đặc biệt":null,status:i===24?"INACTIVE":"ACTIVE"}));
    await button("Làm mới").props.onClick();await settle();
    const pager=()=>nodes(render()).find(x=>x.props?.label==="danh mục"&&"total" in x.props);
    assert.equal(pager().props.total,25);pager().props.onChange(2);assert.match(text(render()),/Danh mục 24/);assert.doesNotMatch(text(render()),/Danh mục 0/);
    const search=()=>nodes(render()).find(x=>x.props?.["aria-label"]==="Tìm danh mục");
    search().props.onChange({target:{value:"  ĐẶC BIỆT  "}});assert.equal(pager().props.page,0);assert.equal(pager().props.total,1);
    nodes(render()).find(x=>x.props?.["aria-label"]==="Lọc trạng thái danh mục").props.onChange({target:{value:"ACTIVE"}});assert.equal(pager().props.total,0);assert.match(text(render()),/Không có danh mục phù hợp/);
  } finally {if(old)Object.defineProperty(globalThis,"window",old);else Reflect.deleteProperty(globalThis,"window");}
});
