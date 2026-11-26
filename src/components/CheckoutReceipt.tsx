import { useEffect, useRef, useState } from "react";
import { api, errorMessage, orderLabels, type ApiOrder, type PaymentStatus } from "../lib/commerce";
import type { Product } from "../types";
import ImageWithFallback from "./ImageWithFallback";
import { money } from "./ProductCard";
import { Icon } from "./Icon";
import "../pages/PaymentResult.css";
import "./CheckoutReceipt.css";


type Props = {
  orderId: number;
  products: Product[];
  notice?: string;
  openOrder: () => void;
  openOrders: () => void;
  shopping: () => void;
  home?: () => void;
};

const orderSteps = [
  { status: "PENDING", title: "Đặt hàng thành công", detail: "Đã ghi nhận đơn hàng" },
  { status: "CONFIRMED", title: "Xác nhận đơn hàng", detail: "TeaSmart sẽ liên hệ xác nhận" },
  { status: "SHIPPING", title: "Chuẩn bị & đóng gói", detail: "TeaSmart chuẩn bị sản phẩm" },
  { status: "DELIVERED", title: "Giao hàng", detail: "Vận chuyển đến bạn" },
];

function formatDate(value: string | undefined) {
  if (!value) return null;
  // Spring stores order and payment LocalDateTime values in Vietnam time.
  const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value)
    ? value + "+07:00"
    : value;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return value;
  const datePart = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
  return datePart + " - " + timePart;
}

function paymentLabel(payment: PaymentStatus) {
  if (payment.reconciliationRequired) return "Đang xác minh giao dịch";
  if (payment.paymentStatus === "PAID") return "Đã thanh toán";
  if (payment.paymentStatus === "FAILED") return "Thanh toán thất bại";
  if (payment.paymentMethod === "COD") return "Chưa thanh toán";
  return "Đang chờ thanh toán";
}

export default function CheckoutReceipt({ orderId, products = [], notice, openOrder, openOrders, shopping, home }: Props) {
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [payment, setPayment] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [revision, setRevision] = useState(0);
  const [copyMessage, setCopyMessage] = useState("");
  const lock = useRef(true);

  useEffect(() => {
    const controller = new AbortController();
    lock.current = true;
    setBusy(true);
    setError("");
    setOrder(null);
    setPayment(null);
    void Promise.all([
      api<ApiOrder>("/orders/" + orderId, { signal: controller.signal }),
      api<PaymentStatus>("/orders/" + orderId + "/payment", { signal: controller.signal }),
    ]).then(([nextOrder, nextPayment]) => {
      if (nextOrder.orderId !== orderId || nextPayment.orderId !== orderId
        || nextOrder.paymentMethod !== nextPayment.paymentMethod) throw new Error("Invalid order receipt");
      if (!controller.signal.aborted) {
        setOrder(nextOrder);
        setPayment(nextPayment);
      }
    }).catch(reason => {
      if (!controller.signal.aborted) setError(errorMessage(reason));
    }).finally(() => {
      if (!controller.signal.aborted) {
        setBusy(false);
        lock.current = false;
      }
    });
    const onPageShow = () => {
      if (!lock.current) setRevision(value => value + 1);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => {
      controller.abort();
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [orderId, revision]);

  const paid = order?.paymentStatus === "PAID" && payment?.paymentStatus === "PAID"
    && payment.gateway === "VNPAY" && !payment.reconciliationRequired;
  const isCod = payment?.paymentMethod === "COD";
  const successful = !busy && !error && !!order && order.orderStatus !== "CANCELLED" && (isCod || paid);
  const cancelled = order?.orderStatus === "CANCELLED";
  const title = busy ? "Đang xác minh đơn hàng" : error ? "Chưa thể xác minh đơn hàng"
    : cancelled ? "Đơn hàng đã hủy" : successful ? (isCod ? "Đặt hàng thành công!" : "Thanh toán thành công!")
    : payment?.paymentStatus === "FAILED" ? "Thanh toán chưa thành công" : "Đang xác minh thanh toán";
  const statusCopy = busy ? "Đang tải trạng thái mới nhất từ TeaSmart."
    : error ? "Không thể xác minh thông tin đơn hàng lúc này. Vui lòng thử lại."
      : cancelled ? "Trạng thái đơn hàng được cập nhật từ hệ thống TeaSmart."
        : payment?.paymentStatus === "FAILED" ? "Đơn hàng đã được ghi nhận. Thanh toán chưa thành công."
          : "Đơn hàng đang chờ TeaSmart xác minh kết quả thanh toán từ VNPay.";
  const awaitingCodPayment = isCod && payment?.paymentStatus === "PENDING" && !payment.reconciliationRequired;
  const paymentDescription = isCod
    ? awaitingCodPayment ? "Cần thanh toán khi nhận hàng" : payment ? paymentLabel(payment) : ""
    : "Đã thanh toán qua VNPay";
  const activeStep = orderSteps.findIndex(step => step.status === order?.orderStatus);
  const createdAt = formatDate(!isCod && paid && payment?.paidAt ? payment.paidAt : order?.createdAt);

  async function copyOrderCode() {
    if (!order?.orderCode) return;
    try {
      await navigator.clipboard.writeText(order.orderCode);
      setCopyMessage("Đã sao chép mã đơn hàng.");
    } catch {
      setCopyMessage("Không thể sao chép tự động. Bạn có thể chọn mã đơn hàng để sao chép.");
    }
  }

  function refreshReceipt() {
    if (lock.current) return;
    lock.current = true;
    setRevision(value => value + 1);
  }

  if (!successful || !order || !payment) return (
    <main className="page payment-result">
      <div className="payment-breadcrumb">TeaSmart / Kết quả thanh toán</div>
      <section className="payment-outcome" aria-live="polite" aria-busy={busy}>
        <div className="payment-symbol" aria-hidden="true">{cancelled || payment?.paymentStatus === "FAILED" ? "!" : "◷"}</div>
        <h1>{title}</h1>
        <p>{statusCopy}</p>
        {(notice || error) && <p role="alert">{error || notice}</p>}
        {order && <p>Mã đơn hàng: {order.orderCode}</p>}
        {!busy && <div className="payment-actions">
          {order && <button type="button" className="btn btn-primary" onClick={openOrder}>Xem chi tiết đơn hàng</button>}
          <button type="button" className="btn btn-outline" onClick={refreshReceipt}>{error ? "Thử tải lại" : "Kiểm tra lại trạng thái"}</button>
          <button type="button" className="btn btn-outline" onClick={shopping}>Tiếp tục mua sắm</button>
          <button type="button" className="btn btn-outline" onClick={home ?? openOrders}>Về trang chủ</button>
        </div>}
      </section>
    </main>
  );
  return <main className="page order-success-page">
    <div className="receipt-scenery" aria-hidden="true" />
    <nav className="order-success-breadcrumb" aria-label="Đường dẫn">TeaSmart / Kết quả thanh toán</nav>
    <div className="order-success-grid">
      <section className="order-success-hero" aria-live="polite">
        <div className="order-success-copy">
          <div className="receipt-emblem" aria-hidden="true">
            <svg className="receipt-laurel" viewBox="0 0 220 110"><defs><linearGradient id="receipt-gold"><stop stopColor="#a88832"/><stop offset="1" stopColor="#edce74"/></linearGradient></defs>{[false,true].map(flip=><g key={String(flip)} transform={flip ? "translate(220 0) scale(-1 1)" : undefined} fill="url(#receipt-gold)"><path d="M75 100 Q27 66 48 12" fill="none" stroke="#b89b47" strokeWidth="2"/>{[0,1,2,3,4].map(i=><g key={i} transform={`translate(${40+i*3},${20+i*16}) rotate(${-25+i*12})`}><ellipse cx="-7" cy="0" rx="4" ry="10" transform="rotate(-35)"/><ellipse cx="8" cy="7" rx="4" ry="10" transform="rotate(35)"/></g>)}</g>)}</svg>
            <span className="order-success-check"><Icon name="check" size={46}/></span>
          </div>
          <h1>{title}</h1>
          <p>{isCod
            ? (awaitingCodPayment ? "Đơn hàng của bạn đã được TeaSmart ghi nhận. Bạn sẽ thanh toán khi nhận hàng." : "Đơn hàng của bạn đã được TeaSmart ghi nhận.")
            : "Thanh toán đã được xác nhận."}</p>
          <p>{isCod ? "Cảm ơn bạn đã tin tưởng và lựa chọn TeaSmart!" : "Cảm ơn bạn đã mua hàng tại TeaSmart!"}</p>
        </div>
        {notice && <p role="alert">{notice}</p>}
          <div className="order-success-facts">
            <div><Icon name="receipt"/><span><small>Mã đơn hàng</small><strong className="receipt-code" title={order.orderCode}>{order.orderCode}</strong></span><button type="button" onClick={()=>void copyOrderCode()} aria-label="Sao chép mã đơn hàng"><Icon name="copy" size={15}/></button></div>
            <div><Icon name="calendar"/><span><small>{isCod ? "Thời gian đặt hàng" : "Thời gian giao dịch"}</small><strong>{createdAt}</strong></span></div>
            <div><Icon name="coins"/><span><small>{awaitingCodPayment ? "Thanh toán khi nhận hàng" : payment.paymentStatus === "PAID" ? "Số tiền đã thanh toán" : "Tổng tiền đơn hàng"}</small><strong>{money(order.totalAmount)}</strong></span></div>
            <div><Icon name="shieldCheck"/><span><small>Trạng thái thanh toán</small><strong className={`receipt-payment-badge ${payment.paymentStatus === "PAID" && !payment.reconciliationRequired ? "is-paid" : ""}`}>{paymentLabel(payment)}</strong></span></div>
          </div>
          {copyMessage && <p className="order-success-copy-message" role="status">{copyMessage}</p>}
          <div className="receipt-method"><Icon name="card"/><span>Phương thức thanh toán</span>{isCod ? <strong>Thanh toán khi nhận hàng (COD)</strong> : <><strong>Thanh toán trực tuyến qua VNPay</strong><img src="/payments/vnpay.svg" alt=""/></>}</div>
          <section className="order-success-shipping">
            <h2><Icon name="truck"/>Thông tin giao hàng</h2>
            <div className="receipt-shipping-grid">
              <div><Icon name="user"/><span><small>Người nhận</small><strong>{order.recipientName}</strong></span></div>
              <div><Icon name="phone"/><span><small>Số điện thoại</small><strong>{order.recipientPhone}</strong></span></div>
              <div><Icon name="mapPin"/><span><small>Địa chỉ giao hàng</small><strong>{order.shippingAddress}</strong></span></div>
            </div>
          </section>
      </section>
      <aside className="order-success-summary">
        <h2><Icon name="bag" size={24}/>Tóm tắt đơn hàng</h2>
        <ul className="order-success-items">{order.items.map((item,index)=>{
            const product=products.find(p=>p.id===item.productId);
            return <li key={`${item.productId}-${index}`}>
              {product?.image ? <ImageWithFallback src={product.image} alt={item.productName}/> : <span className="order-success-image-placeholder" aria-hidden="true"><Icon name="leaf" size={36}/></span>}
              <div><strong>{item.productName}</strong>{product?.weight && <p>{product.weight}</p>}<p>Số lượng: {item.quantity}</p><p>Đơn giá: {money(item.unitPrice)}</p><b>{money(item.unitPrice * item.quantity)}</b></div>
            </li>;
          })}</ul>
          <div className="order-success-totals">
            {order.subtotal!=null && <div><span>Tạm tính</span><strong>{money(order.subtotal)}</strong></div>}
            {order.shippingFee!=null && <div><span>Phí vận chuyển</span><strong>{money(order.shippingFee)}</strong></div>}
            <div className="order-success-total"><span>Tổng thanh toán<small>{paymentDescription}</small></span><strong>{money(order.totalAmount)}</strong></div>
          </div>
      </aside>
      <section className="order-success-timeline">
        <div className="receipt-timeline-heading"><span><Icon name="package" size={27}/></span><div><h2>Hành trình đơn hàng</h2><p>Trạng thái: {orderLabels[order.orderStatus] ?? order.orderStatus}</p></div></div>
        <ol>{orderSteps.map((step, index) => {
          const shipping = step.status === "SHIPPING" && activeStep >= index;
          const delivered = step.status === "DELIVERED" && activeStep === index;
          const label = index === 0 ? (isCod ? "Đã đặt hàng" : "Đã thanh toán")
            : shipping ? "Đang giao hàng" : delivered ? "Đã giao hàng" : step.title;
          const detail = index === 0 ? (isCod ? paymentDescription : "Hoàn tất giao dịch")
            : shipping ? "Đơn hàng đã được bàn giao vận chuyển" : delivered ? "Đã giao đến người nhận" : step.detail;
          return <li key={step.status} className={index <= activeStep ? "is-current" : ""} aria-current={index === activeStep ? "step" : undefined}>
            <span className="order-success-step-marker"><Icon name={index === 0 ? "check" : index === 1 ? "bag" : index === 2 && !shipping ? "package" : "truck"} size={18}/></span>
            <strong>{label}</strong><small>{detail}</small>
          </li>;
        })}</ol>
      </section>
      <div className="order-success-actions">
        <button type="button" className="btn btn-primary" onClick={openOrder}><Icon name="receipt"/>Xem chi tiết đơn hàng</button>
        <button type="button" className="btn btn-outline" onClick={shopping}><Icon name="cart"/>Tiếp tục mua sắm</button>
        <button type="button" className="btn btn-outline" onClick={home ?? openOrders}><Icon name="home"/>Về trang chủ</button>
        <button type="button" className="receipt-refresh" onClick={refreshReceipt}>Kiểm tra lại trạng thái</button>
      </div>
      <aside className="order-success-support">
        <div className="receipt-help-title"><span><Icon name="headphones" size={27}/></span><div><h2>Cần hỗ trợ?</h2><p>Nếu bạn có bất kỳ thắc mắc nào về đơn hàng, vui lòng liên hệ với TeaSmart.</p></div></div>
        <a href="tel:0962022716"><Icon name="phone" size={25}/><span><small>Hotline</small><strong>0962022716</strong></span></a>
        <a href="mailto:quangmanh12082005@gmail.com"><Icon name="mail" size={25}/><span><small>Email</small><strong>quangmanh12082005@gmail.com</strong></span></a>
      </aside>
    </div>
  </main>;
}
