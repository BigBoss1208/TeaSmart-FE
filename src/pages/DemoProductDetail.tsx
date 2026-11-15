import {Icon} from "../components/Icon";
import ProductPurchase from "../components/ProductPurchase";
import ProductGallery from "../components/ProductGallery";
import ProductReviews from "../components/ProductReviews";
import TeaRecommendations from "../components/TeaRecommendations";
import {useEffect,useState} from "react";
import {api,errorMessage,type ApiProduct} from "../lib/commerce";
import type {Product,Page} from "../types";
import {money} from "../components/ProductCard";
import "./CustomerExperience.css";
export default function DemoProductDetail({product,onAddToCart,onBuyNow,navigate,favorite,onToggleFavorite,onSelectProduct,customer=false}: {
 customer?:boolean;product:Product;onAddToCart:(p:Product,w?:string,q?:number)=>void|Promise<unknown>;onBuyNow?:(p:Product,w?:string,q?:number)=>void;navigate:(p:Page)=>void;favorite:boolean;onToggleFavorite:()=>void;onSelectProduct:(p:Product)=>void;
}) {
 const [detail,setDetail]=useState<ApiProduct|null>(null),[error,setError]=useState("");
 const [summary,setSummary]=useState<{totalReviews:number;averageRating:number|null}|null>(null);
 const demo=product.image.startsWith("/demo/tea/");
 useEffect(()=>{const a=new AbortController();setDetail(null);setError("");setSummary(null);
 void api<ApiProduct>(`/products/${encodeURIComponent(product.slug??"")}`,{signal:a.signal}).then(d=>{if(!a.signal.aborted)setDetail(d)}).catch(e=>{if(!a.signal.aborted)setError(errorMessage(e))});
 void api<{totalReviews:number;averageRating:number|null}>(`/products/${product.id}/reviews/summary`,{signal:a.signal}).then(s=>{if(!a.signal.aborted)setSummary(s)}).catch(()=>{});return()=>a.abort()},[product.id,product.slug]);
 return <main className="page product-experience"><nav className="breadcrumbs" aria-label="Đường dẫn"><button onClick={()=>navigate("home")}>Trang chủ</button><span>›</span><button onClick={()=>navigate("explore")}>{detail?.categoryName??product.type}</button><span>›</span><span>{product.name}</span></nav>
 {demo&&<p className="demo-catalog-note">DỮ LIỆU DEMO · Giá, tồn kho, ảnh AI và liên kết vùng phục vụ đồ án; chưa xác minh thương mại.</p>}
 <section className="product-experience-grid"><div><ProductGallery id={product.id} image={product.image} name={product.name}/></div><div className="purchase-information">
 <h1>{detail?.name??product.name}</h1>
 <div className="product-review-link"><a href="#product-reviews">{summary?summary.totalReviews>0?`${summary.averageRating??"—"}/5 · ${summary.totalReviews} đánh giá`:"Chưa có đánh giá":"Xem đánh giá của khách hàng"}</a><button className="btn btn-outline" onClick={onToggleFavorite}>{favorite?"Bỏ yêu thích":"Lưu vào yêu thích"}</button></div>
 {error?<p role="alert">{error}</p>:!detail?<p role="status">Đang tải thông tin sản phẩm…</p>:<><p className="seller-product-owner">Gian hàng: <strong>{detail.shopName || "TeaSmart"}</strong></p><strong className="detail-price">{money(detail.price)}</strong>{detail.tasteNote&&<p className="detail-desc">{detail.tasteNote}</p>}
 <div className="product-facts"><div><Icon name="leaf"/><small>{demo?"Vùng phân loại demo":"Vùng chè theo danh mục"}</small><strong>{detail.regionName}</strong></div><div><Icon name="bag"/><small>Quy cách cố định</small><strong>{detail.weightGrams}g</strong></div></div>
 <ProductPurchase product={product} onAddToCart={onAddToCart} onBuyNow={onBuyNow}/>
 <div className="product-delivery-row"><div className="delivery-information"><strong><Icon name="bag"/> Thông tin giao hàng</strong><p>Chọn địa chỉ tại Checkout. Chưa có dữ liệu phí và thời gian giao dự kiến để báo trước; thông tin đơn được xác nhận bởi hệ thống.</p><small>Vùng chè không phải địa chỉ kho gửi hàng.</small></div><div className="product-service-list"><div><Icon name="bag"/><span>Thanh toán linh hoạt<small>COD hoặc VNPay</small></span></div><div><Icon name="user"/><span>Thông tin cửa hàng<small>Chính sách giao hàng và hỗ trợ chưa được công bố đầy đủ.</small></span></div></div></div></>}
 </div></section>
 <nav className="product-section-nav" aria-label="Thông tin sản phẩm"><a href="#product-description">Mô tả sản phẩm</a><a href="#product-reviews">Đánh giá sản phẩm</a></nav><div className="product-lower-grid"><section id="product-description" className="product-description"><h2>Mô tả sản phẩm</h2>{detail?<p style={{whiteSpace:"pre-line"}}>{detail.description||"Chưa có mô tả chi tiết từ cửa hàng."}</p>:<p>Thông tin chi tiết chưa tải xong.</p>}</section>
 <div id="product-reviews"><ProductReviews key={product.id} productId={product.id} customer={customer}/></div></div>
 <TeaRecommendations key={`related-${product.id}`} productId={product.id} onSelectProduct={onSelectProduct} onAddToCart={onAddToCart} onBuyNow={onBuyNow}/>
 </main>;
}
