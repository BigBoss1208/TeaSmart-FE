import { useEffect, useState } from "react";
import { api, errorMessage, type PaymentStatus } from "../lib/commerce";
import { money } from "../components/ProductCard";
import type { Page } from "../types";

export default function PaymentReturn({ navigate }: { navigate: (page: Page) => void }) {
  const [payment, setPayment] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const reference = new URLSearchParams(window.location.search).get("vnp_TxnRef") ?? "";
  useEffect(() => {
    const abort = new AbortController(); let timer: ReturnType<typeof setTimeout>; let attempts = 0;
    async function poll() {
      try {
        if (!/^[A-Za-z0-9]{1,100}$/.test(reference)) { setError("Thiếu mã tham chiếu thanh toán hợp lệ."); return; }
        const p = await api<PaymentStatus>(`/orders/payment-status?reference=${encodeURIComponent(reference)}`, { signal: abort.signal });
        setPayment(p); setError("");
        if (p.paymentStatus === "PENDING" && ++attempts < 12) timer = setTimeout(poll, 5000);
      } catch (e) { if (!abort.signal.aborted) setError(errorMessage(e)); }
    }
    void poll(); return () => { abort.abort(); clearTimeout(timer); };
  }, [reference, refresh]);
  // The browser return code/signature never decides whether the order is paid.
  return <main className="page simple-page"><h1>Kết quả thanh toán VNPay Sandbox</h1>
    {error && <p role="alert">{error}</p>}
    {payment ? <><p>Đơn #{payment.orderId} · {money(payment.amount)}</p>
      <p>{payment.paymentStatus === "PAID" ? "Đã ghi nhận thanh toán." : payment.paymentStatus === "FAILED"
        ? "Thanh toán thất bại đã được xác minh." : "Đang chờ xác minh thanh toán. Không thanh toán thêm cho đơn này."}</p>
      {payment.reconciliationRequired && <p>Giao dịch cần đối soát. Vui lòng liên hệ cửa hàng và cung cấp mã đơn.</p>}</> : !error && <p>Đang kiểm tra…</p>}
    <button className="btn btn-outline" onClick={() => setRefresh(n => n + 1)}>Kiểm tra lại</button>{" "}
    <button className="btn btn-primary" onClick={() => { sessionStorage.setItem("teasmart_payment_return", window.location.pathname + window.location.search); navigate("login"); }}>Đăng nhập</button>{" "}
    <button className="btn btn-outline" onClick={() => navigate("account")}>Đơn hàng của tôi</button></main>;
}
