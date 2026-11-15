import { useEffect, useState } from "react";
import { api, errorMessage, type ApiOrder, type ApiPage, type PaymentStatus, type CheckoutSession } from "../lib/commerce";
import { money } from "../components/ProductCard";

import { queryOutcomeDescription } from "../lib/paymentReconciliation";

export function CheckoutSessionReconciliationQueue() {
  const [sessions, setSessions] = useState<CheckoutSession[]>([]);
  const [error, setError] = useState(""); const [busy, setBusy] = useState<number | null>(null); const [revision, setRevision] = useState(0);
  const [reconcileResult, setReconcileResult] = useState<{outcome:string;paymentAttemptId:number|null;attemptStatus:string|null;queryOutcome:string;requestSent:boolean;httpStatus:number|null;elapsedMs:number;gatewayResponseCode:string|null;gatewayTransactionStatus:string|null}|null>(null);
  useEffect(() => { let live = true; void api<CheckoutSession[]>("/admin/checkout-sessions/reconciliation").then(rows => { if (live) { setSessions(rows); setError(""); } }).catch(e => { if (live) setError(errorMessage(e)); }); return () => { live = false; }; }, [revision]);
  async function reconcile(id: number) { if (busy !== null) return; setBusy(id); setError(""); setReconcileResult(null); try { const result=await api<typeof reconcileResult>(`/admin/checkout-sessions/${id}/reconcile`, { method: "POST" }); if(result)setReconcileResult(result); setRevision(x => x + 1); } catch (e) { setError(errorMessage(e)); } finally { setBusy(null); } }
  return <section className="admin-table" aria-label="Đối soát Checkout Session"><div className="admin-table-title"><strong>Checkout Session cần đối soát</strong><button className="admin-action-btn" disabled={busy !== null} onClick={() => setRevision(x => x + 1)}>Làm mới</button></div>
    {error && <p role="alert">{error}</p>}{reconcileResult&&<section role="status" className="admin-reconciliation-result"><strong>Kết quả đối soát: {reconcileResult.outcome}</strong><p>PaymentAttempt #{reconcileResult.paymentAttemptId??"—"}: {reconcileResult.attemptStatus??"không có"}</p><p>QueryDR: {reconcileResult.queryOutcome} · Đã gửi: {reconcileResult.requestSent?"Có":"Không"}{reconcileResult.httpStatus!==null?` · HTTP ${reconcileResult.httpStatus}`:""} · {reconcileResult.elapsedMs} ms</p><p>VNPay ResponseCode: {reconcileResult.gatewayResponseCode??"chưa xác minh"} · TransactionStatus: {reconcileResult.gatewayTransactionStatus??"chưa xác minh"}</p><p>{queryOutcomeDescription(reconcileResult.queryOutcome)}</p><small>HTTP 200 chỉ xác nhận có phản hồi HTTP; không tự hoàn tất Order hoặc xác nhận đã thanh toán.</small></section>}{sessions.map(s => <div className="admin-tr" key={s.checkoutSessionId} style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      <strong>{s.sessionCode}</strong><span>{s.status} · {s.latestAttemptStatus ?? "chưa có attempt"}</span><span>{money(s.totalAmount)}</span>
      {s.reconciliationRequired && <b>Cần xử lý thủ công trước khi giao hàng</b>}
      <button className="admin-action-btn" disabled={busy !== null} onClick={() => void reconcile(s.checkoutSessionId)}>{busy === s.checkoutSessionId ? "Đang đối soát…" : "Kiểm tra trạng thái thanh toán"}</button>
    </div>)}{!sessions.length && !error && <p>Không có Checkout Session cần đối soát.</p>}
  </section>;
}

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
