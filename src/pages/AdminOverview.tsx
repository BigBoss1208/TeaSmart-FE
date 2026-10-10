import { useEffect, useState } from "react";
import { api, errorMessage } from "../lib/commerce";
import { defaultRange, chartHeight, type DashboardData } from "../lib/adminData";
import { money } from "../components/ProductCard";
import "./AdminData.css";
const labels: Record<string,string> = { PENDING: "Chờ xử lý", CONFIRMED: "Đã xác nhận", SHIPPING: "Đang giao", DELIVERED: "Đã giao", CANCELLED: "Đã hủy" };
export default function AdminOverview() {
  const [range, setRange] = useState(defaultRange); const [draft, setDraft] = useState(range);
  const [data, setData] = useState<DashboardData | null>(null); const [error, setError] = useState("");
  const [loading, setLoading] = useState(true); const [revision, setRevision] = useState(0);
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setError(""); setData(null);
    void api<DashboardData>(`/admin/dashboard?${new URLSearchParams(range)}`, { signal: abort.signal })
      .then(result => { if (!abort.signal.aborted) setData(result); })
      .catch(e => { if (!abort.signal.aborted) setError(errorMessage(e)); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [range, revision]);
  const max = Math.max(0, ...(data?.revenueByDay.map(d => d.revenue) ?? []));
  return <div className="admin-view-content admin-data">
    <form className="admin-data-filters" onSubmit={e => { e.preventDefault(); setRange({ ...draft }); }}>
      <label>Từ ngày<input type="date" required value={draft.from} onChange={e => setDraft({ ...draft, from: e.target.value })} /></label>
      <label>Đến ngày<input type="date" required value={draft.to} onChange={e => setDraft({ ...draft, to: e.target.value })} /></label>
      <button className="btn btn-primary" disabled={loading}>Xem thống kê</button>
      <button type="button" className="btn btn-outline" disabled={loading} onClick={() => setRevision(n => n + 1)}>Làm mới</button>
    </form>
    <p>Doanh thu theo ngày thanh toán PAID · Asia/Ho_Chi_Minh · Tối đa 366 ngày.</p>
    {loading && <p role="status">Đang tải thống kê…</p>}
    {error && <div role="alert"><p>{error}</p><button onClick={() => setRevision(n => n + 1)}>Thử lại</button></div>}
    {data && <>
      <div className="kpis">
        <div><span>Doanh thu đã thanh toán</span><strong>{money(data.revenue)}</strong><small>{data.paidPayments} khoản PAID trong kỳ</small></div>
        <div><span>Đơn hàng trong kỳ</span><strong>{data.ordersCount}</strong><small>Theo ngày tạo đơn</small></div>
        <div><span>Sản phẩm</span><strong>{data.productsCount}</strong><small>Tất cả trạng thái</small></div>
        <div><span>Khách hàng</span><strong>{data.customersCount}</strong><small>Tài khoản CUSTOMER, gồm tài khoản khóa</small></div>
      </div>
      <section className="chart-card"><h2>Doanh thu {data.from} — {data.to}</h2>
        {data.paidPayments === 0 && <p>Chưa có thanh toán PAID trong khoảng ngày này.</p>}
        <svg className="admin-revenue-chart" viewBox="0 0 720 200" role="img" aria-label="Biểu đồ doanh thu thực tế theo ngày">
          <line x1="0" y1="170" x2="720" y2="170" stroke="currentColor" />
          {data.revenueByDay.map((day, i) => {
            const width = 720 / data.revenueByDay.length; const height = chartHeight(day.revenue, max);
            return <g key={day.date}><title>{day.date}: {money(day.revenue)} · {day.paymentsCount} thanh toán</title>
              <rect x={i * width + width * .1} y={170 - height} width={width * .8} height={height} fill="var(--forest)" /></g>;
          })}
          <text x="0" y="192" fontSize="11">{data.from}</text><text x="720" y="192" textAnchor="end" fontSize="11">{data.to}</text>
        </svg>
        <details><summary>Xem số liệu biểu đồ</summary><div className="admin-data-scroll"><table><thead><tr><th>Ngày</th><th>Doanh thu</th><th>Thanh toán PAID</th></tr></thead>
          <tbody>{data.revenueByDay.map(day => <tr key={day.date}><td>{day.date}</td><td>{money(day.revenue)}</td><td>{day.paymentsCount}</td></tr>)}</tbody></table></div></details>
      </section>
      <section className="chart-card"><h2>Đơn hàng theo trạng thái trong kỳ</h2><div className="admin-status-grid">
        {Object.entries(data.ordersByStatus).map(([status, count]) => <div key={status}><span>{labels[status] ?? status}</span><strong>{count}</strong></div>)}
      </div>{data.ordersCount === 0 && <p>Chưa có đơn hàng trong khoảng ngày này.</p>}</section>
    </>}
  </div>;
}
