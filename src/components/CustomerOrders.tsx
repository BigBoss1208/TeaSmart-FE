import type {Product} from "../types";
import {useEffect,useRef,useState} from "react";
import {api,errorMessage,orderLabels,type ApiOrder,type PaymentStatus} from "../lib/commerce";
import {allReviewProducts,canCancelCod,filterOrders,limitedMap,orderPage,orderTabs,unreviewedProducts,type OrderSummary,type OrderTab} from "../lib/customerOrders";
import {money} from "./ProductCard";
import ProductReviews from "./ProductReviews";
import "./CustomerOrders.css";
export default function CustomerOrders({userId,onOpen,products=[]}:{userId:string|null;onOpen:(id:number)=>void;products?:Product[]}) {
 return userId ? <OwnedOrders key={userId} onOpen={onOpen} products={products}/> : <p>Đăng nhập tài khoản khách hàng để xem đơn mua.</p>;
}
export function OwnedOrders({onOpen,products=[]}:{onOpen:(id:number)=>void;products?:Product[]}) {
 const [tab,setTab]=useState<OrderTab>("ALL"),[rows,setRows]=useState<OrderSummary[]>([]);
 const [requested,setRequested]=useState(0),[loaded,setLoaded]=useState(-1),[totalPages,setTotalPages]=useState(0),[total,setTotal]=useState(0);
 const [revision,setRevision]=useState(0),[attempt,setAttempt]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [payments,setPayments]=useState<Record<number,PaymentStatus>>({}),[paymentError,setPaymentError]=useState(false);
 const [eligible,setEligible]=useState<Record<number,number[]>>({}),[reviewReady,setReviewReady]=useState(false),[reviewError,setReviewError]=useState("");
 const [reviewProduct,setReviewProduct]=useState<number|null>(null),[busy,setBusy]=useState<number|null>(null),[message,setMessage]=useState("");
 const [details,setDetails]=useState<Record<number,ApiOrder|null>>({});
 useEffect(()=>{
  const abort=new AbortController();setDetails({});
  void limitedMap(rows,abort.signal,async o=>{try{const d=await api<ApiOrder>(`/orders/${o.orderId}`,{signal:abort.signal});return d.orderId===o.orderId&&Array.isArray(d.items)?d:null}catch{return null}}).then(values=>{if(!abort.signal.aborted)setDetails(Object.fromEntries(rows.map((o,i)=>[o.orderId,values[i]])))}).catch(()=>{});
  return()=>abort.abort();
 },[rows]);
 const mutation=useRef<AbortController|null>(null),mutationLock=useRef(false),loadLock=useRef(false);
 useEffect(()=>()=>{mutation.current?.abort()},[]);
 const refresh=()=>{setRequested(0);setReviewProduct(null);setRevision(n=>n+1)};
 useEffect(()=>{
  const abort=new AbortController();loadLock.current=true;setLoading(true);setError("");
  if(requested===0){setRows([]);setLoaded(-1);setPayments({});setEligible({});setReviewReady(false)}
  void orderPage(requested,abort.signal).then(result=>{if(abort.signal.aborted)return;
   setRows(old=>{const map=new Map((requested===0?[]:old).map(o=>[o.orderId,o]));result.content.forEach(o=>map.set(o.orderId,o));return [...map.values()]});
   setLoaded(requested);setTotalPages(result.totalPages);setTotal(result.totalElements);
  }).catch(e=>{if(!abort.signal.aborted)setError(errorMessage(e))}).finally(()=>{if(!abort.signal.aborted){setLoading(false);loadLock.current=false}});
  return()=>{abort.abort();loadLock.current=false};
 },[requested,revision,attempt]);
 useEffect(()=>{
  const abort=new AbortController();setPayments({});setPaymentError(false);
  void limitedMap(rows,abort.signal,async o=>{try{return await api<PaymentStatus>(`/orders/${o.orderId}/payment`,{signal:abort.signal})}catch(e){if(abort.signal.aborted)throw e;return null}}).then(values=>{if(abort.signal.aborted)return;const map:Record<number,PaymentStatus>={};values.forEach((p,i)=>{if(p&&p.orderId===rows[i].orderId)map[p.orderId]=p});setPayments(map);setPaymentError(values.some((p,i)=>!p||p.orderId!==rows[i].orderId))}).catch(()=>{});
  return()=>abort.abort();
 },[rows,tab,attempt]);
 useEffect(()=>{
  setReviewReady(false);setEligible({});setReviewError("");
  if(tab!=="REVIEW"||loading||error)return;
  const abort=new AbortController();
  void (async()=>{
   const reviewed=await allReviewProducts(abort.signal);
   const delivered=rows.filter(o=>o.orderStatus==="DELIVERED");
   const details=await limitedMap(delivered,abort.signal,o=>api<ApiOrder>(`/orders/${o.orderId}`,{signal:abort.signal}));
   const result:Record<number,number[]>={};details.forEach((d,i)=>{if(d.orderId!==delivered[i].orderId)throw new Error("Invalid order detail");result[d.orderId]=unreviewedProducts(d,reviewed)});
   if(!abort.signal.aborted){setEligible(result);setReviewReady(true)}
  })().catch(e=>{if(!abort.signal.aborted)setReviewError(errorMessage(e))});
  return()=>abort.abort();
 },[tab,rows,loading,error,attempt]);
 async function cancel(o:OrderSummary){
  if(mutationLock.current||!canCancelCod(o,payments[o.orderId])||!window.confirm("Hủy đơn COD đang chờ xác nhận?"))return;
  const abort=new AbortController();mutation.current=abort;mutationLock.current=true;setBusy(o.orderId);setMessage("");
  try{await api(`/orders/${o.orderId}/cancel`,{method:"PATCH",signal:abort.signal});if(!abort.signal.aborted){setMessage("Đã hủy đơn hàng. Danh sách đang được làm mới.");refresh()}}
  catch(e){if(!abort.signal.aborted)setMessage(errorMessage(e))}
  finally{if(!abort.signal.aborted){mutationLock.current=false;setBusy(null)}}
 }
 const [query,setQuery]=useState("");
 const incomplete=loaded<totalPages-1,visible=filterOrders(rows,tab,eligible).filter(o=>[o.orderCode,...(details[o.orderId]?.items.map(i=>i.productName)??[])].join(" ").toLocaleLowerCase("vi").includes(query.trim().toLocaleLowerCase("vi")));
 const reviewWaiting=tab==="REVIEW"&&!reviewReady;
 return <div className="customer-orders">
  <header className="customer-panel-heading"><h1>Đơn hàng của tôi</h1><p>Theo dõi trạng thái đơn hàng, thanh toán và lịch sử mua sắm của bạn.</p></header>
  <div className="purchase-tabs" role="tablist" aria-label="Trạng thái đơn mua" onKeyDown={e=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;const buttons=Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button"));const index=buttons.indexOf(document.activeElement as HTMLButtonElement);const next=e.key==="Home"?0:e.key==="End"?buttons.length-1:(index+(e.key==="ArrowRight"?1:-1)+buttons.length)%buttons.length;e.preventDefault();buttons[next]?.focus();buttons[next]?.click()}}>{orderTabs.map(([key,label])=><button type="button" role="tab" aria-selected={tab===key} key={key} onClick={()=>{setTab(key);setReviewProduct(null)}}>{label}</button>)}</div>
  <div className="customer-filter-bar"><input type="search" aria-label="Tìm đơn hàng đã tải" placeholder="Tìm theo mã đơn, tên sản phẩm…" value={query} onChange={e=>setQuery(e.target.value)}/><button className="btn btn-outline" disabled={loading||busy!==null} onClick={refresh}>Làm mới đơn hàng</button></div>
  {message&&<p role="status">{message}</p>}
  {error&&<p role="alert">Chưa tải được danh sách đơn. {error} <button onClick={()=>setAttempt(n=>n+1)}>Thử lại</button></p>}
  {loading&&<p role="status">Đang tải đơn hàng…</p>}
  {loaded>=0&&!error&&<p>Đã tải {rows.length}/{total} đơn hàng.{incomplete?" Bộ lọc chỉ áp dụng trong số đơn đã tải; còn lịch sử chưa tải.":" Đã tải hết các trang lịch sử."}</p>}
  {paymentError&&<p role="alert">Chưa tải được thanh toán của một số đơn. Không thể xác nhận điều kiện hủy các đơn đó. <button onClick={()=>setAttempt(n=>n+1)}>Thử lại</button></p>}
  {tab==="REVIEW"&&reviewError&&<p role="alert">Chưa đủ dữ liệu để xác định đơn cần đánh giá. {reviewError} <button onClick={()=>setAttempt(n=>n+1)}>Thử lại</button></p>}
  {reviewWaiting&&!reviewError&&!error&&!loading&&<p role="status">Đang tải đầy đủ đánh giá và kiểm tra các đơn đã giao…</p>}
  {!loading&&!error&&!reviewWaiting&&!visible.length&&<p>{incomplete?"Chưa thấy đơn phù hợp trong số đơn đã tải. Hãy tải thêm lịch sử.":"Không có đơn phù hợp trong lịch sử đã tải."}</p>}
  {!reviewWaiting&&visible.map(o=>{const p=payments[o.orderId];return <article className="order-card" key={o.orderId}>
   <div className="customer-order-head"><span><strong>Đơn hàng #{o.orderCode}</strong><small>Đặt lúc: {o.createdAt.replace("T"," ")}</small></span><b>{orderLabels[o.orderStatus]??o.orderStatus}</b></div>
   <section className="customer-order-items">{details[o.orderId]?.items.map((item,index)=>{const product=products.find(p=>p.id===item.productId);return <div className="customer-order-item" key={`${item.productId}-${index}`}>{product?.image&&<img src={product.image} alt={item.productName}/>}<span><strong>{item.productName}</strong><small>{money(item.unitPrice)} × {item.quantity}</small></span><b>{money(item.unitPrice*item.quantity)}</b></div>})}{details[o.orderId]===undefined&&<p role="status">Đang tải sản phẩm trong đơn…</p>}{details[o.orderId]===null&&<p>Chưa tải được sản phẩm trong đơn. Bạn có thể mở Xem chi tiết để thử lại.</p>}</section>
   <p className="customer-order-total"><strong><small>Tổng thanh toán: </small>{money(o.totalAmount)}</strong><span>{p?`${p.paymentMethod==="COD"?"COD":"VNPay"} · ${p.paymentStatus==="PAID"?"Đã thanh toán":p.paymentStatus==="FAILED"?"Thanh toán thất bại":"Chưa thanh toán"}`:"Chưa xác minh thông tin thanh toán"}</span></p>
   <div className="customer-order-actions"><button className="btn btn-outline" onClick={()=>onOpen(o.orderId)}>Xem chi tiết</button>
   {canCancelCod(o,p)&&<button className="btn btn-outline" disabled={busy!==null||loading} onClick={()=>void cancel(o)}>{busy===o.orderId?"Đang hủy…":"Hủy đơn COD"}</button>}
   {tab==="REVIEW"&&eligible[o.orderId]?.map(id=><button className="btn btn-outline" key={id} onClick={()=>setReviewProduct(id)}>Đánh giá sản phẩm #{id}</button>)}</div>
  </article>})}
  {incomplete&&<button className="btn btn-outline" disabled={loading||busy!==null} onClick={()=>{if(loadLock.current)return;loadLock.current=true;setRequested(loaded+1);setAttempt(n=>n+1)}}>{loading?"Đang tải…":"Tải thêm"}</button>}
  {tab==="REVIEW"&&reviewProduct!==null&&<section><button onClick={()=>setReviewProduct(null)}>Đóng phần đánh giá</button><ProductReviews key={reviewProduct} productId={reviewProduct} customer onSubmitted={()=>{setMessage("Đã gửi đánh giá. Đang cập nhật đơn cần đánh giá.");refresh()}}/></section>}
 </div>;
}
