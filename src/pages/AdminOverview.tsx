import AdminRevenueChart from "../components/AdminRevenueChart";
import { useEffect, useState } from "react";
import { api, errorMessage, type ApiPage, orderLabels } from "../lib/commerce";
import { defaultRange, type DashboardData, type SellerDashboardData } from "../lib/adminData";
import { money } from "../components/ProductCard";
import "./AdminData.css";
import "./AdminDashboard.css";
import {dateRangeError,validateDashboard,latestOrders} from "../lib/dashboardView";
import {exportDashboard} from "../lib/dashboardExport";
const labels: Record<string,string> = { PENDING: "Chờ xử lý", CONFIRMED: "Đã xác nhận", SHIPPING: "Đang giao", DELIVERED: "Đã giao", CANCELLED: "Đã hủy" };
export default function AdminOverview({statistics=false,seller=false,onOrders}:{statistics?:boolean;seller?:boolean;onOrders?:()=>void}) {
  const [range, setRange] = useState(defaultRange); const [draft, setDraft] = useState(range);
  const [data, setData] = useState<DashboardData | null>(null); const [error, setError] = useState("");
  const sellerData=seller?data as SellerDashboardData|null:null;
  const [loading, setLoading] = useState(true); const [revision, setRevision] = useState(0);
  const [exporting,setExporting]=useState(false),[exportError,setExportError]=useState(""),[validation,setValidation]=useState("");
  type Recent={orderId:number;orderCode:string;customerName:string;recipientName?:string;createdAt:string;totalAmount:number;orderStatus:string};
  const [recent,setRecent]=useState<Recent[]>([]),[recentLoading,setRecentLoading]=useState(false),[recentError,setRecentError]=useState("");
  useEffect(()=>{if(statistics)return;const a=new AbortController();setRecentLoading(true);setRecentError("");void(async()=>{const endpoint=seller?"/seller/orders":"/admin/orders";const first=await api<ApiPage<Recent>>(endpoint+"?size=50",{signal:a.signal});const rows=[...first.content];for(let page=1;page<first.totalPages;page++)rows.push(...(await api<ApiPage<Recent>>(`${endpoint}?size=50&page=${page}`,{signal:a.signal})).content);if(!a.signal.aborted)setRecent(latestOrders(rows.map(row=>({...row,customerName:seller?row.recipientName ?? "Khách hàng":row.customerName}))))})().catch(e=>{if(!a.signal.aborted)setRecentError(errorMessage(e))}).finally(()=>{if(!a.signal.aborted)setRecentLoading(false)});return()=>a.abort()},[statistics,revision,seller]);
  async function download(kind:"xlsx"|"pdf"){if(!data||exporting||draft.from!==data.from||draft.to!==data.to)return;setExporting(true);setExportError("");try{await exportDashboard(kind,data,sellerData??undefined)}catch{setExportError("Chưa thể xuất tệp. Vui lòng thử lại.")}finally{setExporting(false)}}
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setError(""); setData(null);
    void api<DashboardData>(`${seller?"/seller/statistics":"/admin/dashboard"}?${new URLSearchParams(range)}`, { signal: abort.signal })
      .then(result => { if (abort.signal.aborted)return;validateDashboard(result,range);if(seller){const d=result as SellerDashboardData;if(!Number.isSafeInteger(d.shopId)||d.shopId<1||!d.shopName||![d.totalOrderValue,d.unpaidOrderValue,d.itemsSold].every(n=>Number.isFinite(n)&&n>=0)||!Array.isArray(d.topProducts)||!d.topProducts.every(p=>p&&Number.isSafeInteger(p.productId)&&p.productId>0&&typeof p.name==="string"&&[p.quantity,p.orderValue].every(n=>Number.isFinite(n)&&n>=0)))throw new Error("Dữ liệu gian hàng không hợp lệ.");}setData(result); })
      .catch(e => { if (!abort.signal.aborted) setError(errorMessage(e)); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [range, revision,seller]);

  return <div className={`admin-view-content admin-data admin-dashboard ${statistics?"is-statistics":"is-overview"}`}>
    {seller&&<><h2>{statistics ? "Thống kê & Báo cáo" : "Tổng quan kinh doanh"}</h2>{sellerData&&<p>Gian hàng: <strong>{sellerData.shopName}</strong></p>}</>}
    <form className="admin-data-filters" onSubmit={e => { e.preventDefault(); const message=dateRangeError(draft.from,draft.to);setValidation(message);if(!message)setRange({ ...draft }); }}>
      <label>Từ ngày<input type="date" required max={draft.to||undefined} value={draft.from} onChange={e => setDraft({ ...draft, from: e.target.value })} /></label>
      <label>Đến ngày<input type="date" required min={draft.from||undefined} value={draft.to} onChange={e => setDraft({ ...draft, to: e.target.value })} /></label>
      <button className="btn btn-primary" disabled={loading}>Áp dụng</button>
      <button type="button" className="btn btn-outline" disabled={loading} onClick={() => setRevision(n => n + 1)}>Làm mới</button>
    </form>
    {validation&&<p role="alert">{validation}</p>}<p className="dashboard-period">Đang áp dụng: {range.from} — {range.to}</p>
    <p>Doanh thu theo ngày thanh toán PAID · Asia/Ho_Chi_Minh · Tối đa 366 ngày.</p>
    {statistics&&<div className="admin-data-filters dashboard-exports"><button className="btn btn-outline" disabled={!data||loading||exporting||draft.from!==range.from||draft.to!==range.to} onClick={()=>void download("xlsx")}>Xuất Excel .xlsx</button><button className="btn btn-outline" disabled={!data||loading||exporting||draft.from!==range.from||draft.to!==range.to} onClick={()=>void download("pdf")}>Xuất PDF .pdf</button></div>}{exportError&&<p role="alert">{exportError}</p>}
    {(draft.from!==range.from||draft.to!==range.to)&&<p>Chọn Áp dụng để áp dụng khoảng ngày trước khi xuất.</p>}
    {loading && <p role="status">Đang tải thống kê…</p>}
    {error && <div role="alert"><p>{error}</p><button onClick={() => setRevision(n => n + 1)}>Thử lại</button></div>}
    {data && <>
      <div className="kpis">
        <div><span>Doanh thu đã thanh toán</span><strong>{money(data.revenue)}</strong><small>{data.paidPayments} khoản PAID trong kỳ</small></div>
        <div><span>Đơn hàng trong kỳ</span><strong>{data.ordersCount}</strong><small>Theo ngày tạo đơn</small></div>
        <div><span>Sản phẩm</span><strong>{data.productsCount}</strong><small>Tất cả trạng thái</small></div>
        <div><span>{seller?"Khách mua trong kỳ":"Khách hàng"}</span><strong>{data.customersCount}</strong><small>{seller?"Số khách khác nhau đặt đơn trong kỳ":"Tài khoản CUSTOMER, gồm tài khoản khóa"}</small></div>
      </div>
      {sellerData&&<><div className="kpis"><div><span>Tổng giá trị đơn</span><strong>{money(sellerData.totalOrderValue)}</strong><small>Đơn tạo trong kỳ, trừ đơn hủy</small></div><div><span>Giá trị chưa thanh toán</span><strong>{money(sellerData.unpaidOrderValue)}</strong><small>Đơn chưa PAID, trừ đơn hủy; gồm COD PENDING</small></div><div><span>Đơn chờ xử lý</span><strong>{data.ordersByStatus.PENDING??0}</strong></div><div><span>Sản phẩm đã giao</span><strong>{sellerData.itemsSold}</strong><small>Số lượng trong đơn DELIVERED tạo trong kỳ</small></div></div><section className="chart-card"><h2>Sản phẩm bán chạy</h2><p>Theo số lượng trong đơn đã giao, xét ngày tạo đơn. Giá trị sản phẩm không đồng nghĩa tiền đã thu.</p>{sellerData.topProducts.length?<div className="admin-data-scroll"><table><thead><tr><th>Sản phẩm trong đơn</th><th>Đã giao</th><th>Giá trị sản phẩm</th></tr></thead><tbody>{sellerData.topProducts.map(p=><tr key={p.productId}><td>{p.name}</td><td>{p.quantity}</td><td>{money(p.orderValue)}</td></tr>)}</tbody></table></div>:<p>Chưa có sản phẩm trong đơn đã giao của kỳ này.</p>}</section></>}
      <div className="dashboard-charts"><section className="chart-card"><h2>Doanh thu {data.from} — {data.to}</h2>
        {data.paidPayments === 0 && <p>Chưa có thanh toán PAID trong khoảng ngày này.</p>}
        <AdminRevenueChart days={data.revenueByDay} />
        <details open={statistics}><summary>Xem số liệu biểu đồ</summary><div className="admin-data-scroll"><table><thead><tr><th>Ngày</th><th>Doanh thu</th><th>Thanh toán PAID</th></tr></thead>
          <tbody>{data.revenueByDay.map(day => <tr key={day.date}><td>{day.date}</td><td>{money(day.revenue)}</td><td>{day.paymentsCount}</td></tr>)}</tbody></table></div></details>
      </section>
      <section className="chart-card"><h2>Đơn hàng theo trạng thái trong kỳ</h2><div className="admin-status-grid">
        {Object.entries(data.ordersByStatus).map(([status, count]) => <div key={status}><span>{labels[status] ?? status}</span><strong>{count}</strong></div>)}
      </div>{data.ordersCount === 0 && <p>Chưa có đơn hàng trong khoảng ngày này.</p>}
      {data.ordersCount>0&&<div className="dashboard-status-bars">{Object.entries(data.ordersByStatus).map(([status,count])=><div key={status}><span>{labels[status]??status}</span><meter min={0} max={data.ordersCount} value={count} aria-label={`${labels[status]??status}: ${count}`}/><strong>{count}</strong></div>)}</div>}</section></div>
    </>}
    {!statistics&&<section className="chart-card dashboard-recent"><div><h2>Đơn hàng gần đây</h2>{seller?<button type="button" onClick={onOrders}>Xem tất cả đơn hàng</button>:<a href="/admin/orders">Xem tất cả</a>}</div><p>Các đơn mới nhất {seller?"của gian hàng":"toàn hệ thống"}, không giới hạn theo bộ lọc thống kê.</p>{recentLoading&&<p role="status">Đang tải đơn gần đây…</p>}{recentError&&<p role="alert">{recentError}</p>}{!recentLoading&&!recentError&&(recent.length?<div className="admin-data-scroll"><table><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày đặt</th><th>Tổng tiền</th><th>Trạng thái</th></tr></thead><tbody>{recent.map(o=><tr key={o.orderId}><td title={o.orderCode}>{o.orderCode.length>22?o.orderCode.slice(0,12)+"…"+o.orderCode.slice(-5):o.orderCode}</td><td>{o.customerName}</td><td>{o.createdAt.replace("T"," ")}</td><td>{money(o.totalAmount)}</td><td>{orderLabels[o.orderStatus]??o.orderStatus}</td></tr>)}</tbody></table></div>:<p>Chưa có đơn hàng.</p>)}</section>}
    {!statistics&&!seller&&<p className="dashboard-limitations">Top bán chạy chưa có API doanh số. Cảnh báo tồn kho thấp chờ thống nhất ngưỡng nghiệp vụ. Không hiển thị số liệu ước đoán.</p>}
  </div>;
}
