import {readCheckoutReceipt,rememberCheckoutReceipt,checkoutReceiptKey} from "../src/lib/checkoutReceipt.ts";
import { normalizeShippingPhone, validShippingPhone } from "../src/lib/phone.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { ApiError, mapOrder, sandboxRedirect } from "../src/lib/commerce.ts";
import type { Product } from "../src/types.ts";

function harness(saved?: object, direct?: {productId:number;quantity:number}, selectedItems?:{cartItemId:number;quantity:number}[], vnpayUrl: string | null = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=fixture", buyAgain?:{product:Product;quantity:number}[], activeSessions: object[] = [], cartLines?: any[], checkLoading = false) {
  const storage = new Map<string, string>(); if (saved) storage.set("teasmart_checkout_session", JSON.stringify(saved));
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: {
    getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key),
  } });
  let destination = "";
  const pageEvents = new Map<string, Function>();
  Object.defineProperty(globalThis, "window", { configurable: true, value: { addEventListener: (name: string, fn: Function) => pageEvents.set(name, fn), removeEventListener: (name: string) => pageEvents.delete(name), location: { assign: (url: string) => { destination = url; } } } });
  const slots: any[] = []; const effects: (() => void)[] = []; let cursor = 0; const calls: { path: string; init: RequestInit }[] = [];
  let failure: unknown, failurePath: string | null = null, release: (() => void) | undefined, deferred = false, deferredUsed = false;
  const order = { orderId: 71, orderCode: "TS-COMPONENT-FIXTURE", orderStatus: "PENDING", recipientName: "Fixture", recipientPhone: "0912345678", shippingAddress: "Test address", totalAmount: 100000, createdAt: "2026-10-22T12:00:00", paymentMethod: "COD", paymentStatus: "PENDING", items: [] };
  const session = { checkoutSessionId: 73, sessionCode: "TSCS-FIXTURE", status: "READY", reservationStatus: "HELD", expiresAt: "2099-01-01T00:00:00", recipientName: "Fixture", recipientPhone: "0912345678", shippingAddress: "Test address", note: null, subtotal: 100000, shippingFee: 0, totalAmount: 100000, latestAttemptStatus: null, latestReference: null, latestAttemptNumber: null, reconciliationRequired: false, orderId: null, items: [{productId:1,productName:"Fixture",unitPrice:100000,quantity:1,subtotal:100000}] };
  const navigations: string[] = [];
  const transport = async (path: string, init: RequestInit) => {
    calls.push({ path, init }); if (path === "/checkout-sessions/active") return activeSessions; if (deferred && !deferredUsed) { deferredUsed = true; await new Promise<void>(resolve => { release = resolve; }); }
    if (failure && (!failurePath || failurePath === path)) throw failure;
    if (path === "/checkout-sessions") return session;
    if (path === `/checkout-sessions/${session.checkoutSessionId}`) return session;
    if (path === "/checkout-sessions/73/confirm-cod") return { ...session, status: "COMPLETED", reservationStatus: "CONSUMED", orderId: 71 };
    if (path === "/checkout-sessions/73/payment-attempts/vnpay") return { session: { ...session, status: "AWAITING_PAYMENT", latestAttemptStatus: "PENDING" }, paymentUrl: vnpayUrl, attemptReference: "TSVNP-FIXTURE", replayed: false };
    if (path === "/orders/71") return order;
    return {};
  };
  const react = {
    useState(initial: any) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial; return [slots[i], (next: any) => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }]; },
    useRef(initial: any) { const i = cursor++; return slots[i] ?? (slots[i] = { current: initial }); },
    useEffect(effect: () => void) { effects.push(effect); },
  };
  const require = createRequire(import.meta.url), module = { exports: {} as any };
  const compiled = ts.transpileModule(readFileSync("src/pages/PaymentCheckout.tsx", "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function("require", "module", "exports", compiled)((name: string) => name === "react" ? react : name === "../lib/checkoutReceipt" ? {readCheckoutReceipt,rememberCheckoutReceipt} : name.endsWith(".css") ? {} : ["../components/CheckoutReceipt","../components/ImageWithFallback"].includes(name) ? {default:()=>null} : name === "../lib/phone" ? {normalizeShippingPhone,validShippingPhone} : name === "../lib/commerce" ? { api: transport, ApiError, mapOrder, sandboxRedirect, errorMessage: () => "Controlled API error" } : name === "../components/AddressBook" ? {default:()=>null,addressText:(a:any)=>[a.detailAddress,a.ward,a.district,a.province].filter(Boolean).join(", ")} : name === "../components/OrderSummary" ? { default: () => null } : name === "../components/Icon" ? { Icon: () => null } : name === "../components/ProductCard" ? { money: String } : require(name), module, module.exports);
  const placed: any[] = [];
  function render() { cursor = 0; const tree = module.exports.default({ buyNow:direct, buyAgain, selectedItems, products: [], cart: cartLines ?? [{ product: { id: direct?.productId ?? 1, name: "Fixture", price: 100000 }, qty: 1 }], user: { id: 1, role: "USER", name: "Fixture", phone: "0912345678" }, navigate: (p: string) => navigations.push(p), onOrderPlaced: (o: any) => placed.push(o) }); if (!checkLoading) slots[16] = true; return tree; }
  function nodes(x: any): any[] { return !x || typeof x !== "object" ? [] : [x, ...[x.props?.children].flat(Infinity).flatMap(nodes)]; }
  const all = () => {
    const result = nodes(render());
    const form = result.find(x => x.type === "form");
    if (form?.props.ref) form.props.ref.current = { requestSubmit: () => form.props.onSubmit({ preventDefault() {} }) };
    return result;
  };
  const radios = () => all().filter(x => x.type === "input" && x.props.type === "radio");
  const rawSubmit = () => all().find(x => x.type === "form").props.onSubmit({ preventDefault() {} });
  const currentStep = () => { const item = all().find(x => x.type === "li" && x.props["aria-current"] === "step"); return item ? Number(item.props.children[0].props.children) : 1; };
  const click = (label: string) => { const button = all().find(x => x.type === "button" && x.props.children === label); assert.ok(button, `Missing button: ${label}`); button.props.onClick(); };
  const selectAddress = () => { const component = all().find(x => x.props?.onSelect && x.type !== "button"); assert.ok(component, "AddressBook component is present"); component.props.onSelect({ addressId: 41, recipientName:"Fixture",phone:"0912345678",detailAddress:"Test address",ward:"Ward",district:"District",province:"Province",isDefault:true }); };
  const toPayment = () => selectAddress();
  const toReview = () => {};
  const submit = () => { selectAddress(); return rawSubmit(); };
  return { pageShow: () => pageEvents.get("pageshow")?.({persisted:true}), session, storage, calls, placed, navigations, radios, all, submit, rawSubmit, toPayment, toReview, click, currentStep, setCart: (lines: any[]) => { cartLines = lines; }, runEffects: () => effects.splice(0).forEach(effect => effect()), flush: () => new Promise(resolve => setImmediate(resolve)), destination: () => destination, fail: (e: unknown) => { failure = e; failurePath = null; }, failOn: (path: string, e: unknown) => { failurePath = path; failure = e; }, defer: () => { deferred = true; }, release: () => release!() };
}

test("Empty cart during hydration preserves the saved session and blocks a new order", async () => {
  const intentKey = JSON.stringify({ sourceType: "CART", buyNowIntentId: null, selectedItems: [], items: [{ productId: 1, quantity: 1 }] });
  const saved = { userId: "1", key: "pending-cart", sessionId: 73, method: "COD", intentKey };
  const h = harness(saved, undefined, undefined, undefined, undefined, [], []);
  h.all(); h.runEffects(); await h.flush();
  assert.deepEqual(JSON.parse(h.storage.get("teasmart_checkout_session")!), saved);
  await h.submit();
  assert.deepEqual(h.calls, []);
  assert.deepEqual(h.navigations, []);
  assert.ok(h.all().filter(x => x.type === "button" && x.props.type === "submit").every(x => x.props.disabled));
  h.runEffects();
  h.setCart([{ product: { id: 1, name: "Fixture", price: 100000 }, qty: 1 }]);
  h.all(); h.runEffects(); await h.flush();
  assert.deepEqual(h.calls.map(call => call.path), ["/checkout-sessions/active","/checkout-sessions/73"]);
  assert.deepEqual(h.navigations, []);
  assert.equal(h.placed.length, 0);
});

test("Checkout has four branded method cards, COD default, MoMo/VietQR disabled", () => {
  const h = harness(); h.toPayment(); const radios = h.radios();
  assert.deepEqual(radios.map(x => x.props.value), ["COD", "VNPAY", "MOMO", "VIETQR"]);
  assert.equal(radios[0].props.checked, true); assert.equal(radios[1].props.disabled, false);
  assert.ok(radios.slice(2).every(x => x.props.disabled));
  assert.deepEqual(h.all().filter(x => x.type === "img" && x.props.src?.startsWith("/payments/")).map(x => x.props.src), ["/payments/vnpay.svg", "/payments/momo.svg", "/payments/vietqr.svg"]);
  assert.equal(h.all().filter(x => x.type === "fieldset" && x.props.className === "checkout-payment-group").length, 2);
});
test("Unsupported method handlers cannot change selection or create a request", () => {
  const h = harness(); h.toPayment(); h.radios()[1].props.onChange();
  for (const radio of h.radios().slice(2)) radio.props.onChange();
  assert.equal(h.radios().find(x => x.props.checked).props.value, "VNPAY"); assert.equal(h.calls.length, 0);
});
test("COD submit retains endpoint, key, shipping payload and duplicate-submit guard", async () => {
  const h = harness(); h.defer(); const first = h.submit(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.all().find(x=>x.type==="button"&&x.props.type==="submit").props.disabled,true); await h.submit(); assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].path, "/checkout-sessions"); assert.equal(h.calls[0].init.method, "POST");
  assert.ok(new Headers(h.calls[0].init.headers).get("Idempotency-Key"));
  const request=JSON.parse(h.calls[0].init.body as string); assert.equal(request.sourceType,"CART");
  assert.deepEqual(Object.keys(request.shipping).sort(), ["note", "recipientName", "recipientPhone", "shippingAddress"]);
  h.release(); await first; assert.deepEqual(h.calls.slice(1).map(c=>c.path), ["/checkout-sessions/73/confirm-cod","/orders/71"]); assert.equal(h.placed.length, 1); assert.equal(h.destination(), "");
});
test("VNPay selection creates a session and attempt then redirects only to Sandbox", async () => {
  const h = harness(); h.toPayment(); h.radios()[1].props.onChange(); await h.submit();
  assert.deepEqual(h.calls.map(c=>c.path), ["/checkout-sessions","/checkout-sessions/73/payment-attempts/vnpay"]);
  assert.match(h.destination(), /^https:\/\/sandbox\.vnpayment\.vn\/paymentv2\/vpcpay.html/);
  assert.equal(h.storage.has("teasmart_checkout_session"), true, "retain the session for safe Back/replay"); assert.equal(h.placed.length, 0);
  assert.equal(h.all().some(x => x.props?.orderId === 71), false, "receipt must not render before the VNPay redirect");
});
test("Uncertain VNPay attempt retry reuses its idempotency key", async () => {
  const h = harness(); h.toPayment(); h.radios()[1].props.onChange(); h.failOn("/checkout-sessions/73/payment-attempts/vnpay", new TypeError("Offline")); await h.submit();
  const first = h.calls[1], saved = JSON.parse(h.storage.get("teasmart_checkout_session")!); assert.ok(saved.attemptKey);
  h.failOn("/checkout-sessions/73/payment-attempts/vnpay", null); await h.submit();
  assert.equal(h.calls[2].path, first.path); assert.equal(new Headers(h.calls[2].init.headers).get("Idempotency-Key"), new Headers(first.init.headers).get("Idempotency-Key"));
});
test("An uncertain request preserves original method and key for retry", async () => {
  const h = harness(); h.toPayment(); h.radios()[1].props.onChange(); h.fail(new TypeError("Offline")); await h.submit();
  const first = h.calls[0]; assert.ok(h.storage.has("teasmart_checkout_session"));
  h.fail(null); await h.submit();
  assert.equal(h.calls[1].path, first.path); assert.equal(new Headers(h.calls[1].init.headers).get("Idempotency-Key"), new Headers(first.init.headers).get("Idempotency-Key"));
});
test("Known pre-creation validation failure clears the draft and unlocks form without creating an order", async () => {
  const h = harness(); h.fail(new ApiError(400, "VALIDATION_ERROR", "Invalid")); await h.submit();
  assert.equal(h.storage.has("teasmart_checkout_session"), false); assert.equal(h.placed.length, 0);
  assert.equal(h.placed.length, 0);
});

test("Checkout does not submit without a selected saved address",async()=>{const h=harness();await h.rawSubmit();assert.equal(h.calls.length,0)});

test("VNPay redirect does not render or persist an order receipt before verified payment", async()=>{const h=harness();h.toPayment();h.radios()[1].props.onChange();await h.submit();assert.equal(h.all().some(x=>x.props?.orderId===71),false);assert.equal(readCheckoutReceipt("1"),null);assert.ok(!h.all().some(x=>x.props.className==="payment-symbol is-paid"));});
test("VNPay without a payment URL keeps the session and does not create an order",async()=>{const h=harness(undefined,undefined,undefined,null);h.toPayment();h.radios()[1].props.onChange();await h.submit();assert.equal(h.navigations.length,0);assert.ok(!h.calls.some(c=>c.path.startsWith("/orders/")));assert.equal(h.storage.has("teasmart_checkout_session"),true);assert.equal(h.placed.length,0)});
test("Buy now sends product/quantity in a Backend-priced session",async()=>{const h=harness(undefined,{productId:17,quantity:3});await h.submit();assert.equal(h.calls[0].path,"/checkout-sessions");const body=JSON.parse(h.calls[0].init.body as string);assert.equal(body.sourceType,"BUY_NOW");assert.equal(body.buyNowProductId,17);assert.equal(body.buyNowQuantity,3);assert.equal(body.shipping.recipientPhone,"0912345678");assert.equal(h.calls[1].path,"/checkout-sessions/73/confirm-cod");});
test("Buy now uncertain retry retains source selection and idempotency key",async()=>{const h=harness(undefined,{productId:17,quantity:3});h.fail(new TypeError());await h.submit();const first=h.calls[0];h.fail(null);await h.submit();assert.equal(h.calls[1].init.body,first.init.body);assert.equal(new Headers(h.calls[1].init.headers).get("Idempotency-Key"),new Headers(first.init.headers).get("Idempotency-Key"));});

test("Shop note is included in the shipping snapshot",async()=>{const h=harness();h.toPayment();h.all().find(x=>x.props?.onNoteChange).props.onNoteChange("Gói quà");h.radios()[1].props.onChange();h.radios()[0].props.onChange();assert.equal(h.all().find(x=>x.props?.onNoteChange).props.note,"Gói quà");await h.submit();const body=JSON.parse(h.calls[0].init.body as string);assert.equal(body.shipping.note,"Gói quà");assert.equal(body.shipping.recipientPhone,"0912345678")});
test("Uncertain buy-now locks note and method and reuses exact original body",async()=>{const h=harness(undefined,{productId:17,quantity:2});h.fail(new TypeError());await h.submit();assert.equal(h.all().find(x=>x.props?.onNoteChange).props.note,"");assert.ok(h.radios().every(x=>x.props.disabled));const first=h.calls[0];h.fail(null);await h.submit();assert.equal(h.calls[1].init.body,first.init.body)});

test("VNPay redirect keeps the user-owned session and does not mark an order receipt",async()=>{const h=harness();h.toPayment();assert.ok(h.all().some(x=>x.type==="button"&&x.props.children==="Đặt hàng"));h.radios()[1].props.onChange();await h.submit();assert.equal(readCheckoutReceipt("1"),null);assert.equal(readCheckoutReceipt("2"),null);assert.ok(h.destination().startsWith("https://sandbox.vnpayment.vn/"));assert.ok(h.storage.has("teasmart_checkout_session"));assert.equal(h.all().some(x=>x.props?.orderId===71),false);});

test("Selected checkout sends only the chosen cart line snapshots",async()=>{const selected=[{cartItemId:11,quantity:2},{cartItemId:13,quantity:1}];const h=harness(undefined,undefined,selected);await h.submit();assert.equal(h.calls[0].path,"/checkout-sessions");assert.equal(JSON.parse(h.calls[0].init.body as string).sourceType,"SELECTED");assert.deepEqual(JSON.parse(h.calls[0].init.body as string).selectedItems,selected);});
test("Selected VNPay retry keeps the selected source and creation key after uncertain response",async()=>{const selected=[{cartItemId:11,quantity:1}];const h=harness(undefined,undefined,selected);h.toPayment();h.radios()[1].props.onChange();h.fail(new TypeError("Offline"));await h.submit();const first=h.calls[0];h.fail(null);await h.submit();assert.equal(h.calls[1].path,"/checkout-sessions");assert.equal(h.calls[1].init.body,first.init.body);assert.equal(new Headers(h.calls[1].init.headers).get("Idempotency-Key"),new Headers(first.init.headers).get("Idempotency-Key"));});

test("Buy again starts a multi-product Checkout Session without adding cart lines",async()=>{const product=(id:number,name:string)=>({id,name,price:100000,weight:"100g",image:"",type:"Tea",taste:[],note:"",rating:0});const items=[{product:product(17,"First tea"),quantity:2},{product:product(23,"Second tea"),quantity:1}];const h=harness(undefined,undefined,undefined,undefined,items);await h.submit();const request=JSON.parse(h.calls[0].init.body as string);assert.equal(h.calls[0].path,"/checkout-sessions");assert.equal(request.sourceType,"BUY_AGAIN");assert.deepEqual(request.buyAgainItems,[{productId:17,quantity:2},{productId:23,quantity:1}]);assert.equal(h.calls.some(call=>call.path.startsWith("/cart/items")),false);assert.equal(h.calls[1].path,"/checkout-sessions/73/confirm-cod");});

test("Single-page checkout exposes payment immediately without stepper",()=>{const h=harness();assert.equal(h.all().some(x=>x.props?.className==="checkout-progress"),false);assert.equal(h.radios().length,4);h.toPayment();assert.equal(h.calls.length,0);assert.ok(h.all().some(x=>x.type==="button"&&x.props.children==="Đặt hàng"));h.radios()[1].props.onChange();assert.ok(h.all().some(x=>x.type==="button"&&x.props.children==="Thanh toán qua VNPay"));assert.equal(h.calls.length,0)});
test("Open address editor blocks order submission",async()=>{const h=harness();h.toPayment();h.all().find(x=>x.props?.onDraftChange).props.onDraftChange(true);await h.rawSubmit();assert.equal(h.calls.length,0);assert.equal(h.all().find(x=>x.type==="button"&&x.props.type==="submit").props.disabled,true)});

test("One confirmation lives inside summary and explains disabled state",()=>{const h=harness();const buttons=()=>h.all().filter(x=>x.type==="button"&&x.props.type==="submit");assert.equal(buttons().length,2);assert.ok(h.all().some(x=>x.props?.className==="checkout-confirmation-mobile"));assert.equal(buttons()[0].props.disabled,true);assert.ok(h.all().some(x=>x.props?.id==="checkout-submit-reason"&&x.props.children==="Vui lòng chọn địa chỉ nhận hàng."));const summary=h.all().find(x=>x.type==="aside"&&x.props.className==="checkout-summary");assert.ok(summary.props.children.flat(Infinity).some((x:any)=>x?.props?.className==="checkout-confirmation"));h.toPayment();assert.equal(buttons()[0].props.disabled,false);assert.equal(h.calls.length,0)});

test("Checkout does not restore an unrelated first active session when current intent has no saved session", async () => {
  const h = harness(undefined, undefined, undefined, undefined, undefined, [{ checkoutSessionId: 9, status: "RECONCILIATION_REQUIRED", latestAttemptStatus: "UNKNOWN", orderId: null, items: [{productId:99}] }]);
  h.all(); h.runEffects(); await h.flush();
  assert.deepEqual(h.calls.map(c => c.path), ["/checkout-sessions/active"]);
  assert.deepEqual(h.navigations, []);
});

test("Checkout ignores a cached session bound to another purchase intent", async () => {
  const h = harness({ userId: "1", key: "old-intent", sessionId: 73, method: "COD", intentKey: "BUY_NOW:A" }, undefined, undefined, undefined, undefined, [],
    [{ product: { id: 2, name: "Different tea", price: 100000 }, qty: 1 }]);
  h.all(); h.runEffects(); await h.flush();
  assert.deepEqual(h.calls.map(c => c.path), ["/checkout-sessions/active"]);
  assert.deepEqual(h.navigations, []);
  assert.equal(h.storage.has("teasmart_checkout_session"), false);
});

test("Checkout resumes the exact owner and purchase session after reload", async () => {
  const intentKey = JSON.stringify({ sourceType: "CART", buyNowIntentId: null, selectedItems: [], items: [{ productId: 1, quantity: 1 }] });
  const h = harness({ userId: "1", key: "same-intent", sessionId: 73, method: "COD", intentKey });
  h.all(); h.runEffects(); await h.flush();
  assert.deepEqual(h.calls.map(call => call.path), ["/checkout-sessions/active","/checkout-sessions/73"]);
  assert.deepEqual(h.navigations, []);
});

test("Admin reconciliation is labeled as a status check and never promises Order completion", () => {
  const source = readFileSync("src/pages/AdminPayments.tsx", "utf8");
  assert.match(source, /Kiểm tra trạng thái thanh toán/);
  assert.doesNotMatch(source, /Đối soát \/ hoàn tất Order/);
  assert.match(source, /HTTP 200 chỉ xác nhận có phản hồi HTTP/);
  assert.match(source, /queryOutcomeDescription\(reconcileResult.queryOutcome\)/);
});

for (const productId of [2, 3]) test(`UNKNOWN product X does not block independent COD product ${productId}`, async () => {
  const unresolved = {checkoutSessionId:9, latestAttemptStatus:"UNKNOWN", reconciliationRequired:true, reservationStatus:"HELD", items:[{productId:1}]};
  const before = JSON.stringify(unresolved);
  const h = harness(undefined, {productId,quantity:1}, undefined, undefined, undefined, [unresolved]);
  h.all(); h.runEffects(); await h.flush(); h.toPayment();
  assert.ok(h.all().filter(x=>x.type==="button"&&x.props.type==="submit").every(x=>!x.props.disabled));
  assert.equal(h.all().filter(x=>x.type==="input"&&x.props.type==="checkbox").length,0);
  await h.rawSubmit();
  assert.deepEqual(h.calls.map(c=>c.path),["/checkout-sessions/active","/checkout-sessions","/checkout-sessions/73/confirm-cod","/orders/71"]);
  assert.equal(JSON.stringify(unresolved),before);
});

test("UNKNOWN same product requires explicit confirmation before any COD or VNPay request", async () => {
  const h = harness(undefined, {productId:1,quantity:1}, undefined, undefined, undefined,
    [{checkoutSessionId:9,latestAttemptStatus:"UNKNOWN",items:[{productId:1}]}]);
  h.all(); h.runEffects(); await h.flush(); h.toPayment();
  for (const index of [0,1]) {
    h.radios()[index].props.onChange();
    await h.rawSubmit();
    assert.ok(h.all().some(x=>x.props?.role==="alertdialog"));
    assert.ok(h.all().filter(x=>x.type==="button"&&x.props.type==="submit").every(x=>x.props.disabled));
  }
  assert.deepEqual(h.calls.map(c=>c.path),["/checkout-sessions/active"]);
});

test("Independent VNPay needs no account checkbox and starts its own attempt", async () => {
  const h = harness(undefined, {productId:2,quantity:1}, undefined, undefined, undefined,
    [{checkoutSessionId:9,latestAttemptStatus:"UNKNOWN",items:[{productId:1}]}]);
  h.all(); h.runEffects(); await h.flush(); h.toPayment(); h.radios()[1].props.onChange();
  assert.equal(h.all().filter(x=>x.type==="input"&&x.props.type==="checkbox").length,0);
  assert.equal(h.all().filter(x=>x.props?.className==="checkout-unresolved-warning").length,0);
  await h.rawSubmit();
  assert.deepEqual(h.calls.map(c=>c.path),["/checkout-sessions/active","/checkout-sessions","/checkout-sessions/73/payment-attempts/vnpay"]);
});

test("A restored READY COD session displays its saved shipping details without a warning", async () => {
  const intentKey = JSON.stringify({ sourceType: "CART", buyNowIntentId: null, selectedItems: [], items: [{ productId: 1, quantity: 1 }] });
  const h = harness({ userId: "1", key: "ready-cod", sessionId: 73, method: "COD", intentKey });
  h.all();
  h.runEffects();
  await h.flush();

  const nodes = h.all();
  const details = nodes.find(node => node.props?.["aria-label"] === "Phiên mua hiện tại");
  assert.equal(details?.props.className, "checkout-session-details");
  assert.match(JSON.stringify(details), /Test address/);
  assert.doesNotMatch(JSON.stringify(nodes), /Đang khôi phục phiên thanh toán/);
  const confirm = nodes.find(node => node.type === "button" && node.props.type === "submit");
  assert.equal(confirm?.props.children, "Đặt hàng");
  assert.equal(confirm?.props.disabled, false);
  assert.deepEqual(h.calls.map(call => call.path), ["/checkout-sessions/active","/checkout-sessions/73"]);
});

for (const status of ["PENDING","UNKNOWN"]) test(`Back with ${status} remains in Checkout and blocks duplicate COD/VNPay`,async()=>{
  const intentKey=JSON.stringify({sourceType:"CART",buyNowIntentId:null,selectedItems:[],items:[{productId:1,quantity:1}]});
  const h=harness({userId:"1",key:"back",sessionId:73,intentKey});
  Object.assign(h.session,{status:"AWAITING_PAYMENT",latestAttemptStatus:status});
  h.all();h.runEffects();await h.flush();
  assert.deepEqual(h.navigations,[]);
  for(const index of [0,1]) {
    assert.equal(h.radios()[index].props.disabled,false);
    h.radios()[index].props.onChange();await h.rawSubmit();
    assert.ok(h.all().filter(x=>x.type==="button"&&x.props.type==="submit").every(x=>x.props.disabled));
  }
  assert.deepEqual(h.calls.map(c=>c.path),["/checkout-sessions/active","/checkout-sessions/73"]);
  assert.ok(JSON.stringify(h.all()).includes("Test address"));
  assert.ok(h.all().some(node => node.props?.className === "checkout-unresolved-warning"));
});

 test("Verified final failure reuses READY session with a new attempt key",async()=>{
  const intentKey=JSON.stringify({sourceType:"CART",buyNowIntentId:null,selectedItems:[],items:[{productId:1,quantity:1}]});
  const h=harness({userId:"1",key:"same-session",sessionId:73,intentKey,attemptKey:"finished-attempt"});
  Object.assign(h.session,{status:"READY",latestAttemptStatus:"FAILED_FINAL"});
  h.all();h.runEffects();await h.flush();h.radios()[1].props.onChange();await h.rawSubmit();
  assert.deepEqual(h.calls.map(c=>c.path),["/checkout-sessions/active","/checkout-sessions/73","/checkout-sessions/73/payment-attempts/vnpay"]);
  assert.notEqual(new Headers(h.calls[1].init.headers).get("Idempotency-Key"),"finished-attempt");
 });

for (const selected of [undefined, [{cartItemId:41,quantity:1}]]) {
  test("Cart checkout blocks UNKNOWN products for COD and VNPay", async () => {
    const h = harness(undefined, undefined, selected, undefined, undefined,
      [{checkoutSessionId:16,latestAttemptStatus:"UNKNOWN",items:[{productId:1}]}], undefined, true);
    h.toPayment();
    assert.ok(h.all().filter(n=>n.type==="button"&&n.props.type==="submit").every(n=>n.props.disabled));
    await h.rawSubmit();
    assert.equal(h.calls.length, 0);
    h.runEffects(); await h.flush();
    for (const radio of h.radios().slice(0,2)) {
      radio.props.onChange();
      await h.rawSubmit();
      assert.ok(h.all().some(n=>n.props?.className==="checkout-unresolved-warning"));
      assert.ok(h.all().filter(n=>n.type==="button"&&n.props.type==="submit").every(n=>n.props.disabled));
    }
    assert.ok(h.calls.every(c=>c.path==="/checkout-sessions/active"));
  });
}

test("VNPay departure stays locked without rendering the pending-session warning", async () => {
  const h = harness(); h.toPayment(); h.radios()[1].props.onChange(); await h.submit();
  assert.match(h.destination(), /^https:\/\/sandbox.vnpayment.vn\//);
  assert.deepEqual(h.navigations, []);
  assert.equal(h.all().some(x => x.props?.["aria-label"] === "Trạng thái thanh toán cần kiểm tra"), false);
  assert.ok(h.all().filter(x => x.props?.type === "submit").every(x => x.props.disabled));
  const count = h.calls.length; await h.rawSubmit(); assert.equal(h.calls.length, count);
});

test("Back from gateway clears departure loading but never retries the pending attempt", async () => {
  const h = harness(); h.toPayment(); h.runEffects(); await h.flush();
  h.radios()[1].props.onChange(); await h.submit();
  const writes = () => h.calls.filter(c => c.init?.method === "POST").length;
  const before = writes(); h.pageShow();
  assert.ok(h.all().some(x => x.props?.["aria-label"] === "Trạng thái thanh toán cần kiểm tra"));
  await h.rawSubmit(); assert.equal(writes(), before);
  assert.ok(h.storage.has("teasmart_checkout_session"));
});

test("Missing or unsafe gateway URL reports an error without navigation or unlocking replay", async () => {
  for (const url of [null, "https://example.invalid/payment"]) {
    const h = harness(undefined, undefined, undefined, url); h.toPayment(); h.radios()[1].props.onChange(); await h.submit();
    assert.equal(h.destination(), ""); assert.deepEqual(h.navigations, []);
    assert.ok(h.all().some(x => x.props?.role === "alert"));
    const count = h.calls.length; await h.rawSubmit(); assert.equal(h.calls.length, count);
  }
});

test("Independent BUY_NOW requires explicit confirmation and redirects once with its UUID", async () => {
  const old = {checkoutSessionId:9,status:"RECONCILIATION_REQUIRED",latestAttemptStatus:"UNKNOWN",items:[{productId:55222}]};
  const h = harness(undefined, {productId:55222,quantity:1}, undefined, undefined, undefined, [old]);
  h.toPayment(); h.runEffects(); await h.flush(); h.radios()[1].props.onChange(); await h.submit();
  assert.equal(h.calls.filter(c => c.init?.method === "POST").length, 0);
  assert.ok(h.all().filter(x => x.props?.type === "submit").every(x => x.props.disabled));
  const confirm = h.all().find(x => x.type === "button" && x.props.children === "Xác nhận mua mới"); confirm.props.onClick(); confirm.props.onClick(); await h.flush();
  const writes = h.calls.filter(c => c.init?.method === "POST");
  assert.equal(writes.length, 2);
  const body = JSON.parse(writes[0].init.body as string);
  assert.equal(body.sourceType, "BUY_NOW");
  assert.match(body.independentPurchaseIntentId, /^[0-9a-f-]{36}$/);
  assert.equal(body.buyNowProductId, 55222);
  assert.match(h.destination(), /^https:\/\/sandbox.vnpayment.vn\//);
  assert.deepEqual(h.navigations, []);
});

test("Verified cancellation draft permits VNPay selection and a fresh attempt", async () => {
  const intentKey=JSON.stringify({sourceType:"CART",buyNowIntentId:null,selectedItems:[],items:[{productId:1,quantity:1}]});
  const requestBody={sourceType:"CART",shipping:{recipientName:"Fixture",recipientPhone:"0912345678",shippingAddress:"Test address",note:null}};
  const h=harness({userId:"1",intentKey,key:"fresh-after-cancel",sessionId:null,method:"COD",requestBody,verifiedCancellationDraft:true});
  const radio=h.radios().find(x=>x.props.value==="VNPAY");
  assert.equal(radio.props.disabled,false);
  assert.ok(h.all().filter(x=>x.type==="fieldset").every(x=>!x.props.disabled));
  radio.props.onChange(); await h.rawSubmit();
  assert.deepEqual(h.calls.map(c=>c.path),["/checkout-sessions","/checkout-sessions/73/payment-attempts/vnpay"]);
  assert.deepEqual(JSON.parse(h.calls[0].init.body as string),requestBody);
  assert.match(h.destination(),/^https:\/\/sandbox.vnpayment.vn\//);
  assert.equal(h.placed.length,0);
  await h.rawSubmit(); assert.equal(h.calls.length,2);
});
test("An uncertain creation draft still locks payment method until resolved", () => {
  const intentKey=JSON.stringify({sourceType:"CART",buyNowIntentId:null,selectedItems:[],items:[{productId:1,quantity:1}]});
  const h=harness({userId:"1",intentKey,key:"uncertain",sessionId:null,method:"COD",requestBody:{sourceType:"CART"}});
  assert.equal(h.radios().find(x=>x.props.value==="VNPAY").props.disabled,true);
  assert.ok(h.all().filter(x=>x.type==="fieldset").every(x=>x.props.disabled));
  assert.equal(h.calls.length,0);
});
for (const method of ["COD", "VNPAY"]) test(`Refresh of verified cancelled session restores fresh ${method} checkout`, async () => {
 const intentKey=JSON.stringify({sourceType:"CART",buyNowIntentId:null,selectedItems:[],items:[{productId:1,quantity:1}]});
 const requestBody={sourceType:"CART",shipping:{recipientName:"Fixture",recipientPhone:"0912345678",shippingAddress:"Test address",note:null}};
 const h=harness({userId:"1",key:"cancelled-key",sessionId:73,intentKey,method:"VNPAY",attemptKey:"cancelled-attempt",requestBody});
 Object.assign(h.session,{status:"CANCELLED",reservationStatus:"RELEASED",latestAttemptStatus:"FAILED_FINAL"});
 h.all();h.runEffects();await h.flush();
 const saved=JSON.parse(h.storage.get("teasmart_checkout_session")!);
 assert.equal(saved.sessionId,null);assert.notEqual(saved.key,"cancelled-key");assert.equal(saved.attemptKey,undefined);
 assert.deepEqual(saved.requestBody,requestBody);
 assert.equal(h.calls.filter(c=>c.init?.method==="POST").length,0);
 assert.equal(h.all().some(n=>n.props?.className==="checkout-unresolved-warning"),false);
 assert.ok(h.radios().slice(0,2).every(n=>!n.props.disabled));
 Object.assign(h.session,{status:"READY",reservationStatus:"HELD",latestAttemptStatus:null});
 h.radios().find(n=>n.props.value===method).props.onChange();await h.rawSubmit();
 assert.equal(h.calls[2].path,"/checkout-sessions");
 assert.equal(h.calls[3].path,method==="COD"?"/checkout-sessions/73/confirm-cod":"/checkout-sessions/73/payment-attempts/vnpay");
});
for (const method of ["COD", "VNPAY"]) test(`Refresh of administratively quarantined session restores fresh ${method} checkout`, async () => {
 const intentKey=JSON.stringify({sourceType:"CART",buyNowIntentId:null,selectedItems:[],items:[{productId:1,quantity:1}]});
 const requestBody={sourceType:"CART",shipping:{recipientName:"Fixture",recipientPhone:"0912345678",shippingAddress:"Test address",note:null}};
 const h=harness({userId:"1",key:"cancelled-key",sessionId:73,intentKey,method:"VNPAY",attemptKey:"cancelled-attempt",requestBody});
 Object.assign(h.session,{status:"ADMIN_QUARANTINED",reservationStatus:"RELEASED",latestAttemptStatus:"UNKNOWN",reconciliationRequired:true});
 h.all();h.runEffects();await h.flush();
 const saved=JSON.parse(h.storage.get("teasmart_checkout_session")!);
 assert.equal(saved.sessionId,null);assert.notEqual(saved.key,"cancelled-key");assert.equal(saved.attemptKey,undefined);
 assert.deepEqual(saved.requestBody,requestBody);
 assert.equal(h.calls.filter(c=>c.init?.method==="POST").length,0);
 assert.equal(h.all().some(n=>n.props?.className==="checkout-unresolved-warning"),false);
 assert.ok(h.radios().slice(0,2).every(n=>!n.props.disabled));
 Object.assign(h.session,{status:"READY",reservationStatus:"HELD",latestAttemptStatus:null});
 h.radios().find(n=>n.props.value===method).props.onChange();await h.rawSubmit();
 assert.equal(h.calls[2].path,"/checkout-sessions");
 assert.equal(h.calls[3].path,method==="COD"?"/checkout-sessions/73/confirm-cod":"/checkout-sessions/73/payment-attempts/vnpay");
});