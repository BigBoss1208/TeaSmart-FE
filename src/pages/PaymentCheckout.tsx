import CheckoutReceipt from "../components/CheckoutReceipt";
import {readCheckoutReceipt,rememberCheckoutReceipt} from "../lib/checkoutReceipt";
import ImageWithFallback from "../components/ImageWithFallback";
import "./CustomerExperience.css";
import { normalizeShippingPhone, validShippingPhone } from "../lib/phone";
import AddressBook, { addressText, type SavedAddress } from "../components/AddressBook";
import { useEffect, useRef, useState } from "react";
import type { User, Order, Page, Product } from "../types";
import { Icon } from "../components/Icon";
import { money } from "../components/ProductCard";
import { api, ApiError, errorMessage, mapOrder, sandboxRedirect,
  type ApiOrder, type CartLine, type CheckoutSession, type CheckoutSessionAction } from "../lib/commerce";

const paymentGroups = [
  { title: "01 — Thanh toán khi nhận hàng", options: [
    { id: "COD", title: "COD – Thanh toán khi nhận hàng", description: "Thanh toán bằng tiền mặt khi nhận đơn hàng.", logo: null, available: true },
  ] },
  { title: "02 — Thanh toán trực tuyến", options: [
    { id: "VNPAY", title: "VNPay", description: "Bạn sẽ được chuyển đến cổng VNPay để hoàn tất thanh toán.", logo: "/payments/vnpay.svg", available: true },
    { id: "MOMO", title: "Ví MoMo", description: "Thanh toán bằng ví điện tử MoMo.", logo: "/payments/momo.svg", available: false },
    { id: "VIETQR", title: "Chuyển khoản VietQR", description: "Quét mã QR để chuyển khoản ngân hàng.", logo: "/payments/vietqr.svg", available: false },
  ] },
] as const;

export default function PaymentCheckout({ cart, products, user, navigate, onOrderPlaced, openOrder, openOrders, buyNow, buyAgain, selectedItems }: {
  buyNow?: { productId: number; quantity: number; intentId: string };
  buyAgain?: { product: Product; quantity: number }[];
  selectedItems?: {cartItemId:number;quantity:number}[];
  products: Product[];
  openOrder?: (id: number) => void; openOrders?: () => void;
  cart: CartLine[]; user: User | null; navigate: (page: Page) => void; onOrderPlaced: (order: Order, direct?: boolean) => void;
}) {
  const storageKey = buyNow ? `teasmart_checkout_buy_now_${buyNow.intentId}` : "teasmart_checkout_session";
  const purchaseIntentKey = JSON.stringify({
    sourceType: buyAgain ? "BUY_AGAIN" : buyNow ? "BUY_NOW" : selectedItems ? "SELECTED" : "CART",
    buyNowIntentId: buyNow?.intentId ?? null,
    selectedItems: selectedItems?.map(item => ({ cartItemId: item.cartItemId, quantity: item.quantity })).sort((a, b) => a.cartItemId - b.cartItemId) ?? [],
    items: cart.map(line => ({ productId: line.product.id, quantity: line.qty })).sort((a, b) => a.productId - b.productId),
  });
  const subtotal=cart.reduce((sum,line)=>sum+line.product.price*line.qty,0);
  const [receipt,setReceipt]=useState(()=>readCheckoutReceipt(String(user?.id)));
  const [receiptNotice,setReceiptNotice]=useState("");
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<"COD" | "VNPAY">(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
      return saved?.userId === String(user?.id) && saved.intentKey === purchaseIntentKey && saved.method === "VNPAY" ? "VNPAY" : "COD";
    } catch { return "COD"; }
  });
  const [checkoutSession, setCheckoutSession] = useState<CheckoutSession | null>(null);
  const [checkoutDraft, setCheckoutDraft] = useState<Record<string, unknown> | null>(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
      return saved?.userId === String(user?.id) && saved.intentKey === purchaseIntentKey && !saved.sessionId && saved.requestBody ? saved.requestBody : null;
    } catch { return null; }
  });
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [addressEditorOpen, setAddressEditorOpen] = useState(false);
  // Only a draft created after an authenticated terminal cancellation may change
  // payment method. An uncertain submission keeps its original retry lock.
  const verifiedCancellationDraft = (() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
      return saved?.verifiedCancellationDraft === true && saved.userId === String(user?.id)
        && saved.intentKey === purchaseIntentKey && saved.sessionId == null;
    } catch { return false; }
  })();

  const paymentRef = useRef<HTMLElement>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState("");
  const [unresolvedSessions, setUnresolvedSessions] = useState<CheckoutSession[]>([]);
  const [unresolvedLoaded, setUnresolvedLoaded] = useState(false);
  const [unresolvedCheckFailed, setUnresolvedCheckFailed] = useState(false);
  const [confirmIndependentPurchase, setConfirmIndependentPurchase] = useState(false);
  const independentPurchaseIntentRef = useRef<string | null>(null);
  const checkoutFormRef = useRef<HTMLFormElement>(null);
  const [sessionRestorePending, setSessionRestorePending] = useState(() => {
    try { const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null"); return saved?.userId === String(user?.id) && Number.isSafeInteger(saved.sessionId); }
    catch { return false; }
  });
  const [sessionRestoreFailed, setSessionRestoreFailed] = useState(false);
  const gatewayRedirectPending = useRef(false);
  useEffect(() => {
    // Back/forward cache restores the same React instance. Unlock the UI only
    // on return; the saved PENDING session still prevents another attempt.
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      gatewayRedirectPending.current = false;
      inFlight.current = false;
      independentPurchaseIntentRef.current = null;
      setConfirmIndependentPurchase(false);
      setBusy(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);
  const displayedSubtotal = checkoutSession?.subtotal ?? subtotal;
  const displayedShipping = checkoutSession?.shippingFee ?? 0;
  const displayedTotal = checkoutSession?.totalAmount ?? subtotal;
  useEffect(() => {
    if (!user) return;
    const abort = new AbortController();
    const savedSession = (() => { try { const x = JSON.parse(sessionStorage.getItem(storageKey) ?? "null"); return x?.userId === String(user.id) && Number.isSafeInteger(x.sessionId) ? x : null; } catch { return null; } })();
    // Cart hydration is asynchronous. An empty initial snapshot is not evidence
    // of a new purchase intent and must not discard a saved payment session.
    if (savedSession && cart.length === 0) {
      setSessionRestorePending(true);
      return () => abort.abort();
    }
    {
      setUnresolvedLoaded(false);
      setUnresolvedCheckFailed(false);
      void api<CheckoutSession[]>("/checkout-sessions/active", { signal: abort.signal }).then(rows => {
        if (!abort.signal.aborted) setUnresolvedSessions(rows.filter(s => s.latestAttemptStatus === "UNKNOWN" || s.latestAttemptStatus === "PENDING" || s.reconciliationRequired));
      }).catch(() => { if (!abort.signal.aborted) { setUnresolvedCheckFailed(true); setError("Không thể kiểm tra giao dịch thanh toán cũ. Hãy tải lại trang trước khi tiếp tục mua."); } })
        .finally(() => { if (!abort.signal.aborted) setUnresolvedLoaded(true); });
    }
    const intentMatches = savedSession?.intentKey === purchaseIntentKey;
    const legacySessionNeedsCheck = !!savedSession && !savedSession.intentKey;
    if (savedSession && !intentMatches && !legacySessionNeedsCheck) {
      const current = (() => { try { return JSON.parse(sessionStorage.getItem(storageKey) ?? "null"); } catch { return null; } })();
      if (current?.userId === String(user.id) && current.sessionId === savedSession.sessionId) sessionStorage.removeItem(storageKey);
      setCheckoutSession(null); setSessionRestorePending(false);
    } else if (savedSession) {
      setSessionRestorePending(true); setSessionRestoreFailed(false);
      void api<CheckoutSession>(`/checkout-sessions/${savedSession.sessionId}`, { signal: abort.signal }).then(s => {
        if (abort.signal.aborted) return;
        const expected = new Map<number, number>();
        for (const line of cart) expected.set(line.product.id, (expected.get(line.product.id) ?? 0) + line.qty);
        const actual = new Map<number, number>();
        for (const item of s.items) actual.set(item.productId, (actual.get(item.productId) ?? 0) + item.quantity);
        const sameItems = expected.size === actual.size && [...expected].every(([productId, quantity]) => actual.get(productId) === quantity);
        if (!sameItems) {
          const current = (() => { try { return JSON.parse(sessionStorage.getItem(storageKey) ?? "null"); } catch { return null; } })();
          if (current?.userId === String(user.id) && current.sessionId === savedSession.sessionId) sessionStorage.removeItem(storageKey);
          setCheckoutSession(null); setSessionRestorePending(false); return;
        }
        // A server-confirmed terminal cancellation is not an unresolved purchase.
        // Retire only this matching local session; do not submit on refresh.
        if (s.reservationStatus === "RELEASED" && !s.orderId
            && ((s.status === "CANCELLED" && s.latestAttemptStatus === "FAILED_FINAL" && !s.reconciliationRequired)
                || s.status === "ADMIN_QUARANTINED")) {
          const { attemptKey: _oldAttempt, attemptReference: _oldReference, ...draft } = savedSession;
          const requestBody = savedSession.requestBody && typeof savedSession.requestBody === "object"
            ? { ...savedSession.requestBody, shipping: { recipientName: s.recipientName,
                recipientPhone: s.recipientPhone, shippingAddress: s.shippingAddress, note: s.note } }
            : null;
          if (requestBody) {
            sessionStorage.setItem(storageKey, JSON.stringify({ ...draft, intentKey: purchaseIntentKey,
              key: crypto.randomUUID(), sessionId: null, requestBody, verifiedCancellationDraft: true }));
            setCheckoutDraft(requestBody);
          } else {
            sessionStorage.removeItem(storageKey);
            setCheckoutDraft(null);
          }
          setCheckoutSession(null);
          return;
        }
        sessionStorage.setItem(storageKey, JSON.stringify({ ...savedSession, intentKey: purchaseIntentKey }));
        setCheckoutSession(s);
        if (s.status === "COMPLETED" && s.orderId) { rememberCheckoutReceipt(String(user.id), s.orderId); setReceipt(s.orderId); }
        if (s.latestAttemptStatus === "FAILED_FINAL") {
          delete savedSession.attemptKey; delete savedSession.attemptReference;
          sessionStorage.setItem(storageKey, JSON.stringify({ ...savedSession, intentKey: purchaseIntentKey }));
        }
      }).catch(() => { if (!abort.signal.aborted) setSessionRestoreFailed(true); })
        .finally(() => { if (!abort.signal.aborted) setSessionRestorePending(false); });
    } else setSessionRestorePending(false);
    return () => abort.abort();
  }, [user?.id, buyNow?.intentId, purchaseIntentKey]);

  const recoveredSessionBlocked = !!checkoutSession && (checkoutSession.status !== "READY" || checkoutSession.reservationStatus !== "HELD" || checkoutSession.reconciliationRequired || ["PENDING", "UNKNOWN", "SUCCEEDED"].includes(checkoutSession.latestAttemptStatus ?? ""));

  async function checkCurrentSession() {
    if (!checkoutSession || busy) return;
    setBusy(true); setError("");
    try {
      const updated = await api<CheckoutSession>(`/checkout-sessions/${checkoutSession.checkoutSessionId}`);
      setCheckoutSession(updated);
      if (updated.orderId) { rememberCheckoutReceipt(String(user?.id), updated.orderId); setReceipt(updated.orderId); }
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  function selectAddress(selected: SavedAddress) {
    setSelectedAddressId(selected.addressId > 0 ? selected.addressId : null);
    if (!checkoutSession && !checkoutDraft) {
      setName(selected.recipientName);
      setPhone(selected.phone);
      setAddress(addressText(selected));
    }
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current || !user) return;
    if (sessionRestorePending || sessionRestoreFailed) { setError("Không thể xác nhận phiên Checkout đã lưu. Hãy tải lại hoặc kiểm tra giao dịch cũ trước khi đặt hàng mới."); return; }
    const startingIndependentBuyNow = !!(buyNow && independentPurchaseIntentRef.current && checkoutSession && recoveredSessionBlocked);
    if (recoveredSessionBlocked && !startingIndependentBuyNow) { setError("Phiên mua này chưa an toàn để thanh toán lại. Vui lòng kiểm tra trạng thái."); return; }
    if (addressEditorOpen) { setError("Hãy lưu hoặc hủy địa chỉ đang chỉnh sửa trước khi đặt hàng."); return; }
    if (!checkoutSession && unresolvedCheckFailed) { setError("Không thể kiểm tra giao dịch cũ. Vui lòng tải lại trang."); return; }
    if (!checkoutSession && !unresolvedLoaded) { setError("Đang kiểm tra giao dịch thanh toán cũ. Vui lòng chờ trước khi tiếp tục."); return; }
    if (!checkoutSession && new Set(cart.map(line=>line.shopId??null)).size>1) { setError("Vui lòng quay lại giỏ và chỉ chọn sản phẩm của một gian hàng."); return; }
    if (!checkoutSession && !checkoutDraft && (!selectedAddressId || !name.trim() || !validShippingPhone(phone) || !address.trim() || address.length>500 || note.length>500)) {setError("Vui lòng chọn địa chỉ nhận hàng hợp lệ.");return;}
    if (!checkoutSession && !buyNow && unresolvedSessions.some(session => session.items.some(item => cart.some(line => line.product.id === item.productId)))) {
      setError("Giao dịch trước đang được xác minh. Vui lòng kiểm tra kết quả trước khi thanh toán lại."); return;
    }
    inFlight.current = true; setBusy(true); setError("");
    const storage = (() => { try { const x = JSON.parse(sessionStorage.getItem(storageKey) ?? "null"); return x?.userId === String(user.id) && x?.intentKey === purchaseIntentKey ? x : null; } catch { return null; } })();
    const sameUnresolvedProduct = !!buyNow && unresolvedSessions.some(s => s.items.some(item => buyNow.productId === item.productId));
    if (!checkoutSession && sameUnresolvedProduct && !independentPurchaseIntentRef.current) {
      setConfirmIndependentPurchase(true);
      inFlight.current = false; setBusy(false); setError(""); return;
    }
    const key = startingIndependentBuyNow ? crypto.randomUUID() : storage?.key ?? crypto.randomUUID();
    if (startingIndependentBuyNow) {
      sessionStorage.removeItem(storageKey);
      setCheckoutSession(null);
      setCheckoutDraft(null);
    }
    let requestBody = startingIndependentBuyNow ? null : checkoutDraft;
    if ((!checkoutSession || startingIndependentBuyNow) && !requestBody) requestBody = {
      sourceType: buyAgain ? "BUY_AGAIN" : buyNow ? "BUY_NOW" : selectedItems ? "SELECTED" : "CART",
      ...(buyNow ? { buyNowProductId: buyNow.productId, buyNowQuantity: buyNow.quantity } : {}),
      ...(selectedItems ? { selectedItems } : {}),
      ...(buyAgain ? { buyAgainItems: buyAgain.map(item => ({ productId: item.product.id, quantity: item.quantity })) } : {}),
      ...(buyNow && independentPurchaseIntentRef.current ? { independentPurchaseIntentId: independentPurchaseIntentRef.current } : {}),
      shipping: startingIndependentBuyNow && checkoutSession
        ? { recipientName: checkoutSession.recipientName, recipientPhone: checkoutSession.recipientPhone, shippingAddress: checkoutSession.shippingAddress, note: checkoutSession.note }
        : { recipientName: name.trim(), recipientPhone: normalizeShippingPhone(phone), shippingAddress: address.trim(), note: note.trim() || null },
    };
    if ((!checkoutSession || startingIndependentBuyNow) && requestBody && buyNow && independentPurchaseIntentRef.current)
      requestBody = { ...requestBody, sourceType: "BUY_NOW", buyNowProductId: buyNow.productId,
        buyNowQuantity: buyNow.quantity, independentPurchaseIntentId: independentPurchaseIntentRef.current };
    sessionStorage.setItem(storageKey, JSON.stringify({ userId: String(user.id), intentKey: purchaseIntentKey, key, method, sessionId: startingIndependentBuyNow ? null : checkoutSession?.checkoutSessionId ?? storage?.sessionId ?? null, ...((!checkoutSession || startingIndependentBuyNow) && requestBody ? { requestBody } : {}) }));
    if ((!checkoutSession || startingIndependentBuyNow) && requestBody) setCheckoutDraft(requestBody);
    try {
      let session = startingIndependentBuyNow ? null : checkoutSession;
      if (!session) {
        session = await api<CheckoutSession>("/checkout-sessions", { method: "POST", headers: { "Idempotency-Key": key }, body: JSON.stringify(requestBody) });
        setCheckoutSession(session);
        setCheckoutDraft(null);
        sessionStorage.setItem(storageKey, JSON.stringify({ userId: String(user.id), intentKey: purchaseIntentKey, key, method, sessionId: session.checkoutSessionId, requestBody }));
      }
      if (method === "VNPAY") {
        const attemptKey = session.latestAttemptStatus !== "FAILED_FINAL" && storage?.sessionId === session.checkoutSessionId && storage?.attemptKey ? storage.attemptKey : crypto.randomUUID();
        sessionStorage.setItem(storageKey, JSON.stringify({ userId: String(user.id), intentKey: purchaseIntentKey, key, method, sessionId: session.checkoutSessionId, attemptKey, requestBody }));
        const result = await api<CheckoutSessionAction>(`/checkout-sessions/${session.checkoutSessionId}/payment-attempts/vnpay`, { method: "POST", headers: { "Idempotency-Key": attemptKey } });
        sessionStorage.setItem(storageKey, JSON.stringify({ userId: String(user.id), intentKey: purchaseIntentKey, key, method, sessionId: session.checkoutSessionId, attemptKey, attemptReference: result.attemptReference, requestBody }));
        setCheckoutSession(result.session);
        if (!result.paymentUrl) throw new ApiError(502, "VNPAY_PAYMENT_URL_MISSING", "VNPay chưa trả đường dẫn thanh toán. Hãy kiểm tra trạng thái phiên trước khi thử lại.");
        sandboxRedirect(result.paymentUrl);
        // location.assign starts navigation asynchronously. Keep the submit
        // lock until departure so PENDING is not rendered as a recovery step.
        gatewayRedirectPending.current = true;
        return;
      }
      const completed = await api<CheckoutSession>(`/checkout-sessions/${session.checkoutSessionId}/confirm-cod`, { method: "POST" });
      if (!completed.orderId) throw new Error("Order confirmation is still pending.");
      const order = await api<ApiOrder>(`/orders/${completed.orderId}`);
      rememberCheckoutReceipt(String(user.id), order.orderId); setReceipt(order.orderId);
      sessionStorage.removeItem(storageKey);
      onOrderPlaced(mapOrder(order), !!buyNow || !!buyAgain);
    } catch (e) {
      if (e instanceof ApiError && e.code === "PRODUCT_PAYMENT_STATUS_UNRESOLVED" && buyNow) {
        if (!independentPurchaseIntentRef.current) { setConfirmIndependentPurchase(true); setError(""); }
        else setError("Backend chưa chấp nhận intent mua mới. Chưa tạo đơn; vui lòng thử lại hoặc liên hệ hỗ trợ.");
        return;
      }
      if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
        setCheckoutDraft(null);
        const saved = (() => { try { return JSON.parse(sessionStorage.getItem(storageKey) ?? "null"); } catch { return null; } })();
        if (!saved?.sessionId) sessionStorage.removeItem(storageKey);
      }
      setError(errorMessage(e));
    } finally { if (!gatewayRedirectPending.current) { inFlight.current = false; setBusy(false); } }
  }
  if (!user || user.role !== "USER") return <main className="page simple-page"><h1>Thanh toán</h1>
    <p>Vui lòng đăng nhập tài khoản khách hàng.</p><button className="btn btn-primary" onClick={() => navigate("login")}>Đăng nhập</button></main>;
  if (receipt) return <CheckoutReceipt orderId={receipt} products={products} notice={receiptNotice} openOrder={()=>openOrder?.(receipt)} openOrders={()=>openOrders?openOrders():navigate("account")} shopping={()=>navigate("explore")} home={()=>navigate("home")}/>;
  const recoveredShipping = checkoutDraft?.shipping && typeof checkoutDraft.shipping === "object"
    ? checkoutDraft.shipping as { recipientName?: string; recipientPhone?: string; shippingAddress?: string; note?: string | null }
    : null;
  const submitBlockedReason = busy ? "Đang xử lý yêu cầu, vui lòng chờ."
    : sessionRestorePending ? "Đang kiểm tra phiên Checkout đã lưu."
    : sessionRestoreFailed ? "Không thể kiểm tra phiên Checkout đã lưu. Hãy tải lại hoặc xem trạng thái giao dịch cũ."
    : recoveredSessionBlocked ? "Phiên mua này đang chờ xác minh hoặc đã kết thúc; chưa thể tạo thanh toán/đơn hàng mới từ phiên này."
    : addressEditorOpen ? "Vui lòng lưu hoặc hủy địa chỉ đang chỉnh sửa."
    : !checkoutSession && unresolvedCheckFailed ? "Không thể kiểm tra giao dịch cũ. Vui lòng tải lại trang."
    : !checkoutSession && !unresolvedLoaded ? "Đang kiểm tra giao dịch thanh toán cũ."
    : !checkoutSession && !buyNow && unresolvedSessions.some(session => session.items.some(item => cart.some(line => line.product.id === item.productId))) ? "Sản phẩm này thuộc giao dịch chưa xác định. Vui lòng xử lý giao dịch cũ trước khi mua lại."
    : !checkoutSession && !checkoutDraft && selectedAddressId == null ? "Vui lòng chọn địa chỉ nhận hàng."
    : !checkoutSession && !checkoutDraft && (!name.trim() || !validShippingPhone(phone) || !address.trim() || address.length > 500 || note.length > 500) ? "Vui lòng kiểm tra họ tên, số điện thoại, địa chỉ và lời nhắn."
    : !checkoutSession && !checkoutDraft && !cart.length ? "Chưa có sản phẩm để đặt hàng."
    : !checkoutSession && !checkoutDraft && cart.some(item => item.available === false) ? "Có sản phẩm hiện không thể đặt. Vui lòng kiểm tra giỏ hàng."
    : "";
  const canSubmitOrder = !submitBlockedReason && !confirmIndependentPurchase;

  return <main className="page simple-page checkout-page checkout-experience">
    <div className="checkout-heading">
      <span className="eyebrow">TEASMART · ĐẶT HÀNG</span><h1>Thông tin thanh toán</h1>
      <p>Kiểm tra địa chỉ, lời nhắn và sản phẩm trước khi xác nhận.</p>
    </div>
    {!busy && !checkoutSession && unresolvedSessions.some(s => s.items.some(i => cart.some(line => line.product.id === i.productId))) && <section className="checkout-unresolved-warning" role="alert">Sản phẩm này thuộc giao dịch chưa xác định. Chưa thể tạo giao dịch trùng; hãy xem trạng thái giao dịch trong lịch sử thanh toán.</section>}
    {!busy && checkoutSession && recoveredSessionBlocked && <section className="checkout-unresolved-warning" aria-label="Trạng thái thanh toán cần kiểm tra">
      <strong>Giao dịch trước chưa có kết quả xác minh</strong>
      <p>{checkoutSession.recipientName} · {checkoutSession.recipientPhone} · {checkoutSession.shippingAddress}</p>
      <p>Đơn cũ vẫn đang được giữ để đối soát. Không gửi thanh toán lặp cho phiên đó.</p>
      <button type="button" className="btn btn-outline" disabled={busy} onClick={() => void checkCurrentSession()}>Kiểm tra trạng thái phiên này</button>
      {buyNow && <button type="button" className="btn btn-primary" disabled={busy} onClick={() => setConfirmIndependentPurchase(true)}>Mua mới độc lập</button>}
    </section>}
    {checkoutSession && !recoveredSessionBlocked && <section className="checkout-session-details" aria-label="Phiên mua hiện tại">
      <strong>Thông tin giao hàng đã xác nhận</strong>
      <p>{checkoutSession.recipientName} · {checkoutSession.recipientPhone} · {checkoutSession.shippingAddress}</p>
    </section>}
    {checkoutSession?.shopName && <p>Gian hàng: {checkoutSession.shopName}</p>}
    <form ref={checkoutFormRef} className="checkout-grid checkout-single-page" onSubmit={submit}>
      <div className="checkout-address">
          <AddressBook
            locked={busy || !!checkoutSession || !!checkoutDraft}
            onSelect={selectAddress}
            onDraftChange={setAddressEditorOpen}
            onAddressSaved={() => paymentRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })}
            note={note}
            onNoteChange={setNote}
          />
      </div>
      <aside className="checkout-summary">
        <div className="summary-title">Đơn hàng của bạn</div>
        {checkoutSession ? checkoutSession.items.map(item => {
          const product = products.find(candidate => candidate.id === item.productId) ?? cart.find(line => line.product.id === item.productId)?.product;
          return <div className="checkout-item" key={item.productId}><ImageWithFallback src={product?.image ?? ""} alt={item.productName} />
            <span><strong>{item.productName}</strong><small>{product?.weight || "Quy cách theo sản phẩm"} · SL {item.quantity}</small><small>Đơn giá: {money(item.unitPrice)}</small></span><b>{money(item.subtotal)}</b>
          </div>;
        }) : cart.map(item => <div className="checkout-item" key={item.product.id}><ImageWithFallback src={item.product.image} alt={item.product.name} />
          <span><strong>{item.product.name}</strong><small>{item.product.weight || "Quy cách theo sản phẩm"} · SL {item.qty}</small><small>Đơn giá: {money(item.product.price)}</small>{item.available === false && <small>Sản phẩm hiện không thể đặt</small>}</span><b>{money(item.product.price * item.qty)}</b>
        </div>)}
        <div className="checkout-voucher"><strong>Mã giảm giá</strong><p>Chưa hỗ trợ áp dụng mã giảm giá tại Checkout.</p></div>
        <div className="checkout-subtotal"><span>Tạm tính sản phẩm</span><strong>{money(displayedSubtotal)}</strong></div>
        <div className="checkout-fee"><span>Phí vận chuyển</span><strong>{money(displayedShipping)}</strong></div>
        <div className="checkout-total"><span>Tổng thanh toán dự kiến</span><strong>{money(displayedTotal)}</strong></div>

      <div className="checkout-confirmation">
        {confirmIndependentPurchase && <div role="alertdialog" aria-modal="true" aria-labelledby="independent-purchase-title" className="checkout-unresolved-confirmation">
          <h2 id="independent-purchase-title">Giao dịch VNPay trước chưa được xác minh</h2>
          <p>Giao dịch cũ có thể vẫn được thanh toán. Nếu tiếp tục, đây là lần mua mới độc lập và bạn có thể phát sinh thanh toán cho cả hai giao dịch.</p>
          <button type="button" className="btn btn-secondary" onClick={() => { independentPurchaseIntentRef.current = null; setConfirmIndependentPurchase(false); }}>Hủy</button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => { if (inFlight.current || independentPurchaseIntentRef.current) return; independentPurchaseIntentRef.current = crypto.randomUUID(); setConfirmIndependentPurchase(false); queueMicrotask(() => checkoutFormRef.current?.requestSubmit()); }}>Xác nhận mua mới</button>
        </div>}
        {submitBlockedReason && <p id="checkout-submit-reason" role="status">{submitBlockedReason}</p>}
        {error && <p role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={!canSubmitOrder} aria-describedby={submitBlockedReason ? "checkout-submit-reason" : undefined}>{busy ? "Đang xử lý…" : method === "VNPAY" ? "Thanh toán qua VNPay" : "Đặt hàng"}</button>
      </div>
        <div className="checkout-assurance"><strong>Thông tin mua hàng</strong><p>Kiểm tra sản phẩm và địa chỉ trước khi đặt hàng.</p><p>COD: thanh toán khi nhận hàng. VNPay: chỉ xác nhận thanh toán khi hệ thống đã kiểm tra giao dịch.</p></div>

      </aside>

          <section className="form-section" ref={paymentRef}>
            <div className="form-title">Phương thức thanh toán</div>
            <div className="checkout-payment-methods">
              {paymentGroups.map(group => <fieldset className="checkout-payment-group" key={group.title} disabled={busy || (!!checkoutDraft && !verifiedCancellationDraft)}>
                <legend>{group.title}</legend>
                <div className="checkout-payment-options">{group.options.map(option => <label key={option.id}
                  className={`checkout-payment-card${method === option.id ? " is-selected" : ""}${!option.available ? " is-unavailable" : ""}`}>
                  <input type="radio" name="pay" value={option.id} checked={method === option.id}
                    disabled={!option.available || busy || (!!checkoutDraft && !verifiedCancellationDraft)}
                    onChange={() => { if (option.available && (option.id === "COD" || option.id === "VNPAY")) setMethod(option.id); }} />
                  <span className="checkout-payment-logo" aria-hidden="true">{option.logo ? <img src={option.logo} alt="" /> : <Icon name="bag" size={26} />}</span>
                  <span className="checkout-payment-copy"><span className="checkout-payment-heading"><strong>{option.title}</strong>
                    {!option.available && <span className="checkout-payment-badge">Sắp tích hợp</span>}
                    {option.id === "VNPAY" && <span className="checkout-payment-badge is-sandbox">Sandbox</span>}
                  </span><span className="checkout-payment-description">{option.description}</span>
                    {option.id === "VNPAY" && <span className="checkout-payment-sandbox-note">Môi trường thử nghiệm, không dùng tiền thật.</span>}
                  </span>
                </label>)}</div>
              </fieldset>)}
            </div>
          </section>

      <div className="checkout-confirmation-mobile">
        {submitBlockedReason && <p role="status">{submitBlockedReason}</p>}
        <button type="submit" className="btn btn-primary" disabled={!canSubmitOrder}>{busy ? "Đang xử lý…" : method === "VNPAY" ? "Thanh toán qua VNPay" : "Đặt hàng"}</button>
      </div>
    </form>
  </main>;
}
