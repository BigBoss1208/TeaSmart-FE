import "./AdminKpis.css";
import Modal from "../components/Modal";
import AdminActionMenu from "../components/AdminActionMenu";
import AdminPagination from "../components/AdminPagination";
import "./AdminCatalog.css";
import ImageWithFallback from "../components/ImageWithFallback";
import {AdminGalleryEditor} from "../components/ProductGallery";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { money } from "../components/ProductCard";
import { api, ApiError, errorMessage } from "../lib/commerce";
import { productApi, productForm, productPayload, tasteFields, type AdminProduct, type ProductForm, type ProductOption } from "../lib/adminProducts";

const client = productApi((path, init = {}) => api(path, { ...init, signal: init.signal
  ? AbortSignal.any([init.signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000) }));
const tasteLabels = { strengthLevel: "Độ đậm", astringencyLevel: "Độ chát", aromaLevel: "Hương thơm", aftertasteLevel: "Hậu vị" };
function failure(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) return "Dữ liệu sản phẩm không hợp lệ. Kiểm tra các trường và giới hạn nhập liệu.";
    if (error.status === 404) return "Sản phẩm hoặc liên kết không còn tồn tại. Hãy làm mới danh sách.";
    if (error.status === 409) return "Tên sản phẩm tạo đường dẫn đã tồn tại. Vui lòng chọn tên khác.";
    return errorMessage(error);
  }
  if (error instanceof Error && error.name === "TimeoutError") return "Yêu cầu quá thời gian chờ. Hãy làm mới danh sách để kiểm tra kết quả trước khi gửi lại.";
  return error instanceof TypeError ? "Không thể kết nối Backend. Vui lòng thử lại." : error instanceof Error ? error.message : "Không thể xử lý sản phẩm.";
}
export default function AdminProducts({ onProductsChanged }: { onProductsChanged?: () => Promise<void> }) {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [options, setOptions] = useState<{ categories: ProductOption[]; regions: ProductOption[]; stores: ProductOption[] }>({ categories: [], regions: [], stores: [] });
  const [loading, setLoading] = useState(true), [optionsReady, setOptionsReady] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [success, setSuccess] = useState("");
  const [keyword, setKeyword] = useState(""), [category, setCategory] = useState("all"), [page, setPage] = useState(0);
  const [statusFilter,setStatusFilter]=useState("all");
  const [stockOnly,setStockOnly]=useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null), [detail, setDetail] = useState<AdminProduct | null>(null);
  const [form, setForm] = useState<ProductForm>(productForm), [modal, setModal] = useState(false);
  const lifetime = useRef<AbortController | null>(null), pending = useRef(false), reads = useRef(0);
  useEffect(() => {
    const controller = new AbortController(); lifetime.current = controller;
    void reload(controller.signal);
    return () => controller.abort();
  }, []);
  async function reload(signal = lifetime.current?.signal) {
    const generation = ++reads.current;
    setLoading(true); setError(""); setOptionsReady(false);
    const results = await Promise.allSettled([client.list(signal), client.options(signal)]);
    if (signal?.aborted || generation !== reads.current) return;
    const [list, refs] = results;
    if (list.status === "fulfilled") { setProducts(list.value); setPage(0); }
    else { setProducts([]); setError(failure(list.reason)); }
    if (refs.status === "fulfilled") { setOptions(refs.value); setOptionsReady(true); }
    else setError(previous => [previous, `Không tải được danh mục/vùng chè/cửa hàng: ${failure(refs.reason)}`].filter(Boolean).join(" "));
    setLoading(false);
  }
  const disabled = busy || loading;
  function field(key: keyof ProductForm, value: string) { setForm(previous => ({ ...previous, [key]: value })); }
  function add() {
    if (disabled || !optionsReady) return;
    setEditing(null); setForm(productForm()); setError(""); setSuccess(""); setModal(true);
  }
  async function open(product: AdminProduct, edit: boolean) {
    if (pending.current || loading) return;
    pending.current = true; setBusy(true); setError(""); setSuccess("");
    const signal = lifetime.current?.signal;
    try {
      const fresh = await client.detail(product.productId, signal);
      if (signal?.aborted) return;
      if (edit) { setEditing(fresh); setForm(productForm(fresh)); setModal(true); } else setDetail(fresh);
    } catch (e) { if (!signal?.aborted) setError(failure(e)); }
    finally { pending.current = false; if (!signal?.aborted) setBusy(false); }
  }
  async function write(operation: (signal?: AbortSignal) => Promise<AdminProduct>, message: string) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(""); setSuccess("");
    const signal = lifetime.current?.signal;
    try {
      await operation(signal);
      if (signal?.aborted) return;
      setModal(false); setSuccess(message);
      await reload(signal);
      if (!signal?.aborted && onProductsChanged) {
        try { await onProductsChanged(); }
        catch { if (!signal?.aborted) setError("Đã lưu sản phẩm, nhưng chưa tải lại được danh mục Customer. Vui lòng tải lại trang."); }
      }
    } catch (e) { if (!signal?.aborted) setError(failure(e)); }
    finally { pending.current = false; if (!signal?.aborted) setBusy(false); }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (pending.current) return;
    let payload;
    try { payload = productPayload(form); } catch (e) { setError(failure(e)); return; }
    await write(signal => client.save(editing?.productId ?? null, editing ? {...payload, expectedStockQuantity:editing.stockQuantity} : payload, signal), editing ? "Đã lưu thay đổi sản phẩm." : "Đã thêm sản phẩm.");
  }
  async function changeStatus(product: AdminProduct) {
    const status = product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (pending.current || !window.confirm(`${status === "INACTIVE" ? "Ngừng kinh doanh" : "Mở bán lại"} sản phẩm “${product.name}”?`)) return;
    await write(signal => client.status(product.productId, status, signal), status === "INACTIVE" ? "Đã ngừng kinh doanh sản phẩm; dữ liệu được giữ nguyên." : "Đã chuyển sản phẩm sang đang kinh doanh.");
  }
  const filtered = products.filter(p => p.name.toLocaleLowerCase("vi").includes(keyword.trim().toLocaleLowerCase("vi")) && (category === "all" || String(p.categoryId) === category) && (!stockOnly || p.stockQuantity===0) && (statusFilter === "all" || p.status === statusFilter));
  const visible = filtered.slice(page * 12, (page + 1) * 12);
  const optionSelect = (key: "categoryId" | "regionId" | "storeId", label: string, choices: ProductOption[]) => <div className="admin-form-group">
    <label htmlFor={`product-${key}`}>{label} *</label>
    <select id={`product-${key}`} required value={form[key]} onChange={e => field(key, e.target.value)}>
      <option value="">Chọn {label.toLowerCase()}</option>
      {choices.map(x => <option key={x.id} value={x.id}>{x.name}{x.status === "INACTIVE" ? " (Ngừng hoạt động)" : ""}</option>)}
    </select>
  </div>;
  const inactiveReference = [["categoryId", options.categories], ["regionId", options.regions], ["storeId", options.stores]].some(([key, list]) => (list as ProductOption[]).some(x => String(x.id) === form[key as keyof ProductForm] && x.status !== "ACTIVE"));
  return <div className="admin-catalog-b2">
    <div className="kpis admin-kpis" aria-label="Thống kê sản phẩm">
     <div><button className="admin-kpi-card" type="button" disabled={loading||!!error} aria-pressed={statusFilter==="all"&&!stockOnly} onClick={()=>{setStatusFilter("all");setStockOnly(false);setKeyword("");setCategory("all");setPage(0)}}><span className="admin-kpi-label">Tổng sản phẩm</span><svg className="admin-kpi-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10"/></svg><strong className="admin-kpi-value">{loading||error?"—":products.length}</strong></button></div>
     <div><button className="admin-kpi-card" type="button" disabled={loading||!!error} aria-pressed={statusFilter==="ACTIVE"&&!stockOnly} onClick={()=>{setStatusFilter("ACTIVE");setStockOnly(false);setPage(0)}}><span className="admin-kpi-label">Đang kinh doanh</span><svg className="admin-kpi-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10v11h16V10 M3 10l2-7h14l2 7 M9 21v-7h6v7"/></svg><strong className="admin-kpi-value">{loading||error?"—":products.filter(p=>p.status==="ACTIVE").length}</strong></button></div>
     <div><div className="admin-kpi-card"><span className="admin-kpi-label">Danh mục</span><svg className="admin-kpi-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h7l2 3h9v12H3z"/></svg><strong className="admin-kpi-value">{optionsReady?options.categories.length:"—"}</strong></div></div>
     <div><button className="admin-kpi-card" type="button" disabled={loading||!!error} aria-pressed={stockOnly} onClick={()=>{setStockOnly(true);setStatusFilter("all");setPage(0)}}><span className="admin-kpi-label">Hết hàng</span><svg className="admin-kpi-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l9-4 9 4v10l-9 4-9-4z M9 10l6 6 M15 10l-6 6"/></svg><strong className="admin-kpi-value">{loading||error?"—":products.filter(p=>p.stockQuantity===0).length}</strong></button></div>
    </div>
    <div className="admin-list">
      <div className="admin-list-head"><div><strong>Danh mục sản phẩm chè Thái Nguyên</strong><span>Quản lý danh sách, giá cả và tồn kho ({loading||error?"—":products.length} sản phẩm)</span></div>
        <button className="btn btn-primary" disabled={disabled || !optionsReady} onClick={add}><Icon name="plus" /> Thêm sản phẩm</button></div>
      {success && <p role="status">{success}</p>}{error && !modal && <p role="alert">{error}</p>}
      <div className="admin-toolbar">
        <input type="text" placeholder="Tìm kiếm sản phẩm theo tên..." className="admin-search-input" value={keyword} onChange={e => { setKeyword(e.target.value); setPage(0); }} />
        <select className="admin-select" aria-label="Lọc danh mục sản phẩm" value={category} onChange={e => { setCategory(e.target.value); setPage(0); }}>
          <option value="all">Tất cả phân loại</option>{Array.from(new Map(products.map(p => [p.categoryId, p.categoryName])).entries()).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select className="admin-select" aria-label="Lọc trạng thái sản phẩm" value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setStockOnly(false);setPage(0)}}><option value="all">Tất cả trạng thái</option><option value="ACTIVE">Đang kinh doanh</option><option value="INACTIVE">Ngừng bán</option></select>
        <button className="btn btn-outline" disabled={disabled} onClick={() => void reload()}>Làm mới</button>
      </div>
      {loading && <p role="status">Đang tải sản phẩm…</p>}
      {!loading && !error && !filtered.length && <p>Không có sản phẩm phù hợp.</p>}
      <div className="admin-table-responsive">
        <div className="admin-th" style={{ gridTemplateColumns: "60px 1.8fr 1.2fr 1fr 80px 155px 170px" }}><span>Ảnh</span><span>Tên sản phẩm</span><span>Danh mục</span><span>Giá bán</span><span>Tồn kho</span><span>Trạng thái</span><span>Thao tác</span></div>
        {visible.map(p => <div className="admin-tr" style={{ gridTemplateColumns: "60px 1.8fr 1.2fr 1fr 80px 155px 170px", alignItems: "center" }} key={p.productId}>
          <span>{<ImageWithFallback src={p.imageUrl} alt={p.name} style={{ width: "42px", height: "42px", objectFit: "cover", borderRadius: "2px" }} />}</span>
          <span><strong>{p.name}</strong>{/\b(?:DEV|TEST)\b/i.test(p.name)&&<small className="admin-badge badge-info">Dữ liệu thử nghiệm</small>}<small style={{ display: "block", color: "var(--muted)", fontSize: "9px" }}>{p.weightGrams}g</small></span>
          <span>{p.categoryName}</span><span><strong>{money(p.price)}</strong></span><span>{p.stockQuantity} gói</span>
          <span><span className={`admin-badge ${p.status === "ACTIVE" ? "badge-success" : "badge-info"}`}>{p.status === "ACTIVE" ? "Đang kinh doanh" : "Ngừng kinh doanh"}</span></span>
          <span style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            <button className="admin-action-btn" disabled={disabled} onClick={() => void open(p, false)} title="Xem chi tiết">Xem</button>
            <button className="admin-action-btn" disabled={disabled || !optionsReady} onClick={() => void open(p, true)} title="Chỉnh sửa">Sửa</button>
            <AdminActionMenu label={`Thao tác ${p.name}`}><button className="admin-action-btn" disabled={disabled} onClick={() => void changeStatus(p)}>{p.status === "ACTIVE" ? "Ngừng bán" : "Mở bán lại"}</button></AdminActionMenu>
          </span>
        </div>)}
      </div>
      <AdminPagination page={page} total={filtered.length} onChange={setPage} disabled={disabled} label="sản phẩm" />
    </div>
    {modal && <Modal title={editing ? "Chỉnh sửa thông tin sản phẩm" : "Thêm sản phẩm chè mới"} onClose={()=>{if(!busy)setModal(false)}}>
      <form onSubmit={save}><fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <div className="admin-form-group"><label htmlFor="product-name">Tên sản phẩm chè *</label><input id="product-name" required maxLength={200} value={form.name} onChange={e => field("name", e.target.value)} placeholder="Ví dụ: Trà Nõn Tôm Thượng Hạng" /></div>
        <div className="admin-form-row">{optionSelect("categoryId", "Phân loại dòng chè", options.categories)}<div className="admin-form-group"><label htmlFor="product-weight">Khối lượng đóng gói (g) *</label><input id="product-weight" type="number" required min={1} max={4294967295} step={1} value={form.weightGrams} onChange={e => field("weightGrams", e.target.value)} /></div></div>
        <div className="admin-form-row">{optionSelect("regionId", "Vùng chè", options.regions)}{optionSelect("storeId", "Cửa hàng", options.stores)}</div>
        <div className="admin-form-row"><div className="admin-form-group"><label htmlFor="product-price">Giá bán niêm yết (VNĐ) *</label><input id="product-price" type="number" required min={0.01} max={9999999999.99} step={0.01} value={form.price} onChange={e => field("price", e.target.value)} /></div><div className="admin-form-group"><label htmlFor="product-stock">Số lượng tồn kho (gói) *</label><input id="product-stock" type="number" required min={0} max={4294967295} step={1} value={form.stockQuantity} onChange={e => field("stockQuantity", e.target.value)} /></div></div>
        <div className="admin-form-row"><div className="admin-form-group"><label htmlFor="product-status">Trạng thái</label><select id="product-status" value={form.status} onChange={e => field("status", e.target.value)}><option value="ACTIVE">Đang kinh doanh</option><option value="INACTIVE">Ngừng kinh doanh</option></select></div><div className="admin-form-group"><label htmlFor="product-image">URL Hình ảnh sản phẩm</label><input id="product-image" type="text" maxLength={500} value={form.imageUrl} onChange={e => field("imageUrl", e.target.value)} placeholder="/demo/tea/... hoặc https://..." /></div></div>
        {editing && <AdminGalleryEditor id={editing.productId} onSaved={urls=>field("imageUrl",urls[0]??"")}/>}
        {inactiveReference && <p>Liên kết ngừng hoạt động vẫn được lưu theo quy tắc Backend; sản phẩm chỉ hiển thị Customer khi cả sản phẩm và các liên kết đều ACTIVE.</p>}
        <div className="admin-form-group"><label htmlFor="product-description">Mô tả sản phẩm</label><textarea id="product-description" rows={3} value={form.description} onChange={e => field("description", e.target.value)} /></div>
        <div className="admin-form-group"><label htmlFor="product-note">Ghi chú hương vị & Đặc tính</label><textarea id="product-note" rows={2} maxLength={500} value={form.tasteNote} onChange={e => field("tasteNote", e.target.value)} /></div>
        <div className="admin-form-row">{tasteFields.map(key => <div className="admin-form-group" key={key}><label htmlFor={`product-${key}`}>{tasteLabels[key]} (1–5, tùy chọn)</label><input id={`product-${key}`} type="number" min={1} max={5} step={1} value={form[key]} onChange={e => field(key, e.target.value)} /></div>)}</div>
        {error && <p role="alert">{error}</p>}
        <div className="admin-modal-actions"><button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Hủy bỏ</button><button type="submit" className="btn btn-primary">{busy ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Thêm vào danh sách"}</button></div>
      </fieldset></form>
    </Modal>}
    {detail && <Modal title="Chi tiết" onClose={()=>setDetail(null)}>
      <div className="admin-modal-head"><h3 className="admin-modal-title">Chi tiết sản phẩm #{detail.productId}</h3><button onClick={() => setDetail(null)} aria-label="Đóng chi tiết sản phẩm"><Icon name="close" size={20} /></button></div>
      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "20px", marginBottom: "16px" }}>{<ImageWithFallback src={detail.imageUrl} alt={detail.name} style={{ width: "120px", height: "120px", objectFit: "cover" }} />}<div style={{ fontSize: "11px", lineHeight: "1.8" }}>
        <strong>{detail.name}</strong><div>Đường dẫn: {detail.slug}</div><div>Danh mục: {detail.categoryName} · {detail.categoryStatus}</div><div>Vùng chè: {detail.regionName} · {detail.regionStatus}</div><div>Cửa hàng: {detail.storeName} · {detail.storeStatus}</div><div>Quy cách: {detail.weightGrams}g · Giá: {money(detail.price)}</div><div>Tồn kho: {detail.stockQuantity} gói · {detail.status}</div>
        {tasteFields.map(key => <div key={key}>{tasteLabels[key]}: {detail[key] ?? "Chưa có dữ liệu"}</div>)}<div>Ngày tạo: {detail.createdAt}</div><div>Cập nhật: {detail.updatedAt}</div></div></div>
      <p>{detail.description}</p><p>{detail.tasteNote}</p><div className="admin-modal-actions"><button className="btn btn-primary" onClick={() => setDetail(null)}>Đóng</button></div>
    </Modal>}
  </div>;
}
