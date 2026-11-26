import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "../types";
import { api, ApiError, errorMessage } from "../lib/commerce";
import { applicationProfile, emptySellerProfile, getSellerState, sellerStatusLabel, shopProfile, submitSeller, updateSellerShop, type SellerProfile, type SellerState, type SellerShop } from "../lib/seller";
import SellerPendingApplication from "../components/SellerApplicationView";
import SellerRegistration from "../components/SellerRegistration";
import SellerProfileForm from "../components/SellerProfileForm";
import "./Seller.css";
import "./SellerCenterLayout.css";
import SellerProducts from "./SellerProducts";
import AdminOverview from "./AdminOverview";
import SellerOrders from "./SellerOrders";
import SellerDashboard from "./SellerDashboard";
import { Icon } from "../components/Icon";

export default function SellerCenter({ user, onLogin, onShopping }: { user: User | null; onLogin: () => void; onShopping: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menuOpen]);
  const [state, setState] = useState<SellerState | null>(null);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [products, showProducts] = useState(false);
  const [overview, showOverview] = useState(true);
  const [createProduct, setCreateProduct] = useState(false);
  const [statistics,showStatistics]=useState(false);
  const [orders, showOrders] = useState(false);
  const [error, setError] = useState(""), [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const logoInput = useRef<HTMLInputElement>(null);
  const mutation = useRef(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    if (!user || user.role !== "USER" || !user.sellerEnabled) { setLoading(false); return; }
    try {
      const next = await getSellerState(signal);
      if (!signal?.aborted) { setState(next); setError(""); }
    } catch (e) {
      if (!signal?.aborted) { setState(null); setError(errorMessage(e)); }
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [user?.id, user?.role, user?.sellerEnabled]);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const focus = () => { if (!mutation.current) void load(controller.signal); };
    window.addEventListener("focus", focus);
    return () => { controller.abort(); window.removeEventListener("focus", focus); };
  }, [load]);
  async function save(profile: SellerProfile) {
    if (mutation.current) return;
    mutation.current = true; setBusy(true); setError(""); setMessage("");
    try {
      if (state?.shop) await updateSellerShop(profile); else await submitSeller(profile);
      setMessage(state?.shop ? "Đã lưu thông tin gian hàng." : "Đã gửi hồ sơ. TeaSmart sẽ xem xét và thông báo kết quả tại đây.");
      await load(); setRevision(v => v + 1);
      // Shop edits do not change account permissions; keep the active form mounted.
      if (!state?.shop) window.dispatchEvent(new Event("teasmart-profile-updated"));
    } catch (e) {
      // A conflict may mean another tab already submitted; fetch authoritative state.
      if (e instanceof ApiError && [403,409].includes(e.status)) await load();
      setError(errorMessage(e));
    } finally { mutation.current = false; setBusy(false); }
  }
  async function upload(file?: File) {
    if (!file || mutation.current) return;
    if (!["image/png","image/jpeg","image/webp"].includes(file.type) || file.size === 0 || file.size > 5 * 1024 * 1024) {
      setError("Chọn ảnh PNG, JPEG hoặc WebP, tối đa 5 MB."); return;
    }
    mutation.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const body = new FormData(); body.append("file",file);
      const shop = await api<SellerShop>("/seller/shop/logo", { method: "POST", body });
      setState(s => s ? { ...s, shop } : s); setMessage("Đã cập nhật logo.");
    } catch (e) { setError(errorMessage(e)); }
    finally { mutation.current = false; setBusy(false); if (logoInput.current) logoInput.current.value = ""; }
  }
  if (!user) return <main className="page seller-page"><h1>Kênh người bán</h1><p>Đăng nhập tài khoản khách hàng để mở gian hàng chè.</p><button className="btn btn-primary" onClick={onLogin}>Đăng nhập</button></main>;
  if (user.role !== "USER") return <main className="page seller-page"><h1>Kênh người bán</h1><p>Hãy quản lý hồ sơ người bán trong trang quản trị.</p></main>;
  if (!user.sellerEnabled) return <main className="page seller-page"><h1>Kênh người bán</h1><p>Kênh người bán chưa được mở. Bạn vẫn có thể mua sắm tại TeaSmart.</p><button className="btn btn-outline" onClick={onShopping}>Tiếp tục mua sắm</button></main>;
  if(state && (state.status === "NONE" || state.status === "REJECTED")) return <SellerRegistration key={state.application?.applicationId ?? "new"} initial={state.application ? applicationProfile(state.application) : {...emptySellerProfile,representativeName:user.name,phone:user.phone??"",representativeEmail:user.email}} busy={busy} enabled={!!state.profileDetailsEnabled} error={error} message={message} rejected={state.application?.rejectionReason} onSubmit={save} onShopping={onShopping}/>;
  return <main className={"page seller-page seller-center-shell" + (menuOpen ? " menu-open" : "")}>
    <header className="seller-center-topbar"><button type="button" aria-label="Mở hoặc đóng menu người bán" aria-expanded={menuOpen} aria-controls="seller-center-navigation" onClick={()=>setMenuOpen(!menuOpen)}><Icon name={menuOpen ? "close" : "menu"}/></button><strong>TeaSmart <span>| Seller Center</span></strong></header>
    {menuOpen && <button className="seller-menu-backdrop" aria-label="Đóng menu" onClick={()=>setMenuOpen(false)}/>}

    <div className="seller-heading"><div><span className="eyebrow">TEASMART · KÊNH NGƯỜI BÁN</span><h1>{state?.shop ? "Seller Center" : "Mở gian hàng chè"}</h1><p>Đồng hành cùng người bán chè Thái Nguyên.</p></div>
      <button className="btn btn-outline" onClick={onShopping}>Về mua sắm</button></div>
    {message && <p className="seller-notice" role="status">{message}</p>}
    {error && <div className="seller-error" role="alert">{error} <button type="button" disabled={busy} onClick={() => void load()}>Tải lại trạng thái</button></div>}
    {loading && <p role="status">Đang tải hồ sơ gian hàng…</p>}
    {state && <div className="seller-layout">
      <aside id="seller-center-navigation" className="seller-card seller-summary"><div className="seller-center-brand"><Icon name="leaf" size={32}/> TeaSmart<small>Kênh người bán</small></div><div className="seller-mark">{(state.shop?.logoUrl || state.shop?.applicationLogoUrl) ? <img src={state.shop.logoUrl || state.shop.applicationLogoUrl || undefined} alt={"Logo " + state.shop.name} onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src="/placeholder-teasmart.svg"}} /> : <span aria-hidden="true">🍃</span>}</div>
        <h2>{state.shop?.name ?? state.application?.shopName ?? "Gian hàng của bạn"}</h2>
        <span className={"seller-badge seller-status-" + state.status.toLowerCase()}>{sellerStatusLabel(state.status)}</span>
        <p>Bạn vẫn có thể đặt hàng bằng tài khoản này.</p>
        <button className="btn btn-outline" disabled={busy} onClick={() => void load()}>Kiểm tra trạng thái</button>
        {state.status === "ACTIVE" && <nav className="seller-tabs" aria-label="Quản lý gian hàng" onClick={()=>setMenuOpen(false)}>
          <button aria-pressed={overview} onClick={()=>{showStatistics(false);showOverview(true);showProducts(false);showOrders(false)}}><Icon name="home"/>Tổng quan</button>
          <button aria-pressed={products&&createProduct} disabled={!state.productsEnabled} onClick={()=>{showStatistics(false);showOverview(false);showProducts(true);showOrders(false);setCreateProduct(true)}}><Icon name="plus"/>Đăng sản phẩm</button>
          <button aria-pressed={!overview&&!products&&!orders&&!statistics} onClick={()=>{showStatistics(false);showOverview(false);showProducts(false);showOrders(false)}}><Icon name="store"/>Thông tin gian hàng</button>
          <button aria-label="Sản phẩm" disabled={!state.productsEnabled} aria-pressed={products&&!createProduct} onClick={()=>{showStatistics(false);showOverview(false);setCreateProduct(false);showProducts(true);showOrders(false)}}><Icon name="bag"/>Quản lý sản phẩm</button>
          <button aria-label="Đơn hàng" disabled={!state.productsEnabled} aria-pressed={orders} onClick={()=>{showStatistics(false);showOverview(false);showProducts(false);showOrders(true)}}><Icon name="receipt"/>Quản lý đơn hàng</button>
          <button disabled={!state.productsEnabled} aria-pressed={statistics} onClick={()=>{showOverview(false);showProducts(false);showOrders(false);showStatistics(true)}}><Icon name="coins"/>Thống kê &amp; Báo cáo</button>
        </nav>}
        <button className="btn seller-home-link" onClick={onShopping}><Icon name="arrow"/>Trở về website</button>
      </aside>
      <section className="seller-card">
        {state.status === "PENDING" && state.application && <SellerPendingApplication application={state.application} busy={busy||loading} onRefresh={()=>void load()} onShopping={onShopping}/>}
        {state.status === "SUSPENDED" && <><h2>Gian hàng đang bị khóa</h2><p>{state.shop?.statusReason || "Vui lòng liên hệ TeaSmart để được hỗ trợ."}</p><p>Thông tin gian hàng được giữ lại. Bạn chưa thể chỉnh sửa cho đến khi được mở lại.</p></>}
        {(state.status === "NONE" || state.status === "REJECTED") && <>
          <h2>{state.status === "REJECTED" ? "Cập nhật và gửi lại hồ sơ" : "Thông tin đăng ký"}</h2>
          {state.status === "REJECTED" && <p className="seller-error">Lý do từ chối: {state.application?.rejectionReason}. Hồ sơ gửi lại sẽ được xét duyệt mới; lịch sử cũ được giữ lại.</p>}
          <p>Thông tin cần chính xác để TeaSmart xét duyệt. Bạn có thể tải logo sau khi gian hàng được duyệt.</p>
          <SellerProfileForm key={String(state.application?.applicationId ?? "new")} initial={state.application ? applicationProfile(state.application) : { ...emptySellerProfile, representativeName: user.name, phone: user.phone ?? "" }} busy={busy} submitLabel="Gửi đăng ký" onSubmit={save} />
        </>}
        {state.status === "ACTIVE" && state.productsEnabled && statistics && <AdminOverview statistics seller/>}
        {state.status === "ACTIVE" && overview && <div className="seller-overview">
          <div className="seller-welcome-banner" role="button" tabIndex={0} aria-label="Xem tổng quan kinh doanh" onClick={()=>document.getElementById("seller-business-overview")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"start"})} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();e.currentTarget.click()}}}><div className="seller-welcome-copy">
            <span>Chào mừng trở lại,</span>
            <h2>{state.shop?.name} <span aria-hidden="true">👋</span></h2>
            <p>Quản lý sản phẩm, đơn hàng và theo dõi hiệu quả kinh doanh của gian hàng tại TeaSmart.</p>
          </div>
          <span className="seller-welcome-sprig" aria-hidden="true"><i/><i/><i/></span>
          </div>
          {!state.productsEnabled && <p className="seller-notice" role="status">Quản lý sản phẩm và đơn hàng chưa được mở trên môi trường này. Bạn có thể cập nhật thông tin gian hàng; hãy liên hệ quản trị viên để được hỗ trợ.</p>}
          {state.productsEnabled && <SellerDashboard onCreate={()=>{showOverview(false);showProducts(true);setCreateProduct(true)}} onProducts={()=>{showOverview(false);showProducts(true);setCreateProduct(false)}} onOrders={()=>{showOverview(false);showOrders(true)}} onStatistics={()=>{showOverview(false);showStatistics(true)}}/>}
        </div>}
        {state.status === "ACTIVE" && state.productsEnabled && products && <SellerProducts key={createProduct ? "create" : "list"} initialCreate={createProduct} />}
        {state.status === "ACTIVE" && state.productsEnabled && orders && <SellerOrders />}
        {state.status === "ACTIVE" && state.shop && (!overview && !products && !orders && !statistics) && <>
          <h2>Thông tin gian hàng</h2><p>Cập nhật thông tin liên hệ và giới thiệu gian hàng của bạn.</p>
          <div className="seller-logo-upload"><label>Logo gian hàng<input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e => void upload(e.target.files?.[0])} /></label><small>PNG, JPEG hoặc WebP, tối đa 5 MB.</small></div>
          <SellerProfileForm key={state.shop.shopId + ":" + revision} initial={shopProfile(state.shop)} detailsEnabled={state.profileDetailsEnabled} busy={busy} submitLabel="Lưu thông tin" onSubmit={save} />
        </>}
      </section>
    </div>}
  </main>;
}
