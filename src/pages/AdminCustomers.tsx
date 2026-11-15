import AdminPagination from "../components/AdminPagination";
import "./AdminCatalog.css";
import "./AdminOperations.css";
import Modal from "../components/Modal";
import { useEffect, useRef, useState } from "react";
import { api, errorMessage, type ApiPage } from "../lib/commerce";
import { customerQuery, type CustomerData } from "../lib/adminData";
import { money } from "../components/ProductCard";
import "./AdminData.css";
const statusText = (status: string) => status === "ACTIVE" ? "Hoạt động" : status === "INACTIVE" ? "Đã khóa" : status;
export default function AdminCustomers() {
  const [keyword, setKeyword] = useState(""); const [status, setStatus] = useState("");
  const [query, setQuery] = useState({ keyword: "", status: "", page: 0 });
  const [data, setData] = useState<ApiPage<CustomerData> | null>(null); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); const [detailError, setDetailError] = useState(""); const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<CustomerData | null>(null); const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false); const [revision, setRevision] = useState(0); const inFlight = useRef(false); const detailAbort = useRef<AbortController | null>(null);
  const [totalCustomers,setTotalCustomers]=useState<number|null>(null),[notice,setNotice]=useState("");
  useEffect(()=>{const a=new AbortController();setTotalCustomers(null);void api<ApiPage<CustomerData>>("/admin/customers?page=0&size=1",{signal:a.signal}).then(r=>{if(!a.signal.aborted)setTotalCustomers(r.totalElements)}).catch(()=>{});return()=>a.abort()},[revision]);
  useEffect(() => () => detailAbort.current?.abort(), []);
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setError(""); setData(null);
    void api<ApiPage<CustomerData>>(customerQuery(query.keyword, query.status, query.page), { signal: abort.signal })
      .then(result => { if (!abort.signal.aborted) setData(result); })
      .catch(e => { if (!abort.signal.aborted) setError(errorMessage(e)); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [query, revision]);
  async function open(id: number) {
    if (inFlight.current) return;
    detailAbort.current?.abort(); const abort = new AbortController(); detailAbort.current = abort;
    setDetail(null); setConfirm(false); setDetailError(""); setDetailLoading(true);
    try { const result = await api<CustomerData>(`/admin/customers/${id}`, { signal: abort.signal }); if (!abort.signal.aborted) setDetail(result); }
    catch (e) { if (!abort.signal.aborted) setDetailError(errorMessage(e)); } finally { if (!abort.signal.aborted) setDetailLoading(false); }
  }
  async function changeStatus() {
    if (!detail || inFlight.current) return; inFlight.current = true; setBusy(true); setDetailError("");
    try {
      setDetail(await api<CustomerData>(`/admin/customers/${detail.userId}/status`, { method: "PATCH", body: JSON.stringify({ status: detail.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }) }));
      setConfirm(false); setNotice("Đã cập nhật trạng thái tài khoản."); setQuery(q => ({ ...q, page: 0 })); setRevision(n => n + 1);
    } catch (e) { setDetailError(errorMessage(e)); } finally { inFlight.current = false; setBusy(false); }
  }
  return <div className="admin-table admin-data admin-operations"><h2>Quản lý khách hàng</h2><p>Tra cứu thông tin và trạng thái tài khoản Customer.</p><div className="kpis"><div><span>Tổng khách hàng</span><strong>{totalCustomers??"—"}</strong><small>Tất cả trạng thái tài khoản CUSTOMER</small></div></div>{notice&&<p role="status">{notice}</p>}
    <form className="admin-data-filters admin-customer-toolbar" onSubmit={e => { e.preventDefault(); setQuery({ keyword:keyword.trim().replace(/\s+/g," "), status, page: 0 }); }}>
      <label className="admin-customer-search">Tìm khách hàng<span className="admin-search-field"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg><input maxLength={200} placeholder="Tên, email hoặc số điện thoại" value={keyword} onChange={e => setKeyword(e.target.value)} /></span></label>
      <label>Trạng thái<select value={status} onChange={e => setStatus(e.target.value)}><option value="">Tất cả</option><option value="ACTIVE">Hoạt động</option><option value="INACTIVE">Đã khóa</option></select></label>
      <button className="btn btn-primary" disabled={loading}>Tìm kiếm</button>
      <button type="button" className="btn btn-outline" disabled={loading} onClick={() => setRevision(n => n + 1)}><span aria-hidden="true">↻</span> Làm mới</button>
    </form>
    {loading && <p role="status">Đang tải khách hàng…</p>}{error && <div role="alert"><p>{error}</p><button onClick={() => setRevision(n => n + 1)}>Thử lại</button></div>}
    {data && <><p>{data.totalElements} khách hàng</p><div className="admin-data-scroll"><table><thead><tr><th>Họ tên</th><th>Email</th><th>Điện thoại</th><th>Ngày đăng ký</th><th>Đơn hàng</th><th>Đã thanh toán</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
      <tbody>{data.content.map(c => <tr key={c.userId}><td><div className="operations-customer"><span className="operations-avatar" aria-hidden="true">{c.fullName.trim().slice(0,1).toUpperCase()||"•"}</span><strong>{c.fullName}</strong></div></td><td>{c.email}</td><td>{c.phone ?? "—"}</td><td>{c.createdAt.replace("T"," ")}</td><td>{c.ordersCount}</td><td>{money(c.totalSpent)}</td><td><span className={`admin-badge ${c.status==="ACTIVE"?"badge-success":"badge-danger"}`}>{statusText(c.status)}</span></td>
        <td><button className="admin-action-btn" onClick={() => void open(c.userId)}>Chi tiết</button></td></tr>)}</tbody></table></div>
      {!data.content.length && <p>Không có khách hàng phù hợp.</p>}
      <AdminPagination page={data.page} total={data.totalElements} onChange={page=>setQuery(q=>({...q,page}))} disabled={loading||busy} label="khách hàng" />
    </>}
    {(detail || detailLoading || detailError) && <Modal title="Chi tiết khách hàng" onClose={()=>{if(!busy){detailAbort.current?.abort();setDetail(null);setDetailLoading(false);setDetailError("");setConfirm(false)}}}>
      <button disabled={busy} onClick={() => { detailAbort.current?.abort(); setDetailLoading(false); setDetail(null); setDetailError(""); setConfirm(false); }}>Đóng chi tiết</button>
      {detailLoading && <p role="status">Đang tải chi tiết…</p>}{detailError && <p role="alert">{detailError}</p>}
      {detail && <><h3>{detail.fullName}</h3><dl><dt>ID</dt><dd>{detail.userId}</dd><dt>Email</dt><dd>{detail.email}</dd><dt>Điện thoại</dt><dd>{detail.phone ?? "—"}</dd>
        <dt>Trạng thái</dt><dd>{statusText(detail.status)}</dd><dt>Ngày đăng ký</dt><dd>{detail.createdAt}</dd><dt>Cập nhật</dt><dd>{detail.updatedAt}</dd>
        <dt>Đơn hàng</dt><dd>{detail.ordersCount}</dd><dt>Đã thanh toán PAID</dt><dd>{money(detail.totalSpent)}</dd></dl>
        {(["ACTIVE", "INACTIVE"].includes(detail.status)) && <button className="btn btn-outline" disabled={busy} onClick={() => setConfirm(true)}>{detail.status === "ACTIVE" ? "Khóa tài khoản" : "Mở khóa tài khoản"}</button>}
        {confirm && <div><p>{detail.status === "ACTIVE" ? "Khóa sẽ ngăn đăng nhập và sử dụng JWT. Dữ liệu đơn hàng được giữ nguyên." : "Cho phép khách hàng đăng nhập lại?"}</p>
          <button disabled={busy} onClick={() => void changeStatus()}>{busy ? "Đang cập nhật…" : "Xác nhận thay đổi"}</button> <button disabled={busy} onClick={() => setConfirm(false)}>Hủy</button></div>}
      </>}
    </Modal>}
  </div>;
}
