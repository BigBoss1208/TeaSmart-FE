import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chatErrorMessage, requestRagAdvice } from "../src/lib/ragChat.ts";
import { ApiError } from "../src/lib/commerce.ts";

test("Classifier renders leaf analysis and advice uses the customer widget", () => {
 const app = readFileSync("src/App.tsx", "utf8");
 assert.doesNotMatch(app, /page === "ai" && <TeaAdvisor/);
 assert.match(app, /page === "leaf" && <LeafAnalysis/);
 assert.ok(app.includes('if (p === "ai") { setChatOpenSignal'));
 assert.match(app, /<ChatbotWidget[^>]*customer=\{currentUser\?\.role === "USER"\}/);
 assert.ok(readFileSync("src/components/Header.tsx", "utf8").includes('go("leaf")'));
});

test("Knowledge unavailable, auth, timeout and network errors are actionable and honest", () => {
 for (const code of ["RAG_DISABLED", "RAG_NOT_CONFIGURED"]) assert.match(chatErrorMessage(new ApiError(503, code, "private provider detail")), /chưa được cấu hình/);
 assert.match(chatErrorMessage(new ApiError(503, "RAG_LLM_DISABLED", "")), /chưa thể trả lời/);
 assert.match(chatErrorMessage(new ApiError(401, "", "")), /đăng nhập/);
 assert.match(chatErrorMessage(new ApiError(403, "", "")), /khách hàng/);
 assert.match(chatErrorMessage(new ApiError(504, "RAG_TIMEOUT", "")), /thử lại/);
 assert.match(chatErrorMessage(new TypeError("fetch failed")), /kiểm tra mạng/);
 assert.doesNotMatch(chatErrorMessage(new ApiError(503, "RAG_PROVIDER_UNAVAILABLE", "secret")), /secret/);
});
test("Catalog explicitly disallows LLM and follow-up context is preserved", async () => {
 const oldFetch=globalThis.fetch, oldStorage=Object.getOwnPropertyDescriptor(globalThis,"sessionStorage");
 Object.defineProperty(globalThis,"sessionStorage",{configurable:true,value:{getItem:()=>null}});
 globalThis.fetch=async (_url,init)=>{const body=JSON.parse(String(init?.body));assert.equal(body.allowLlm,false);assert.deepEqual(body.context,{maxPrice:300000});assert.deepEqual(body.history,["ít chát"]);return new Response(JSON.stringify({method:"READ_ONLY_BUSINESS_V1",llmUsed:false,businessProducts:[]}));};
 try {const result=await requestRagAdvice("làm quà",{}, {maxPrice:300000},["ít chát"],new AbortController().signal,false);assert.equal(result.llmUsed,false);}finally{globalThis.fetch=oldFetch;if(oldStorage)Object.defineProperty(globalThis,"sessionStorage",oldStorage);else Reflect.deleteProperty(globalThis,"sessionStorage");}
});
