import { useEffect, useMemo, useState } from "react";
import { api, errorMessage, mapProduct, orderLabels, type ApiOrder, type ApiProduct, type ApiPage, type PaymentStatus } from "../lib/commerce";
import ShippingInfoEditor from "../components/ShippingInfoEditor";
import { money, ProductCard } from "../components/ProductCard";
import { Icon } from "../components/Icon";
import type { Page, Product } from "../types";
import type { AuthState } from "./PaymentReturn";
import "./CustomerExperience.css";

type ReorderLine = {
  productId: number;
  productName: string;
  quantity: number;
  product?: Product;
  stockQuantity: number | null;
  issue?: string;
};

type Props = {
  authState: AuthState;
  onAuthRetry: () => void;
  navigate: (p: Page) => void;
  openOrders: () => void;
  products: Product[];
  favorites: number[];
  onAddToCart: (p: Product) => void | Promise<unknown>;
  onToggleFavorite: (id: number) => void;
  onSelectProduct: (p: Product) => void;
  onBuyAgain: (items: { product: Product; quantity: number }[]) => void;
};

function formatDate(value?: string) {
  if (!value) return "Chưa có thông tin";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    hourCycle: "h23", timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function orderStatus(order: ApiOrder) {
  const status = order.orderStatus;
  const tone = status === "PENDING" ? "pending" : status === "DELIVERED" ? "complete" : status === "CANCELLED" ? "cancelled" : "in-transit";
  const message = status === "PENDING" ? "Đơn hàng đang chờ TeaSmart xác nhận."
    : status === "CONFIRMED" ? "Đơn hàng đã được xác nhận và đang được chuẩn bị."
      : status === "SHIPPING" ? "Đơn hàng đang được vận chuyển đến bạn."
        : status === "DELIVERED" ? "Đơn hàng đã được giao. Cảm ơn bạn đã mua sắm tại TeaSmart."
          : status === "CANCELLED" ? "Đơn hàng này đã được hủy theo trạng thái hệ thống."
            : "Trạng thái đơn hàng được cập nhật từ hệ thống TeaSmart.";
  return { tone, label: orderLabels[status] ?? status, message };
}

function paymentLabel(payment: PaymentStatus | null) {
  if (!payment) return "Chưa tải được trạng thái thanh toán";
  if (payment.reconciliationRequired) return "Đang đối soát giao dịch";
  if (payment.paymentStatus === "PAID") return "Đã thanh toán";
  if (payment.paymentStatus === "FAILED") return "Thanh toán thất bại";
  return payment.paymentMethod === "COD" ? "Chưa thanh toán · thu khi nhận hàng" : "Chưa thanh toán";
}

export default function CustomerOrderDetail({
  authState, onAuthRetry, navigate, openOrders, products, favorites,
  onAddToCart, onToggleFavorite, onSelectProduct, onBuyAgain,
}: Props) {
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState<PaymentStatus | null>(null);
  const [catalog, setCatalog] = useState<ApiProduct[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [reorder, setReorder] = useState<ReorderLine[] | null>(null);
  const [reorderBusy, setReorderBusy] = useState(false);
  const [reorderError, setReorderError] = useState("");
  const [copied, setCopied] = useState(false);
  const id = window.location.pathname.split("/").at(-1);

  useEffect(() => {
    if (authState !== "ready" || !id || !/^[1-9][0-9]*$/.test(id)) return;
    const abort = new AbortController();
    const signal = AbortSignal.any([abort.signal, AbortSignal.timeout(20000)]);
    void Promise.all([
      api<ApiOrder>(`/orders/${id}`, { signal }),
      api<PaymentStatus>(`/orders/${id}/payment`, { signal }),
    ]).then(([nextOrder, nextPayment]) => {
      if (!abort.signal.aborted) { setOrder(nextOrder); setPayment(nextPayment); }
    }).catch(reason => { if (!abort.signal.aborted) setError(errorMessage(reason)); });
    return () => abort.abort();
  }, [id, authState]);

  useEffect(() => {
    const abort = new AbortController();
    void api<ApiPage<ApiProduct>>("/products?size=50", { signal: abort.signal })
      .then(async first => {
        const rest = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, index) =>
          api<ApiPage<ApiProduct>>(`/products?size=50&page=${index + 1}`, { signal: abort.signal })));
        if (!abort.signal.aborted) { setCatalog([first, ...rest].flatMap(page => page.content)); setCatalogLoaded(true); }
      })
      .catch(() => { if (!abort.signal.aborted) { setCatalog([]); setCatalogLoaded(true); } });
    return () => abort.abort();
  }, []);

  const suggested = useMemo(() => {
    const orderedIds = new Set(order?.items.map(item => item.productId) ?? []);
    return catalog.map(mapProduct).filter(product => !orderedIds.has(product.id)).slice(0, 4);
  }, [order, catalog]);

  async function prepareBuyAgain() {
    if (!order || reorderBusy) return;
    if (!catalogLoaded) { setReorderError("Danh mục sản phẩm đang được tải. Vui lòng thử lại sau giây lát."); return; }
    if (!catalog.length) { setReorderError("Chưa thể tải danh mục hiện tại để kiểm tra mua lại."); return; }
    setReorderBusy(true); setReorderError(""); setReorder(null);
    const lines = await Promise.all(order.items.map(async item => {
      const listed = catalog.find(product => product.productId === item.productId);
      if (!listed?.slug) return { productId: item.productId, productName: item.productName, quantity: item.quantity, stockQuantity: null, issue: "Không tìm thấy sản phẩm trong danh mục hiện tại." } satisfies ReorderLine;
      try {
        const current = await api<ApiProduct>(`/products/${encodeURIComponent(listed.slug)}`);
        const stock = Number.isFinite(current.stockQuantity) ? Number(current.stockQuantity) : null;
        const mapped = mapProduct(current);
        const issue = stock === null ? "Không xác định được tồn kho, vui lòng thử lại sau."
          : stock < 1 ? "Sản phẩm hiện đã hết hàng."
            : stock < item.quantity ? `Chỉ còn ${stock} sản phẩm trong kho.` : undefined;
        return { productId: item.productId, productName: item.productName, quantity: item.quantity, product: mapped, stockQuantity: stock, issue } satisfies ReorderLine;
      } catch {
        return { productId: item.productId, productName: item.productName, quantity: item.quantity, stockQuantity: null, issue: "Sản phẩm hiện không còn được kinh doanh." } satisfies ReorderLine;
      }
    }));
    setReorder(lines);
    setReorderBusy(false);
  }

  function continueBuyAgain() {
    if (!reorder) return;
    const invalid = reorder.some(line => !line.product || !line.stockQuantity || line.quantity < 1 || line.quantity > line.stockQuantity);
    if (invalid) { setReorderError("Hãy giảm số lượng hoặc chủ động bỏ các sản phẩm không thể mua lại trước khi tiếp tục."); return; }
    const items = reorder.filter((line): line is ReorderLine & { product: Product; stockQuantity: number } => !!line.product && !!line.stockQuantity)
      .map(line => ({ product: line.product, quantity: line.quantity }));
    if (!items.length) { setReorderError("Cần giữ lại ít nhất một sản phẩm để tiếp tục."); return; }
    onBuyAgain(items);
  }

  async function copyCode() {
    if (!order) return;
    try { await navigator.clipboard.writeText(order.orderCode); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { setCopied(false); }
  }

  const status = order ? orderStatus(order) : null;
  return <main className="page customer-order-detail">
    <nav className="customer-order-breadcrumb" aria-label="Đường dẫn">
      <button type="button" onClick={openOrders}>Đơn hàng của tôi</button><span aria-hidden="true">›</span><strong>Chi tiết đơn hàng</strong>
    </nav>
    <header className="customer-order-heading"><h1>Chi tiết đơn hàng</h1><p>Xem thông tin chi tiết và trạng thái đơn hàng của bạn</p></header>
    {authState === "loading" ? <p role="status">Đang khôi phục phiên đăng nhập…</p>
      : authState === "guest" ? <button className="btn btn-primary" onClick={() => { sessionStorage.setItem("teasmart_order_return", window.location.pathname); navigate("login"); }}>Đăng nhập để xem đơn hàng</button>
        : authState === "error" ? <button className="btn btn-outline" onClick={onAuthRetry}>Thử khôi phục phiên</button>
          : error ? <p className="customer-order-error" role="alert">{error}</p>
            : !order ? <p role="status">Đang tải thông tin đơn hàng…</p> : <>
              <section className={`customer-order-status is-${status?.tone}`} aria-label="Trạng thái đơn hàng">
                <span className="customer-order-status-icon"><Icon name="package" size={28}/></span>
                <div className="customer-order-status-copy"><small>Đơn hàng TeaSmart</small><strong>Mã đơn: {order.orderCode}</strong><span>Đặt lúc: {formatDate(order.createdAt)}</span></div>
                <div className="customer-order-status-current"><span><Icon name={order.orderStatus === "PENDING" ? "calendar" : "check"} size={18}/>{status?.label}</span><small>{status?.message}</small></div>
                <button className="customer-order-copy" type="button" onClick={() => void copyCode()} aria-label="Sao chép mã đơn"><Icon name="copy" size={18}/></button>
                {copied && <span className="customer-order-copied" role="status">Đã sao chép</span>}
              </section>

              <div className="customer-order-columns">
                <section className="customer-order-card customer-order-products" aria-labelledby="ordered-products-title">
                  <h2 id="ordered-products-title"><Icon name="cart" size={22}/>Sản phẩm đã đặt</h2>
                  <ul>{order.items.map((item, index) => {
                    const product = products.find(candidate => candidate.id === item.productId);
                    return <li key={`${item.productId}-${index}`}>
                      {product?.image ? <img src={product.image} alt="" loading="lazy"/> : <span className="customer-order-image-placeholder"><Icon name="leaf" size={24}/></span>}
                      <div className="customer-order-item-info"><strong>{item.productName}</strong>{product?.weight && <small>Quy cách: {product.weight}</small>}<span>{money(item.unitPrice)}</span></div>
                      <span className="customer-order-quantity">× {item.quantity}</span>
                      <strong className="customer-order-line-total">{money(item.unitPrice * item.quantity)}</strong>
                    </li>;
                  })}</ul>
                </section>

                <div className="customer-order-side">
                  <section className="customer-order-card customer-order-shipping" aria-labelledby="shipping-title">
                    <div className="customer-order-card-heading"><h2 id="shipping-title"><Icon name="mapPin" size={22}/>Thông tin giao hàng</h2></div>
                    {order.orderStatus === "PENDING" && <ShippingInfoEditor order={order} onSaved={updated => setOrder(updated)} disabledMessage={payment?.reconciliationRequired ? "Đang đối soát giao dịch; hiện chưa thể chỉnh sửa." : undefined} />}
                    <dl><div><dt><Icon name="user" size={16}/>Người nhận</dt><dd>{order.recipientName}</dd></div><div><dt><Icon name="phone" size={16}/>Số điện thoại</dt><dd>{order.recipientPhone}</dd></div><div><dt><Icon name="mapPin" size={16}/>Địa chỉ</dt><dd>{order.shippingAddress}</dd></div></dl>
                  </section>
                  <section className="customer-order-card customer-order-payment" aria-labelledby="payment-title">
                    <h2 id="payment-title"><Icon name="bag" size={21}/>Thông tin thanh toán</h2>
                    <dl className="customer-order-totals"><div><dt>Tạm tính</dt><dd>{order.subtotal != null ? money(order.subtotal) : money(order.totalAmount - (order.shippingFee ?? 0))}</dd></div><div><dt>Phí vận chuyển</dt><dd>{money(order.shippingFee ?? 0)}</dd></div><div className="customer-order-total"><dt>Tổng thanh toán</dt><dd>{money(order.totalAmount)}</dd></div></dl>
                    <dl className="customer-order-payment-facts"><div><dt><Icon name="bag" size={16}/>Phương thức thanh toán</dt><dd>{order.paymentMethod === "COD" ? "Thanh toán khi nhận hàng (COD)" : "VNPay"}</dd></div><div><dt><Icon name="check" size={16}/>Trạng thái thanh toán</dt><dd><span className={`customer-payment-state is-${payment?.paymentStatus === "PAID" ? "paid" : payment?.paymentStatus === "FAILED" ? "failed" : payment?.reconciliationRequired ? "reconciling" : "pending"}`}>{paymentLabel(payment)}</span></dd></div></dl>
                  </section>
                </div>
              </div>

              <div className="customer-order-actions">
                <button type="button" className="btn btn-primary" onClick={() => void prepareBuyAgain()} disabled={reorderBusy||!catalogLoaded}><Icon name="check" size={18}/>{reorderBusy ? "Đang kiểm tra sản phẩm…" : "Mua lại"}</button>
                <button type="button" className="btn btn-outline" onClick={() => navigate("explore")}><Icon name="bag" size={18}/>Tiếp tục mua sắm</button>
                <button type="button" className="btn btn-outline" onClick={openOrders}><Icon name="package" size={18}/>Quay về Đơn hàng của tôi</button>
              </div>

              {reorder && <section className="customer-reorder-panel" aria-labelledby="customer-reorder-title">
                <div className="customer-reorder-heading"><div><h2 id="customer-reorder-title">Kiểm tra danh sách mua lại</h2><p>Giá và tồn kho hiện tại đã được tra cứu. Bạn có thể điều chỉnh số lượng hoặc chủ động bỏ sản phẩm.</p></div><button type="button" aria-label="Đóng danh sách mua lại" onClick={() => { setReorder(null); setReorderError(""); }}>×</button></div>
                <ul>{reorder.map((line, index) => <li key={line.productId}>
                  {line.product?.image ? <img src={line.product.image} alt=""/> : <span className="customer-order-image-placeholder"><Icon name="leaf" size={24}/></span>}
                  <div><strong>{line.product?.name ?? line.productName}</strong><small>{line.product ? `${money(line.product.price)} · ${line.stockQuantity} sản phẩm còn hàng` : line.issue}</small>{line.issue && <span className="customer-reorder-warning">{line.issue}</span>}</div>
                  {line.product && (line.stockQuantity ?? 0) > 0 ? <label>Số lượng<input type="number" min={1} max={line.stockQuantity ?? undefined} value={line.quantity} onChange={event => { const value = Math.max(1, Number(event.target.value) || 1); setReorder(rows => rows?.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: Math.min(value, row.stockQuantity ?? value), issue: value > (row.stockQuantity ?? 0) ? `Chỉ còn ${row.stockQuantity} sản phẩm trong kho.` : undefined } : row) ?? null); }}/></label> : <span className="customer-reorder-warning">Không thể mua</span>}
                  <button type="button" className="customer-reorder-remove" onClick={() => setReorder(rows => rows?.filter((_, rowIndex) => rowIndex !== index) ?? null)}>Bỏ sản phẩm</button>
                </li>)}</ul>
                {reorderError && <p className="customer-order-error" role="alert">{reorderError}</p>}
                <div className="customer-reorder-actions"><button type="button" className="btn btn-primary" onClick={continueBuyAgain}>Tiếp tục đến thanh toán</button><button type="button" className="btn btn-outline" onClick={() => setReorder(null)}>Hủy</button></div>
              </section>}

              <section className="customer-order-recommendations" aria-labelledby="customer-recommendations-title">
                <div className="customer-order-recommendations-heading"><div><h2 id="customer-recommendations-title"><Icon name="leaf" size={26}/>Có thể bạn sẽ thích</h2><p>Khám phá thêm các sản phẩm chè Thái Nguyên chất lượng</p></div><button type="button" onClick={() => navigate("explore")}>Xem thêm sản phẩm <Icon name="arrow" size={17}/></button></div>
                {suggested.length ? <div className="customer-order-recommendation-grid">{suggested.map(product => <ProductCard key={product.id} product={product} onView={() => onSelectProduct(product)} onAdd={() => onAddToCart(product)} isFavorite={favorites.includes(product.id)} onToggleFavorite={() => onToggleFavorite(product.id)}/>)}</div> : <p className="customer-order-recommendations-empty">{catalog.length ? "Không có sản phẩm gợi ý ngoài các sản phẩm trong đơn này." : "Chưa tải được danh sách sản phẩm gợi ý."}</p>}
              </section>
            </>}
  </main>;
}
