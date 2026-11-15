import type { ApiOrder } from "../lib/commerce";
import { money } from "./ProductCard";
export default function OrderSummary({ order }: { order: ApiOrder }) {
  return <section className="payment-summary"><span className="payment-eyebrow">ĐƠN HÀNG TEASMART</span><h2>Tóm tắt đơn hàng</h2>
    <p>Mã đơn <strong>{order.orderCode}</strong></p>
    <ul>{order.items.map((item, i) => <li key={`${item.productId}-${i}`}><div><strong>{item.productName}</strong><small>{item.quantity} × {money(item.unitPrice)}</small></div><b>{money(item.quantity * item.unitPrice)}</b></li>)}</ul>
    {order.subtotal != null && <p>Tạm tính: {money(order.subtotal)}</p>}
    {order.shippingFee != null && <p>Phí vận chuyển: {money(order.shippingFee)}</p>}
    <div className="payment-total"><span>Tổng thanh toán</span><strong>{money(order.totalAmount)}</strong></div>
    <h3>Thông tin giao hàng</h3><p>{order.recipientName}<br />{order.recipientPhone}<br />{order.shippingAddress}</p>
    <p>Phương thức: {order.paymentMethod === "COD" ? "Thanh toán khi nhận hàng (COD)" : "Thanh toán trực tuyến"}</p>
  </section>;
}
