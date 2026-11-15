import {useEffect, useState} from "react";
import {api, errorMessage, mapProduct, type ApiPage, type ApiProduct} from "../lib/commerce";
import {isCustomerTasteProduct} from "../lib/tasteCatalog";
import type {Product} from "../types";
import ImageWithFallback from "./ImageWithFallback";
import {money} from "./ProductCard";

export default function CartCatalog({cartProductIds, onSelectProduct, onBrowse}: {
  cartProductIds: number[];
  onSelectProduct: (product: Product) => void;
  onBrowse: () => void;
}) {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void api<ApiPage<ApiProduct>>("/products?size=20", {signal: controller.signal})
      .then(page => {if (!controller.signal.aborted) setProducts(page.content);})
      .catch(reason => {if (!controller.signal.aborted) setError(errorMessage(reason));})
      .finally(() => {if (!controller.signal.aborted) setLoading(false);});
    return () => controller.abort();
  }, [retry]);
  const visible = products.filter(p => !cartProductIds.includes(p.productId)
    && isCustomerTasteProduct(p) && (p.stockQuantity == null || p.stockQuantity > 0)).slice(0, 4);
  return <section className="cart-catalog" aria-labelledby="cart-catalog-title">
    <div className="cart-catalog-heading"><h2 id="cart-catalog-title">Khám phá thêm sản phẩm</h2><button type="button" onClick={onBrowse}>Xem thêm →</button></div>
    {loading ? <p role="status">Đang tải sản phẩm…</p> : error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => setRetry(n => n + 1)}>Thử lại</button></div> : visible.length === 0 ? <p>Chưa có sản phẩm khác phù hợp để hiển thị.</p> : <div className="cart-catalog-grid">{visible.map(p => <button type="button" className="cart-catalog-card" key={p.productId} onClick={() => onSelectProduct(mapProduct(p))}>
      <ImageWithFallback src={p.imageUrl || "/placeholder-teasmart.svg"} alt={p.name}/>
      <span><strong>{p.name}</strong><b>{money(p.price)}</b><small>Xem chi tiết →</small></span>
    </button>)}</div>}
  </section>;
}
