import test from "node:test";import assert from "node:assert/strict";import {requestRagAdvice} from "../src/lib/ragChat.ts";
test("RAG sends bounded user-only history and JWT only in Authorization",async()=>{
 const fetch=globalThis.fetch,storage=Object.getOwnPropertyDescriptor(globalThis,"sessionStorage");Object.defineProperty(globalThis,"sessionStorage",{configurable:true,value:{getItem:()=>"fixture-token",removeItem(){}}});
 globalThis.fetch=async(path,init)=>{assert.equal(path,"/api/chatbot/rag");const body=JSON.parse(String(init?.body));assert.equal(body.history.length,6);assert.equal(body.message,"pha chè");assert.equal(new Headers(init?.headers).get("Authorization"),"Bearer fixture-token");assert.doesNotMatch(String(init?.body),/fixture-token|userId|password/);return new Response(JSON.stringify({method:"RAG_LLM_V1",reply:"Fixture only",sources:[]}));};
 try{const answer=await requestRagAdvice(" pha chè ",{},undefined,Array(9).fill("câu hỏi"),new AbortController().signal);assert.equal(answer.method,"RAG_LLM_V1");}finally{globalThis.fetch=fetch;if(storage)Object.defineProperty(globalThis,"sessionStorage",storage);else Reflect.deleteProperty(globalThis,"sessionStorage");}
});
test("RAG provider unavailable remains an error, no invented answer",async()=>{
 const fetch=globalThis.fetch,storage=Object.getOwnPropertyDescriptor(globalThis,"sessionStorage");Object.defineProperty(globalThis,"sessionStorage",{configurable:true,value:{getItem:()=>null,removeItem(){}}});globalThis.fetch=async()=>new Response(JSON.stringify({code:"RAG_NOT_CONFIGURED",message:"Not configured"}),{status:503});
 try{await assert.rejects(requestRagAdvice("pha chè",{},undefined,[],new AbortController().signal),(error:any)=>error.status===503);}finally{globalThis.fetch=fetch;if(storage)Object.defineProperty(globalThis,"sessionStorage",storage);else Reflect.deleteProperty(globalThis,"sessionStorage");}
});


test("Knowledge labels require evidence, not merely a completed provider call", async () => {
 const {ragAnswerLabel}=await import("../src/lib/ragChat.ts");
 assert.equal(ragAnswerLabel({method:"RAG_NO_EVIDENCE",llmUsed:true,sources:[]}),"Chưa có đủ tài liệu để trả lời");
 assert.equal(ragAnswerLabel({method:"RAG_NO_EVIDENCE",llmUsed:false,sources:[]}),"Chưa có đủ tài liệu để trả lời");
 assert.equal(ragAnswerLabel({method:"KNOWLEDGE_UNAVAILABLE",llmUsed:false,sources:[]}),"Chưa có đủ tài liệu để trả lời");
 assert.equal(ragAnswerLabel({method:"RAG_LLM_V1",llmUsed:true,sources:[{id:"fixture:0",title:"Fixture",url:"https://example.invalid",publisher:"Fixture",accessedAt:"2026-11-17"}]}),"Có tham khảo tài liệu");
 assert.equal(ragAnswerLabel({method:"READ_ONLY_BUSINESS_V1",llmUsed:false,sources:[]}),"Thông tin từ TeaSmart");
});

test("Provider failures never expose technical codes or private messages to customers", async () => {
 const {chatErrorMessage}=await import("../src/lib/ragChat.ts");const {ApiError}=await import("../src/lib/commerce.ts");
 for(const code of ["RAG_PROVIDER_UNAVAILABLE","RAG_RATE_LIMITED","RAG_CALLS_DISABLED","RAG_PROVIDER_AUTH_REJECTED","RAG_MODEL_UNAVAILABLE","RAG_INVALID_OUTPUT","RAG_UNGROUNDED_OUTPUT","RAG_TIMEOUT"]){
  const text=chatErrorMessage(new ApiError(code==="RAG_TIMEOUT"?504:503,code,"private-key-fixture"));
  assert.doesNotMatch(text,/RAG_|private-key-fixture|Gemini.*thành công/);
  assert.match(text,/thử lại|sản phẩm/);
 }
});


test("Tea-line followups preserve backend-owned line and region context",async()=>{
 const oldFetch=globalThis.fetch,storage=Object.getOwnPropertyDescriptor(globalThis,"sessionStorage");Object.defineProperty(globalThis,"sessionStorage",{configurable:true,value:{getItem:()=>null}});
 globalThis.fetch=async(_url,init)=>{const body=JSON.parse(String(init?.body));assert.deepEqual(body.context,{teaLine:"non tom",regionId:21,maxPrice:299999.99});assert.equal(body.message,"Loại nào ít chát?");assert.equal(body.allowLlm,false);return new Response(JSON.stringify({method:"READ_ONLY_BUSINESS_V1",businessKind:"LINE_PRODUCTS",reply:"Fixture",preferences:body.context,businessProducts:[],recommendations:{items:[]},sources:[],llmUsed:false}));};
 try{const result=await requestRagAdvice("Loại nào ít chát?",{}, {teaLine:"non tom",regionId:21,maxPrice:299999.99},["Chè nõn tôm"],new AbortController().signal,false);assert.equal(result.preferences.teaLine,"non tom");assert.equal(result.llmUsed,false);}finally{globalThis.fetch=oldFetch;if(storage)Object.defineProperty(globalThis,"sessionStorage",storage);else Reflect.deleteProperty(globalThis,"sessionStorage");}
});
