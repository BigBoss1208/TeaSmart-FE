import {isCustomerTasteProduct} from "../lib/tasteCatalog";
import { useEffect, useState } from "react";
import { api, ApiError, mapProduct } from "../lib/commerce";
import { recommendationPath, type TeaRecommendations as Result } from "../lib/teaAdvisor";
import type { Product } from "../types";
import { money, ProductCard } from "./ProductCard";
import "./TeaRecommendations.css";
export default function TeaRecommendations({ productId, profile, compact = false, onSelectProduct, onAddToCart, onBuyNow }: {
  productId?: number; profile?: string; compact?: boolean; onSelectProduct: (p: Product) => void; onAddToCart: (p: Product) => void; onBuyNow?: (p: Product, weight?: string, quantity?: number) => void }) {
  const [data, setData] = useState<Result | null>(null); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); const [retry, setRetry] = useState(0);
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setData(null); setError("");
    void api<Result>(recommendationPath(productId, profile), { signal: abort.signal }).then(r => { if (!abort.signal.aborted) setData(r); })
      .catch(e => { if (!abort.signal.aborted) setError(e instanceof ApiError ? e.message : "Chưa thể tải gợi ý. Vui lòng thử lại."); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [productId, profile, retry]);
  const items = data?.items.filter(item => item.stockQuantity > 0 && item.product.productId !== productId && isCustomerTasteProduct(item.product))
    .filter((item, index, all) => all.findIndex(candidate => candidate.product.productId === item.product.productId) === index).slice(0,4) ?? [];
  return <section className={compact ? "tea-recommendations compact" : "section related tea-recommendations"}><h2>{productId ? "Có thể bạn cũng thích" : "Gợi ý từ danh mục hiện tại"}</h2>
    {loading && <p role="status">Đang tìm sản phẩm gợi ý…</p>}{error && <div role="alert"><p>{error}</p><button onClick={() => setRetry(n => n + 1)}>Thử lại</button></div>}
    {data && <>{data.fallback && <p>Chưa đủ dữ liệu để so khớp khẩu vị; đây không phải xếp hạng bán chạy.</p>}
      {!items.length && <p>Chưa có sản phẩm còn hàng để gợi ý.</p>}
      <div className={compact ? "tea-recommendation-list" : "product-grid"}>{items.map(item => { const p = {...mapProduct(item.product),stockQuantity:item.stockQuantity}; return <div key={p.id}>
        {compact ? <button onClick={() => onSelectProduct(p)}>{p.image && <img src={p.image} alt={p.name} loading="lazy" />}<span><strong>{p.name}</strong><small>{p.note}</small></span><b>{money(p.price)}</b></button>
          : <ProductCard product={p} onView={() => onSelectProduct(p)} onAdd={() => onAddToCart(p)} onBuyNow={onBuyNow ? (selected,w,q)=>onBuyNow(selected??p,w,q) : undefined} />}
        </div>; })}</div></>}
  </section>;
}
