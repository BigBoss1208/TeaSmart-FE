import "./AdminPolish.css";
import AdminSellers from "./AdminSellers";
import AdminReviews from "./AdminReviews";
import AdminPlaces from "./AdminPlaces";
import AdminCategories from "./AdminCategories";
import AdminProducts from "./AdminProducts";
import AdminOverview from "./AdminOverview";
import AdminCustomers from "./AdminCustomers";
import AdminOrdersWorkspace from "./AdminOrdersWorkspace";
import { useState, useEffect, useRef } from "react";
import { Order, Customer, Review, AdminSubView, User } from "../types";
import { Icon } from "../components/Icon";
import { money } from "../components/ProductCard";

export const adminRoutes: Record<AdminSubView, string> = {
  Sellers: "/admin/sellers",
  Dashboard: "/admin",
  Products: "/admin/products",
  Categories: "/admin/categories",
  Orders: "/admin/orders",
  Customers: "/admin/customers",
  Reviews: "/admin/reviews",
  TeaRegions: "/admin/tea-regions",
  Shops: "/admin/shops",
  Statistics: "/admin/statistics"
};

export function getAdminViewFromPath(path: string): AdminSubView {
  if (path.includes("/sellers")) return "Sellers";
  if (path.includes("/products")) return "Products";
  if (path.includes("/categories")) return "Categories";
  if (path.includes("/orders")) return "Orders";
  if (path.includes("/customers")) return "Customers";
  if (path.includes("/reviews")) return "Reviews";
  if (path.includes("/tea-regions")) return "TeaRegions";
  if (path.includes("/shops")) return "Shops";
  if (path.includes("/statistics")) return "Statistics";
  return "Dashboard";
}

export function AdminPortal({
  onProductsChanged,
  onCategoriesChanged,
  onPlacesChanged,
  orders,
  onUpdateOrderStatus,
  customers,
  onUpdateCustomerStatus,
  reviews,
  onToggleReviewStatus,
  onExitAdmin,
  onLogout,
  currentUser,
  initialSubView = "Dashboard"
}: {
  onProductsChanged?: () => Promise<void>;
  onCategoriesChanged?: () => Promise<void>;
  onPlacesChanged?: () => Promise<void>;
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: Order["status"]) => void;
  customers: Customer[];
  onUpdateCustomerStatus?: (customerId: number, status: Customer["status"]) => void;
  reviews: Review[];
  onToggleReviewStatus: (reviewId: number) => void;
  onExitAdmin: () => void;
  onLogout: () => void;
  currentUser?: User | null;
  initialSubView?: AdminSubView;
}) {
  const [view, setView] = useState<AdminSubView>(initialSubView);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => { mainRef.current?.scrollTo(0, 0); setMobileSidebarOpen(false); }, [view]);
  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileSidebarOpen(false); };
    const desktop = window.matchMedia("(min-width: 901px)");
    const resize = () => { if (desktop.matches) setMobileSidebarOpen(false); };
    window.addEventListener("keydown", close); desktop.addEventListener("change", resize);
    return () => { window.removeEventListener("keydown", close); desktop.removeEventListener("change", resize); };
  }, [mobileSidebarOpen]);

  // Sync initialSubView when props change
  useEffect(() => {
    setView(initialSubView);
  }, [initialSubView]);

  const handleSelectView = (subView: AdminSubView) => {
    setView(subView);
    setMobileSidebarOpen(false);
    const targetUrl = adminRoutes[subView];
    window.history.pushState(null, "", targetUrl);
  };

  // ----------------------------------------------------
  // Modals state
  // ----------------------------------------------------

  const [showOrderModal, setShowOrderModal] = useState<Order | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState<Customer | null>(null);

  const menuItems: { id: AdminSubView; label: string; icon: string; path: string }[] = [
    { id: "Dashboard", label: "Tổng quan", icon: "📊", path: "/admin" },
    { id: "Products", label: "Sản phẩm", icon: "🍵", path: "/admin/products" },
    { id: "Categories", label: "Danh mục", icon: "📁", path: "/admin/categories" },
    { id: "Orders", label: "Đơn hàng", icon: "📦", path: "/admin/orders" },
    { id: "Customers", label: "Khách hàng", icon: "👥", path: "/admin/customers" },
    { id: "Reviews", label: "Đánh giá", icon: "⭐", path: "/admin/reviews" },
    { id: "TeaRegions", label: "Vùng chè", icon: "🗺️", path: "/admin/tea-regions" },
    { id: "Sellers", label: "Người bán & Gian hàng", icon: "🌿", path: "/admin/sellers" },
    { id: "Shops", label: "Cửa hàng & HTX", icon: "🏬", path: "/admin/shops" },
    { id: "Statistics", label: "Thống kê", icon: "📈", path: "/admin/statistics" }
  ];

  return (
    <main className={`admin-page${view === "Dashboard" || view === "Statistics" ? " admin-report-page" : ""}`}>
      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="admin-mobile-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* LEFT SIDEBAR */}
      <aside id="teasmart-admin-sidebar" aria-label="Menu quản trị" className={`admin-side ${mobileSidebarOpen ? "open" : ""}`}>
        <div className="logo" style={{ cursor: "pointer" }} onClick={onExitAdmin}>
          <span className="logo-mark">
            <Icon name="leaf" />
          </span>
          <span>TeaSmart</span>
        </div>
        <small>BẢNG ĐIỀU KHIỂN QUẢN TRỊ</small>

        <nav>
          {menuItems.map((m) => (
            <button
              className={view === m.id ? "active" : ""}
              key={m.id}
              onClick={() => handleSelectView(m.id)}
            >
              <span style={{ fontSize: "14px" }}>{m.icon}</span>
              {m.label}
            </button>
          ))}
        </nav>

        {/* Back to Store & Logout Links in Sidebar */}
        <div className="admin-side-foot">
          <button
            onClick={onExitAdmin}
            className="admin-side-action-btn"
            title="Quay lại giao diện cửa hàng"
          >
            ← Về cửa hàng chính
          </button>
          <button
            onClick={onLogout}
            className="admin-side-action-btn admin-side-logout"
            title="Đăng xuất khỏi phiên quản trị"
          >
            Đăng xuất
          </button>
        </div>

        <div className="admin-user">
          <span className="admin-user-avatar">
            {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : "QT"}
          </span>
          <div>
            <strong>{currentUser?.name || "Quản trị viên"}</strong>
            <small>{currentUser?.email || "admin@teasmart.vn"}</small>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <section ref={mainRef} className="admin-main">
        {/* TOPBAR */}
        <header className="admin-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Hamburger button for Mobile / Tablet */}
            <button
              className="admin-menu-toggle"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              aria-label={mobileSidebarOpen ? "Đóng menu quản trị" : "Mở menu quản trị"}
              aria-expanded={mobileSidebarOpen}
              aria-controls="teasmart-admin-sidebar"
            >
              <Icon name="menu" size={20} />
            </button>
            <div hidden={view === "Sellers"}>
              <div className="admin-title">
                {menuItems.find((m) => m.id === view)?.label}
              </div>
              <p className="admin-subtext">
                Hệ thống quản lý TeaSmart. Bản ghi DEV/test được giữ riêng về nội dung, không phải dữ liệu hàng hóa đã xác minh.
              </p>
            </div>
          </div>

        </header>

        {/* ========================================================
            1. DASHBOARD VIEW (/admin)
            ======================================================== */}
        {view === "Dashboard" && <AdminOverview key="overview" />}

        {/* ========================================================
            2. PRODUCTS VIEW (/admin/products)
            ======================================================== */}
        {view === "Products" && <AdminProducts onProductsChanged={onProductsChanged} />}

        {/* ========================================================
            3. CATEGORIES VIEW (/admin/categories)
            ======================================================== */}
        {view === "Categories" && <AdminCategories onCategoriesChanged={onCategoriesChanged} />}

        {/* ========================================================
            4. ORDERS VIEW (/admin/orders)
            ======================================================== */}
        {view === "Orders" && <AdminOrdersWorkspace />}

        {/* ========================================================
            5. CUSTOMERS VIEW (/admin/customers)
            ======================================================== */}
        {view === "Customers" && <AdminCustomers />}

        {/* ========================================================
            6. REVIEWS VIEW (/admin/reviews)
            ======================================================== */}
        {view === "Reviews" && <AdminReviews/>}

        {/* ========================================================
            7. TEA REGIONS VIEW (/admin/tea-regions)
            ======================================================== */}
        {view === "TeaRegions" && <AdminPlaces key="region" kind="region" onPlacesChanged={onPlacesChanged} />}

        {/* ========================================================
            8. SHOPS / BRANDS VIEW (/admin/shops)
            ======================================================== */}
        {view === "Sellers" && <AdminSellers enabled={currentUser?.sellerEnabled === true} />}
        {view === "Shops" && <AdminPlaces key="store" kind="store" onPlacesChanged={onPlacesChanged} />}

        {/* ========================================================
            9. STATISTICS VIEW (/admin/statistics)
            ======================================================== */}
        {view === "Statistics" && <AdminOverview key="statistics" statistics />}
      </section>

      {/* ========================================================
          MODALS
          ======================================================== */}

      {/* Category Modal */}
      {showOrderModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowOrderModal(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <h3 className="admin-modal-title">Chi tiết đơn hàng {showOrderModal.id}</h3>
              <button onClick={() => setShowOrderModal(null)} style={{ background: "none", border: 0, cursor: "pointer" }}>
                <Icon name="close" size={20} />
              </button>
            </div>
            <div style={{ fontSize: "11px", lineHeight: "1.7", marginBottom: "15px" }}>
              <div><strong>Khách hàng:</strong> {showOrderModal.customerName}</div>
              <div><strong>Điện thoại:</strong> {showOrderModal.customerPhone}</div>
              <div><strong>Email:</strong> {showOrderModal.customerEmail}</div>
              <div><strong>Địa chỉ giao:</strong> {showOrderModal.shippingAddress}</div>
              <div><strong>Thanh toán:</strong> {showOrderModal.paymentMethod}</div>
              <div><strong>Ngày đặt:</strong> {showOrderModal.date}</div>
              <div><strong>Trạng thái:</strong> <span className="admin-badge badge-info">{showOrderModal.status}</span></div>
            </div>

            <div style={{ borderTop: "1px solid var(--line)", paddingTop: "12px" }}>
              <strong style={{ fontSize: "11px", display: "block", marginBottom: "8px" }}>Các mặt hàng trong đơn:</strong>
              {showOrderModal.items.map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px dashed var(--line)", fontSize: "11px" }}>
                  <span>{item.product.name} ({item.product.weight}) × {item.qty}</span>
                  <strong>{money(item.product.price * item.qty)}</strong>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", fontSize: "13px" }}>
                <strong>Tổng cộng thanh toán:</strong>
                <strong style={{ color: "var(--forest)" }}>{money(showOrderModal.total)}</strong>
              </div>
            </div>

            <div className="admin-modal-actions">
              <button className="btn btn-primary" onClick={() => setShowOrderModal(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      {showCustomerModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowCustomerModal(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <h3 className="admin-modal-title">Thông tin khách hàng #{showCustomerModal.id}</h3>
              <button onClick={() => setShowCustomerModal(null)} style={{ background: "none", border: 0, cursor: "pointer" }}>
                <Icon name="close" size={20} />
              </button>
            </div>
            <div style={{ fontSize: "11px", lineHeight: "1.8", marginBottom: "15px" }}>
              <div><strong>Họ và tên:</strong> {showCustomerModal.name}</div>
              <div><strong>Email:</strong> {showCustomerModal.email}</div>
              <div><strong>Số điện thoại:</strong> {showCustomerModal.phone}</div>
              <div><strong>Ngày tham gia:</strong> {showCustomerModal.joinDate}</div>
              <div><strong>Tổng số đơn hàng:</strong> {showCustomerModal.ordersCount} đơn</div>
              <div><strong>Tổng chi tiêu:</strong> <b style={{ color: "var(--forest)" }}>{money(showCustomerModal.totalSpent)}</b></div>
              <div><strong>Trạng thái tài khoản:</strong> <span className="admin-badge badge-success">{showCustomerModal.status}</span></div>
            </div>
            <div className="admin-modal-actions">
              <button className="btn btn-primary" onClick={() => setShowCustomerModal(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
