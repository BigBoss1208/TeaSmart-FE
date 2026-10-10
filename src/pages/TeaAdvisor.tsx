import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { money } from "../components/ProductCard";
import { api, ApiError, mapProduct } from "../lib/commerce";
import { validateTeaForm, requestTeaAdvice, type TeaAdvice, type TeaPreferences } from "../lib/teaAdvisor";
import type { Page, Product } from "../types";
import "./TeaAdvisor.css";
type Option = { categoryId?: number; regionId?: number; name: string };
type Exchange = { message: string; answer: TeaAdvice };
export default function TeaAdvisor({ navigate, onAddToCart, onSelectProduct, customer }: {
  navigate: (p: Page) => void; onAddToCart: (p: Product) => void; onSelectProduct: (p: Product) => void; customer: boolean }) {
  const [message, setMessage] = useState(""); const [min, setMin] = useState(""); const [max, setMax] = useState("");
  const [category, setCategory] = useState(""); const [region, setRegion] = useState(""); const [purpose, setPurpose] = useState("");
  const [strength, setStrength] = useState(""); const [astringency, setAstringency] = useState("");
  const [categories, setCategories] = useState<Option[]>([]); const [regions, setRegions] = useState<Option[]>([]);
  const [optionsError, setOptionsError] = useState(false); const [optionRetry, setOptionRetry] = useState(0);
  const [history, setHistory] = useState<Exchange[]>([]); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null); const inFlight = useRef(false); const context = useRef<TeaPreferences | undefined>(undefined);
  useEffect(() => {
    const abort = new AbortController(); setOptionsError(false);
    void Promise.all([api<Option[]>("/categories", { signal: abort.signal }), api<Option[]>("/tea-regions", { signal: abort.signal })])
      .then(([c, r]) => { if (!abort.signal.aborted) { setCategories(c); setRegions(r); } })
      .catch(() => { if (!abort.signal.aborted) setOptionsError(true); }); return () => abort.abort();
  }, [optionRetry]);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { if (!customer) { request.current?.abort(); inFlight.current = false; setBusy(false); setHistory([]); context.current = undefined; } }, [customer]);
  function reset() { request.current?.abort(); inFlight.current = false; setBusy(false); setHistory([]); setMessage(""); setError(""); context.current = undefined;
    setMin(""); setMax(""); setCategory(""); setRegion(""); setPurpose(""); setStrength(""); setAstringency(""); }
  async function send(text = message) {
    if (inFlight.current || !customer) return;
    const invalid = validateTeaForm(text, min, max); if (invalid) { setError(invalid); return; }
    const preferences: TeaPreferences = { ...(category && { categoryId: Number(category) }), ...(region && { regionId: Number(region) }),
      ...(min && { minPrice: Number(min) }), ...(max && { maxPrice: Number(max) }), ...(strength && { strength: Number(strength) }),
      ...(astringency && { astringency: Number(astringency) }), ...(purpose && { purpose: purpose as "DAILY" | "GIFT" }) };
    const abort = new AbortController(); request.current = abort; inFlight.current = true; setBusy(true); setError("");
    try {
      const answer = await requestTeaAdvice(text, preferences, context.current, abort.signal);
      if (!abort.signal.aborted) { setHistory(h => [...h, { message: text.trim(), answer }].slice(-8)); context.current = answer.preferences; setMessage(""); }
    } catch (e) { if (!abort.signal.aborted) setError(e instanceof ApiError ? (e.status === 401 ? "Phiên đăng nhập không còn hợp lệ. Hãy đăng nhập lại." : e.status === 403 ? "Chức năng tư vấn dành cho tài khoản khách hàng." : e.message) : "Kết nối bị gián đoạn. Bạn có thể thử gửi lại."); }
    finally { if (!abort.signal.aborted) { inFlight.current = false; setBusy(false); } }
  }
  const latest = history.at(-1)?.answer;
  return <main className="page ai-page tea-advisor"><aside className="ai-side"><div><span><Icon name="spark" /></span><strong>TeaSmart AI</strong><small>Trợ lý chọn chè từ danh mục thật</small></div>
    <button onClick={reset}>Cuộc trò chuyện mới</button><button onClick={() => navigate("leaf")}><Icon name="camera" /> Phân tích lá chè</button>
    <p className="ai-help">Tư vấn bằng quy tắc tiếng Việt và content-based filtering. Không dùng LLM, không cam kết công dụng sức khỏe. Không gửi mật khẩu, token hoặc thông tin cá nhân.</p></aside>
    <section className="ai-conversation"><div className="ai-top"><strong>TeaSmart AI · Tư vấn chọn chè</strong><button onClick={reset}>Làm mới</button></div>
      {!customer ? <div className="messages"><p>Đăng nhập tài khoản khách hàng để sử dụng tư vấn.</p><button className="btn btn-primary" onClick={() => navigate("login")}>Đăng nhập</button></div> : <>
        <div className="tea-preferences"><p>Ngân sách cho một gói (₫). Bộ lọc ưu tiên hơn nội dung tin nhắn; làm mới để xóa nhu cầu trước đó.</p>
          {optionsError && <p role="alert">Chưa tải được danh mục/vùng chè. <button onClick={() => setOptionRetry(n => n + 1)}>Thử lại</button></p>}
          <div className="tea-filter-grid"><label>Giá tối thiểu<input type="number" min="0" step="0.01" value={min} onChange={e => setMin(e.target.value)} /></label>
          <label>Giá tối đa<input type="number" min="0.01" step="0.01" value={max} onChange={e => setMax(e.target.value)} /></label>
          <label>Danh mục<select value={category} onChange={e => setCategory(e.target.value)}><option value="">Tất cả</option>{categories.map(c => <option key={c.categoryId} value={c.categoryId}>{c.name}</option>)}</select></label>
          <label>Vùng chè<select value={region} onChange={e => setRegion(e.target.value)}><option value="">Tất cả</option>{regions.map(r => <option key={r.regionId} value={r.regionId}>{r.name}</option>)}</select></label>
          <label>Nhu cầu<select value={purpose} onChange={e => setPurpose(e.target.value)}><option value="">Chưa chọn</option><option value="DAILY">Uống hằng ngày</option><option value="GIFT">Mua làm quà</option></select></label>
          <label>Độ đậm<select value={strength} onChange={e => setStrength(e.target.value)}><option value="">Chưa chọn</option>{[1,2,3,4,5].map(n => <option key={n}>{n}</option>)}</select></label>
          <label>Độ chát<select value={astringency} onChange={e => setAstringency(e.target.value)}><option value="">Chưa chọn</option>{[1,2,3,4,5].map(n => <option key={n}>{n}</option>)}</select></label></div>
        </div>
        <div className="messages" aria-live="polite"><p>Hãy mô tả khẩu vị và ngân sách, ví dụ: “Ít chát, hậu ngọt, tối đa 300k”.</p>
          <div className="ai-quick">{["Đậm vị", "Ít chát", "Hậu ngọt", "Uống hằng ngày", "Mua làm quà"].map(t => <button disabled={busy} key={t} onClick={() => void send(t)}>{t}</button>)}</div>
          {history.map((x, i) => <div key={i}><div className="bubble-row user-row"><p className="bubble user">{x.message}</p></div><div className="bubble-row"><p className="bubble ai tea-reply">{x.answer.reply}</p></div></div>)}
          {busy && <p role="status">Đang kiểm tra danh mục và tìm chè phù hợp…</p>}{error && <div role="alert"><p>{error}</p><button onClick={() => navigate("login")}>Đăng nhập lại</button></div>}
          {latest && <>{latest.notices.map(n => <p className="tea-reason" key={n}>{n}</p>)}
            {!latest.recommendations.items.length && <p>Không có sản phẩm phù hợp các điều kiện hiện tại.</p>}
            {latest.recommendations.items.map(item => { const p = mapProduct(item.product); return <article className="ai-product" key={p.id}>
              {p.image && <img src={p.image} alt={p.name} loading="lazy" />}<div><strong>{p.name}</strong><span>{p.note}</span><b>{money(p.price)} / {p.weight}</b><span>Còn {item.stockQuantity} gói lúc tư vấn</span>
                <p>{item.reasons.join(" · ")}</p><div><button className="btn btn-outline" onClick={() => onSelectProduct(p)}>Xem sản phẩm</button><button className="btn btn-primary" onClick={() => onAddToCart(p)}>Thêm vào giỏ</button></div></div>
            </article>; })}</>}
        </div>
        <form className="ai-compose" onSubmit={e => { e.preventDefault(); void send(); }}><label htmlFor="tea-message">Nhu cầu của bạn</label><textarea id="tea-message" maxLength={1000} value={message} disabled={busy} onChange={e => setMessage(e.target.value)} placeholder="Ví dụ: ít chát, hậu ngọt, dưới 300k" />
          <button className="btn btn-primary" disabled={busy || !message.trim()}>Gửi tư vấn</button><small>Hội thoại chỉ giữ trong bộ nhớ trang, không lưu vào tài khoản hoặc log.</small></form>
      </>}
    </section></main>;
}
