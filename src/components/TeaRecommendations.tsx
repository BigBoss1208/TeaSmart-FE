import { useEffect, useState } from "react";
import { api, ApiError, mapProduct } from "../lib/commerce";
import { recommendationPath, type TeaRecommendations as Result } from "../lib/teaAdvisor";
import type { Product } from "../types";
import { money, ProductCard } from "./ProductCard";
export default function TeaRecommendations({ productId, profile, compact = false, onSelectProduct, onAddToCart }: {
  productId?: number; profile?: string; compact?: boolean; onSelectProduct: (p: Product) => void; onAddToCart: (p: Product) => void }) {
  const [data, setData] = useState<Result | null>(null); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); const [retry, setRetry] = useState(0);
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setData(null); setError("");
    void api<Result>(recommendationPath(productId, profile), { signal: abort.signal }).then(r => { if (!abort.signal.aborted) setData(r); })
      .catch(e => { if (!abort.signal.aborted) setError(e instanceof ApiError ? e.message : "Chưa thể tải gợi ý. Vui lòng thử lại."); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [productId, profile, retry]);
  return <section className={compact ? "tea-recommendations compact" : "section related tea-recommendations"}><h2>{productId ? "Sản phẩm có đặc điểm tương tự" : "Gợi ý từ danh mục hiện tại"}</h2>
    {loading && <p role="status">Đang tìm sản phẩm gợi ý…</p>}{error && <div role="alert"><p>{error}</p><button onClick={() => setRetry(n => n + 1)}>Thử lại</button></div>}
    {data && <>{data.fallback && <p>Chưa đủ dữ liệu để so khớp; hiển thị sản phẩm còn hàng, không phải xếp hạng bán chạy.</p>}
      {!data.items.length && <p>Chưa có sản phẩm còn hàng để gợi ý.</p>}
      <div className={compact ? "tea-recommendation-list" : "product-grid"}>{data.items.map(item => { const p = mapProduct(item.product); return <div key={p.id}>
        {compact ? <button onClick={() => onSelectProduct(p)}>{p.image && <img src={p.image} alt={p.name} loading="lazy" />}<span><strong>{p.name}</strong><small>{p.note}</small></span><b>{money(p.price)}</b></button>
          : <ProductCard product={p} onView={() => onSelectProduct(p)} onAdd={() => onAddToCart(p)} />}
        {!compact && <p>Còn {item.stockQuantity} gói lúc tải</p>}
        <p className="tea-reason">{item.reasons.join(" · ")}</p></div>; })}</div></>}
  </section>;
}
