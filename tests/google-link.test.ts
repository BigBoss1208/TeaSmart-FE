import test from "node:test";
import assert from "node:assert/strict";
import {googleLinkPost} from "../src/lib/google-link.ts";
import {ApiError} from "../src/lib/commerce.ts";
test("Invalid Google state preserves the existing TeaSmart session",async()=>{
 const originalFetch=globalThis.fetch,originalStorage=Object.getOwnPropertyDescriptor(globalThis,"sessionStorage");const values=new Map([["teasmart_access_token","synthetic-session"]]);
 Object.defineProperty(globalThis,"sessionStorage",{configurable:true,value:{getItem:(k:string)=>values.get(k)??null,removeItem:(k:string)=>values.delete(k)}});
 try{globalThis.fetch=async(url,init)=>{assert.equal(url,"/api/auth/google/link/complete");assert.equal(init?.method,"POST");assert.equal(init?.credentials,"same-origin");assert.equal(init?.cache,"no-store");assert.equal(new Headers(init?.headers).get("Authorization"),"Bearer synthetic-session");return Response.json({code:"GOOGLE_AUTH_FAILED"},{status:401})};await assert.rejects(googleLinkPost("complete"),e=>e instanceof ApiError&&e.status===401);assert.equal(values.get("teasmart_access_token"),"synthetic-session");}
 finally{globalThis.fetch=originalFetch;if(originalStorage)Object.defineProperty(globalThis,"sessionStorage",originalStorage);else Reflect.deleteProperty(globalThis,"sessionStorage")}
});
test("Google linking cannot start without a TeaSmart session",async()=>{const old=Object.getOwnPropertyDescriptor(globalThis,"sessionStorage");Object.defineProperty(globalThis,"sessionStorage",{configurable:true,value:{getItem:()=>null}});try{await assert.rejects(googleLinkPost("start"),e=>e instanceof ApiError&&e.code==="UNAUTHORIZED")}finally{if(old)Object.defineProperty(globalThis,"sessionStorage",old);else Reflect.deleteProperty(globalThis,"sessionStorage")}});