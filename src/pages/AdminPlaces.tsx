import Modal from "../components/Modal";
import AdminActionMenu from "../components/AdminActionMenu";
import AdminPagination from "../components/AdminPagination";
import "./AdminCatalog.css";
import "./AdminModeration.css";
import ImageWithFallback from "../components/ImageWithFallback";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { api } from "../lib/commerce";
import { placeApi, placeId, placeForm, placeFields, placePayload, placeFailure, type PlaceKind, type AdminPlace, type PlaceForm } from "../lib/adminPlaces";
const clients = {
  region: placeApi("region", transport), store: placeApi("store", transport),
};
function transport<T>(path: string, init: RequestInit = {}) { return api<T>(path, { ...init, signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000) }); }
const labels: Record<keyof PlaceForm, string> = { name: "Tên", description: "Mô tả", location: "Khu vực / Huyện", imageUrl: "URL ảnh", address: "Địa chỉ", phone: "Số điện thoại", email: "Email", logoUrl: "URL logo", status: "Trạng thái" };
const limits: Partial<Record<keyof PlaceForm, number>> = { name: 150, location: 255, imageUrl: 500, address: 255, phone: 20, email: 255, logoUrl: 500 };
export default function AdminPlaces({ kind, onPlacesChanged }: { kind: PlaceKind; onPlacesChanged?: () => Promise<void> }) {
  const client = clients[kind], region = kind === "region";
  const title = region ? "vùng chè" : "cơ sở / HTX";
  const [items, setItems] = useState<AdminPlace[]>([]), [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [success, setSuccess] = useState("");
  const [modal, setModal] = useState(false), [editing, setEditing] = useState<AdminPlace | null>(null), [detail, setDetail] = useState<AdminPlace | null>(null);
  const [form, setForm] = useState<PlaceForm>(placeForm);
  const lifetime = useRef<AbortController | null>(null), pending = useRef(false), reads = useRef(0);
  useEffect(() => { const controller = new AbortController(); lifetime.current = controller; void reload(controller.signal); return () => controller.abort(); }, [kind]);
  async function reload(signal = lifetime.current?.signal) {
    const generation = ++reads.current; setLoading(true); setError("");
    try { const result = await client.list(signal); if (!signal?.aborted && generation === reads.current) setItems(result); }
    catch (e) { if (!signal?.aborted && generation === reads.current) { setItems([]); setError(placeFailure(e)); } }
    finally { if (!signal?.aborted && generation === reads.current) setLoading(false); }
  }
  function add() { if (busy || loading) return; setEditing(null); setForm(placeForm()); setError(""); setSuccess(""); setModal(true); }
  async function open(record: AdminPlace, edit: boolean) {
    if (pending.current || loading) return; pending.current = true; setBusy(true); setError(""); setSuccess(""); const signal = lifetime.current?.signal;
    try { const fresh = await client.detail(placeId(record), signal); if (!signal?.aborted) { if (edit) { setEditing(fresh); setForm(placeForm(fresh)); setModal(true); } else setDetail(fresh); } }
    catch (e) { if (!signal?.aborted) setError(placeFailure(e)); }
    finally { pending.current = false; if (!signal?.aborted) setBusy(false); }
  }
  async function write(operation: (signal?: AbortSignal) => Promise<AdminPlace>, message: string) {
    if (pending.current) return; pending.current = true; setBusy(true); setError(""); setSuccess(""); const signal = lifetime.current?.signal;
    try { await operation(signal); if (signal?.aborted) return; setModal(false); setSuccess(message); await reload(signal);
      try { await onPlacesChanged?.(); } catch { if (!signal?.aborted) setError("Đã lưu nhưng chưa đồng bộ catalog. Vui lòng tải lại trang."); }
    } catch (e) { if (!signal?.aborted) setError(placeFailure(e)); }
    finally { pending.current = false; if (!signal?.aborted) setBusy(false); }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (pending.current) return;
    try { const request = placePayload(kind, form); await write(signal => client.save(editing ? placeId(editing) : null, request, signal), editing ? "Đã cập nhật thông tin." : "Đã tạo mới thành công."); }
    catch (e) { setError(placeFailure(e)); }
  }
  async function toggle(record: AdminPlace) {
    if (pending.current || loading) return; const status = record.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (!window.confirm(status === "INACTIVE" ? `Ngừng sử dụng ${title} “${record.name}”? Sản phẩm liên quan có thể bị ẩn khỏi cửa hàng.` : `Mở lại ${title} “${record.name}”?`)) return;
    await write(signal => client.status(placeId(record), status, signal), status === "ACTIVE" ? "Đã mở lại." : "Đã ngừng sử dụng.");
  }
  const [keyword,setKeyword]=useState(""),[statusFilter,setStatusFilter]=useState(""),[page,setPage]=useState(0);
  const filtered=items.filter(r=>r.name.toLocaleLowerCase("vi").includes(keyword.trim().toLocaleLowerCase("vi"))&&(!statusFilter||r.status===statusFilter));
  const current=Math.min(page,Math.max(0,Math.ceil(filtered.length/12)-1)),visible=filtered.slice(current*12,current*12+12);
  const disabled = busy || loading;
  return <div className="admin-b4">
    <div className="admin-list">
      <div className="admin-list-head"><div><strong>{region ? "Quản lý vùng chè Thái Nguyên" : "Quản lý Hợp tác xã & Cơ sở sản xuất chè đối tác"}</strong><span>{region ? "Thông tin vùng nguyên liệu trong hệ thống" : "Thông tin cửa hàng và HTX trong hệ thống"} · {loading||error?"—":items.length} bản ghi</span></div><button className="btn btn-primary" disabled={disabled} onClick={add}><Icon name="plus" /> Thêm {title}</button></div>
      {error && <p role="alert" className="text-danger">{error}</p>}{success && <p role="status">{success}</p>}
      <div className="admin-toolbar"><input className="admin-search-input" aria-label="Tìm theo tên" placeholder={region?"Tìm tên vùng chè…":"Tìm tên cửa hàng / HTX…"} value={keyword} onChange={e=>{setKeyword(e.target.value);setPage(0)}}/><select className="admin-select" aria-label="Lọc trạng thái" value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(0)}}><option value="">Tất cả trạng thái</option><option value="ACTIVE">Đang sử dụng</option><option value="INACTIVE">Ngừng sử dụng</option></select><button className="btn btn-outline" disabled={disabled} onClick={() => void reload()}>Làm mới</button></div>
      {loading && <p role="status">Đang tải {title}…</p>}{!loading && !error && !filtered.length && <p>{items.length?"Không có kết quả phù hợp bộ lọc.":`Chưa có ${title}.`}</p>}
      <div className="admin-table-responsive"><div className="admin-th" style={{ gridTemplateColumns: "70px 1.2fr 1.5fr 1fr 240px" }}><span>Ảnh</span><span>{region ? "Tên vùng & Huyện" : "Tên cơ sở / HTX"}</span><span>{region ? "Mô tả" : "Địa chỉ"}</span><span>{region ? "Trạng thái" : "Liên hệ"}</span><span>Thao tác</span></div>
        {visible.map(record => { const value = placeForm(record), image = region ? value.imageUrl : value.logoUrl; return <div className="admin-tr" key={placeId(record)} style={{ gridTemplateColumns: "70px 1.2fr 1.5fr 1fr 240px", alignItems: "center" }}>
          <span>{<ImageWithFallback src={image} alt={record.name} style={{ width: "55px", height: "40px", objectFit: "cover", borderRadius: "2px" }} />}</span>
          <div><strong>{record.name}</strong>{/\b(?:DEV|TEST)\b/i.test(record.name)&&<small className="admin-badge badge-info">Dữ liệu thử nghiệm</small>}<small style={{ display: "block", color: "var(--muted)" }}>{region ? value.location : ""}</small>{!region && <span className={`admin-badge ${record.status === "ACTIVE" ? "badge-success" : "badge-info"}`}>{record.status === "ACTIVE" ? "Đang sử dụng" : "Ngừng sử dụng"}</span>}</div>
          <span className="b4-clamp">{(region ? value.description : value.address) || "—"}</span>
          {region ? <span><span className={`admin-badge ${record.status === "ACTIVE" ? "badge-success" : "badge-info"}`}>{record.status === "ACTIVE" ? "Đang sử dụng" : "Ngừng sử dụng"}</span></span> : <div><span style={{ fontSize: "10px", color: "var(--forest)" }}>{value.phone || "—"}</span><div style={{ fontSize: "9px", color: "var(--muted)", overflowWrap: "anywhere" }}>{value.email}</div></div>}
          <span style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}><button className="admin-action-btn" disabled={disabled} onClick={() => void open(record, false)}>Xem</button><button className="admin-action-btn" disabled={disabled} onClick={() => void open(record, true)}>Sửa</button><AdminActionMenu label={`Thao tác ${record.name}`}><button className="admin-action-btn" disabled={disabled} onClick={() => void toggle(record)}>{record.status === "ACTIVE" ? "Ngừng sử dụng" : "Mở lại"}</button></AdminActionMenu></span>
        </div>; })}
      </div>
      <AdminPagination page={current} total={filtered.length} onChange={setPage} disabled={disabled} label={title} />
    </div>
    {modal && <Modal title={(editing ? "Chỉnh sửa " : "Thêm ")+title} onClose={()=>{if(!busy)setModal(false)}}>
      <form onSubmit={save}><fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        {placeFields(kind).map(field => <div className="admin-form-group" key={field}><label htmlFor={`place-${field}`}>{field === "name" ? `${region ? "Tên vùng chè" : "Tên cơ sở / Hợp tác xã"} *` : labels[field]}</label>
          {field === "status" ? <select id="place-status" value={form.status} onChange={e => setForm(previous => ({ ...previous, status: e.target.value as PlaceForm["status"] }))}><option value="ACTIVE">Đang sử dụng</option><option value="INACTIVE">Ngừng sử dụng</option></select> : field === "description" ? <textarea id="place-description" value={form.description} onChange={e => setForm(previous => ({ ...previous, description: e.target.value }))} /> : <input id={`place-${field}`} type="text" required={field === "name"} maxLength={limits[field]} value={form[field]} onChange={e => setForm(previous => ({ ...previous, [field]: e.target.value }))} />}
        </div>)}
        {error && <p role="alert" className="text-danger">{error}</p>}<div className="admin-modal-actions"><button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Hủy</button><button type="submit" className="btn btn-primary">{busy ? "Đang lưu…" : "Lưu thông tin"}</button></div>
      </fieldset></form>
    </Modal>}
    {detail && <Modal title={detail.name} onClose={()=>setDetail(null)}>
      <ImageWithFallback src={region?placeForm(detail).imageUrl:placeForm(detail).logoUrl} alt={detail.name} style={{width:120,height:100,objectFit:"cover"}}/><div style={{ display: "grid", gap: "10px", fontSize: "12px", overflowWrap: "anywhere" }}><div><strong>ID:</strong> {placeId(detail)}</div>{placeFields(kind).map(field => <div key={field}><strong>{labels[field]}:</strong> {placeForm(detail)[field] || "—"}</div>)}<div><strong>Ngày tạo:</strong> {detail.createdAt}</div><div><strong>Cập nhật:</strong> {detail.updatedAt}</div></div><div className="admin-modal-actions"><button className="btn btn-primary" onClick={() => setDetail(null)}>Đóng</button></div>
    </Modal>}
  </div>;
}
