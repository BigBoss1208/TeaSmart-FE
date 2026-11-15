import { useEffect, useState } from "react";
import { mapProduct } from "../lib/commerce";
import { loadTasteCatalog, matchesTaste, tasteChoices, tasteCriteria, type TasteChoice, type TasteProduct } from "../lib/tasteCatalog";
import type { Product } from "../types";
import { Icon } from "./Icon";
import { ProductCard } from "./ProductCard";
import "./TasteFinder.css";

export default function TasteFinder({ onSelectProduct, onAi }: { onSelectProduct: (p: Product) => void; onAi: () => void }) {
  const [choice, setChoice] = useState<TasteChoice>("Hậu ngọt");
  const [products, setProducts] = useState<TasteProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    const signal = AbortSignal.any([abort.signal, AbortSignal.timeout(20000)]);
    setLoading(true); setError(""); setProducts([]);
    void loadTasteCatalog(signal).then(data => { if (!abort.signal.aborted) setProducts(data); })
      .catch(() => { if (!abort.signal.aborted) setError("Chưa thể tải dữ liệu khẩu vị. Vui lòng thử lại."); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [retry]);
  const matches = products.filter(p => matchesTaste(p, choice));
  return <section className="taste-finder taste-finder-v2" aria-labelledby="taste-finder-title">
    <div className="taste-copy">
      <div className="eyebrow">Chọn theo khẩu vị</div>
      <h2 className="taste-title" id="taste-finder-title">Bạn thích vị chè<br />như thế nào?</h2>
      <p>Chọn cảm nhận bạn yêu thích. Chúng tôi chỉ hiển thị sản phẩm có dữ liệu phù hợp trong danh mục hiện tại.</p>
      <button type="button" className="btn btn-primary" onClick={onAi}><Icon name="spark" /> Để TeaSmart AI tư vấn</button>
      <small className="taste-honesty">Đây là bộ lọc danh mục, không phải phản hồi AI. Nút tư vấn mở công cụ hiện có.</small>
    </div>
    <div className="taste-panel">
      <div className="taste-options" role="group" aria-label="Chọn khẩu vị chè">{tasteChoices.map(label =>
        <button key={label} type="button" aria-pressed={choice === label} className={choice === label ? "selected" : ""} onClick={() => setChoice(label)}>
          {label}{choice === label && <Icon name="check" size={16} />}
        </button>)}</div>
      <div className="taste-results" aria-live="polite" aria-busy={loading}>
        <div className="taste-results-heading"><h3>{choice}</h3><span>{tasteCriteria(choice)}</span></div>
        {loading ? <div className="taste-state" role="status"><Icon name="leaf" size={28} /><p>Đang kiểm tra dữ liệu sản phẩm…</p></div>
          : error ? <div className="taste-state" role="alert"><p>{error}</p><button type="button" className="btn btn-outline" onClick={() => setRetry(n => n + 1)}>Thử lại</button></div>
            : matches.length === 0 ? <div className="taste-state"><Icon name="leaf" size={32} /><h4>Chưa có sản phẩm phù hợp</h4><p>Danh mục hiện chưa có đủ dữ liệu đáp ứng lựa chọn này. Bạn có thể chọn khẩu vị khác; TeaSmart không tự suy đoán đặc điểm sản phẩm.</p></div>
              : <><div className="taste-cards">{matches.slice(0, 2).map(item => {
                const product = mapProduct(item);
                return <ProductCard key={product.id} product={product} detailsOnly onView={() => onSelectProduct(product)} onAdd={() => {}} />;
              })}</div><p className="taste-result-note">{matches.length > 2 ? `Hiển thị 2 trong ${matches.length} sản phẩm phù hợp.` : `${matches.length} sản phẩm phù hợp.`} Giá theo API tại thời điểm tải.</p></>}
      </div>
    </div>
  </section>;
}
