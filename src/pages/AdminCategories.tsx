import Modal from "../components/Modal";
import AdminActionMenu from "../components/AdminActionMenu";
import AdminPagination from "../components/AdminPagination";
import "./AdminCatalog.css";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { api } from "../lib/commerce";
import { categoryApi, categoryForm, categoryPayload, categoryFailure, type AdminCategory, type CategoryForm } from "../lib/adminCategories";
const client = categoryApi((path, init = {}) => api(path, { ...init, signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000) }));
export default function AdminCategories({ onCategoriesChanged }: { onCategoriesChanged?: () => Promise<void> }) {
  const [items, setItems] = useState<AdminCategory[]>([]), [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [success, setSuccess] = useState("");
  const [modal, setModal] = useState(false), [editing, setEditing] = useState<AdminCategory | null>(null);
  const [form, setForm] = useState<CategoryForm>(categoryForm);
  const lifetime = useRef<AbortController | null>(null), pending = useRef(false), reads = useRef(0);
  useEffect(() => { const controller = new AbortController(); lifetime.current = controller; void reload(controller.signal); return () => controller.abort(); }, []);
  async function reload(signal = lifetime.current?.signal) {
    const generation = ++reads.current; setLoading(true); setError("");
    try { const result = await client.list(signal); if (!signal?.aborted && generation === reads.current) setItems(result); }
    catch (e) { if (!signal?.aborted && generation === reads.current) { setItems([]); setError(categoryFailure(e)); } }
    finally { if (!signal?.aborted && generation === reads.current) setLoading(false); }
  }
  function add() { if (busy || loading) return; setEditing(null); setForm(categoryForm()); setError(""); setSuccess(""); setModal(true); }
  async function edit(item: AdminCategory) {
    if (pending.current || loading) return; pending.current = true; setBusy(true); setError(""); setSuccess("");
    const signal = lifetime.current?.signal;
    try { const fresh = await client.detail(item.categoryId, signal); if (!signal?.aborted) { setEditing(fresh); setForm(categoryForm(fresh)); setModal(true); } }
    catch (e) { if (!signal?.aborted) setError(categoryFailure(e)); }
    finally { pending.current = false; if (!signal?.aborted) setBusy(false); }
  }
  async function write(operation: (signal?: AbortSignal) => Promise<AdminCategory>, message: string) {
    if (pending.current) return; pending.current = true; setBusy(true); setError(""); setSuccess("");
    const signal = lifetime.current?.signal;
    try {
      await operation(signal); if (signal?.aborted) return;
      setModal(false); setSuccess(message); await reload(signal);
      try { await onCategoriesChanged?.(); } catch { if (!signal?.aborted) setError("Danh mục đã lưu, nhưng chưa đồng bộ dữ liệu cửa hàng. Vui lòng tải lại trang."); }
    } catch (e) { if (!signal?.aborted) setError(categoryFailure(e)); }
    finally { pending.current = false; if (!signal?.aborted) setBusy(false); }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (pending.current) return;
    try { const request = categoryPayload(form); await write(signal => client.save(editing?.categoryId ?? null, request, signal), editing ? "Đã cập nhật danh mục." : "Đã tạo danh mục."); }
    catch (e) { setError(categoryFailure(e)); }
  }
  async function toggle(item: AdminCategory) {
    if (pending.current || loading) return;
    const status = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (!window.confirm(status === "INACTIVE" ? `Ngừng sử dụng danh mục “${item.name}”? Sản phẩm liên quan có thể bị ẩn khỏi cửa hàng.` : `Mở lại danh mục “${item.name}”?`)) return;
    await write(signal => client.status(item.categoryId, status, signal), status === "ACTIVE" ? "Đã mở lại danh mục." : "Đã ngừng sử dụng danh mục.");
  }
  const [keyword,setKeyword]=useState(""),[statusFilter,setStatusFilter]=useState("all"),[page,setPage]=useState(0);
  const filtered=items.filter(i=>`${i.name} ${i.description??""}`.toLocaleLowerCase("vi").includes(keyword.trim().toLocaleLowerCase("vi"))&&(statusFilter==="all"||i.status===statusFilter));
  const currentPage=Math.min(page,Math.max(0,Math.ceil(filtered.length/12)-1));
  const visible=filtered.slice(currentPage*12,currentPage*12+12);
  const disabled = busy || loading;
  return <div className="admin-catalog-b2">
    <div className="admin-list">
      <div className="admin-list-head"><div><strong>Quản lý danh mục chè</strong><span>{loading||error?"—":items.length} danh mục · Quản lý thông tin và trạng thái</span></div><button className="btn btn-primary" disabled={disabled} onClick={add}><Icon name="plus" /> Thêm danh mục</button></div>
      {error && <p role="alert" className="text-danger">{error}</p>}{success && <p role="status">{success}</p>}
      <div className="admin-toolbar"><input className="admin-search-input" aria-label="Tìm danh mục" placeholder="Tìm theo tên hoặc mô tả…" value={keyword} onChange={e=>{setKeyword(e.target.value);setPage(0)}}/><select className="admin-select" aria-label="Lọc trạng thái danh mục" value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(0)}}><option value="all">Tất cả trạng thái</option><option value="ACTIVE">Đang sử dụng</option><option value="INACTIVE">Ngừng sử dụng</option></select><button className="btn btn-outline" disabled={disabled} onClick={() => void reload()}>Làm mới</button></div>
      {loading && <p role="status">Đang tải danh mục…</p>}
      {!loading && !error && !filtered.length && <p>Không có danh mục phù hợp.</p>}
      <div className="admin-table-responsive"><div className="admin-th" style={{ gridTemplateColumns: "180px 1fr 140px 240px" }}><span>Tên danh mục</span><span>Mô tả phân loại</span><span>Trạng thái</span><span>Thao tác</span></div>
        {visible.map(item => <div className="admin-tr" key={item.categoryId} style={{ gridTemplateColumns: "180px 1fr 140px 240px", alignItems: "center" }}>
          <strong>{item.name}{/\b(?:DEV|TEST)\b/i.test(item.name)&&<small className="admin-badge badge-info">Dữ liệu thử nghiệm</small>}</strong><span className="admin-b2-description" title={item.description??undefined}>{item.description || "—"}</span>
          <span><span className={`admin-badge ${item.status === "ACTIVE" ? "badge-success" : "badge-info"}`}>{item.status === "ACTIVE" ? "Đang sử dụng" : "Ngừng sử dụng"}</span></span>
          <span style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}><button className="admin-action-btn" disabled={disabled} onClick={() => void edit(item)}>Sửa</button><AdminActionMenu label={`Thao tác ${item.name}`}><button className="admin-action-btn" disabled={disabled} onClick={() => void toggle(item)}>{item.status === "ACTIVE" ? "Ngừng sử dụng" : "Mở lại"}</button></AdminActionMenu></span>
        </div>)}
      </div>
      <AdminPagination page={currentPage} total={filtered.length} onChange={setPage} disabled={disabled} label="danh mục" />
    </div>
    {modal && <Modal title={editing ? "Chỉnh sửa danh mục" : "Thêm danh mục chè"} onClose={()=>{if(!busy)setModal(false)}}>
      <form onSubmit={save}><fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <div className="admin-form-group"><label htmlFor="category-name">Tên danh mục *</label><input id="category-name" required maxLength={100} value={form.name} onChange={e => setForm(previous => ({ ...previous, name: e.target.value }))} /></div>
        <div className="admin-form-group"><label htmlFor="category-description">Mô tả phân loại</label><textarea id="category-description" value={form.description} onChange={e => setForm(previous => ({ ...previous, description: e.target.value }))} /></div>
        <div className="admin-form-group"><label htmlFor="category-status">Trạng thái</label><select id="category-status" value={form.status} onChange={e => setForm(previous => ({ ...previous, status: e.target.value as CategoryForm["status"] }))}><option value="ACTIVE">Đang sử dụng</option><option value="INACTIVE">Ngừng sử dụng</option></select></div>
        {error && <p role="alert" className="text-danger">{error}</p>}
        <div className="admin-modal-actions"><button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Hủy</button><button type="submit" className="btn btn-primary">{busy ? "Đang lưu…" : "Lưu danh mục"}</button></div>
      </fieldset></form>
    </Modal>}
  </div>;
}
