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
      setConfirm(false); setQuery(q => ({ ...q, page: 0 })); setRevision(n => n + 1);
    } catch (e) { setDetailError(errorMessage(e)); } finally { inFlight.current = false; setBusy(false); }
  }
  return <div className="admin-table admin-data"><h2>Quản lý khách hàng</h2>
    <form className="admin-data-filters" onSubmit={e => { e.preventDefault(); setQuery({ keyword, status, page: 0 }); }}>
      <label>Tìm khách hàng<input maxLength={200} placeholder="Tên, email hoặc số điện thoại" value={keyword} onChange={e => setKeyword(e.target.value)} /></label>
      <label>Trạng thái<select value={status} onChange={e => setStatus(e.target.value)}><option value="">Tất cả</option><option value="ACTIVE">Hoạt động</option><option value="INACTIVE">Đã khóa</option></select></label>
      <button className="btn btn-primary" disabled={loading}>Tìm kiếm</button>
      <button type="button" disabled={loading} onClick={() => setRevision(n => n + 1)}>Làm mới</button>
    </form>
    {loading && <p role="status">Đang tải khách hàng…</p>}{error && <div role="alert"><p>{error}</p><button onClick={() => setRevision(n => n + 1)}>Thử lại</button></div>}
    {data && <><p>{data.totalElements} khách hàng</p><div className="admin-data-scroll"><table><thead><tr><th>Họ tên</th><th>Email</th><th>Điện thoại</th><th>Đơn hàng</th><th>Đã thanh toán</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
      <tbody>{data.content.map(c => <tr key={c.userId}><td>{c.fullName}</td><td>{c.email}</td><td>{c.phone ?? "—"}</td><td>{c.ordersCount}</td><td>{money(c.totalSpent)}</td><td>{statusText(c.status)}</td>
        <td><button className="admin-action-btn" onClick={() => void open(c.userId)}>Chi tiết</button></td></tr>)}</tbody></table></div>
      {!data.content.length && <p>Không có khách hàng phù hợp.</p>}
      <div className="admin-data-pagination"><button disabled={query.page === 0 || loading} onClick={() => setQuery(q => ({ ...q, page: q.page - 1 }))}>Trước</button>
        <span>Trang {data.page + 1} / {Math.max(1, data.totalPages)}</span><button disabled={query.page + 1 >= data.totalPages || loading} onClick={() => setQuery(q => ({ ...q, page: q.page + 1 }))}>Sau</button></div>
    </>}
    {(detail || detailLoading || detailError) && <section className="chart-card admin-customer-detail" aria-label="Chi tiết khách hàng">
      <button disabled={busy} onClick={() => { detailAbort.current?.abort(); setDetailLoading(false); setDetail(null); setDetailError(""); setConfirm(false); }}>Đóng chi tiết</button>
      {detailLoading && <p role="status">Đang tải chi tiết…</p>}{detailError && <p role="alert">{detailError}</p>}
      {detail && <><h3>{detail.fullName}</h3><dl><dt>ID</dt><dd>{detail.userId}</dd><dt>Email</dt><dd>{detail.email}</dd><dt>Điện thoại</dt><dd>{detail.phone ?? "—"}</dd>
        <dt>Trạng thái</dt><dd>{statusText(detail.status)}</dd><dt>Ngày đăng ký</dt><dd>{detail.createdAt}</dd><dt>Cập nhật</dt><dd>{detail.updatedAt}</dd>
        <dt>Đơn hàng</dt><dd>{detail.ordersCount}</dd><dt>Đã thanh toán PAID</dt><dd>{money(detail.totalSpent)}</dd></dl>
        {(["ACTIVE", "INACTIVE"].includes(detail.status)) && <button className="btn btn-outline" disabled={busy} onClick={() => setConfirm(true)}>{detail.status === "ACTIVE" ? "Khóa tài khoản" : "Mở khóa tài khoản"}</button>}
        {confirm && <div><p>{detail.status === "ACTIVE" ? "Khóa sẽ ngăn đăng nhập và sử dụng JWT. Dữ liệu đơn hàng được giữ nguyên." : "Cho phép khách hàng đăng nhập lại?"}</p>
          <button disabled={busy} onClick={() => void changeStatus()}>{busy ? "Đang cập nhật…" : "Xác nhận thay đổi"}</button> <button disabled={busy} onClick={() => setConfirm(false)}>Hủy</button></div>}
      </>}
    </section>}
  </div>;
}
