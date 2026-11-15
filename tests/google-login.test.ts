import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { getEventListeners } from "node:events";
import { ApiError, mapUser, errorMessage } from "../src/lib/commerce.ts";
import { createGoogleLoginFlow, googleAuthApi, googleLoginErrorMessage, loadGoogleSdk,
  type GoogleIdentitySdk, type GoogleLoginDependencies } from "../src/lib/google-login.ts";

const user = { userId: 7, fullName: "Offline fixture", email: "fixture@example.invalid", role: "CUSTOMER", createdAt: "2026-10-10" };
const result = { accessToken: "offline-teasmart-jwt-fixture", user };
const flush = async () => { await new Promise(resolve => setImmediate(resolve)); };

function hangingFetch(onSignal: (signal: AbortSignal) => void): typeof fetch {
  return ((_url: unknown, init?: RequestInit) => new Promise((_resolve, reject) => {
    const signal = init!.signal!;
    onSignal(signal);
    if (signal.aborted) reject(signal.reason);
    else signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  })) as typeof fetch;
}

test("API deadline remains 20 seconds with caller signal and cleans cancellation listener", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const caller = new AbortController(); let requestSignal!: AbortSignal;
  const original = globalThis.fetch;
  globalThis.fetch = hangingFetch(signal => { requestSignal = signal; });
  try {
    const pending = googleAuthApi("/challenge", undefined, caller.signal);
    const rejected = assert.rejects(pending, error => error instanceof Error && error.name === "TimeoutError");
    t.mock.timers.tick(19999); assert.equal(requestSignal.aborted, false);
    t.mock.timers.tick(1); await rejected;
    assert.equal(caller.signal.aborted, false);
    assert.equal(getEventListeners(caller.signal, "abort").length, 0);
    assert.match(googleLoginErrorMessage(requestSignal.reason), /quá thời gian chờ/);
  } finally { globalThis.fetch = original; }
});
test("API cancellation aborts immediately; timer cannot replace cancellation reason", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const caller = new AbortController(); let requestSignal!: AbortSignal;
  const original = globalThis.fetch; globalThis.fetch = hangingFetch(signal => { requestSignal = signal; });
  try {
    const pending = googleAuthApi("", { idToken: "offline-fixture" }, caller.signal);
    const rejected = assert.rejects(pending, error => error instanceof Error && error.name === "AbortError");
    caller.abort(); await rejected; t.mock.timers.tick(20000);
    assert.equal(requestSignal.reason.name, "AbortError");
    assert.equal(getEventListeners(caller.signal, "abort").length, 0);
  } finally { globalThis.fetch = original; }
});
test("already cancelled API request remains cancelled", async () => {
  const caller = new AbortController(); caller.abort();
  const original = globalThis.fetch; globalThis.fetch = hangingFetch(() => {});
  try {
    await assert.rejects(googleAuthApi("/challenge", undefined, caller.signal), error => error instanceof Error && error.name === "AbortError");
    assert.equal(getEventListeners(caller.signal, "abort").length, 0);
  } finally { globalThis.fetch = original; }
});
test("successful API clears deadline and caller listener", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const caller = new AbortController(); let requestSignal!: AbortSignal;
  const original = globalThis.fetch;
  globalThis.fetch = (async (_url, init) => { requestSignal = init!.signal!;
    return new Response(JSON.stringify(result), { status: 200 }); }) as typeof fetch;
  try {
    assert.deepEqual(await googleAuthApi("", {}, caller.signal), result);
    assert.equal(getEventListeners(caller.signal, "abort").length, 0);
    t.mock.timers.tick(20000); assert.equal(requestSignal.aborted, false);
    caller.abort(); assert.equal(requestSignal.aborted, false);
  } finally { globalThis.fetch = original; }
});
test("deadline includes a stalled response body", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const original = globalThis.fetch;
  globalThis.fetch = (async (_url, init) => ({ ok: true, status: 200,
    json: () => new Promise((_resolve, reject) => init!.signal!.addEventListener("abort", () => reject(init!.signal!.reason), { once: true })),
  })) as typeof fetch;
  try {
    const pending = googleAuthApi("/challenge", undefined, new AbortController().signal);
    const rejected = assert.rejects(pending, error => error instanceof Error && error.name === "TimeoutError");
    await Promise.resolve(); t.mock.timers.tick(20000); await rejected;
  } finally { globalThis.fetch = original; }
});
function setup(options: { failure?: Error; sdkFailure?: boolean } = {}) {
  let now = 1000, callback: (response: { credential?: string }) => void = () => {};
  let expire: () => void = () => {}, expiredDelay = 0, renderCount = 0, success: unknown;
  const states: { state: string; message: string }[] = [], requests: { path: string; body?: unknown }[] = [];
  let initializeOptions: any;
  const sdk: GoogleIdentitySdk = {
    initialize(config) { initializeOptions = config; callback = config.callback; },
    renderButton(_parent, config) { renderCount++; assert.equal(config.type, "standard"); assert.equal(config.locale, "vi"); },
  };
  const deps: GoogleLoginDependencies = {
    loadSdk: async () => { if (options.sdkFailure) throw new Error("GOOGLE_SDK_UNAVAILABLE"); return sdk; },
    request: async <T>(path: string, body?: unknown) => {
      requests.push({ path, body });
      if (options.failure) throw options.failure;
      return (path === "/challenge" ? { nonce: "offline-nonce", expiresIn: 300 } : result) as T;
    },
    now: () => now,
    schedule(fn, delay) { expire = fn; expiredDelay = delay; return 1 as any; },
    unschedule() {},
  };
  const element = { clientWidth: 320, replaceChildren() {} } as unknown as HTMLElement;
  const flow = createGoogleLoginFlow("offline-client-id", element, (state, message) => states.push({ state, message }),
    response => { success = response; }, deps);
  return { flow, states, requests, fire: (value: { credential?: string }) => callback(value),
    expire: () => { now += expiredDelay; expire(); }, sdk, deps, element,
    get initializeOptions() { return initializeOptions; }, get renderCount() { return renderCount; },
    get success() { return success; } };
}

test("real flow exits loading on challenge/login timeout and retries with fresh request", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const fixture = setup(); fixture.deps.request = googleAuthApi;
  const original = globalThis.fetch; let challenges = 0, logins = 0;
  globalThis.fetch = ((url, init) => {
    const count = String(url).endsWith("/challenge") ? ++challenges : ++logins;
    if (count === 1) return hangingFetch(() => {})(url, init);
    return Promise.resolve(new Response(JSON.stringify(String(url).endsWith("/challenge")
      ? { nonce: `offline-nonce-${count}`, expiresIn: 300 } : result), { status: 200 }));
  }) as typeof fetch;
  try {
    const first = fixture.flow.start(); await flush();
    assert.equal(fixture.states.at(-1)?.state, "challenge");
    t.mock.timers.tick(20000); await first;
    assert.equal(fixture.states.at(-1)?.state, "error"); assert.match(fixture.states.at(-1)!.message, /quá thời gian chờ/);
    await fixture.flow.start(); assert.equal(fixture.states.at(-1)?.state, "ready");
    fixture.fire({ credential: "offline-credential" }); assert.equal(fixture.states.at(-1)?.state, "verifying");
    t.mock.timers.tick(20000); await flush();
    assert.equal(fixture.states.at(-1)?.state, "error"); assert.match(fixture.states.at(-1)!.message, /quá thời gian chờ/);
    await fixture.flow.start(); fixture.fire({ credential: "offline-fresh-credential" }); await flush();
    assert.equal(challenges, 3); assert.equal(logins, 2); assert.deepEqual(fixture.success, result);
  } finally { fixture.flow.dispose(); globalThis.fetch = original; }
});
test("unmount aborts real challenge/login request without publishing stale state", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const original = globalThis.fetch;
  try {
    for (const phase of ["challenge", "verifying"]) {
      const fixture = setup(); fixture.deps.request = googleAuthApi; let activeSignal!: AbortSignal;
      globalThis.fetch = ((url, init) => {
        if (phase === "verifying" && String(url).endsWith("/challenge"))
          return Promise.resolve(new Response(JSON.stringify({ nonce: "offline-nonce", expiresIn: 300 }), { status: 200 }));
        return hangingFetch(signal => { activeSignal = signal; })(url, init);
      }) as typeof fetch;
      const started = fixture.flow.start(); await flush();
      if (phase === "verifying") { await started; fixture.fire({ credential: "offline-credential" }); }
      assert.equal(fixture.states.at(-1)?.state, phase);
      const stateCount = fixture.states.length; fixture.flow.dispose();
      await started; await flush(); t.mock.timers.tick(20000);
      assert.equal(activeSignal.aborted, true); assert.equal(activeSignal.reason.name, "AbortError");
      assert.equal(fixture.states.length, stateCount); assert.equal(fixture.success, undefined);
    }
  } finally { globalThis.fetch = original; }
});

test("challenge precedes official GIS render, nonce configured and no One Tap", async () => {
  const fixture = setup(); await fixture.flow.start();
  assert.deepEqual(fixture.requests, [{ path: "/challenge", body: undefined }]);
  assert.equal(fixture.initializeOptions.nonce, "offline-nonce");
  assert.equal(fixture.initializeOptions.client_id, "offline-client-id");
  assert.equal(fixture.initializeOptions.auto_select, false);
  assert.equal(fixture.renderCount, 1);
  assert.equal(fixture.states.at(-1)?.state, "ready"); fixture.flow.dispose();
});
test("credential submits only idToken, success is TeaSmart response and duplicate callback ignored", async () => {
  const fixture = setup(); await fixture.flow.start();
  fixture.fire({ credential: "offline-google-credential" }); fixture.fire({ credential: "offline-google-credential" }); await flush();
  assert.deepEqual(fixture.requests[1], { path: "", body: { idToken: "offline-google-credential" } });
  assert.equal(fixture.requests.length, 2); assert.deepEqual(fixture.success, result);
  assert.equal(fixture.states.at(-1)?.state, "done"); fixture.flow.dispose();
});
test("expired challenge rejects callback; retry gets new challenge", async () => {
  const fixture = setup(); await fixture.flow.start(); fixture.expire();
  fixture.fire({ credential: "offline-old-credential" }); await flush();
  assert.equal(fixture.requests.length, 1); assert.equal(fixture.states.at(-1)?.state, "expired");
  await fixture.flow.start(); assert.equal(fixture.renderCount, 2); assert.equal(fixture.requests.length, 2);
  fixture.flow.dispose();
});
test("popup dismissal does not set indefinite loading; missing credential supports retry", async () => {
  const fixture = setup(); await fixture.flow.start();
  assert.equal(fixture.states.at(-1)?.state, "ready"); // No callback when user closes GIS popup.
  fixture.fire({}); assert.equal(fixture.states.at(-1)?.state, "error"); assert.equal(fixture.requests.length, 1);
  await fixture.flow.start(); assert.equal(fixture.states.at(-1)?.state, "ready"); fixture.flow.dispose();
});
test("SDK failure leaves error and supports retry", async () => {
  const options = { sdkFailure: true }; const fixture = setup(options); await fixture.flow.start();
  assert.equal(fixture.states.at(-1)?.state, "error"); assert.match(fixture.states.at(-1)!.message, /Không tải được/);
  options.sdkFailure = false; await fixture.flow.start(); assert.equal(fixture.renderCount, 1); fixture.flow.dispose();
});
test("Google 401, 409, 503 and network errors have safe Vietnamese messages", async () => {
  const cases = [
    [new ApiError(401, "GOOGLE_AUTH_FAILED", "sensitive"), /Không thể xác thực Google/],
    [new ApiError(409, "GOOGLE_LINK_REQUIRED", "sensitive"), /Email này đã có tài khoản TeaSmart/],
    [new ApiError(503, "GOOGLE_AUTH_UNAVAILABLE", "sensitive"), /chưa sẵn sàng/],
    [new TypeError("sensitive network details"), /kiểm tra mạng/],
  ] as const;
  for (const [error, pattern] of cases) {
    const fixture = setup(); await fixture.flow.start();
    fixture.deps.request = async () => { throw error; };
    fixture.fire({ credential: "offline-credential" }); await flush();
    assert.equal(fixture.states.at(-1)?.state, "error"); assert.match(fixture.states.at(-1)!.message, pattern);
    assert.doesNotMatch(fixture.states.at(-1)!.message, /sensitive/); fixture.flow.dispose();
  }
  assert.equal(googleLoginErrorMessage(cases[1][0]), "Email này đã có tài khoản TeaSmart chưa liên kết Google. Hãy đăng nhập bằng email/SĐT và mật khẩu đã đăng ký, rồi mở Hồ sơ cá nhân để liên kết Google an toàn.");
});
test("disabled backend and network failure fetching challenge do not render a button", async () => {
  for (const failure of [new ApiError(503, "GOOGLE_AUTH_UNAVAILABLE", "disabled"), new TypeError("offline")]) {
    const fixture = setup({ failure }); await fixture.flow.start();
    assert.equal(fixture.renderCount, 0); assert.equal(fixture.states.at(-1)?.state, "error"); fixture.flow.dispose();
  }
});
test("dispose and stale callbacks cannot submit or sign in", async () => {
  const fixture = setup(); await fixture.flow.start(); const old = fixture.initializeOptions.callback;
  await fixture.flow.start(); old({ credential: "offline-old-credential" }); await flush();
  assert.equal(fixture.requests.length, 2);
  fixture.flow.dispose(); fixture.fire({ credential: "offline-credential" }); await flush(); assert.equal(fixture.requests.length, 2);
});
test("invalid role response never signs in, and late verification after unmount is ignored", async () => {
  const fixture = setup(); await fixture.flow.start();
  fixture.deps.request = async <T>() => ({ ...result, user: { ...user, role: "ADMIN" } }) as T;
  fixture.fire({ credential: "offline-credential" }); await flush();
  assert.equal(fixture.success, undefined); assert.equal(fixture.states.at(-1)?.state, "error"); fixture.flow.dispose();
  const late = setup(); await late.flow.start();
  let complete: (value: any) => void = () => {};
  late.deps.request = () => new Promise(resolve => { complete = resolve; });
  late.fire({ credential: "offline-credential" }); late.flow.dispose(); complete(result); await flush();
  assert.equal(late.success, undefined);
});
test("default browser timers keep their receiver and do not remove a rendered button", async () => {
  const savedWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const savedFetch = globalThis.fetch, savedSet = globalThis.setTimeout, savedClear = globalThis.clearTimeout;
  const fixture = setup(); let clears = 0, scheduled = 0;
  Object.defineProperty(globalThis, "window", { configurable: true, value: { google: { accounts: { id: fixture.sdk } } } });
  globalThis.setTimeout = (function (this: unknown) {
    assert.equal(this, undefined, "browser timer must not receive dependencies as this");
    scheduled++; return 1;
  }) as unknown as typeof setTimeout;
  globalThis.clearTimeout = (function (this: unknown) {
    assert.equal(this, undefined, "browser cleanup timer must not receive dependencies as this");
  }) as typeof clearTimeout;
  globalThis.fetch = (async () => ({ ok: true, json: async () => ({ nonce: "offline-nonce", expiresIn: 300 }) })) as typeof fetch;
  const states: string[] = [];
  const element = { clientWidth: 280, replaceChildren() { clears++; } } as unknown as HTMLElement;
  const flow = createGoogleLoginFlow("offline-client-id", element, state => states.push(state), () => {});
  try {
    await flow.start();
    assert.equal(states.at(-1), "ready"); assert.equal(fixture.renderCount, 1);
    assert.equal(clears, 1); assert.equal(scheduled, 2);
    flow.dispose(); assert.equal(clears, 2);
  } finally {
    globalThis.fetch = savedFetch; globalThis.setTimeout = savedSet; globalThis.clearTimeout = savedClear;
    if (savedWindow) Object.defineProperty(globalThis, "window", savedWindow); else delete (globalThis as any).window;
  }
});
test("responsive GIS width follows container while waiting and remains within SDK bounds", async () => {
  const fixture = setup(); const widths: number[] = [];
  const element = { clientWidth: 0, parentElement: { clientWidth: 210 }, replaceChildren() {} } as unknown as HTMLElement;
  fixture.sdk.renderButton = (_parent, config) => { widths.push(config.width); };
  const flow = createGoogleLoginFlow("offline-client-id", element, () => {}, () => {}, fixture.deps);
  await flow.start(); assert.deepEqual(widths, [210]); flow.dispose();
});
test("same-origin JSON requests send browser cookies; Google ID token never enters storage", async () => {
  const originalFetch = globalThis.fetch; const calls: any[] = [];
  globalThis.fetch = (async (url, init) => {
    calls.push({ url, init }); return new Response(JSON.stringify(calls.length === 1 ? { nonce: "fixture", expiresIn: 300 } : result),
      { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  try {
    await googleAuthApi("/challenge"); await googleAuthApi("", { idToken: "offline-google-credential" });
    assert.equal(calls[0].url, "/api/auth/google/challenge"); assert.equal(calls[1].url, "/api/auth/google");
    for (const call of calls) {
      assert.equal(call.init.credentials, "same-origin"); assert.equal(call.init.headers["Content-Type"], "application/json");
      assert.equal(call.init.headers.Authorization, undefined); assert.equal(call.init.cache, "no-store");
    }
    assert.deepEqual(JSON.parse(calls[1].init.body), { idToken: "offline-google-credential" });
  } finally { globalThis.fetch = originalFetch; }
});
test("Google 401 preserves current TeaSmart storage and protected error handling", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ code: "GOOGLE_AUTH_FAILED" }), { status: 401 })) as typeof fetch;
  try { await assert.rejects(googleAuthApi("", { idToken: "fixture" }), error => error instanceof ApiError && error.status === 401); }
  finally { globalThis.fetch = previous; }
  assert.equal(errorMessage(new ApiError(401, "UNAUTHORIZED", "fixture")), "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
});

function evaluateComponent(path: string, resolve: (name: string) => unknown, env = {}) {
  const require = createRequire(import.meta.url);
  const source = ts.transpileModule(readFileSync(path, "utf8").replace(/import\.meta\.env/g, "__env"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} as any };
  new Function("require", "module", "exports", "__env", source)((name: string) => resolve(name) ?? require(name), module, module.exports, env);
  return module.exports;
}
function find(tree: any, predicate: (node: any) => boolean): any {
  if (!tree || typeof tree !== "object") return;
  if (predicate(tree)) return tree;
  for (const child of [tree.props?.children].flat(Infinity)) { const found = find(child, predicate); if (found) return found; }
}
test("component hides Google when Client ID absent; configured component prepares GIS", async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { location: { protocol: "http:", hostname: "localhost" } } });
  try {
    for (const clientId of ["", "offline-client-id"]) {
      let starts = 0; const effects: (() => void)[] = [];
      const component = evaluateComponent("src/components/GoogleLoginButton.tsx", name => {
        if (name === "react") return { useState: (value: unknown) => [value, () => {}], useRef: (value: unknown) => ({ current: value === null ? {} : value }),
          useEffect: (effect: () => void) => effects.push(effect) };
        if (name === "../lib/google-login") return { createGoogleLoginFlow: () => ({ start: async () => { starts++; }, dispose() {} }) };
      }, { VITE_GOOGLE_CLIENT_ID: clientId }).default;
      const tree = component({ onAuthenticated() {}, onBusyChange() {} }); effects.forEach(effect => effect()); await flush();
      if (!clientId) { assert.equal(tree, null); assert.equal(starts, 0); }
      else { assert.ok(find(tree, node => node.props?.["aria-label"] === "Đăng nhập Google")); assert.equal(starts, 1); }
    }
  } finally { if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow); else delete (globalThis as any).window; }
});
test("Google success through LoginPage stores only TeaSmart JWT, maps CUSTOMER and calls existing onLogin", () => {
  const storage = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage"); const stored: unknown[][] = [];
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: { setItem: (...args: unknown[]) => stored.push(args) } });
  const googleComponent = () => null; let loggedIn: any;
  try {
    const { LoginPage } = evaluateComponent("src/pages/Auth.tsx", name => {
      if (name === "react") return { useState: (initial: unknown) => [initial, () => {}] };
      if (name === "../components/GoogleLoginButton") return { default: googleComponent };
      if (name === "../components/Icon") return { Icon: () => null };
      if (name === "../lib/commerce") return { mapUser };
      if (name === "../lib/registration") return {};
    });
    const tree = LoginPage({ navigate() {}, onLogin: (value: any) => { loggedIn = value; } });
    find(tree, node => node.type === googleComponent).props.onAuthenticated(result);
    assert.deepEqual(stored, [["teasmart_access_token", result.accessToken]]); assert.equal(loggedIn.role, "USER");
    assert.equal(loggedIn.id, user.userId);
    const app = readFileSync("src/App.tsx", "utf8");
    assert.match(app, /else navigate\(user.role === "ADMIN" \? "admin" : "home"/);
  } finally { if (storage) Object.defineProperty(globalThis, "sessionStorage", storage); else delete (globalThis as any).sessionStorage; }
});
test("official SDK script errors reject without hanging and a retry can load", async () => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window"), oldDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  let script: any;
  const sdk = setup().sdk;
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  Object.defineProperty(globalThis, "document", { configurable: true, value: {
    createElement: () => (script = { remove() {} }), head: { appendChild() {} },
  } });
  try {
    const failed = loadGoogleSdk(); assert.equal(script.src, "https://accounts.google.com/gsi/client?hl=vi");
    script.onerror(); await assert.rejects(failed, /GOOGLE_SDK_UNAVAILABLE/);
    const retry = loadGoogleSdk(); (globalThis as any).window.google = { accounts: { id: sdk } }; script.onload();
    assert.equal(await retry, sdk);
  } finally {
    for (const [name, descriptor] of [["window", oldWindow], ["document", oldDocument]] as const) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete (globalThis as any)[name];
    }
  }
});
