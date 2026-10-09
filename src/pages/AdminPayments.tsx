import { useEffect, useState } from "react";
import { api, errorMessage, type ApiOrder, type ApiPage, type PaymentStatus } from "../lib/commerce";
import { money } from "../components/ProductCard";

export default function AdminPayments() {
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(0);
  const [orders, setOrders] = useState<(ApiOrder & { payment?: PaymentStatus })[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const result = await api<ApiPage<{ orderId: number }>>(`/admin/orders?page=${page}&size=12`);
        const details = await Promise.all(result.content.map(async o => ({
          ...await api<ApiOrder>(`/admin/orders/${o.orderId}`),
          payment: await api<PaymentStatus>(`/admin/orders/${o.orderId}/payment`),
        })));
        if (live) { setOrders(details); setPages(result.totalPages); setError(""); }
      } catch (e) { if (live) { setError(errorMessage(e)); setOrders([]); } }
    })(); return () => { live = false; };
  }, [page, revision]);
  async function action(o: ApiOrder, operation: "confirm" | "reconcile" | string) {
    if (busy !== null) return;
    setBusy(o.orderId); setError("");
    try {
      if (operation === "confirm") await api(`/admin/orders/${o.orderId}/payment/confirm-cod`, { method: "PATCH" });
      else if (operation === "reconcile") await api(`/admin/orders/${o.orderId}/payment/reconcile`, { method: "POST" });
      else await api(`/admin/orders/${o.orderId}/status`, { method: "PATCH", body: JSON.stringify({ status: operation }) });
      setRevision(n => n + 1);
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(null); }
  }
  return <div className="admin-table"><div className="admin-table-title"><strong>Đơn hàng & thanh toán</strong></div>
    {error && <p role="alert">{error}</p>}
    {orders.map(o => {
      const next = ({ PENDING: "CONFIRMED", CONFIRMED: "SHIPPING", SHIPPING: "DELIVERED" } as Record<string, string>)[o.orderStatus];
      const processable = !o.payment?.reconciliationRequired && (o.paymentMethod === "COD" && o.paymentStatus === "PENDING"
        || o.paymentMethod === "ONLINE" && o.paymentStatus === "PAID");
      return <div className="admin-tr" key={o.orderId} style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <strong>{o.orderCode}</strong><span>{o.recipientName}</span><span>{money(o.totalAmount)}</span>
        <span>{o.orderStatus} · {o.paymentMethod} · {o.paymentStatus}</span>
        {o.payment?.paidAt && <small>Đã thu: {o.payment.paidAt} (giờ Việt Nam)</small>}
        {o.payment?.reconciliationRequired && <span>Cần đối soát</span>}
        {next && processable && <button className="admin-action-btn" disabled={busy !== null} onClick={() => void action(o, next)}>Chuyển {next}</button>}
        {o.orderStatus === "DELIVERED" && o.paymentMethod === "COD" && o.paymentStatus === "PENDING" && <button
          className="admin-action-btn" disabled={busy !== null} onClick={() => {
            if (window.confirm(`Xác nhận đã thu ${money(o.totalAmount)} cho ${o.orderCode}?`)) void action(o, "confirm");
          }}>Xác nhận đã thu COD</button>}
        {o.paymentMethod === "ONLINE" && o.paymentStatus === "PENDING" && <button className="admin-action-btn"
          disabled={busy !== null} onClick={() => void action(o, "reconcile")}>Đối soát VNPay</button>}
      </div>;
    })}
    {!orders.length && !error && <p>Chưa có đơn hàng.</p>}
    <button disabled={page === 0 || busy !== null} onClick={() => setPage(p => p - 1)}>Trước</button>{" "}
    <span>Trang {page + 1} / {Math.max(1, pages)}</span>{" "}
    <button disabled={page + 1 >= pages || busy !== null} onClick={() => setPage(p => p + 1)}>Sau</button>
  </div>;
}
