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
      <button className="product-image" onClick={onView} aria-label={`Xem chi tiết ${product.name}`}>
        <img src={product.image} alt={product.name} loading="lazy" />
        <span className="tag">{product.type}</span>
        <button
          type="button"
          className={`heart ${isFavorite ? "active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.(e);
          }}
          aria-label={isFavorite ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
        >
          <Icon name="heart" size={18} />
        </button>
      </button>
      <div className="product-info">
        <div className="rating">
          ★★★★★ <span>{product.rating} ({product.reviewsCount || 85})</span>
        </div>
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
