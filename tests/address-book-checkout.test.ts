import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import { normalizeShippingPhone, validShippingPhone } from "../src/lib/phone.ts";
import {
  buildShippingAddress,
  findAdministrativeUnit,
  loadAdministrativeDataset,
  normalizeAdministrativeSearch,
} from "../src/lib/administrativeUnits.ts";

const dataset = JSON.parse(readFileSync("public/data/vietnam-administrative-units-2026-11-08.json", "utf8"));

function harness(response?: (body: any) => Promise<any>, initialRows: any[] = []) {
  let backendRows = initialRows;
  const effects: (() => void)[] = [];
  let mounted = false;
  const slots: any[] = [];
  let cursor = 0;
  const requests: { path: string; init: RequestInit }[] = [];
  const selected: any[] = [];
  const savedEvents: { address: any; created: boolean }[] = [];
  const draftStates: boolean[] = [];
  const transport = async (path: string, init: RequestInit = {}) => {
    requests.push({ path, init });
    if (path === "/addresses" && !init.method) return backendRows;
    if (response && path === "/addresses") { const saved = await response(JSON.parse(String(init.body))); backendRows = [saved]; return saved; }
    throw new Error(`Unexpected request: ${path}`);
  };
  const react = {
    useState(initial: any) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [slots[index], (next: any) => { slots[index] = typeof next === "function" ? next(slots[index]) : next; }];
    },
    useRef(initial: any) {
      const index = cursor++;
      return slots[index] ?? (slots[index] = { current: initial });
    },
    useEffect(fn: () => void) { if (!mounted) effects.push(fn); },
  };
  const module = { exports: {} as any };
  const compiled = ts.transpileModule(readFileSync("src/components/AddressBook.tsx", "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function("require", "module", "exports", compiled)((name: string) => {
    if (name === "react") return react;
    if (name === "../lib/phone") return { normalizeShippingPhone, validShippingPhone };
    if (name === "../lib/commerce") return { api: transport, errorMessage: () => "Không thể lưu địa chỉ." };
    if (name === "../lib/administrativeUnits") return { buildShippingAddress, findAdministrativeUnit, loadAdministrativeDataset: async () => dataset, normalizeAdministrativeSearch };
    return createRequire(import.meta.url)(name);
  }, module, module.exports);

  function render() {
    cursor = 0;
    const tree = module.exports.default({
      onSelect: (address: any) => selected.push(address),
      onDraftChange: (open: boolean) => draftStates.push(open),
      onAddressSaved: (address: any, created: boolean) => savedEvents.push({ address, created }),
      continueAfterCreate: true,
    });
    slots[4] = dataset;
    slots[5] = false;
    return tree;
  }
  function nodes(value: any): any[] {
    return !value || typeof value !== "object" ? [] : [value, ...[value.props?.children].flat(Infinity).flatMap(nodes)];
  }
  const all = () => nodes(render());
  const clickText = (label: string) => {
    const button = all().find(node => node.type === "button" && node.props.children === label);
    assert.ok(button, `Missing button: ${label}`);
    button.props.onClick();
  };
  const inputByPlaceholder = (label: string) => all().find(node => node.type === "input" && node.props.placeholder === label);
  function fillValidAddress() {
    if (all().some(n => n.type === "button" && n.props.children === "+ Thêm địa chỉ mới")) clickText("+ Thêm địa chỉ mới");
    inputByPlaceholder("Nhập họ tên người nhận").props.onChange({ target: { value: "Người nhận test" } });
    inputByPlaceholder("Ví dụ: 0912345678").props.onChange({ target: { value: "0912345678" } });
    const province = all().find(node => node.props?.label === "Tỉnh / Thành phố");
    const thaiNguyen = dataset.provinces.find((item: any) => item.code === "19");
    province.props.onSelect(thaiNguyen);
    const ward = all().find(node => node.props?.label === "Phường / Xã / Đặc khu");
    ward.props.onSelect(findAdministrativeUnit(thaiNguyen.units, "tan cuong"));
    inputByPlaceholder("Số nhà, tên đường, thôn/xóm, tòa nhà").props.onChange({ target: { value: "Số 1 đường Trà" } });
  }
  return { ready: async () => { all(); mounted = true; effects.splice(0).forEach(fn => fn()); await new Promise(r => setImmediate(r)); }, all, clickText, fillValidAddress, inputByPlaceholder, requests, selected, savedEvents, draftStates };
}

test("successful address POST selects the response and reports create exactly once", async () => {
  const saved = { addressId: 84, recipientName: "Người nhận test", phone: "0912345678", province: "Tỉnh Thái Nguyên", district: "", ward: "Xã Tân Cương", detailAddress: "Số 1 đường Trà", isDefault: true };
  const h = harness(async () => saved);
  await h.ready();
  h.fillValidAddress();
  const save = h.all().find(node => node.type === "button" && node.props.children === "Lưu địa chỉ nhận hàng");
  assert.ok(save);
  save.props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.requests.filter(r => r.init.method === "POST").length, 1);
  assert.equal(h.requests.find(r => r.init.method === "POST")?.path, "/addresses");
  assert.equal(h.requests.find(r => r.init.method === "POST")?.init.method, "POST");
  assert.equal(h.selected.at(-1).addressId, 84);
  assert.deepEqual(h.savedEvents, [{ address: saved, created: true }]);
  assert.deepEqual(h.draftStates, [true, false]);
});

test("double activation while address POST is pending sends only one request", async () => {
  let release!: (value: any) => void;
  const saved = { addressId: 85, recipientName: "Người nhận test", phone: "0912345678", province: "Tỉnh Thái Nguyên", district: "", ward: "Xã Tân Cương", detailAddress: "Số 1 đường Trà", isDefault: true };
  const h = harness(() => new Promise(resolve => { release = resolve; }));
  await h.ready();
  h.fillValidAddress();
  const save = h.all().find(node => node.type === "button" && node.props.children === "Lưu địa chỉ nhận hàng");
  save.props.onClick();
  save.props.onClick();
  assert.equal(h.requests.filter(r => r.init.method === "POST").length, 1);
  release(saved);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.requests.filter(r => r.init.method === "POST").length, 1);
  assert.equal(h.savedEvents.length, 1);
});

test("failed address POST leaves the entered form open and does not signal continuation", async () => {
  const h = harness(async () => { throw new Error("offline"); });
  await h.ready();
  h.fillValidAddress();
  const save = h.all().find(node => node.type === "button" && node.props.children === "Lưu địa chỉ nhận hàng");
  save.props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.requests.filter(r => r.init.method === "POST").length, 1);
  assert.equal(h.savedEvents.length, 0);
  assert.ok(h.all().some(node => node.props?.role === "alert" && node.props.children === "Không thể lưu địa chỉ."));
  assert.equal(h.inputByPlaceholder("Nhập họ tên người nhận").props.value, "Người nhận test");
  assert.equal(h.inputByPlaceholder("Số nhà, tên đường, thôn/xóm, tòa nhà").props.value, "Số 1 đường Trà");
});

test("invalid address data is rejected before any write request", async () => {
  const h = harness(async () => { throw new Error("must not be called"); });
  await h.ready();
  h.inputByPlaceholder("Nhập họ tên người nhận").props.onChange({ target: { value: "Người nhận" } });
  h.inputByPlaceholder("Ví dụ: 0912345678").props.onChange({ target: { value: "123" } });
  h.inputByPlaceholder("Số nhà, tên đường, thôn/xóm, tòa nhà").props.onChange({ target: { value: "Số 1" } });
  h.clickText("Lưu địa chỉ nhận hàng");
  assert.equal(h.requests.filter(r => r.init.method).length, 0);
  assert.equal(h.savedEvents.length, 0);
  const fields = h.all().filter(node => node.type?.name === "SearchableUnit");
  assert.ok(fields.some(node => node.props.error === "Vui lòng chọn tỉnh/thành phố trong danh sách."));
  assert.ok(fields.some(node => node.props.error === "Vui lòng chọn phường/xã trong danh sách."));
});


test("empty address response opens inline form without auto writes or add button", async () => {
 const h = harness(); await h.ready();
 assert.ok(h.inputByPlaceholder("Nhập họ tên người nhận"));
 assert.equal(h.all().some(n => n.type === "button" && n.props.children === "+ Thêm địa chỉ mới"), false);
 assert.ok(h.all().find(n => n.type === "input" && n.props.type === "checkbox").props.checked);
 assert.ok(h.requests.every(r => !r.init.method));
});
test("existing address response stays a card without opening editor", async () => {
 const h = harness(undefined,[{addressId:1,recipientName:"Test",phone:"0912345678",province:"Tỉnh Thái Nguyên",district:"",ward:"Xã Tân Cương",detailAddress:"Test",isDefault:true}]); await h.ready();
 assert.equal(h.inputByPlaceholder("Nhập họ tên người nhận"), undefined);
 assert.ok(h.all().some(n => n.type === "button" && n.props.children === "+ Thêm địa chỉ mới"));
 assert.equal(h.selected.at(-1).addressId,1);
 assert.ok(h.requests.every(r => !r.init.method));
});
