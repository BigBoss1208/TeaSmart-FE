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
