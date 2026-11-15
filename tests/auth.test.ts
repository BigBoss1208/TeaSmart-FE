import test from "node:test";
import assert from "node:assert/strict";
import { ApiError, errorMessage } from "../src/lib/commerce.ts";
import { normalizeRegistrationPhone, registrationErrorMessage } from "../src/lib/registration.ts";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { mapUser } from "../src/lib/commerce.ts";

test("login accepts email or phone while registration keeps email input", () => {
  const source = readFileSync("src/pages/Auth.tsx", "utf8");
  const login = source.slice(0, source.indexOf("export function RegisterPage"));
  assert.match(login, /Email hoặc số điện thoại/);
  assert.match(login, /id="login-email"\s+type="text"/);
  assert.match(login, /autoComplete="username"/);
  assert.match(login, /JSON\.stringify\(\{ email: email\.trim\(\), password \}\)/);
  assert.match(source, /id="reg-email"\s+type="email"/);
});

test("registration canonicalizes both Vietnamese forms without removing invalid punctuation", () => {
  assert.equal(normalizeRegistrationPhone(" +84 912 345 678 "), "0912345678");
  assert.equal(normalizeRegistrationPhone("0912345678"), "0912345678");
  assert.equal(normalizeRegistrationPhone("0912-345678"), "0912-345678");
});
test("registration duplicate messages are Vietnamese and scoped to registration", () => {
  assert.equal(registrationErrorMessage(new ApiError(409, "DUPLICATE_EMAIL", "SQL must not be displayed")), "Email đã được đăng ký.");
  assert.equal(registrationErrorMessage(new ApiError(409, "DUPLICATE_PHONE", "SQL must not be displayed")), "Số điện thoại đã được đăng ký.");
  assert.match(registrationErrorMessage(new ApiError(400, "VALIDATION_ERROR", "Invalid")), /Thông tin đăng ký không hợp lệ/);
  assert.equal(registrationErrorMessage(new TypeError("offline")), errorMessage(new TypeError("offline")));
  assert.equal(errorMessage(new ApiError(401, "UNAUTHORIZED", "Invalid")), "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
});

test("real Auth submit handlers preserve AUTH-01 and normalize registration requests", async () => {
  const require = createRequire(import.meta.url);
  let stateIndex = 0, screen = "login", message = "", phone = "+84 912 345 678", calls = 0;
  let failure: Error | null = null, submitted: any, loggedIn: any;
  let loginIdentifier = "test@example.invalid";
  const source = ts.transpileModule(readFileSync("src/pages/Auth.tsx", "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} as any };
  new Function("require", "module", "exports", source)((name: string) => {
    if (name === "../lib/commerce") return { ApiError, errorMessage, mapUser, api: async (_: string, init: RequestInit) => {
      calls++; submitted = JSON.parse(init.body as string); if (failure) throw failure;
      const user = { userId: 1, fullName: "Fixture", email: "test@example.invalid", role: "CUSTOMER", createdAt: "2026-10-10" };
      return screen === "login" ? { accessToken: "offline-test-token", user } : user;
    } };
    if (name === "../lib/registration") return { normalizeRegistrationPhone, registrationErrorMessage };
    if (name === "../components/Icon") return { Icon: () => null };
    if (name === "../components/GoogleLoginButton") return { default: () => null };
    if (name === "react") return { useState: (initial: unknown) => {
      const index = stateIndex++;
      const values = screen === "login" ? [loginIdentifier, "offline-password"]
        : ["Fixture", "test@example.invalid", phone, "offline-password", "offline-password"];
      return [index < values.length ? values[index] : initial, (next: string) => {
        if (index === (screen === "login" ? 3 : 6)) message = next;
      }];
    } };
    return require(name);
  }, module, module.exports);
  function findForm(tree: any): any {
    if (!tree || typeof tree !== "object") return;
    if (tree.type === "form") return tree;
    for (const child of [tree.props?.children].flat(Infinity)) { const found = findForm(child); if (found) return found; }
  }
  async function submit() {
    stateIndex = 0; message = "";
    const props = { navigate() {}, onLogin: (user: any) => { loggedIn = user; }, onRegisterSuccess() {} };
    const tree = screen === "login" ? module.exports.LoginPage(props) : module.exports.RegisterPage(props);
    await findForm(tree).props.onSubmit({ preventDefault() {} });
  }
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: { setItem() {} } });
  try {
    failure = new ApiError(401, "UNAUTHORIZED", "Invalid"); await submit();
    assert.equal(message, "Tài khoản hoặc mật khẩu không chính xác.");
    failure = new TypeError("offline"); await submit(); assert.equal(message, errorMessage(failure));
    failure = null; await submit(); assert.equal(loggedIn.role, "USER");
    for (const identifier of ["0912345678", " +84 912 345 678 "]) {
      loginIdentifier = identifier; await submit();
      assert.equal(submitted.email, identifier.trim());
      assert.deepEqual(Object.keys(submitted).sort(), ["email", "password"]);
      assert.equal(loggedIn.role, "USER");
    }
    screen = "register"; await submit(); assert.equal(submitted.phone, "0912345678");
    failure = new ApiError(409, "DUPLICATE_PHONE", "Conflict"); await submit(); assert.equal(message, "Số điện thoại đã được đăng ký.");
    failure = new ApiError(409, "DUPLICATE_EMAIL", "Conflict"); await submit(); assert.equal(message, "Email đã được đăng ký.");
    const previousCalls = calls; phone = "0912-345678"; await submit();
    assert.equal(calls, previousCalls); assert.match(message, /Số điện thoại di động Việt Nam không hợp lệ/);
  } finally {
    if (originalStorage) Object.defineProperty(globalThis, "sessionStorage", originalStorage);
    else delete (globalThis as any).sessionStorage;
  }
});
