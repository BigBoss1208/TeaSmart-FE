import test from "node:test";
import assert from "node:assert/strict";
import {validateLeafMedia,IMAGE_LIMIT,VIDEO_LIMIT} from "../src/lib/leafMedia.ts";
import {createServer} from "vite";
import {createElement} from "react";
import {renderToString} from "react-dom/server";
test("leaf preview accepts only real supported MIME/extension and bounded files",()=>{
 assert.equal(validateLeafMedia({name:"leaf.JPG",type:"image/jpeg",size:200},"image"),null);
 assert.ok(validateLeafMedia({name:"payload.exe",type:"image/jpeg",size:100},"image"));assert.ok(validateLeafMedia({name:"leaf.png",type:"text/html",size:100},"image"));assert.ok(validateLeafMedia({name:"leaf.png",type:"image/png",size:IMAGE_LIMIT+1},"image"));assert.ok(validateLeafMedia({name:"leaf.png",type:"image/png",size:0},"image"));
 assert.equal(validateLeafMedia({name:"clip.mp4",type:"video/mp4",size:200},"video"),null);assert.ok(validateLeafMedia({name:"clip.mov",type:"video/quicktime",size:200},"video"));assert.ok(validateLeafMedia({name:"clip.mp4",type:"video/mp4",size:VIDEO_LIMIT+1},"video"));
});
test("leaf page has honest image/video tabs, no fixed AI prediction",async()=>{const server=await createServer({configFile:false,server:{middlewareMode:true},appType:"custom"});try{const page=await server.ssrLoadModule('/src/pages/LeafAnalysis.tsx');const html=renderToString(createElement(page.default)).replace(/<!-- -->/g, "");assert.match(html,/Phân tích ảnh lá chè/);assert.match(html,/Phân tích video lá chè/);assert.match(html,/Backend chưa có mô hình/);assert.match(html,/disabled/);assert.doesNotMatch(html,/92%|Bệnh đốm lá/);}finally{await server.close()}});
test("widget starts as accessible TeaSmart leaf launcher without full page navigation",async()=>{const server=await createServer({configFile:false,server:{middlewareMode:true},appType:"custom"});try{const component=await server.ssrLoadModule('/src/components/ChatbotWidget.tsx');const html=renderToString(createElement(component.default,{customer:false,onLogin(){},onProduct(){}}));assert.match(html,/Mở TeaSmart AI/);assert.match(html,/aria-expanded="false"/);assert.doesNotMatch(html,/iframe|role="dialog"/);}finally{await server.close()}});
