import { useEffect, useState } from "react";
import { api, errorMessage } from "../lib/commerce";
import "./SellerOrders.css";

type Row = {
  orderId: number;
  orderCode: string;
  recipientName: string;
  createdAt: string;
  totalAmount: number;
  orderStatus: string;
  paymentMethod: string | null;
  paymentStatus: string | null;
  itemCount: number;
};
type Item = { productId: number; productName: string; imageUrl: string | null; unitPrice: number; quantity: number; subtotal: number };
type Detail = Omit<Row, "itemCount"> & {
  recipientPhone: string;
  shippingAddress: string;
  note: string | null;
  subtotal: number;
  shippingFee: number;
  items: Item[];
};
type Page = { content: Row[]; totalElements: number; totalPages: number; page: number; size: number };
const money = (value: number) => `${Number(value ?? 0).toLocaleString("vi-VN")}đ`;
const labels: Record<string, string> = {
  PENDING: "Chờ xác nhận", CONFIRMED: "Đã xác nhận", SHIPPING: "Đang giao", DELIVERED: "Đã giao", CANCELLED: "Đã hủy",
};
const nextStatus: Record<string, string> = { PENDING: "CONFIRMED", CONFIRMED: "SHIPPING", SHIPPING: "DELIVERED" };

export default function SellerOrders() {
  const [rows, setRows] = useState<Row[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load(signal?: AbortSignal) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: q.trim(), status, page: String(page), size: "12" });
      const result = await api<Page>(`/seller/orders?${params}`, { signal });
      setRows(result.content);
      setPages(result.totalPages);
      setTotal(result.totalElements);
      setError("");
    } catch (e) {
      if (!signal?.aborted) setError(errorMessage(e));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [q, status, page]);

  async function openOrder(id: number) {
    setError("");
    try { setDetail(await api<Detail>(`/seller/orders/${id}`)); }
    catch (e) { setError(errorMessage(e)); }
  }
  async function advance() {
    if (!detail) return;
    const next = nextStatus[detail.orderStatus];
    if (!next || !window.confirm(`Chuyển đơn ${detail.orderCode} sang “${labels[next]}”?`)) return;
    setBusy(true);
    setError("");
    try {
      setDetail(await api<Detail>(`/seller/orders/${detail.orderId}/status`, {
        method: "PATCH", body: JSON.stringify({ status: next }),
      }));
      await load();
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  return <main className="seller-orders">
    <div className="seller-orders-heading">
      <div><p className="seller-orders-eyebrow">VẬN HÀNH GIAN HÀNG</p><h2>Đơn hàng</h2><p>Theo dõi và cập nhật các đơn thuộc gian hàng của bạn.</p></div>
      <span className="seller-orders-count">{total} đơn</span>
    </div>
    {error && <p role="alert" className="seller-orders-error">{error}</p>}
    {detail ? <section className="seller-orders-detail" aria-label="Chi tiết đơn hàng">
      <button className="seller-orders-back" onClick={() => setDetail(null)}>← Danh sách đơn</button>
      <div className="seller-orders-detail-head">
        <div><span className="seller-orders-eyebrow">MÃ ĐƠN</span><h3>{detail.orderCode}</h3><p>Đặt ngày {new Date(detail.createdAt).toLocaleString("vi-VN")}</p></div>
        <span className={`seller-orders-badge status-${detail.orderStatus.toLowerCase()}`}>{labels[detail.orderStatus] ?? detail.orderStatus}</span>
      </div>
      <div className="seller-orders-detail-grid">
        <section className="seller-orders-block"><h4>Sản phẩm</h4>
          <div className="seller-orders-items">{detail.items.map((item, index) => <article className="seller-orders-item" key={`${item.productId}-${index}`}>
            {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span className="seller-orders-image-placeholder" aria-hidden="true">🍃</span>}
            <div className="seller-orders-item-name"><strong>{item.productName}</strong><span>{money(item.unitPrice)} × {item.quantity}</span></div>
            <strong>{money(item.subtotal)}</strong>
          </article>)}</div>
          <dl className="seller-orders-totals"><div><dt>Tạm tính</dt><dd>{money(detail.subtotal)}</dd></div><div><dt>Phí vận chuyển</dt><dd>{money(detail.shippingFee)}</dd></div><div className="grand"><dt>Tổng thanh toán</dt><dd>{money(detail.totalAmount)}</dd></div></dl>
        </section>
        <div className="seller-orders-side">
          <section className="seller-orders-block"><h4>Thông tin giao hàng</h4><p><b>{detail.recipientName}</b><br />{detail.recipientPhone}</p><p>{detail.shippingAddress}</p>{detail.note && <p>Ghi chú: {detail.note}</p>}</section>
          <section className="seller-orders-block"><h4>Thanh toán</h4><p>Phương thức <b>{detail.paymentMethod ?? "—"}</b></p><p>Trạng thái <b>{detail.paymentStatus ?? "Chưa có thông tin"}</b></p><small>Trạng thái giao hàng không làm thay đổi trạng thái thanh toán.</small></section>
        </div>
      </div>
      {nextStatus[detail.orderStatus] && <button className="seller-orders-primary" disabled={busy} onClick={() => void advance()}>{busy ? "Đang cập nhật…" : `Chuyển sang ${labels[nextStatus[detail.orderStatus]]}`}</button>}
    </section> : <>
      <div className="seller-orders-filters">
        <label>Tìm mã đơn<input aria-label="Tìm mã đơn" value={q} maxLength={100} onChange={e => { setPage(0); setQ(e.target.value); }} placeholder="Nhập mã đơn hàng" /></label>
        <label>Trạng thái<select aria-label="Lọc trạng thái" value={status} onChange={e => { setPage(0); setStatus(e.target.value); }}><option value="">Tất cả trạng thái</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      {loading ? <p className="seller-orders-empty" role="status">Đang tải đơn hàng…</p> : rows.length === 0 ? <p className="seller-orders-empty">Chưa có đơn hàng phù hợp.</p> : <div className="seller-orders-table-wrap"><table className="seller-orders-table">
        <thead><tr><th>Mã đơn</th><th>Người nhận</th><th>Trạng thái</th><th>Thanh toán</th><th>Tổng tiền</th><th>Ngày đặt</th><th></th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.orderId}>
          <td data-label="Mã đơn"><strong>{row.orderCode}</strong><small>{row.itemCount} sản phẩm</small></td>
          <td data-label="Người nhận">{row.recipientName}</td>
          <td data-label="Trạng thái"><span className={`seller-orders-badge status-${row.orderStatus.toLowerCase()}`}>{labels[row.orderStatus] ?? row.orderStatus}</span></td>
          <td data-label="Thanh toán"><span>{row.paymentMethod ?? "—"}</span><small>{row.paymentStatus ?? "—"}</small></td>
          <td data-label="Tổng tiền"><strong>{money(row.totalAmount)}</strong></td>
          <td data-label="Ngày đặt">{new Date(row.createdAt).toLocaleDateString("vi-VN")}</td>
          <td data-label="Thao tác"><button className="seller-orders-link" onClick={() => void openOrder(row.orderId)}>Xem chi tiết</button></td>
        </tr>)}</tbody>
      </table></div>}
      <div className="seller-orders-pagination"><span>Trang {pages ? page + 1 : 0} / {pages}</span><div><button disabled={page === 0 || loading} onClick={() => setPage(n => n - 1)}>Trước</button><button disabled={page + 1 >= pages || loading} onClick={() => setPage(n => n + 1)}>Sau</button></div></div>
    </>}
  </main>;
}
