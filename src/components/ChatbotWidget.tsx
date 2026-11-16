import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { api, mapProduct, type ApiProduct } from "../lib/commerce";
import { money } from "./ProductCard";
import { validateTeaForm } from "../lib/teaAdvisor";
import { requestRagAdvice, chatErrorMessage, type RagAdvice } from "../lib/ragChat";
import type { Product } from "../types";
import "./ChatbotWidget.css";
type Message = { text: string; at: string; answer?: RagAdvice; failed?: boolean };
export default function ChatbotWidget({customer,onLogin,onProduct,openSignal=0,productId}:{customer:boolean;onLogin:()=>void;onProduct:(p:Product)=>void;openSignal?:number;productId?:number}) {
 const [open,setOpen]=useState(false),[text,setText]=useState(""),[messages,setMessages]=useState<Message[]>([]),[busy,setBusy]=useState(false);
 const suggested=useRef<number[]>([]);
 const abort=useRef<AbortController|null>(null),flight=useRef(false),end=useRef<HTMLDivElement>(null),context=useRef<RagAdvice["preferences"]|undefined>(undefined);
 const [allowLlm,setAllowLlm]=useState(false);
 const [images,setImages]=useState<Record<string,string>>({});
 useEffect(()=>{if(openSignal)setOpen(true)},[openSignal]);
 useEffect(()=>{end.current?.scrollIntoView?.({block:"end",behavior:"smooth"})},[messages,busy,open]);
 useEffect(()=>()=>abort.current?.abort(),[]);
 useEffect(()=>{abort.current?.abort();flight.current=false;setBusy(false);setMessages([]);context.current=undefined;suggested.current=[];setImages({});setText("");},[customer,productId]);
 function close(){abort.current?.abort();flight.current=false;setBusy(false);setOpen(false)}
 async function send(value=text){if(flight.current||!customer||!value.trim())return;if(validateTeaForm(value,"","")){setMessages(m=>[...m,{text:"Vui lòng nhập câu hỏi hợp lệ; không gửi token hoặc thông tin đăng nhập.",at:"",failed:true}]);return;}flight.current=true;setBusy(true);setText("");const controller=new AbortController();abort.current=controller;
 const at=new Date().toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"});setMessages(m=>[...m,{text:value.trim(),at}].slice(-16));
 try{const answer=await requestRagAdvice(value,{},context.current,messages.filter(m=>!m.answer&&!m.failed).map(m=>m.text),controller.signal,allowLlm,productId,suggested.current);if(controller.signal.aborted)return;if(!["CUSTOMER_SUPPORT","OUT_OF_SCOPE","GREETING","CLARIFICATION"].includes(answer.businessKind??""))context.current=answer.preferences;if(answer.businessProducts?.length)suggested.current=answer.businessProducts.map(p=>p.productId).slice(0,4);setMessages(m=>[...m,{text:answer.reply,at:new Date().toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"}),answer}].slice(-16));
 for(const item of answer.businessProducts??[]){try{const p=await api<ApiProduct>(`/products/${encodeURIComponent(item.slug)}`,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(5000)])});if(!controller.signal.aborted&&p.imageUrl)setImages(x=>({...x,[item.slug]:p.imageUrl!}));}catch{}}
 }catch(e){if(!controller.signal.aborted){const error=chatErrorMessage(e);setMessages(m=>[...m,{text:error,at,failed:true}]);setText(value);}}finally{if(!controller.signal.aborted){flight.current=false;setBusy(false)}}
 }
 const latest=messages.filter(m=>m.answer).at(-1)?.answer;
 return <div className="tea-chat-widget">{open&&<section className="tea-chat-window" role="dialog" aria-label="TeaSmart AI" aria-modal="false"><header><span className="tea-chat-logo"><Icon name="leaf" size={25}/></span><div><strong>TeaSmart AI</strong><small>Trợ lý tư vấn chè Thái Nguyên</small></div><button aria-label="Làm mới hội thoại" onClick={()=>{abort.current?.abort();flight.current=false;setBusy(false);setMessages([]);context.current=undefined;suggested.current=[];setText("");}}>↻</button><button aria-label="Thu nhỏ chatbot" onClick={close}>−</button><button aria-label="Đóng chatbot" onClick={close}>×</button></header>
 <div className="tea-chat-messages" aria-live="polite"><div className="tea-chat-ai"><span className="tea-chat-avatar"><Icon name="leaf" size={17}/></span><p>Xin chào! Mình là TeaSmart AI. Mình có thể giúp bạn lựa chọn chè, tìm hiểu sản phẩm và giải đáp kiến thức về chè Thái Nguyên.</p></div>{!customer&&<p>Đăng nhập tài khoản khách hàng để gửi câu hỏi. <button onClick={onLogin}>Đăng nhập</button></p>}
 {messages.map((m,i)=><div key={i} className={m.answer||m.failed?"tea-chat-ai":"tea-chat-user"}>{(m.answer||m.failed)&&<span className="tea-chat-avatar"><Icon name="leaf" size={17}/></span>}<div><p role={m.failed?"alert":undefined}>{m.text}</p><time>{m.at}</time>{m.answer&&<small>{m.answer.llmUsed?"Có tham khảo tài liệu":"Thông tin từ TeaSmart"}</small>}{m.answer?.sources?.map(s=><a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>)}</div></div>)}
 {!!latest?.businessProducts?.length&&<div className="tea-chat-products">{latest.businessProducts.map(p=><article key={p.productId}>{images[p.slug]?<img src={images[p.slug]} alt={p.name}/>:<div className="tea-chat-no-image"><Icon name="leaf"/>Chưa có ảnh</div>}<strong>{p.name}</strong>{latest.recommendations.items.find(item=>item.product.productId===p.productId)?.reasons.map(reason=><small key={reason}>{reason}</small>)}<b>{money(p.price)}</b><small>Còn {p.stockQuantity} gói</small><button onClick={async()=>{try{const data=await api<ApiProduct>(`/products/${encodeURIComponent(p.slug)}`);onProduct(mapProduct(data));}catch{setMessages(m=>[...m,{text:"Không tải được sản phẩm. Vui lòng thử lại.",at:"",failed:true}]);}}}>Xem chi tiết</button></article>)}</div>}
 {latest?.businessKind==="PRODUCTS"&&!latest.businessProducts?.length&&<p>Không có sản phẩm phù hợp. Hãy đổi ngân sách hoặc nhu cầu.</p>}
 {messages.at(-1)?.failed&&text&&<button disabled={busy} onClick={()=>void send()}>Thử lại câu hỏi</button>}
 {busy&&<p role="status">Đang tra cứu dữ liệu…</p>}<div ref={end}/></div><div className="tea-chat-prompts">{["Chè ít chát","Chè dưới 300k","Chè làm quà biếu","Cách pha chè","Chè bán chạy"].map(q=><button key={q} disabled={busy||!customer} onClick={()=>void send(q)}>{q}</button>)}</div>
 <label>Chế độ tư vấn<select aria-label="Chế độ tư vấn widget" disabled={busy} value={allowLlm?"knowledge":"catalog"} onChange={e=>setAllowLlm(e.target.value==="knowledge")}><option value="catalog">Danh mục theo quy tắc</option><option value="knowledge">Kiến thức RAG/LLM (khi đã cấu hình)</option></select></label><form onSubmit={e=>{e.preventDefault();void send()}}><label className="sr-only" htmlFor="widget-message">Nội dung tư vấn</label><textarea id="widget-message" placeholder="Nhập câu hỏi của bạn…" maxLength={1000} value={text} disabled={!customer||busy} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send()}}}/><button aria-label="Gửi tin nhắn" disabled={busy||!customer||!text.trim()}><Icon name="arrow"/></button></form><small className="tea-chat-disclosure">{allowLlm?"Chỉ câu hỏi kiến thức và tối đa 6 câu hỏi trước được gửi tới provider đã cấu hình. Không nhập thông tin cá nhân.":"Dữ liệu cửa hàng thật · Theo quy tắc, không dùng LLM"}</small></section>}
 <button className="tea-chat-launcher" aria-label={open?"Thu nhỏ TeaSmart AI":"Mở TeaSmart AI"} aria-expanded={open} onClick={()=>open?close():setOpen(true)}><Icon name="leaf" size={29}/></button></div>
}
