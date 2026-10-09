import { useRef, useState } from "react";
import type { User, Order, Page } from "../types";
import { Icon } from "../components/Icon";
import { money } from "../components/ProductCard";
import { api, ApiError, errorMessage, mapOrder, readPendingCheckout, sandboxRedirect,
  type ApiOrder, type CartLine, type PendingCheckout } from "../lib/commerce";

export default function PaymentCheckout({ cart, user, navigate, onOrderPlaced }: {
  cart: CartLine[]; user: User | null; navigate: (page: Page) => void; onOrderPlaced: (order: Order) => void;
}) {
  const saved = readPendingCheckout(String(user?.id));
  const [name, setName] = useState(saved?.request.recipientName ?? user?.name ?? "");
  const [phone, setPhone] = useState(saved?.request.recipientPhone ?? user?.phone ?? "");
  const [address, setAddress] = useState(saved?.request.shippingAddress ?? "");
  const [note, setNote] = useState(saved?.request.note ?? "");
  const [method, setMethod] = useState<"COD" | "VNPAY">(saved?.method ?? "COD");
  const [pending, setPending] = useState<PendingCheckout | null>(saved);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<ApiOrder | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current || !user) return;
    inFlight.current = true; setBusy(true); setError("");
    const attempt = pending ?? { userId: String(user.id), key: crypto.randomUUID(), method,
      request: { recipientName: name.trim(), recipientPhone: phone.trim(), shippingAddress: address.trim(), note: note.trim() || null } };
    setPending(attempt); sessionStorage.setItem("teasmart_checkout", JSON.stringify(attempt));
    try {
      const init = { method: "POST", headers: { "Idempotency-Key": attempt.key }, body: JSON.stringify(attempt.request) };
      let order: ApiOrder, paymentUrl: string | null = null;
      if (attempt.method === "VNPAY") {
        const result = await api<{ order: ApiOrder; paymentUrl: string | null }>("/orders/vnpay", init);
        order = result.order; paymentUrl = result.paymentUrl;
      } else order = await api<ApiOrder>("/orders", init);
      sessionStorage.removeItem("teasmart_checkout"); setPending(null);
      onOrderPlaced(mapOrder(order)); setDone(order);
      if (paymentUrl) sandboxRedirect(paymentUrl);
      else if (attempt.method === "VNPAY") setError("Đơn đã được ghi nhận. Kiểm tra trạng thái thanh toán; không tạo giao dịch mới cho đơn này.");
    } catch (e) {
      setError(errorMessage(e));
      // These responses are known to precede order creation; transport/5xx failures retain the key.
      if (e instanceof ApiError && ([400, 401, 403, 409].includes(e.status) || e.code === "VNPAY_UNAVAILABLE")) {
        if (e.code !== "IDEMPOTENCY_KEY_REUSED") { sessionStorage.removeItem("teasmart_checkout"); setPending(null); }
      }
    } finally { inFlight.current = false; setBusy(false); }
  }
  if (!user || user.role !== "USER") return <main className="page simple-page"><h1>Thanh toán</h1>
    <p>Vui lòng đăng nhập tài khoản khách hàng.</p><button className="btn btn-primary" onClick={() => navigate("login")}>Đăng nhập</button></main>;
  if (done) return <main className="page checkout-success"><Icon name="check" size={36} /><h1>Đơn hàng đã được ghi nhận</h1>
    <p>{done.orderCode} · {money(done.totalAmount)} · {done.paymentStatus}</p>{error && <p role="alert">{error}</p>}
    <button className="btn btn-primary" onClick={() => navigate("account")}>Xem đơn hàng</button></main>;
  return <main className="page simple-page checkout-page"><div className="checkout-brand"><Icon name="leaf" /> TeaSmart <span>Thanh toán an toàn</span></div>
    <form className="checkout-grid" onSubmit={submit}><div><section className="form-section">
      <div className="form-title"><span>1</span>Thông tin giao hàng</div>
      <fieldset disabled={busy || !!pending} className="form-grid" style={{ border: 0, padding: 0 }}>
        <label>Họ và tên<input required maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label>
        <label>Số điện thoại<input required pattern="0[0-9]{9}" value={phone} onChange={e => setPhone(e.target.value)} /></label>
        <label className="full">Địa chỉ giao hàng<input required maxLength={500} value={address} onChange={e => setAddress(e.target.value)} /></label>
        <label className="full">Ghi chú<input maxLength={500} value={note} onChange={e => setNote(e.target.value)} /></label>
      </fieldset></section><section className="form-section"><div className="form-title"><span>2</span>Phương thức thanh toán</div>
        <div className="payments">{(["COD", "VNPAY"] as const).map(m => <label key={m} className={method === m ? "active" : ""}>
          <input type="radio" name="pay" checked={method === m} disabled={busy || !!pending} onChange={() => setMethod(m)} />
          <span><strong>{m === "COD" ? "Thanh toán khi nhận hàng (COD)" : "VNPay Sandbox"}</strong>
            <small>{m === "COD" ? "Thu tiền khi giao hàng" : "Môi trường thử nghiệm, không dùng tiền thật"}</small></span></label>)}</div></section></div>
      <aside className="checkout-summary"><div className="summary-title">Đơn hàng của bạn</div>
        {cart.map(x => <div className="checkout-item" key={x.product.id}><img src={x.product.image} alt="" />
          <span><strong>{x.product.name}</strong><small>SL {x.qty}</small>{x.available === false && <small>Sản phẩm hiện không thể đặt</small>}</span><b>{money(x.product.price * x.qty)}</b></div>)}
        <p>Tạm tính: {money(cart.reduce((s, x) => s + x.product.price * x.qty, 0))} · Miễn phí vận chuyển</p>
        {pending && <p>Đang kiểm tra yêu cầu đã gửi. Gửi lại sẽ dùng cùng mã yêu cầu.</p>}
        {error && <p role="alert">{error}</p>}
        <button className="btn btn-primary" disabled={busy || (!pending && (!cart.length || cart.some(x => x.available === false)))}>
          {busy ? "Đang xử lý…" : pending ? "Kiểm tra lại đơn đã gửi" : "Hoàn tất đặt hàng"}</button>
      </aside></form></main>;
}
