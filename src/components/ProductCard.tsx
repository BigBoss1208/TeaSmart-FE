import PurchaseDialog from "./PurchaseDialog";
import ImageWithFallback from "./ImageWithFallback";
import { useEffect, useRef, useState } from "react";
import { Product } from "../types";
import { Icon } from "./Icon";

export const money = (value: number) => `${value.toLocaleString("vi-VN")}₫`;

export function ProductCard({
  product,
  onView,
  onAdd,
  onBuyNow,
  isFavorite = false,
  onToggleFavorite,
  detailsOnly = false
}: {
  product: Product;
  onView: () => void;
  onAdd: () => void | Promise<unknown>;
  onBuyNow?: (product?: Product, weight?: string, quantity?: number) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
  detailsOnly?: boolean;
}) {
  const [choosing,setChoosing] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const timer=useRef<ReturnType<typeof setTimeout>|null>(null),adding=useRef(false);
  const [addError,setAddError]=useState("");
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if(product.stockQuantity===0||adding.current)return;
    adding.current=true;setAddError("");
    try {const result=await onAdd();if(result===false){setAddError("Chưa thêm được vào giỏ hàng.");return}setJustAdded(true);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setJustAdded(false),1200)}
    catch {setAddError("Chưa thêm được vào giỏ hàng. Vui lòng thử lại.")}
    finally {adding.current=false}

  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(product.stockQuantity===0)return;
    if (onBuyNow) setChoosing(true); else onView();
  };

  return (
    <article className="product-card">
      <div className="product-image">
        <button onClick={onView} aria-label={`Xem chi tiết ${product.name}`} style={{ width: "100%", height: "100%", border: 0, padding: 0, background: "transparent" }}>
          {product.image ? <ImageWithFallback src={product.image} alt={product.name} loading="lazy" /> : <span>Chưa có ảnh sản phẩm</span>}
        </button>
        <span className="tag">{product.type}</span>
        {onToggleFavorite && <button
          type="button"
          className={`heart ${isFavorite ? "active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.(e);
          }}
          aria-label={isFavorite ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
        >
          <Icon name="heart" size={18} />
        </button>}
      </div>
      <div className="product-info">
        {product.reviewsCount !== undefined && <div className="rating">
          {product.reviewsCount > 0 ? <span>★ {product.rating} ({product.reviewsCount})</span> : <span>Chưa có đánh giá</span>}
        </div>}
        <button className="product-name" onClick={onView}>
          {product.name}
        </button>
        {addError&&<p role="alert">{addError}</p>}<p>{product.note}</p>{product.stockQuantity!==undefined&&<small className="product-stock">{product.stockQuantity>0?`Còn ${product.stockQuantity} gói/hộp`:"Hết hàng"}</small>}
        <div className="product-bottom">
          <div className="product-price-info">
            <strong className="product-price-amount">{money(product.price)}</strong>
            <span className="product-weight-badge">{product.weight}</span>
          </div>
          {detailsOnly ? <button type="button" className="product-details-link" onClick={onView}>Xem chi tiết</button> : <div className="product-card-actions">
            <button
              type="button"
              className="btn-card-buy"
              disabled={product.stockQuantity===0}
              onClick={handleBuyNow}
              title={`Mua ngay ${product.name}`}
            >
              <span>Mua ngay</span>
              <Icon name="arrow" size={13} />
            </button>
            <button
              type="button"
              disabled={product.stockQuantity===0}
              className={`btn-card-add ${justAdded ? "added" : ""}`}
              onClick={handleAdd}
              aria-label={justAdded ? "Đã thêm vào giỏ" : "Thêm vào giỏ"}
              title={justAdded ? "Đã thêm vào giỏ hàng" : "Thêm vào giỏ hàng"}
            >
              <Icon name={justAdded ? "check" : "bag"} size={16} />
            </button>
          </div>}
        </div>
      </div>
      {choosing&&onBuyNow&&<PurchaseDialog product={product} onClose={()=>setChoosing(false)} onConfirm={(p,w,q)=>onBuyNow(p,w,q)}/>}
    </article>
  );
}
