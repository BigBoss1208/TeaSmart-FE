import { useState } from "react";
import { Product } from "../types";
import { Icon } from "./Icon";

export const money = (value: number) => `${value.toLocaleString("vi-VN")}₫`;

export function ProductCard({
  product,
  onView,
  onAdd,
  onBuyNow,
  isFavorite = false,
  onToggleFavorite
}: {
  product: Product;
  onView: () => void;
  onAdd: () => void;
  onBuyNow?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
}) {
  const [justAdded, setJustAdded] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setJustAdded(true);
    onAdd();
    setTimeout(() => {
      setJustAdded(false);
    }, 1200);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBuyNow) {
      onBuyNow();
    } else {
      onAdd();
    }
  };

  return (
    <article className="product-card">
      <div className="product-image">
        <button onClick={onView} aria-label={`Xem chi tiết ${product.name}`} style={{ width: "100%", height: "100%", border: 0, padding: 0, background: "transparent" }}>
          {product.image ? <img src={product.image} alt={product.name} loading="lazy" /> : <span>Chưa có ảnh sản phẩm</span>}
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
        <p>{product.note}</p>
        <div className="product-bottom">
          <div className="product-price-info">
            <strong className="product-price-amount">{money(product.price)}</strong>
            <span className="product-weight-badge">{product.weight}</span>
          </div>
          <div className="product-card-actions">
            <button
              type="button"
              className="btn-card-buy"
              onClick={handleBuyNow}
              title={`Mua ngay ${product.name}`}
            >
              <span>Mua ngay</span>
              <Icon name="arrow" size={13} />
            </button>
            <button
              type="button"
              className={`btn-card-add ${justAdded ? "added" : ""}`}
              onClick={handleAdd}
              aria-label={justAdded ? "Đã thêm vào giỏ" : "Thêm vào giỏ"}
              title={justAdded ? "Đã thêm vào giỏ hàng" : "Thêm vào giỏ hàng"}
            >
              <Icon name={justAdded ? "check" : "bag"} size={16} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
