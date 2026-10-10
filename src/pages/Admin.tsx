import AdminOverview from "./AdminOverview";
import AdminCustomers from "./AdminCustomers";
import AdminPayments from "./AdminPayments";
import { useState, useEffect } from "react";
import { Product, Order, Category, Customer, Review, TeaRegion, TeaShop, AdminSubView, User } from "../types";
import { Icon } from "../components/Icon";
import { money } from "../components/ProductCard";

export const adminRoutes: Record<AdminSubView, string> = {
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
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  orders,
  onUpdateOrderStatus,
  customers,
  onUpdateCustomerStatus,
  reviews,
  onToggleReviewStatus,
  regions,
  onAddRegion,
  onUpdateRegion,
  onDeleteRegion,
  shops,
  onAddShop,
  onUpdateShop,
  onDeleteShop,
  onExitAdmin,
  onLogout,
  currentUser,
  initialSubView = "Dashboard"
}: {
  products: Product[];
  onAddProduct: (p: Omit<Product, "id">) => void;
  onUpdateProduct: (p: Product) => void;
  onDeleteProduct: (id: number) => void;
  categories: Category[];
  onAddCategory: (name: string, desc: string) => void;
  onUpdateCategory?: (cat: Category) => void;
  onDeleteCategory: (id: string) => void;
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: Order["status"]) => void;
  customers: Customer[];
  onUpdateCustomerStatus?: (customerId: number, status: Customer["status"]) => void;
  reviews: Review[];
  onToggleReviewStatus: (reviewId: number) => void;
  regions: TeaRegion[];
  onAddRegion: (reg: TeaRegion) => void;
  onUpdateRegion?: (reg: TeaRegion) => void;
  onDeleteRegion?: (id: string) => void;
  shops: TeaShop[];
  onAddShop: (shop: TeaShop) => void;
  onUpdateShop?: (shop: TeaShop) => void;
  onDeleteShop?: (id: string) => void;
  onExitAdmin: () => void;
  onLogout: () => void;
  currentUser?: User | null;
  initialSubView?: AdminSubView;
}) {
  const [view, setView] = useState<AdminSubView>(initialSubView);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

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
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [showOrderModal, setShowOrderModal] = useState<Order | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState<Customer | null>(null);

  const [showRegionModal, setShowRegionModal] = useState(false);
  const [editingRegion, setEditingRegion] = useState<TeaRegion | null>(null);
  const [viewingRegion, setViewingRegion] = useState<TeaRegion | null>(null);

  const [showShopModal, setShowShopModal] = useState(false);
  const [editingShop, setEditingShop] = useState<TeaShop | null>(null);
  const [viewingShop, setViewingShop] = useState<TeaShop | null>(null);

  // Form states for Product Modal
  const [pName, setPName] = useState("");
  const [pType, setPType] = useState("Chè Tân Cương");
  const [pPrice, setPPrice] = useState(250000);
  const [pWeight, setPWeight] = useState("200g");
  const [pNote, setPNote] = useState("");
  const [pImage, setPImage] = useState("");
  const [pStock, setPStock] = useState(50);
  const [pStatus, setPStatus] = useState<"Còn hàng" | "Hết hàng">("Còn hàng");

  // Form state for Category Modal
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");

  // Form state for Region Modal
  const [regName, setRegName] = useState("");
  const [regDistrict, setRegDistrict] = useState("");
  const [regTagline, setRegTagline] = useState("");
  const [regDesc, setRegDesc] = useState("");
  const [regSpecialty, setRegSpecialty] = useState("");
  const [regImage, setRegImage] = useState("");

  // Form state for Shop Modal
  const [shopName, setShopName] = useState("");
  const [shopBrand, setShopBrand] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [shopRegion, setShopRegion] = useState("Vùng chè Tân Cương");
  const [shopPhone, setShopPhone] = useState("");
  const [shopEmail, setShopEmail] = useState("");
  const [shopImage, setShopImage] = useState("");
  const [shopDesc, setShopDesc] = useState("");

  const menuItems: { id: AdminSubView; label: string; icon: string; path: string }[] = [
    { id: "Dashboard", label: "Tổng quan", icon: "📊", path: "/admin" },
    { id: "Products", label: "Sản phẩm", icon: "🍵", path: "/admin/products" },
    { id: "Categories", label: "Danh mục", icon: "📁", path: "/admin/categories" },
    { id: "Orders", label: "Đơn hàng", icon: "📦", path: "/admin/orders" },
    { id: "Customers", label: "Khách hàng", icon: "👥", path: "/admin/customers" },
    { id: "Reviews", label: "Đánh giá", icon: "⭐", path: "/admin/reviews" },
    { id: "TeaRegions", label: "Vùng chè", icon: "🗺️", path: "/admin/tea-regions" },
    { id: "Shops", label: "Cửa hàng & HTX", icon: "🏬", path: "/admin/shops" },
    { id: "Statistics", label: "Thống kê", icon: "📈", path: "/admin/statistics" }
  ];

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (categoryFilter === "all" || p.type === categoryFilter)
  );

  // ----------------------------------------------------
  // Product Handlers
  // ----------------------------------------------------
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setPName("");
    setPType("Chè Tân Cương");
    setPPrice(250000);
    setPWeight("200g");
    setPNote("Hương cốm non đặc trưng · Vị đậm thanh");
    setPImage("https://images.unsplash.com/photo-1715016811010-e67e6f3d440c?auto=format&fit=crop&w=1000&q=85");
    setPStock(80);
    setPStatus("Còn hàng");
    setShowProductModal(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setPName(prod.name);
    setPType(prod.type);
    setPPrice(prod.price);
    setPWeight(prod.weight);
    setPNote(prod.note);
    setPImage(prod.image);
    setPStock(75);
    setPStatus("Còn hàng");
    setShowProductModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim()) return;

    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        name: pName,
        type: pType,
        price: pPrice,
        weight: pWeight,
        note: pNote,
        image: pImage || editingProduct.image
      });
    } else {
      onAddProduct({
        name: pName,
        type: pType,
        taste: ["Đậm vị", "Hậu ngọt"],
        note: pNote,
        price: pPrice,
        weight: pWeight,
        rating: 4.9,
        reviewsCount: 1,
        image: pImage || "https://images.unsplash.com/photo-1715016811010-e67e6f3d440c?auto=format&fit=crop&w=1000&q=85",
        description: "Búp chè non tuyển chọn từ nương chè Thái Nguyên chính gốc.",
        regionId: "tan-cuong",
        regionName: "Vùng chè Tân Cương"
      });
    }
    setShowProductModal(false);
  };

  // ----------------------------------------------------
  // Category Handlers
  // ----------------------------------------------------
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCatName("");
    setCatDesc("");
    setShowCategoryModal(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatDesc(cat.description);
    setShowCategoryModal(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    if (editingCategory && onUpdateCategory) {
      onUpdateCategory({
        ...editingCategory,
        name: catName,
        description: catDesc
      });
    } else {
      onAddCategory(catName, catDesc);
    }
    setCatName("");
    setCatDesc("");
    setShowCategoryModal(false);
  };

  // ----------------------------------------------------
  // Region Handlers
  // ----------------------------------------------------
  const handleOpenAddRegion = () => {
    setEditingRegion(null);
    setRegName("");
    setRegDistrict("Thái Nguyên");
    setRegTagline("Đệ nhất danh trà");
    setRegDesc("");
    setRegSpecialty("Chè Đinh, Chè Nõn Tôm");
    setRegImage("https://images.unsplash.com/photo-1787281486400-2181c10eba68?auto=format&fit=crop&w=1200&q=85");
    setShowRegionModal(true);
  };

  const handleOpenEditRegion = (reg: TeaRegion) => {
    setEditingRegion(reg);
    setRegName(reg.name);
    setRegDistrict(reg.district);
    setRegTagline(reg.tagline);
    setRegDesc(reg.shortDesc);
    setRegSpecialty(reg.specialtyTea);
    setRegImage(reg.heroImage);
    setShowRegionModal(true);
  };

  const handleSaveRegion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) return;

    if (editingRegion && onUpdateRegion) {
      onUpdateRegion({
        ...editingRegion,
        name: regName,
        district: regDistrict,
        tagline: regTagline,
        shortDesc: regDesc,
        specialtyTea: regSpecialty,
        heroImage: regImage || editingRegion.heroImage
      });
    } else {
      const newReg: TeaRegion = {
        id: `reg-${Date.now()}`,
        name: regName,
        district: regDistrict,
        altitude: "300m - 500m",
        soilType: "Đất đỏ feralit giàu vi lượng",
        climate: "Mát mẻ ven chân núi Tam Đảo",
        tagline: regTagline,
        shortDesc: regDesc,
        fullDesc: regDesc,
        heritageStory: "Vùng đất trù phú với truyền thống trồng chè lâu đời.",
        features: ["Thu hái búp non thủ công", "Nguồn nước sạch tự nhiên"],
        specialtyTea: regSpecialty,
        heroImage: regImage || "https://images.unsplash.com/photo-1787281486400-2181c10eba68?auto=format&fit=crop&w=1200&q=85",
        gallery: [regImage || "https://images.unsplash.com/photo-1787281486400-2181c10eba68?auto=format&fit=crop&w=1200&q=85"],
        mapCoords: { lat: 21.5, lng: 105.8, xPercent: 50, yPercent: 50 }
      };
      onAddRegion(newReg);
    }
    setShowRegionModal(false);
  };

  // ----------------------------------------------------
  // Shop Handlers
  // ----------------------------------------------------
  const handleOpenAddShop = () => {
    setEditingShop(null);
    setShopName("");
    setShopBrand("Hợp tác xã tiêu biểu");
    setShopAddress("Thái Nguyên");
    setShopRegion("Vùng chè Tân Cương");
    setShopPhone("0988 123 456");
    setShopEmail("contact@htx.vn");
    setShopImage("https://images.unsplash.com/photo-1758390285674-f1d55b9d1312?auto=format&fit=crop&w=1200&q=85");
    setShopDesc("Cơ sở sản xuất và chế biến chè đạt tiêu chuẩn VietGAP & OCOP.");
    setShowShopModal(true);
  };

  const handleOpenEditShop = (shop: TeaShop) => {
    setEditingShop(shop);
    setShopName(shop.name);
    setShopBrand(shop.brandTitle);
    setShopAddress(shop.address);
    setShopRegion(shop.regionName);
    setShopPhone(shop.phone);
    setShopEmail(shop.email);
    setShopImage(shop.coverImage);
    setShopDesc(shop.description);
    setShowShopModal(true);
  };

  const handleSaveShop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) return;

    if (editingShop && onUpdateShop) {
      onUpdateShop({
        ...editingShop,
        name: shopName,
        brandTitle: shopBrand,
        address: shopAddress,
        regionName: shopRegion,
        phone: shopPhone,
        email: shopEmail,
        coverImage: shopImage || editingShop.coverImage,
        description: shopDesc
      });
    } else {
      const newShop: TeaShop = {
        id: `shop-${Date.now()}`,
        name: shopName,
        brandTitle: shopBrand,
        regionId: "tan-cuong",
        regionName: shopRegion,
        address: shopAddress,
        phone: shopPhone,
        email: shopEmail,
        established: "2015",
        founder: "Nghệ nhân chè",
        logo: shopImage,
        coverImage: shopImage,
        description: shopDesc,
        specialties: ["Chè Tôm Nõn", "Trà Đinh"],
        certifications: ["OCOP 4 Sao", "VietGAP"],
        mapCoords: { xPercent: 50, yPercent: 50 }
      };
      onAddShop(newShop);
    }
    setShowShopModal(false);
  };

  return (
    <main className="admin-page">
      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="admin-mobile-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* LEFT SIDEBAR */}
      <aside className={`admin-side ${mobileSidebarOpen ? "open" : ""}`}>
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
      <section className="admin-main">
        {/* TOPBAR */}
        <header className="admin-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Hamburger button for Mobile / Tablet */}
            <button
              className="admin-menu-toggle"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              aria-label="Mở menu quản trị"
            >
              <Icon name="menu" size={20} />
            </button>
            <div>
              <div className="admin-title">
                {menuItems.find((m) => m.id === view)?.label}
              </div>
              <p className="admin-subtext">
                Hệ thống quản lý dữ liệu thương mại điện tử TeaSmart Thái Nguyên.
              </p>
            </div>
          </div>

          <div className="admin-topbar-actions">
            <button
              onClick={onExitAdmin}
              className="btn btn-outline admin-store-btn"
              title="Xem trang web cửa hàng"
            >
              ← Về cửa hàng
            </button>
            <div className="admin-topbar-user">
              <div className="admin-topbar-avatar" title={currentUser?.name || "Admin"}>
                {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : "QT"}
              </div>
              <span className="admin-topbar-name">
                {currentUser?.name || "Quản trị viên"}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="btn btn-outline admin-logout-btn"
              title="Đăng xuất khỏi hệ thống"
            >
              Đăng xuất
            </button>
          </div>
        </header>

        {/* ========================================================
            1. DASHBOARD VIEW (/admin)
            ======================================================== */}
        {view === "Dashboard" && <AdminOverview />}

        {/* ========================================================
            2. PRODUCTS VIEW (/admin/products)
            ======================================================== */}
        {view === "Products" && (
          <div className="admin-list">
            <div className="admin-list-head">
              <div>
                <strong>Danh mục sản phẩm chè Thái Nguyên</strong>
                <span>Quản lý danh sách, giá cả và tồn kho ({products.length} sản phẩm)</span>
              </div>
              <button className="btn btn-primary" onClick={handleOpenAddProduct}>
                <Icon name="plus" /> Thêm sản phẩm
              </button>
            </div>

            <div className="admin-toolbar">
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm theo tên..."
                className="admin-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                className="admin-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">Tất cả phân loại</option>
                <option value="Chè Tân Cương">Chè Tân Cương</option>
                <option value="Chè đặc sản">Chè đặc sản</option>
                <option value="Chè xanh">Chè xanh</option>
                <option value="Quà tặng">Quà tặng</option>
              </select>
            </div>

            <div className="admin-table-responsive">
              <div className="admin-th" style={{ gridTemplateColumns: "60px 1.8fr 1.2fr 1fr 80px 100px 140px" }}>
                <span>Ảnh</span>
                <span>Tên sản phẩm</span>
                <span>Danh mục</span>
                <span>Giá bán</span>
                <span>Tồn kho</span>
                <span>Trạng thái</span>
                <span>Thao tác</span>
              </div>
              {filteredProducts.map((p) => (
                <div className="admin-tr" style={{ gridTemplateColumns: "60px 1.8fr 1.2fr 1fr 80px 100px 140px", alignItems: "center" }} key={p.id}>
                  <span>
                    <img src={p.image} alt={p.name} style={{ width: "42px", height: "42px", objectFit: "cover", borderRadius: "2px" }} />
                  </span>
                  <span>
                    <strong>{p.name}</strong>
                    <small style={{ display: "block", color: "var(--muted)", fontSize: "9px" }}>{p.weight}</small>
                  </span>
                  <span>{p.type}</span>
                  <span><strong>{money(p.price)}</strong></span>
                  <span>75 gói</span>
                  <span><span className="admin-badge badge-success">Còn hàng</span></span>
                  <span style={{ display: "flex", gap: "6px" }}>
                    <button
                      className="admin-action-btn"
                      onClick={() => setViewingProduct(p)}
                      title="Xem chi tiết"
                    >
                      Xem
                    </button>
                    <button
                      className="admin-action-btn"
                      onClick={() => handleOpenEditProduct(p)}
                      title="Chỉnh sửa"
                    >
                      Sửa
                    </button>
                    <button
                      className="admin-action-btn text-danger"
                      onClick={() => onDeleteProduct(p.id)}
                      title="Xóa sản phẩm"
                    >
                      Xóa
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            3. CATEGORIES VIEW (/admin/categories)
            ======================================================== */}
        {view === "Categories" && (
          <div className="admin-list">
            <div className="admin-list-head">
              <div>
                <strong>Quản lý danh mục chè</strong>
                <span>Cấu trúc phân loại sản phẩm trong hệ thống</span>
              </div>
              <button className="btn btn-primary" onClick={handleOpenAddCategory}>
                <Icon name="plus" /> Thêm danh mục
              </button>
            </div>
            <div className="admin-table-responsive">
              <div className="admin-th" style={{ gridTemplateColumns: "180px 1fr 140px 120px" }}>
                <span>Tên danh mục</span>
                <span>Mô tả phân loại</span>
                <span>Số lượng sản phẩm</span>
                <span>Thao tác</span>
              </div>
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="admin-tr"
                  style={{
                    gridTemplateColumns: "180px 1fr 140px 120px",
                    alignItems: "center"
                  }}
                >
                  <strong>{c.name}</strong>
                  <span style={{ color: "var(--muted)" }}>{c.description}</span>
                  <span>
                    <span className="admin-badge badge-info">{c.productsCount} sản phẩm</span>
                  </span>
                  <span style={{ display: "flex", gap: "6px" }}>
                    <button
                      className="admin-action-btn"
                      onClick={() => handleOpenEditCategory(c)}
                    >
                      Sửa
                    </button>
                    <button
                      className="admin-action-btn text-danger"
                      onClick={() => onDeleteCategory(c.id)}
                    >
                      Xóa
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            4. ORDERS VIEW (/admin/orders)
            ======================================================== */}
        {view === "Orders" && <AdminPayments />}

        {/* ========================================================
            5. CUSTOMERS VIEW (/admin/customers)
            ======================================================== */}
        {view === "Customers" && <AdminCustomers />}

        {/* ========================================================
            6. REVIEWS VIEW (/admin/reviews)
            ======================================================== */}
        {view === "Reviews" && (
          <div className="admin-table">
            <div className="admin-table-title">
              <strong>Đánh giá & Phản hồi sản phẩm</strong>
              <span>{reviews.length} đánh giá từ khách hàng</span>
            </div>
            <div className="admin-table-responsive">
              <div className="admin-th" style={{ gridTemplateColumns: "1.2fr 1fr 100px 2fr 100px 100px" }}>
                <span>Sản phẩm</span>
                <span>Khách hàng</span>
                <span>Đánh giá</span>
                <span>Nội dung bình luận</span>
                <span>Trạng thái</span>
                <span>Thao tác</span>
              </div>
              {reviews.map((rev) => (
                <div className="admin-tr" style={{ gridTemplateColumns: "1.2fr 1fr 100px 2fr 100px 100px", alignItems: "center" }} key={rev.id}>
                  <span><strong>{rev.productName}</strong></span>
                  <span>{rev.customerName}</span>
                  <span style={{ color: "var(--gold)" }}>{"★".repeat(rev.rating)}</span>
                  <span style={{ color: "var(--muted)", fontStyle: "italic" }}>"{rev.comment}"</span>
                  <span>
                    <span className={`admin-badge ${rev.status === "Hiển thị" ? "badge-success" : "badge-danger"}`}>
                      {rev.status}
                    </span>
                  </span>
                  <span>
                    <button
                      className="admin-action-btn"
                      onClick={() => onToggleReviewStatus(rev.id)}
                    >
                      {rev.status === "Hiển thị" ? "Ẩn đi" : "Hiện lại"}
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            7. TEA REGIONS VIEW (/admin/tea-regions)
            ======================================================== */}
        {view === "TeaRegions" && (
          <div className="admin-list">
            <div className="admin-list-head">
              <div>
                <strong>Quản lý 4 vùng nguyên liệu chè Thái Nguyên</strong>
                <span>Tân Cương, Trại Cài, La Bằng, Khe Cốc</span>
              </div>
              <button className="btn btn-primary" onClick={handleOpenAddRegion}>
                <Icon name="plus" /> Thêm vùng chè
              </button>
            </div>
            <div className="admin-table-responsive">
              <div className="admin-th" style={{ gridTemplateColumns: "70px 1.2fr 1.5fr 1fr 140px" }}>
                <span>Ảnh</span>
                <span>Tên vùng & Huyện</span>
                <span>Đặc trưng thổ nhưỡng</span>
                <span>Dòng chè chủ đạo</span>
                <span>Thao tác</span>
              </div>
              {regions.map((reg) => (
                <div
                  key={reg.id}
                  className="admin-tr"
                  style={{
                    gridTemplateColumns: "70px 1.2fr 1.5fr 1fr 140px",
                    alignItems: "center"
                  }}
                >
                  <img src={reg.heroImage} alt={reg.name} style={{ width: "55px", height: "40px", objectFit: "cover", borderRadius: "2px" }} />
                  <div>
                    <strong>{reg.name}</strong>
                    <small style={{ display: "block", color: "var(--muted)" }}>{reg.district}</small>
                  </div>
                  <span style={{ color: "var(--muted)", fontSize: "10px" }}>{reg.tagline}</span>
                  <div>
                    <strong>{reg.specialtyTea}</strong>
                  </div>
                  <span style={{ display: "flex", gap: "6px" }}>
                    <button className="admin-action-btn" onClick={() => setViewingRegion(reg)}>Xem</button>
                    <button className="admin-action-btn" onClick={() => handleOpenEditRegion(reg)}>Sửa</button>
                    {onDeleteRegion && (
                      <button className="admin-action-btn text-danger" onClick={() => onDeleteRegion(reg.id)}>Xóa</button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            8. SHOPS / BRANDS VIEW (/admin/shops)
            ======================================================== */}
        {view === "Shops" && (
          <div className="admin-list">
            <div className="admin-list-head">
              <div>
                <strong>Quản lý Hợp tác xã & Cơ sở sản xuất chè đối tác</strong>
                <span>Thông tin các HTX và làng nghề liên kết trưng bày trên TeaSmart</span>
              </div>
              <button className="btn btn-primary" onClick={handleOpenAddShop}>
                <Icon name="plus" /> Thêm cơ sở / HTX
              </button>
            </div>
            <div className="admin-table-responsive">
              <div className="admin-th" style={{ gridTemplateColumns: "70px 1.5fr 1.4fr 1.2fr 140px" }}>
                <span>Ảnh</span>
                <span>Tên cơ sở / HTX</span>
                <span>Địa chỉ</span>
                <span>Liên hệ</span>
                <span>Thao tác</span>
              </div>
              {shops.map((s) => (
                <div
                  key={s.id}
                  className="admin-tr"
                  style={{
                    gridTemplateColumns: "70px 1.5fr 1.4fr 1.2fr 140px",
                    alignItems: "center"
                  }}
                >
                  <img src={s.coverImage} alt={s.name} style={{ width: "55px", height: "40px", objectFit: "cover", borderRadius: "2px" }} />
                  <div>
                    <strong>{s.name}</strong>
                    <small style={{ display: "block", color: "var(--gold)" }}>{s.brandTitle}</small>
                  </div>
                  <small style={{ color: "var(--muted)" }}>{s.address}</small>
                  <div>
                    <span style={{ fontSize: "10px", color: "var(--forest)" }}>📞 {s.phone}</span>
                    <div style={{ fontSize: "9px", color: "var(--muted)" }}>{s.email}</div>
                  </div>
                  <span style={{ display: "flex", gap: "6px" }}>
                    <button className="admin-action-btn" onClick={() => setViewingShop(s)}>Xem</button>
                    <button className="admin-action-btn" onClick={() => handleOpenEditShop(s)}>Sửa</button>
                    {onDeleteShop && (
                      <button className="admin-action-btn text-danger" onClick={() => onDeleteShop(s.id)}>Xóa</button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            9. STATISTICS VIEW (/admin/statistics)
            ======================================================== */}
        {view === "Statistics" && <AdminOverview />}
      </section>

      {/* ========================================================
          MODALS
          ======================================================== */}

      {/* Product Add/Edit Modal */}
      {showProductModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowProductModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <h3 className="admin-modal-title">
                {editingProduct ? "Chỉnh sửa thông tin sản phẩm" : "Thêm sản phẩm chè mới"}
              </h3>
              <button onClick={() => setShowProductModal(false)} style={{ background: "none", border: 0, cursor: "pointer" }}>
                <Icon name="close" size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveProduct}>
              <div className="admin-form-group">
                <label>Tên sản phẩm chè *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Trà Nõn Tôm Thượng Hạng"
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Phân loại dòng chè</label>
                  <select value={pType} onChange={(e) => setPType(e.target.value)}>
                    <option value="Chè Tân Cương">Chè Tân Cương</option>
                    <option value="Chè đặc sản">Chè đặc sản</option>
                    <option value="Chè xanh">Chè xanh</option>
                    <option value="Quà tặng">Quà tặng</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Khối lượng đóng gói</label>
                  <input
                    type="text"
                    required
                    value={pWeight}
                    onChange={(e) => setPWeight(e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Giá bán niêm yết (VNĐ) *</label>
                  <input
                    type="number"
                    required
                    min={10000}
                    step={5000}
                    value={pPrice}
                    onChange={(e) => setPPrice(Number(e.target.value))}
                  />
                </div>
                <div className="admin-form-group">
                  <label>Số lượng tồn kho (gói) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={pStock}
                    onChange={(e) => setPStock(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Trạng thái</label>
                  <select value={pStatus} onChange={(e) => setPStatus(e.target.value as "Còn hàng" | "Hết hàng")}>
                    <option value="Còn hàng">Còn hàng</option>
                    <option value="Hết hàng">Hết hàng</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>URL Hình ảnh sản phẩm</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={pImage}
                    onChange={(e) => setPImage(e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label>Ghi chú hương vị & Đặc tính</label>
                <textarea
                  rows={2}
                  value={pNote}
                  onChange={(e) => setPNote(e.target.value)}
                  placeholder="Hương cốm non đặc trưng · Tiền chát dịu, hậu ngọt sâu..."
                />
              </div>

              <div className="admin-modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowProductModal(false)}>
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? "Lưu thay đổi" : "Thêm vào danh sách"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {viewingProduct && (
        <div className="admin-modal-backdrop" onClick={() => setViewingProduct(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <h3 className="admin-modal-title">Chi tiết sản phẩm #{viewingProduct.id}</h3>
              <button onClick={() => setViewingProduct(null)} style={{ background: "none", border: 0, cursor: "pointer" }}>
                <Icon name="close" size={20} />
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "20px", marginBottom: "16px" }}>
              <img src={viewingProduct.image} alt={viewingProduct.name} style={{ width: "120px", height: "120px", objectFit: "cover", borderRadius: "2px" }} />
              <div style={{ fontSize: "11px", lineHeight: "1.8" }}>
                <div style={{ font: "500 18px 'Lora', serif", color: "var(--forest)", marginBottom: "4px" }}>{viewingProduct.name}</div>
                <div><strong>Dòng chè:</strong> {viewingProduct.type}</div>
                <div><strong>Quy cách:</strong> {viewingProduct.weight}</div>
                <div><strong>Giá bán:</strong> {money(viewingProduct.price)}</div>
                <div><strong>Đánh giá:</strong> {viewingProduct.rating} ★ ({viewingProduct.reviewsCount || 85} nhận xét)</div>
                <div><strong>Hương vị:</strong> {viewingProduct.taste.join(", ")}</div>
              </div>
            </div>
            <p style={{ fontSize: "11px", color: "var(--muted)", lineHeight: "1.7", background: "var(--paper)", padding: "12px", border: "1px solid var(--line)" }}>
              {viewingProduct.note}
            </p>
            <div className="admin-modal-actions">
              <button className="btn btn-primary" onClick={() => setViewingProduct(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowCategoryModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <h3 className="admin-modal-title">
                {editingCategory ? "Chỉnh sửa danh mục" : "Thêm danh mục chè mới"}
              </h3>
              <button onClick={() => setShowCategoryModal(false)} style={{ background: "none", border: 0, cursor: "pointer" }}>
                <Icon name="close" size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveCategory}>
              <div className="admin-form-group">
                <label>Tên phân loại danh mục *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Chè Shan Tuyết Cổ Thụ"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                />
              </div>
              <div className="admin-form-group">
                <label>Mô tả danh mục</label>
                <textarea
                  rows={3}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Dòng trà quý hiếm thu hái trên vùng núi cao sương mù..."
                />
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowCategoryModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCategory ? "Cập nhật" : "Thêm danh mục"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
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

      {/* Region Add/Edit Modal */}
      {showRegionModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowRegionModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <h3 className="admin-modal-title">{editingRegion ? "Chỉnh sửa vùng chè" : "Thêm vùng chè mới"}</h3>
              <button onClick={() => setShowRegionModal(false)} style={{ background: "none", border: 0, cursor: "pointer" }}>
                <Icon name="close" size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveRegion}>
              <div className="admin-form-group">
                <label>Tên vùng chè *</label>
                <input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Ví dụ: Vùng chè Tân Cương" />
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Khu vực / Huyện</label>
                  <input type="text" value={regDistrict} onChange={(e) => setRegDistrict(e.target.value)} placeholder="TP. Thái Nguyên" />
                </div>
                <div className="admin-form-group">
                  <label>Dòng trà đặc sản</label>
                  <input type="text" value={regSpecialty} onChange={(e) => setRegSpecialty(e.target.value)} placeholder="Chè Đinh, Nõn Tôm" />
                </div>
              </div>
              <div className="admin-form-group">
                <label>Khẩu hiệu / Đặc trưng</label>
                <input type="text" value={regTagline} onChange={(e) => setRegTagline(e.target.value)} placeholder="Đệ nhất danh trà Việt Nam" />
              </div>
              <div className="admin-form-group">
                <label>Mô tả vùng nguyên liệu</label>
                <textarea rows={3} value={regDesc} onChange={(e) => setRegDesc(e.target.value)} placeholder="Thổ nhưỡng sỏi cơm màu đỏ son, nguồn nước mát..." />
              </div>
              <div className="admin-form-group">
                <label>Ảnh đồi chè</label>
                <input type="url" value={regImage} onChange={(e) => setRegImage(e.target.value)} placeholder="https://..." />
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowRegionModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">{editingRegion ? "Cập nhật" : "Lưu vùng chè"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Region View Modal */}
      {viewingRegion && (
        <div className="admin-modal-backdrop" onClick={() => setViewingRegion(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <h3 className="admin-modal-title">Thông tin vùng chè {viewingRegion.name}</h3>
              <button onClick={() => setViewingRegion(null)} style={{ background: "none", border: 0, cursor: "pointer" }}>
                <Icon name="close" size={20} />
              </button>
            </div>
            <img src={viewingRegion.heroImage} alt={viewingRegion.name} style={{ width: "100%", height: "180px", objectFit: "cover", marginBottom: "15px" }} />
            <div style={{ fontSize: "11px", lineHeight: "1.8" }}>
              <div><strong>Huyện / Thành phố:</strong> {viewingRegion.district}</div>
              <div><strong>Độ cao địa hình:</strong> {viewingRegion.altitude}</div>
              <div><strong>Thổ nhưỡng:</strong> {viewingRegion.soilType}</div>
              <div><strong>Khí hậu:</strong> {viewingRegion.climate}</div>
              <div><strong>Đặc sản chủ đạo:</strong> {viewingRegion.specialtyTea}</div>
            </div>
            <p style={{ fontSize: "11px", color: "var(--muted)", lineHeight: "1.7", marginTop: "12px", borderTop: "1px solid var(--line)", paddingTop: "12px" }}>
              {viewingRegion.shortDesc}
            </p>
            <div className="admin-modal-actions">
              <button className="btn btn-primary" onClick={() => setViewingRegion(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Shop Add/Edit Modal */}
      {showShopModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowShopModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <h3 className="admin-modal-title">{editingShop ? "Chỉnh sửa cơ sở HTX" : "Thêm cơ sở HTX mới"}</h3>
              <button onClick={() => setShowShopModal(false)} style={{ background: "none", border: 0, cursor: "pointer" }}>
                <Icon name="close" size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveShop}>
              <div className="admin-form-group">
                <label>Tên cơ sở / Hợp tác xã *</label>
                <input type="text" required value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="Ví dụ: HTX Chè Hảo Đạt" />
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Danh hiệu thương hiệu</label>
                  <input type="text" value={shopBrand} onChange={(e) => setShopBrand(e.target.value)} placeholder="HTX OCOP 5 Sao Quốc Gia" />
                </div>
                <div className="admin-form-group">
                  <label>Vùng chè trực thuộc</label>
                  <input type="text" value={shopRegion} onChange={(e) => setShopRegion(e.target.value)} placeholder="Vùng chè Tân Cương" />
                </div>
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Số điện thoại</label>
                  <input type="text" value={shopPhone} onChange={(e) => setShopPhone(e.target.value)} placeholder="0988 123 456" />
                </div>
                <div className="admin-form-group">
                  <label>Email liên hệ</label>
                  <input type="email" value={shopEmail} onChange={(e) => setShopEmail(e.target.value)} placeholder="contact@htx.vn" />
                </div>
              </div>
              <div className="admin-form-group">
                <label>Địa chỉ xưởng sản xuất</label>
                <input type="text" value={shopAddress} onChange={(e) => setShopAddress(e.target.value)} placeholder="Xã Tân Cương, TP. Thái Nguyên" />
              </div>
              <div className="admin-form-group">
                <label>URL Hình ảnh cơ sở</label>
                <input type="url" value={shopImage} onChange={(e) => setShopImage(e.target.value)} placeholder="https://..." />
              </div>
              <div className="admin-form-group">
                <label>Mô tả hoạt động & Chứng nhận</label>
                <textarea rows={2} value={shopDesc} onChange={(e) => setShopDesc(e.target.value)} placeholder="Quy trình sao sấy VietGAP, chứng nhận OCOP..." />
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowShopModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">{editingShop ? "Cập nhật" : "Lưu cơ sở"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shop View Modal */}
      {viewingShop && (
        <div className="admin-modal-backdrop" onClick={() => setViewingShop(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <h3 className="admin-modal-title">Thông tin cơ sở {viewingShop.name}</h3>
              <button onClick={() => setViewingShop(null)} style={{ background: "none", border: 0, cursor: "pointer" }}>
                <Icon name="close" size={20} />
              </button>
            </div>
            <img src={viewingShop.coverImage} alt={viewingShop.name} style={{ width: "100%", height: "180px", objectFit: "cover", marginBottom: "15px" }} />
            <div style={{ fontSize: "11px", lineHeight: "1.8" }}>
              <div style={{ font: "500 16px 'Lora', serif", color: "var(--forest)", marginBottom: "4px" }}>{viewingShop.name}</div>
              <div><strong>Danh hiệu:</strong> {viewingShop.brandTitle}</div>
              <div><strong>Địa chỉ:</strong> {viewingShop.address}</div>
              <div><strong>Vùng trực thuộc:</strong> {viewingShop.regionName}</div>
              <div><strong>Điện thoại:</strong> {viewingShop.phone}</div>
              <div><strong>Email:</strong> {viewingShop.email}</div>
              <div><strong>Chứng nhận:</strong> {viewingShop.certifications.join(", ")}</div>
            </div>
            <p style={{ fontSize: "11px", color: "var(--muted)", lineHeight: "1.7", marginTop: "12px", borderTop: "1px solid var(--line)", paddingTop: "12px" }}>
              {viewingShop.description}
            </p>
            <div className="admin-modal-actions">
              <button className="btn btn-primary" onClick={() => setViewingShop(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
