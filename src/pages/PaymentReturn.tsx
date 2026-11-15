import { useEffect, useState } from "react";
import { api, errorMessage, type ApiOrder, type PaymentStatus } from "../lib/commerce";
import type { Page, Product } from "../types";
import { money } from "../components/ProductCard";
import CheckoutReceipt from "../components/CheckoutReceipt";
import OrderSummary from "../components/OrderSummary";
import { checkoutAfterVerifiedCancellation, paymentReturnDestination } from "../lib/paymentReturn";
import "./PaymentResult.css";
export type AuthState = "loading" | "ready" | "guest" | "error";
type SessionStatus = { checkoutSessionId: number; orderId: number | null; reference: string; attemptStatus: string; sessionStatus: string; amount: number; paidAt: string | null; reconciliationRequired: boolean };
export default function PaymentReturn({ navigate, authState, onAuthRetry, openOrder, openOrders, products }: {
  navigate: (page: Page) => void; authState: AuthState; onAuthRetry: () => void;
  openOrder: (id: number) => void; openOrders: () => void; products: Product[];
}) {
  const [sessionResult, setSessionResult] = useState<SessionStatus | null>(null);
  const [legacy, setLegacy] = useState<PaymentStatus | null>(null);
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const reference = new URLSearchParams(window.location.search).get("vnp_TxnRef") ?? "";
  useEffect(() => {
    if (authState !== "ready") return;
    const abort = new AbortController();
    const signal = AbortSignal.any([abort.signal, AbortSignal.timeout(20000)]);
    async function verify() {
      if (!/^[A-Za-z0-9]{1,100}$/.test(reference)) { setError("Thiếu mã tham chiếu giao dịch."); return; }
      setBusy(true); setError("");
      try {
        const params = Object.fromEntries(new URLSearchParams(window.location.search).entries());
        // A browser Back may reach the return route without a complete, verifiable
        // VNPay payload. Keep that callback non-authoritative, but still ask the
        // server for the attempt status and return the buyer to Checkout when no
        // Order exists.
        try {
          await api<{ accepted: boolean; reference: string }>("/payments/vnpay/return", { method: "POST", body: JSON.stringify(params), signal });
        } catch { /* Payment status below is authoritative; a bad Return never marks payment failed. */ }
        try {
          const result = await api<SessionStatus>(`/checkout-sessions/payment-status?reference=${encodeURIComponent(reference)}`, { signal });
          setSessionResult(result);
          if (result.attemptStatus === "FAILED_FINAL" && result.sessionStatus === "CANCELLED"
              && !result.reconciliationRequired && result.orderId == null && result.reference === reference) {
            const storageKeys = Array.from({ length: sessionStorage.length }, (_, i) => sessionStorage.key(i))
              .filter((key): key is string => key === "teasmart_checkout_session" || key?.startsWith("teasmart_checkout_buy_now_") === true);
            for (const key of storageKeys) {
              try {
                const saved = JSON.parse(sessionStorage.getItem(key) ?? "null");
                if (!saved || typeof saved !== "object") continue;
                const fresh = checkoutAfterVerifiedCancellation(saved, reference, result.checkoutSessionId, crypto.randomUUID());
                if (fresh) sessionStorage.setItem(key, JSON.stringify(fresh));
              } catch { /* Storage recovery is best-effort; backend state remains authoritative. */ }
            }
          }
          if (paymentReturnDestination(result) === "checkout") {
            navigate("checkout");
            return;
          }
          if ((result.attemptStatus === "SUCCEEDED" || result.attemptStatus === "FAILED_FINAL") && result.reference === reference) {
            try {
              const saved = JSON.parse(sessionStorage.getItem("teasmart_checkout_session") ?? "null");
              if (saved?.attemptReference === reference) {
                delete saved.attemptKey; delete saved.attemptReference;
                sessionStorage.setItem("teasmart_checkout_session", JSON.stringify(saved));
              }
            } catch { /* Ignore storage errors; the backend status remains authoritative. */ }
          }
          if (result.orderId) {
            const nextOrder = await api<ApiOrder>(`/orders/${result.orderId}`, { signal }); setOrder(nextOrder);
          }
          return;
        } catch (e) {
          if (!(e instanceof Error) || !("status" in e && (e as {status?:number}).status === 404)) throw e;
        }
        const result = await api<PaymentStatus>(`/orders/payment-status?reference=${encodeURIComponent(reference)}`, { signal });
        setLegacy(result);
        if (result.orderId) setOrder(await api<ApiOrder>(`/orders/${result.orderId}`, { signal }));
      } catch (e) { if (!abort.signal.aborted) setError(errorMessage(e)); }
      finally { if (!abort.signal.aborted) setBusy(false); }
    }
    void verify(); return () => abort.abort();
  }, [reference, authState]);
  const unresolved = sessionResult?.attemptStatus === "PENDING" || sessionResult?.attemptStatus === "UNKNOWN" || sessionResult?.sessionStatus === "PAID_PENDING_ORDER" || sessionResult?.reconciliationRequired;
  const failed = sessionResult?.attemptStatus === "FAILED_FINAL" || legacy?.paymentStatus === "FAILED";
  const paid = authState === "ready" && !busy && !error && !!order && !unresolved && !legacy?.reconciliationRequired
    && (sessionResult?.reference === reference && sessionResult?.orderId === order.orderId && sessionResult?.attemptStatus === "SUCCEEDED"
      || legacy?.orderId === order.orderId && legacy?.paymentStatus === "PAID");
  if (paid && order) return <CheckoutReceipt orderId={order.orderId} products={products} openOrder={() => openOrder(order.orderId)} openOrders={openOrders} shopping={() => navigate("explore")} home={() => navigate("home")} />;
  const amount = sessionResult?.amount ?? legacy?.amount;
  return <main className="page payment-result"><div className="payment-breadcrumb">TeaSmart / Kết quả thanh toán</div><section className="payment-outcome">
    <div className={`payment-symbol ${paid ? "is-paid" : ""}`} aria-hidden="true">{paid ? "✓" : failed ? "!" : "◷"}</div>
    <span className="payment-eyebrow">TEASMART · TRỌN VỊ AN TÂM</span>
    <h1>{authState === "loading" ? "Đang khôi phục phiên đăng nhập" : paid ? "Thanh toán thành công" : failed ? "Thanh toán chưa thành công" : "Đang xác minh thanh toán"}</h1>
    <p>{unresolved ? "Chưa tạo đơn hàng. Đang đối soát giao dịch; vui lòng không gửi thêm thanh toán." : paid ? "TeaSmart đã xác minh khoản thanh toán và đang hoàn tất đơn hàng." : failed ? "Giao dịch đã kết thúc an toàn. Bạn có thể quay lại phiên thanh toán để chọn phương thức khác." : "Kết quả được kiểm tra trực tiếp từ backend TeaSmart."}</p>
    {error && <p role="alert">{error}</p>}{amount != null && <p>Số tiền: <strong>{money(amount)}</strong></p>}
    {authState === "guest" && <button className="btn btn-primary" onClick={() => { sessionStorage.setItem("teasmart_payment_return", window.location.pathname + window.location.search); navigate("login"); }}>Đăng nhập để xem kết quả</button>}
    {authState === "error" && <button className="btn btn-primary" onClick={onAuthRetry}>Thử khôi phục phiên</button>}
    <div className="payment-actions">
      {(unresolved || (!paid && !failed && !!error)) && <button className="btn btn-outline" disabled={busy} onClick={() => window.location.reload()}>{busy ? "Đang kiểm tra…" : "Kiểm tra lại"}</button>}
      {paid && sessionResult && <button className="btn btn-primary" onClick={() => navigate("payment-incomplete")}>Xem trạng thái hoàn tất</button>}
      {(failed || unresolved) && <button className="btn btn-primary" onClick={() => navigate("checkout")}>Quay lại Checkout</button>}
      {legacy && <button className="btn btn-primary" onClick={() => openOrder(legacy.orderId)}>Xem chi tiết đơn hàng</button>}
      <button className="btn btn-outline" onClick={openOrders}>Đơn hàng của tôi</button><button className="btn btn-outline" onClick={() => navigate("explore")}>Tiếp tục mua sắm</button>
    </div>
    {order && <OrderSummary order={order} />}
  </section></main>;
}
