import {useEffect,useRef,useState} from "react";
import {api,errorMessage,mapProduct,type ApiProduct} from "../lib/commerce";
import type {Product} from "../types";
import Modal from "./Modal";
import ImageWithFallback from "./ImageWithFallback";
import {money} from "./ProductCard";
export default function PurchaseDialog({product,initialQuantity=1,onQuantityChange,onClose,onConfirm}:{product:Product;initialQuantity?:number;onQuantityChange?:(q:number)=>void;onClose:()=>void;onConfirm:(p:Product,w:string,q:number)=>void}) {
 const [detail,setDetail]=useState<ApiProduct|null>(null),[quantity,setQuantity]=useState(initialQuantity),[error,setError]=useState("");
 const confirmed=useRef(false);
 useEffect(()=>{const a=new AbortController();void api<ApiProduct>(`/products/${encodeURIComponent(product.slug??"")}`,{signal:a.signal}).then(d=>{if(!a.signal.aborted)setDetail(d)}).catch(e=>{if(!a.signal.aborted)setError(errorMessage(e))});return()=>a.abort()},[product.id,product.slug]);
 const stock=detail?.stockQuantity??0,valid=!!detail&&Number.isInteger(quantity)&&quantity>=1&&quantity<=stock;
 const change=(q:number)=>{setQuantity(q);onQuantityChange?.(q)};
 return <Modal title="Chọn mua sản phẩm" onClose={onClose}><div className="purchase-dialog">
  <div className="purchase-dialog-grid"><div className="purchase-dialog-photo"><ImageWithFallback src={detail?.imageUrl??product.image} alt={product.name}/></div><div className="purchase-dialog-main"><div className="purchase-dialog-product"><div><h3>{detail?.name??product.name}</h3>{detail&&<><strong>{money(detail.price)}</strong><p>Quy cách cố định: {detail.weightGrams}g</p><p>Còn {stock} gói/hộp</p></>}</div></div>
  {error?<p role="alert">Chưa thể xác nhận sản phẩm. {error}</p>:!detail?<p role="status">Đang kiểm tra giá và tồn kho…</p>:<>
  <label>Số lượng gói/hộp <div className="quantity-stepper"><button type="button" aria-label="Giảm số lượng mua ngay" disabled={quantity<=1||!Number.isInteger(quantity)} onClick={()=>change(quantity-1)}>−</button><input aria-label="Số lượng mua ngay" type="number" min={1} max={stock} step={1} value={Number.isFinite(quantity)?quantity:""} disabled={stock<1} onChange={e=>change(Number(e.target.value))}/><button type="button" aria-label="Tăng số lượng mua ngay" disabled={quantity>=stock||!Number.isInteger(quantity)} onClick={()=>change(quantity+1)}>+</button></div></label>
  {valid?<p className="purchase-total">Tạm tính <strong>{money(detail.price*quantity)}</strong></p>:<p role="status">{stock<1?"Sản phẩm hiện hết hàng.":"Số lượng phải là số nguyên từ 1 đến tồn kho hiện có."}</p>}</>}
  </div><aside className="purchase-dialog-aside"><section><h3>Thông tin sản phẩm</h3><p>Giá và tồn kho được kiểm tra từ cửa hàng.</p><p>Quy cách hiển thị là quy cách hiện có của sản phẩm.</p></section><section><h3>Giao hàng & thanh toán</h3><p>Chọn địa chỉ nhận hàng tại Checkout.</p><p>Thanh toán khi nhận hàng (COD).</p><p>Thanh toán trực tuyến qua VNPay.</p><small>Phí giao hàng và tổng tiền được xác nhận tại bước đặt hàng.</small></section></aside></div>
  <div className="purchase-dialog-footer"><div className="payment-actions"><button type="button" className="btn btn-outline" onClick={onClose}>Hủy</button><button type="button" className="btn btn-primary" disabled={!valid||!!error} onClick={()=>{if(!detail||!valid||error||confirmed.current)return;confirmed.current=true;onConfirm(mapProduct(detail),`${detail.weightGrams}g`,quantity);onClose()}}>Tiếp tục mua hàng</button></div><small>Chỉ chuyển đến Checkout sau khi xác nhận. Giỏ hàng hiện tại được giữ nguyên.</small></div>
 </div></Modal>;
}
