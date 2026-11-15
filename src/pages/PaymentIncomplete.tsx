import { useEffect, useState } from "react";
import { api, ApiError, errorMessage, sandboxRedirect, type CheckoutSession, type CheckoutSessionAction } from "../lib/commerce";
import type { Page } from "../types";
import { money } from "../components/ProductCard";
import type { AuthState } from "./PaymentReturn";
import "./PaymentResult.css";

export default function PaymentIncomplete({ authState, userId, navigate, openOrder }: { authState: AuthState; userId: string | null; navigate: (page: Page) => void; openOrder: (id: number) => void }) {
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [choices, setChoices] = useState<CheckoutSession[]>([]);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => {
    setSession(null); setChoices([]); setError("");
    if (authState !== "ready" || !userId) return;
    const abort = new AbortController();
    async function load() {
      const saved = (() => { try { return JSON.parse(sessionStorage.getItem("teasmart_checkout_session") ?? "null"); } catch { return null; } })();
      if (saved?.userId === userId && Number.isSafeInteger(saved.sessionId) && saved.sessionId > 0) {
        try { return await api<CheckoutSession>(`/checkout-sessions/${saved.sessionId}`, { signal: abort.signal }); }
        catch (e) {
          if (!(e instanceof ApiError) || e.status !== 404) throw e;
          // Remove only this stale reference, never a draft written by a newer account/session.
          const current = sessionStorage.getItem("teasmart_checkout_session");
          if (current === JSON.stringify(saved)) sessionStorage.removeItem("teasmart_checkout_session");
        }
      }
      const rows = await api<CheckoutSession[]>("/checkout-sessions/active", { signal: abort.signal });
      if (!abort.signal.aborted) setChoices(rows);
      return null;
    }
    void load().then(s => {
      if (abort.signal.aborted) return;
      setSession(s);
      if (s?.orderId) openOrder(s.orderId);
    }).catch(e => { if (!abort.signal.aborted) setError(errorMessage(e)); });
    return () => abort.abort();
  }, [authState, userId]);
  const unresolved = session?.reconciliationRequired || session?.status === "VERIFYING" || session?.status === "RECONCILIATION_REQUIRED" || session?.latestAttemptStatus === "UNKNOWN" || session?.latestAttemptStatus === "PENDING" || session?.latestAttemptStatus === "SUCCEEDED";
  async function refresh() {
    if (!session || busy) return; setBusy(true); setError("");
    try { const updated = await api<CheckoutSession>(`/checkout-sessions/${session.checkoutSessionId}/refresh`, { method: "POST" }); setSession(updated); if (updated.orderId) openOrder(updated.orderId); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function vnpay() {
    if (!session || busy || unresolved) return; setBusy(true); setError("");
    try {
      const result = await api<CheckoutSessionAction>(`/checkout-sessions/${session.checkoutSessionId}/payment-attempts/vnpay`, { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() } });
      setSession(result.session); if (result.paymentUrl) sandboxRedirect(result.paymentUrl);
      else setError("Chưa tạo được liên kết VNPay. Hãy kiểm tra trạng thái phiên trước khi thử lại.");
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function cod() {
    if (!session || busy || unresolved) return; setBusy(true); setError("");
    try { const done = await api<CheckoutSession>(`/checkout-sessions/${session.checkoutSessionId}/confirm-cod`, { method: "POST" }); setSession(done); if (done.orderId) openOrder(done.orderId); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  const canChoose = !!session && !unresolved && session.reservationStatus === "HELD" && session.status !== "EXPIRED" && session.status !== "COMPLETED";
  return <main className="page payment-result"><div className="payment-breadcrumb">TeaSmart / Thanh toán chưa hoàn tất</div><section className="payment-outcome">
    <div className="payment-symbol" aria-hidden="true">◷</div><span className="payment-eyebrow">TEASMART · KIỂM TRA GIAO DỊCH</span>
    <h1>{authState === "loading" ? "Đang khôi phục phiên" : unresolved ? "Đang xác minh thanh toán" : "Thanh toán chưa hoàn tất"}</h1>
    <p>{unresolved ? "Tài khoản của bạn có giao dịch VNPay chưa xác định được kết quả. UNKNOWN không có nghĩa là thanh toán thất bại. Phiên này vẫn được giữ để đối soát; chưa thể thanh toán lại hoặc chuyển sang COD. Hãy kiểm tra trạng thái hoặc liên hệ quản trị viên với mã phiên bên dưới." : "Phiên mua hàng của bạn đã được lưu. Bạn có thể chọn lại phương thức khi giao dịch trước đã được xác minh an toàn."}</p>
    {authState === "guest" && <button className="btn btn-primary" onClick={() => { sessionStorage.setItem("teasmart_payment_return", window.location.pathname + window.location.search); navigate("login"); }}>Đăng nhập để khôi phục</button>}
    {error && <p role="alert">{error}</p>}
    {!session && choices.map(choice => <button key={choice.checkoutSessionId} className="btn btn-outline" onClick={() => setSession(choice)}>Xem phiên #{choice.checkoutSessionId} · {money(choice.totalAmount)} · {choice.latestAttemptStatus ?? choice.status}</button>)}
    {!session && <button className="btn btn-outline" onClick={() => navigate("checkout")}>Quay lại Checkout</button>}
    {session && <><dl className="payment-facts"><div><dt>Mã phiên</dt><dd>{session.sessionCode}</dd></div><div><dt>Tổng tiền</dt><dd>{money(session.totalAmount)}</dd></div><div><dt>Trạng thái</dt><dd>{session.latestAttemptStatus ?? session.status}</dd></div></dl>
      <ul>{session.items.map(i => <li key={i.productId}>{i.productName} × {i.quantity} · {money(i.subtotal)}</li>)}</ul>
      <div className="payment-actions"><button className="btn btn-outline" onClick={() => navigate("checkout")}>Quay lại Checkout</button>{unresolved && <button className="btn btn-outline" disabled={busy} onClick={() => void refresh()}>{busy ? "Đang kiểm tra…" : "Kiểm tra trạng thái"}</button>}
        {canChoose && <><button className="btn btn-primary" disabled={busy} onClick={() => void vnpay()}>Thử lại VNPay</button><button className="btn btn-outline" disabled={busy} onClick={() => void cod()}>Chọn COD</button></>}
        {!canChoose && !unresolved && session.reservationStatus === "RELEASED" && <button className="btn btn-primary" onClick={() => { sessionStorage.removeItem("teasmart_checkout_session"); navigate("checkout"); }}>Tạo phiên thanh toán mới</button>}
        {!canChoose && !unresolved && session.reservationStatus !== "RELEASED" && <button className="btn btn-outline" onClick={() => navigate("home")}>Về trang chủ</button>}
      </div></>}
  </section></main>;
}
