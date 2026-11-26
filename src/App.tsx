import PublicPlaces from "./pages/PublicPlaces";
import HomeArtwork, { type HomeArtworkKind } from "./components/HomeArtwork";
import HeroVideo from "./components/HeroVideo";
import {matchesProductSearch} from "./lib/productSearch";
import {loadTasteCatalog, matchesTaste, type TasteProduct} from "./lib/tasteCatalog";
import CartCatalog from "./components/CartCatalog";
import SellerCenter from "./pages/SellerCenter";
import {checkoutReceiptKey} from "./lib/checkoutReceipt";
import { loginReturnKey, parseLoginReturn } from "./lib/loginReturn";
import "./pages/CustomerExperience.css";
import MyReviews from "./components/MyReviews";
import AccountSettings from "./components/AccountSettings";
import SellerAccountLink from "./components/SellerAccountLink";
import {isCustomerTasteProduct} from "./lib/tasteCatalog";
import CustomerOrders from "./components/CustomerOrders";
import "./pages/ManualFeedback.css";
import ChatbotWidget from "./components/ChatbotWidget";
import LeafAnalysis from "./pages/LeafAnalysis";
import TeaRecommendations from "./components/TeaRecommendations";
import TasteFinder from "./components/TasteFinder";
import PaymentCheckout from "./pages/PaymentCheckout";
import DemoProductDetail from "./pages/DemoProductDetail";
import PaymentReturn from "./pages/PaymentReturn";
import PaymentIncomplete from "./pages/PaymentIncomplete";
import CustomerOrderDetail from "./pages/CustomerOrderDetail";
import { readPendingCheckout, ApiError, api, errorMessage, mapUser, mapProduct, mapCart, mapOrder, type ApiUser, type ApiProduct, type ApiPage, type ApiCart, type ApiOrder, type CartLine } from "./lib/commerce";
import { useState, useMemo, useRef, useEffect } from "react";
import { Product, Page, Order, Category, Customer, Review, TeaRegion, TeaShop, User, AdminSubView } from "./types";
import {
  teaRegionsData,
  teaShopsData,
  initialCategories,
  initialOrders,
  initialCustomers,
  initialReviews,
  photos
} from "./data/teaData";
import { Icon } from "./components/Icon";
import { ProductCard, money } from "./components/ProductCard";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { TeaRegionsList, TeaRegionDetail } from "./pages/TeaRegions";
import { TeaShopsList, TeaShopDetail } from "./pages/TeaShops";
import { AdminPortal, getAdminViewFromPath, adminRoutes } from "./pages/Admin";
import { LoginPage, RegisterPage } from "./pages/Auth";
import PasswordRecovery from "./pages/PasswordRecovery";
import { VideoCard } from "./components/VideoModal";
import { ScrollReveal } from "./components/ScrollReveal";

function Button({
  children,
  variant = "primary",
  onClick,
  className = "",
  type = "button",
  disabled = false,
  style
}: {
  children: React.ReactNode;
  variant?: "primary" | "light" | "outline" | "ghost";
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      style={style}
      className={`btn btn-${variant} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function SectionTitle({
  eyebrow,
  title,
  body,
  light = false
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  light?: boolean;
}) {
  return (
    <div className={`section-title ${light ? "light" : ""}`}>
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <div className="title">{title}</div>
      {body && <p>{body}</p>}
    </div>
  );
}

/* ========================================================
   HOME PAGE (UX refined with TWG-inspired tea discovery)
   ======================================================== */
function Home({
  products,
  navigate,
  onSelectProduct,
  onAddToCart,
  onBuyNow,
  favorites,
  onToggleFavorite,
  onSelectRegion,
  onSelectShop
}: {
  products: Product[];
  navigate: (p: Page) => void;
  onSelectProduct: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  onBuyNow: (p: Product, weight?: string, quantity?: number) => void;
  favorites: number[];
  onToggleFavorite: (id: number) => void;
  onSelectRegion: (id: string) => void;
  onSelectShop: (id: string) => void;
}) {

  const collections = [
    { name: "Chè Tân Cương", copy: "Tinh tuyển từ vùng chè danh tiếng nhất xứ Thái Nguyên.", image: "hills" as HomeArtworkKind },
    { name: "Chè xanh", copy: "Vị chát thanh, hậu ngọt dịu cho mỗi sớm tinh mơ.", image: "cup" as HomeArtworkKind },
    { name: "Chè đặc sản", copy: "Những búp trà đinh, nõn tôm quý được sao thủ công.", image: "leaf" as HomeArtworkKind },
    { name: "Trà quà tặng", copy: "Trao tặng tinh hoa trà Việt trong thiết kế trang nhã.", image: "gift" as HomeArtworkKind }
  ];

  return (
    <main className="home-page">
      {/* 1. Hero — supplied TeaSmart video with a static poster fallback. */}
      <section className="hero" aria-label="Khám phá chè Thái Nguyên">
        <HeroVideo />
        <div className="hero-overlay" />

        <div className="hero-content">
          <div className="hero-kicker">
            <span className="hero-kicker-line" />
            <span className="hero-kicker-text">NGUYÊN BẢN TỪ ĐỆ NHẤT DANH TRÀ THÁI NGUYÊN</span>
          </div>
          <h1 className="hero-title">
            {"Tinh hoa chè Thái Nguyên\nChạm vị tự nhiên"}
          </h1>
          <p className="hero-desc">Khám phá những dòng chè đặc sản Thái Nguyên được tuyển chọn từ những vùng chè nổi tiếng.</p>
          <div className="hero-buttons">
            <Button variant="light" onClick={() => navigate("explore")}>
              Khám phá bộ sưu tập <Icon name="arrow" />
            </Button>
            <Button variant="outline" onClick={() => navigate("ai")}>
              <Icon name="spark" /> Tìm chè phù hợp
            </Button>
          </div>
        </div>

      </section>

      {/* 2. TWG-Style Luxury Tea Discovery Strip */}
      <ScrollReveal direction="fade" delay={60}>
        <section className="twg-strip">
          <div className="twg-strip-inner">
            {[
              { tag: "01", title: "Trà Tân Cương Thượng Hạng", subtitle: "Đệ Nhất Danh Trà", action: () => onSelectRegion("tan-cuong") },
              { tag: "02", title: "Trà Đinh Ngọc Cung Đình", subtitle: "Thu Hái 1 Búp Đinh", action: () => navigate("explore") },
              { tag: "03", title: "Trà Nõn Tôm Hữu Cơ", subtitle: "Canh Tác Sinh Thái", action: () => onSelectRegion("khe-coc") },
              { tag: "04", title: "Hộp Quà Sơn Mài Nghệ Thuật", subtitle: "Quà Biếu Thượng Khách", action: () => navigate("explore") }
            ].map((item, idx) => (
              <button key={idx} className="twg-strip-item" onClick={item.action}>
                <div className="twg-strip-badge">{item.tag}</div>
                <div className="twg-strip-text">
                  <strong>{item.title}</strong>
                  <small>{item.subtitle}</small>
                </div>
              </button>
            ))}
          </div>
        </section>
      </ScrollReveal>

      {/* 3. Collections Section */}
      <ScrollReveal direction="up" delay={80}>
        <section className="section collections">
          <SectionTitle
            eyebrow="Bộ sưu tập tinh tuyển"
            title="Khám phá thế giới chè Thái Nguyên"
            body="Mỗi dòng chè là một sắc thái riêng của thổ nhưỡng, bàn tay nghệ nhân và văn hóa vùng trung du Bắc Bộ."
          />
          <div className="collection-grid">
            {collections.map((c, i) => (
              <article className={`collection-card c${i}`} key={c.name}>
                {i === 1 || i === 2 ? <img className="collection-real-photo" src={i === 1 ? "/assets/home/thai-nguyen-cup.jpg" : "/assets/home/thai-nguyen-dry-tea.jpg"} alt={i === 1 ? "Chén trà xanh Thái Nguyên — ảnh Phương Huy" : "Chè móc câu Thái Nguyên — ảnh Binh Giang"} loading="lazy" /> : <HomeArtwork kind={c.image} label={c.name} />}
                <div className="collection-shade" />
                <div className="collection-content">
                  <span>0{i + 1}</span>
                  <div className="collection-title">{c.name}</div>
                  <p>{c.copy}</p>
                  <button onClick={() => navigate("explore")}>
                    Khám phá <Icon name="arrow" size={18} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </ScrollReveal>

      {/* 4. Taste Finder */}
      <ScrollReveal direction="up" delay={80}>
        <TasteFinder onSelectProduct={onSelectProduct} onAi={() => navigate("ai")} />
      </ScrollReveal>

      {/* 5. Featured Products */}
      <ScrollReveal direction="up" delay={80}>
        <section className="section featured">
          <SectionTitle
            eyebrow="Được chọn nhiều nhất"
            title="Những sản phẩm được yêu thích"
          />
          <div className="section-top-link">
            <button onClick={() => navigate("explore")}>
              Xem tất cả <Icon name="arrow" />
            </button>
          </div>
          <div className="product-grid">
            {products.slice(0, 4).map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onView={() => onSelectProduct(p)}
                onAdd={() => onAddToCart(p)}
                onBuyNow={(selected,w,q) => onBuyNow(selected??p,w,q)}
                isFavorite={favorites.includes(p.id)}
                onToggleFavorite={() => onToggleFavorite(p.id)}
              />
            ))}
          </div>
        </section>
      </ScrollReveal>

      {/* 6. Four Legendary Tea Regions Showcase */}
      <ScrollReveal direction="up" delay={80}>
        <section className="section" style={{ background: "var(--cream)", padding: "90px 34px" }}>
          <SectionTitle
            eyebrow="Bản đồ nguyên liệu"
            title="Tứ đại vùng chè Thái Nguyên"
            body="Từ cái nôi Tân Cương đến nương chè Trại Cài, La Bằng và thung lũng hữu cơ Khe Cốc."
          />
          <div className="regions-grid" style={{ marginBottom: "35px" }}>
            {teaRegionsData.map((reg) => (
              <article className="region-card" key={reg.id}>
                <div className="region-card-img">
                  {reg.id === "tan-cuong" ? <HomeArtwork kind="hills" label={reg.name} /> : <img src={reg.heroImage} alt={reg.name} loading="lazy" />}
                  <span className="region-badge">{reg.district}</span>
                </div>
                <div className="region-card-body">
                  <h3 className="region-card-title">{reg.name}</h3>
                  <div className="region-card-tagline">{reg.tagline}</div>
                  <p className="region-card-desc">{reg.shortDesc}</p>
                  <button
                    className="btn btn-primary"
                    style={{ width: "100%", marginTop: "auto" }}
                    onClick={() => onSelectRegion(reg.id)}
                  >
                    Khám phá vùng chè <Icon name="arrow" size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div style={{ textAlign: "center" }}>
            <Button variant="outline" onClick={() => navigate("tea-regions")}>
              Xem bản đồ & Chi tiết 4 vùng chè <Icon name="arrow" />
            </Button>
          </div>
        </section>
      </ScrollReveal>

      {/* 7. Tea Cooperatives / Brands Showcase */}
      <ScrollReveal direction="up" delay={80}>
        <section className="section">
          <SectionTitle
            eyebrow="Cơ sở & Hợp tác xã"
            title="Cửa hàng & Thương hiệu chè tiêu biểu"
            body="Gặp gỡ những nghệ nhân và hợp tác xã gìn giữ bí quyết sao chè truyền thống đạt chuẩn OCOP quốc gia."
          />
          <div className="shops-grid" style={{ marginBottom: "30px" }}>
            {teaShopsData.slice(0, 2).map((shop) => (
              <article className="shop-card" key={shop.id}>
                <div className="shop-card-img">
                  <img src={shop.coverImage} alt={shop.name} />
                </div>
                <div className="shop-card-body">
                  <div>
                    <span className="shop-card-subtitle">{shop.brandTitle}</span>
                    <h3 className="shop-card-title">{shop.name}</h3>
                    <div className="shop-card-address">
                      <Icon name="mapPin" size={15} />
                      <span>{shop.address}</span>
                    </div>
                    <div className="shop-tags">
                      {shop.certifications.map((c) => (
                        <span className="shop-tag" key={c}>✓ {c}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    className="btn btn-outline"
                    style={{ color: "var(--forest)", width: "100%", marginTop: "12px", minHeight: "38px" }}
                    onClick={() => onSelectShop(shop.id)}
                  >
                    Xem thông tin cơ sở <Icon name="arrow" size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div style={{ textAlign: "center" }}>
            <Button variant="primary" onClick={() => navigate("shops")}>
              Khám phá tất cả các hợp tác xã chè <Icon name="arrow" />
            </Button>
          </div>
        </section>
      </ScrollReveal>

      {/* 8. Story Section */}
      <ScrollReveal direction="up" delay={80}>
        <section className="story">
          <div className="story-images">
            <img className="story-main" src={photos.farmer} alt="Người hái chè trên nương" />
            <img className="story-detail" src={photos.leaf} alt="Búp chè tươi" />
            <div className="story-seal">
              <Icon name="leaf" />
              <span>Thu hái<br />thủ công</span>
            </div>
          </div>
          <div className="story-copy">
            <SectionTitle
              eyebrow="Câu chuyện TeaSmart"
              title="Từ vùng chè Thái Nguyên đến tách trà của bạn"
            />
            <p>
              Từ thổ nhưỡng đặc biệt của vùng trung du, những búp chè non được hái vào buổi sớm mai, sao bằng đôi bàn tay của người nghệ nhân và giữ trọn hương cốm dịu dàng.
            </p>
            <div className="story-points">
              <div>
                <strong>80°C</strong>
                <span>Nhiệt độ nước lý tưởng</span>
              </div>
              <div>
                <strong>3 phút</strong>
                <span>Cho một ấm trà tròn vị</span>
              </div>
              <div>
                <strong>4 thế hệ</strong>
                <span>Gìn giữ nghề làm chè</span>
              </div>
            </div>
            <div style={{ margin: "22px 0 26px" }}>
              <VideoCard
                videoId="cSnLRsksS7U"
                title="Thước phim tư liệu: Đệ nhất danh trà Thái Nguyên"
                subtitle="Ký sự nghệ nhân làm chè"
                image={photos.hills}
                duration="Tư liệu 4K"
              />
            </div>
            <Button variant="primary" onClick={() => navigate("tea-regions")}>
              Khám phá di sản trà xứ Thái <Icon name="arrow" />
            </Button>
          </div>
        </section>
      </ScrollReveal>

      {/* 9. AI Banner */}
      <ScrollReveal direction="up" delay={80}>
        <section className="ai-banner">
          <div className="ai-copy">
            <div className="ai-symbol">
              <Icon name="spark" size={30} />
            </div>
            <SectionTitle
              eyebrow="TeaSmart AI"
              title="Không biết chọn chè nào?"
              light
              body="TeaSmart AI giúp bạn tìm loại chè phù hợp với khẩu vị và nhu cầu thưởng trà của mình chỉ trong vài câu hỏi."
            />
            <Button variant="light" onClick={() => navigate("ai")}>
              Trò chuyện với TeaSmart AI <Icon name="arrow" />
            </Button>
            <button className="leaf-tool" onClick={() => navigate("leaf")}>
              <Icon name="camera" /> Hoặc kiểm tra tình trạng lá chè bằng AI
            </button>
          </div>
          <div className="chat-preview">
            <div className="chat-head">
              <span>
                <Icon name="bot" />
              </span>
              <div>
                <strong>TeaSmart AI</strong>
                <small>
                  <i /> Đang hoạt động
                </small>
              </div>
            </div>
            <div className="chat-body">
              <div className="bubble ai">Xin chào! Bạn thường thích trà có vị như thế nào?</div>
              <div className="quick-row">
                <span>Hậu ngọt</span>
                <span>Ít chát</span>
                <span>Đậm vị</span>
              </div>
              <div className="bubble user">Mình thích vị đậm, hậu ngọt và uống hằng ngày.</div>
              <div className="typing">
                <i /><i /><i />
              </div>
            </div>
            <div className="chat-input" onClick={() => navigate("ai")} style={{ cursor: "pointer" }}>
              Nhập câu trả lời...<span><Icon name="arrow" /></span>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* 10. Journal */}
      <ScrollReveal direction="up" delay={80}>
        <section className="section journal">
          <SectionTitle eyebrow="Tea Journal" title="Chuyện trà & nghệ thuật thưởng thức" />
          <div className="journal-grid">
            {[
              ["Cẩm nang", "Cách pha chè Thái Nguyên ngon đúng điệu", "cup"],
              ["Văn hóa", "Khám phá văn hóa chè Thái Nguyên trăm năm", "sunrise"],
              ["Bảo quản", "Giữ trọn hương cốm non qua từng mùa", "leaf"]
            ].map((a, i) => (
              <article className={`journal-card j${i}`} key={a[1]}>
                <HomeArtwork kind={a[2] as HomeArtworkKind} label={a[1]} />
                <div>
                  <span>{a[0]} – {i === 2 ? 4 : 6} phút đọc</span>
                  <div className="journal-title">{a[1]}</div>
                  <button onClick={() => navigate("explore")}>
                    Đọc bài viết <Icon name="arrow" size={18} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </ScrollReveal>
    </main>
  );
}

/* ========================================================
   EXPLORE PAGE
   ======================================================== */
function Explore({
  products,
  onSelectProduct,
  onAddToCart,
  onBuyNow,
  favorites,
  onToggleFavorite
}: {
  products: Product[];
  onSelectProduct: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  onBuyNow?: (p: Product, weight?: string, quantity?: number) => void;
  favorites: number[];
  onToggleFavorite: (id: number) => void;
}) {
  const [filter, setFilter] = useState("Tất cả");
  const [regionFilter, setRegionFilter] = useState("Tất cả");
  const [tasteFilter, setTasteFilter] = useState("Tất cả");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("Phổ biến");
  const [tasteCatalog, setTasteCatalog] = useState<TasteProduct[]>([]);
  const [tasteCatalogLoading, setTasteCatalogLoading] = useState(true);
  const [tasteCatalogError, setTasteCatalogError] = useState("");
  const [tasteCatalogRetry, setTasteCatalogRetry] = useState(0);

  useEffect(() => {
    const abort = new AbortController();
    setTasteCatalogLoading(true);
    setTasteCatalogError("");
    void loadTasteCatalog(abort.signal).then(rows => {
      if (!abort.signal.aborted) setTasteCatalog(rows);
    }).catch(() => {
      if (!abort.signal.aborted) setTasteCatalogError("Không tải được điểm hương vị từ danh mục. Vui lòng thử lại.");
    }).finally(() => {
      if (!abort.signal.aborted) setTasteCatalogLoading(false);
    });
    return () => abort.abort();
  }, [tasteCatalogRetry]);

  const visible = useMemo(() => {
    const tasteById = new Map(tasteCatalog.map(item => [item.productId, item]));
    let result = products.filter(
      (p) =>
        (filter === "Tất cả" || p.type === filter) &&
        (tasteFilter === "Tất cả" || (() => { const facts=tasteById.get(p.id); return !!facts && matchesTaste(facts, tasteFilter as "Đậm vị" | "Ít chát" | "Hậu ngọt" | "Hương thơm"); })()) &&
        (regionFilter === "Tất cả" || p.regionName === regionFilter) &&
        matchesProductSearch(p, query)
    );
    if (sort === "Giá thấp → cao") result = [...result].sort((a, b) => a.price - b.price);
    if (sort === "Giá cao → thấp") result = [...result].sort((a, b) => b.price - a.price);
    return result;
  }, [products, filter, tasteFilter, regionFilter, query, sort, tasteCatalog]);

  return (
    <main className="page">
      <section className="explore-hero explore-hero-approved">
        <div>
          <div className="eyebrow">Khám phá theo cách của bạn</div>
          <div className="page-title">
            Tìm vị chè<br />thuộc về bạn
          </div>
          <p>Từ vị đậm truyền thống đến hương thanh nhẹ, mỗi tách trà là một hành trình riêng.</p>
        </div>
        <div className="explore-artwork"><HomeArtwork kind="sunrise" label="Đồi chè xanh trong nắng sớm" /></div>
      </section>

      <section className="explore-content">
        <div className="search-box">
          <Icon name="search" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Tìm sản phẩm chè"
            placeholder="Tìm loại chè bạn yêu thích…"
          />
          {query&&<button type="button" aria-label="Xóa từ khóa" onClick={()=>setQuery("")}><Icon name="close"/></button>}
        </div>

        <div className="explore-chips">
          <div>
            <span>Khám phá theo loại</span>
            {["Tất cả", ...new Set(products.map(p => p.type).filter(Boolean))].map((f) => (
              <button
                key={f}
                className={filter === f ? "active" : ""}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <div>
            <label>Vùng chè <select aria-label="Lọc vùng chè" value={regionFilter} onChange={e => setRegionFilter(e.target.value)}>{["Tất cả", ...new Set(products.map(p => p.regionName).filter((x): x is string => !!x))].map(name => <option key={name}>{name}</option>)}</select></label>
            <span>Khám phá theo vị</span>
            {["Tất cả", "Đậm vị", "Ít chát", "Hậu ngọt", "Hương thơm"].map((t) => (
              <button
                key={t}
                className={tasteFilter === t ? "active" : ""}
                onClick={() => setTasteFilter(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="listing-head">
          <div>
            <strong>{tasteFilter !== "Tất cả" && tasteCatalogLoading ? "Đang kiểm tra sản phẩm…" : `Có ${visible.length} sản phẩm phù hợp`}</strong>
            <span>Thông tin và quy cách theo danh mục hiện tại</span>
          </div>
          <div>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option>Phổ biến</option>
              <option>Giá thấp → cao</option>
              <option>Giá cao → thấp</option>
            </select>
          </div>
        </div>

        <div className="listing" style={{ gridTemplateColumns: "1fr" }}>
          {tasteFilter !== "Tất cả" && tasteCatalogLoading ? <p role="status" style={{textAlign:"center",padding:"36px 0"}}>Đang tải điểm hương vị đã lưu cho sản phẩm…</p> : tasteFilter !== "Tất cả" && tasteCatalogError ? <div role="alert" style={{textAlign:"center",padding:"36px 0"}}><p>{tasteCatalogError}</p><button className="btn btn-outline" onClick={()=>setTasteCatalogRetry(n=>n+1)}>Thử lại</button></div> : visible.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
              <Icon name="search" size={40} />
              <p style={{ marginTop: "12px" }}>Không tìm thấy sản phẩm chè nào phù hợp với bộ lọc.</p>
              <button className="btn btn-primary" onClick={() => { setFilter("Tất cả"); setTasteFilter("Tất cả"); setRegionFilter("Tất cả"); setQuery(""); }}>
                Xem tất cả sản phẩm
              </button>
            </div>
          ) : (
            <div className="product-grid explore-grid">
              {visible.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onView={() => onSelectProduct(p)}
                  onAdd={() => onAddToCart(p)}
                  onBuyNow={onBuyNow ? (selected,w,q) => onBuyNow(selected??p,w,q) : undefined}
                  isFavorite={favorites.includes(p.id)}
                  onToggleFavorite={() => onToggleFavorite(p.id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

/* ========================================================
   PRODUCT DETAIL (with Section 10 Quality Commitment)
   ======================================================== */
function ProductDetail({
  product,
  onAddToCart,
  onBuyNow,
  navigate,
  favorites,
  onToggleFavorite,
  onSelectProduct,
  customer = false
}: {
  product: Product;
  customer?: boolean;
  onAddToCart: (p: Product, weight?: string, quantity?: number) => void | Promise<unknown>;
  onBuyNow?: (p: Product, weight?: string, quantity?: number) => void;
  navigate: (p: Page) => void;
  favorites: number[];
  onToggleFavorite: (id: number) => void;
  onSelectProduct: (p: Product) => void;
}) {
  return <DemoProductDetail product={product} onAddToCart={onAddToCart} onBuyNow={onBuyNow} navigate={navigate} favorite={favorites.includes(product.id)} onToggleFavorite={()=>onToggleFavorite(product.id)} onSelectProduct={onSelectProduct} customer={customer}/>;
}

/* ========================================================
   CART & CHECKOUT
   ======================================================== */
function Cart({cart,updateCart,navigate,onCheckout,userId,onSelectProduct}:{cart:CartLine[];updateCart:(id:number,q:number|null)=>Promise<void>;navigate:(p:Page)=>void;onCheckout:(ids:number[])=>void;userId:string;onSelectProduct:(p:Product)=>void}) {
 const [selection,setSelection]=useState<{owner:string;ids:number[]}>({owner:userId,ids:[]});
 const ids=selection.owner===userId?selection.ids:[];
 const eligible=cart.filter(x=>x.cartItemId&&x.available!==false&&x.qty>0);
 const chosen=eligible.filter(x=>ids.includes(x.cartItemId!));
 const all=eligible.length>0&&chosen.length===eligible.length;
 const toggle=(id:number)=>setSelection({owner:userId,ids:ids.includes(id)?ids.filter(x=>x!==id):[...ids,id]});
 return <main className="page cart-experience"><div className="breadcrumbs">Trang chủ › Giỏ hàng</div><h1>Giỏ hàng của bạn</h1><p>{cart.length} sản phẩm trong giỏ hàng</p><div className="cart-layout"><section className="cart-items"><div className="cart-table-head"><label><input type="checkbox" aria-label="Chọn tất cả sản phẩm hợp lệ" checked={all} onChange={()=>setSelection({owner:userId,ids:all?[]:eligible.map(x=>x.cartItemId!)})}/> Chọn tất cả ({eligible.length})</label><span>Số lượng</span><span>Thành tiền</span></div>
 {cart.length===0&&<p>Giỏ hàng đang trống.</p>}{cart.map(x=><div className="cart-row" key={x.cartItemId??x.product.id}><label><input type="checkbox" aria-label={`Chọn mua ${x.product.name}`} disabled={!x.cartItemId||x.available===false} checked={!!x.cartItemId&&chosen.some(c=>c.cartItemId===x.cartItemId)} onChange={()=>x.cartItemId&&toggle(x.cartItemId)}/></label><img src={x.product.image||"/placeholder-teasmart.svg"} alt={x.product.name}/><div className="cart-name"><strong>{x.product.name}</strong>{x.shopName&&<small>{x.shopName}</small>}<span>{x.product.weight||"Quy cách theo sản phẩm"}</span>{x.available===false&&<small>{x.availabilityReason||"Hiện không thể đặt"}</small>}<button onClick={()=>void updateCart(x.product.id,null)}>Xóa</button></div><div className="quantity"><button aria-label={`Giảm ${x.product.name}`} disabled={x.qty<=1} onClick={()=>void updateCart(x.product.id,x.qty-1)}>−</button><span>{x.qty}</span><button aria-label={`Tăng ${x.product.name}`} disabled={x.available===false} onClick={()=>void updateCart(x.product.id,x.qty+1)}>+</button></div><strong className="row-price">{money(x.product.price*x.qty)}</strong></div>)}
 <button className="continue" onClick={()=>navigate("explore")}>← Tiếp tục mua sắm</button></section><aside className="order-summary"><h2>Tóm tắt đơn hàng</h2><div><span>Đã chọn ({chosen.length} sản phẩm)</span><strong>{money(chosen.reduce((sum,x)=>sum+x.product.price*x.qty,0))}</strong></div><p>Phí vận chuyển và tổng tiền chính thức được xác nhận từ hệ thống khi đặt hàng.</p>{new Set(chosen.map(x=>x.shopId??null)).size>1&&<p role="alert">Vui lòng bỏ chọn sản phẩm của gian hàng khác để thanh toán một gian hàng mỗi lần.</p>}<Button disabled={!chosen.length || new Set(chosen.map(x=>x.shopId??null)).size>1} onClick={()=>onCheckout(chosen.map(x=>x.cartItemId!))}>Mua hàng ({chosen.length}) →</Button><small>Bạn sẽ chọn địa chỉ và phương thức thanh toán ở bước tiếp theo.</small></aside></div><CartCatalog cartProductIds={cart.map(x=>x.product.id)} onSelectProduct={onSelectProduct} onBrowse={()=>navigate("explore")}/></main>;
}

/* ========================================================
   AI TEA CONSULTANT (Intact as requested in Section 13)
   ======================================================== */

/* ========================================================
   ACCOUNT PAGE (with Section 5 Wishlist tab)
   ======================================================== */
function Account({
  favorites,
  products,
  onAddToCart,
  onToggleFavorite,
  onSelectProduct,
  orders,
  currentUser,
  onLogout,
  navigate,
  onOpenOrder
}: {
  onOpenOrder: (id: number) => void;
  favorites: number[];
  products: Product[];
  onAddToCart: (p: Product) => void;
  onToggleFavorite: (id: number) => void;
  onSelectProduct: (p: Product) => void;
  orders: Order[];
  currentUser?: User | null;
  onLogout?: () => void;
  navigate?: (p: Page) => void;
}) {
  const [tab, setTab] = useState(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "orders") return "Đơn hàng của tôi";
    if (tab === "favorites") return "Sản phẩm yêu thích";
    if (tab === "reviews") return "Đánh giá của tôi";
    return "Hồ sơ cá nhân";
  });
  const favoriteProducts = products.filter((p) => favorites.includes(p.id));

  const userName = currentUser?.name || "Khách";
  const userEmail = currentUser?.email || "Chưa đăng nhập";
  const userPhone = currentUser?.phone || "Chưa bổ sung";
  const userInitials = userName
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase() || "NA";

  const handleTabClick = (x: string) => {
    if (x === "Đăng xuất") {
      onLogout?.();
    } else {
      if (x !== tab) {
        const tabParam: Record<string, string> = {
          "Hồ sơ cá nhân": "profile",
          "Đơn hàng của tôi": "orders",
          "Sản phẩm yêu thích": "favorites",
          "Đánh giá của tôi": "reviews",
        };
        const nextParam = tabParam[x];
        if (nextParam) window.history.pushState(null, "", `/account?tab=${nextParam}`);
      }
      setTab(x);
    }
  };

  return (
    <main className="page account-page account-experience">
      {!currentUser && (
        <div style={{ background: "var(--cream)", border: "1px solid var(--line)", padding: "12px 18px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px" }}>
          <span>Bạn đang xem tài khoản ở chế độ khách. Đăng nhập để đồng bộ dữ liệu.</span>
          <button
            onClick={() => navigate?.("login")}
            className="btn btn-primary"
            style={{ minHeight: "32px", padding: "0 12px", fontSize: "10px" }}
          >
            Đăng nhập ngay
          </button>
        </div>
      )}

      <div className="account-breadcrumb">Trang chủ › Tài khoản › {tab}</div>
      <div className="account-layout">
        <aside>
          <div className="account-cover"><div className="account-avatar">{currentUser?.avatarUrl?<img src={currentUser.avatarUrl} alt="Ảnh đại diện"/>:userInitials}</div><strong>{userName}</strong><small>Thành viên TeaSmart</small></div>
          {[
            "Hồ sơ cá nhân",
            "Đơn hàng của tôi",
            "Sản phẩm yêu thích",
            "Đánh giá của tôi",
            ...(currentUser?.role === "USER" && currentUser.sellerEnabled ? ["seller-entry"] : []),
            "Đăng xuất"
          ].map((x) => x === "seller-entry" ? <SellerAccountLink key={x} userId={currentUser!.id} onOpen={()=>navigate?.("seller")} /> : (
            <button
              className={tab === x ? "active" : ""}
              key={x}
              onClick={() => handleTabClick(x)}
              style={x === "Đăng xuất" ? { color: "var(--danger)" } : {}}
            >
              {x}
              <Icon name="chevron" />
            </button>
          ))}
        </aside>

        <section>
          {tab==="Hồ sơ cá nhân"&&<div className="profile-welcome"><span className="eyebrow">XIN CHÀO</span><h1>{userName}</h1><p>Cảm ơn bạn đã đồng hành cùng TeaSmart.</p></div>}
          <div className="account-heading">{tab}</div>

          {/* Tab 1: Wishlist */}
          {tab === "Sản phẩm yêu thích" && (
            <div>
              {favoriteProducts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
                  <Icon name="heart" size={42} />
                  <p style={{ marginTop: "14px" }}>Bạn chưa lưu sản phẩm nào vào danh sách yêu thích.</p>
                </div>
              ) : (
                <div className="account-wishlist-grid">
                  {favoriteProducts.map((p) => (
                    <article className="account-wishlist-item" key={p.id}>
                      <img src={p.image} alt={p.name} className="account-wishlist-thumb" />
                      <div className="account-wishlist-info">
                        <strong>{p.name}</strong>
                        <small>{p.type} · {p.weight}</small>
                        <b>{money(p.price)}</b>
                      </div>
                      <div className="account-wishlist-actions">
                        <Button onClick={() => onAddToCart(p)} style={{ minHeight: "36px", padding: "0 14px", fontSize: "11px" }}>
                          <Icon name="bag" size={14} /> Thêm vào giỏ
                        </Button>
                        <button
                          onClick={() => onToggleFavorite(p.id)}
                          className="wishlist-remove-btn"
                          title="Bỏ yêu thích"
                          aria-label="Bỏ yêu thích"
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "Đơn hàng của tôi" && <CustomerOrders products={products} userId={currentUser?.role === "USER" ? String(currentUser.id) : null} onOpen={onOpenOrder}/>}
          {tab === "Hồ sơ cá nhân" && currentUser && <AccountSettings key={String(currentUser.id)} user={currentUser}/>}

          {/* Other Tabs */}
          {tab === "Đánh giá của tôi" && <MyReviews products={products}/>}
        </section>
      </div>
    </main>
  );
}

/* ========================================================
   CÂU CHUYỆN TEASMART — EDITORIAL STORYTELLING PAGE
   ======================================================== */
function AboutPage({ navigate }: { navigate: (p: Page) => void }) {
  return (
    <main className="storytelling-page">
      {/* PHẦN 1 — HERO NHỎ */}
      <section className="storytelling-hero">
        <ScrollReveal direction="fade" delay={40}>
          <div className="storytelling-hero-head">
            <span className="storytelling-hero-kicker">CÂU CHUYỆN THƯƠNG HIỆU</span>
            <h1 className="storytelling-hero-title">Câu chuyện TeaSmart</h1>
            <p className="storytelling-hero-subtitle">Những câu chuyện bắt đầu từ một búp chè.</p>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={80}>
          <div className="storytelling-hero-banner">
            <img
              src={photos.hero}
              alt="Những triền đồi chè Thái Nguyên ngát xanh trong nắng sớm"
              className="storytelling-hero-banner-img"
            />
            <div className="storytelling-hero-banner-overlay" />
          </div>
        </ScrollReveal>
      </section>

      {/* PHẦN 2 — CÂU CHUYỆN 01 (Desktop: Ảnh trái — Text phải | Mobile: Ảnh trên — Text dưới) */}
      <section className="storytelling-chapter chapter-one">
        <div className="storytelling-chapter-grid layout-photo-left">
          <ScrollReveal direction="fade" delay={60}>
            <div className="storytelling-col-media">
              <div className="storytelling-media-frame">
                <img
                  src={photos.farmer}
                  alt="Người làm chè tỉ mẩn thu hái búp chè sớm mai"
                  className="storytelling-media-img"
                />
                <span className="storytelling-media-caption">
                  Thu hái thủ công búp nõn 1 tôm 2 lá khi sương còn đọng trên lá
                </span>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={100}>
            <div className="storytelling-col-text">
              <span className="storytelling-tag">CÂU CHUYỆN 01</span>
              <h2 className="storytelling-chapter-title">Từ đất chè đến một chén trà</h2>
              <div className="storytelling-chapter-body">
                <p>
                  Trên những triền đồi xanh của Thái Nguyên, cây chè đã gắn bó với người dân qua nhiều thế hệ. Từ những búp chè được hái khi sương còn đọng trên lá, người làm chè gìn giữ từng công đoạn sao, vò và sấy để tạo nên hương cốm non đặc trưng cùng vị chát dịu, hậu ngọt sâu.
                </p>
                <p>
                  TeaSmart bắt đầu từ mong muốn kể lại câu chuyện ấy theo một cách gần gũi hơn — để mỗi người khi thưởng thức một chén trà không chỉ cảm nhận hương vị, mà còn hiểu thêm về vùng đất và những người đã tạo nên nó.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* PHẦN 3 — CÂU CHUYỆN 02 (Desktop: Text trái — Ảnh phải | Mobile: Text trên — Ảnh dưới) */}
      <section className="storytelling-chapter chapter-two">
        <div className="storytelling-chapter-grid layout-text-left">
          <ScrollReveal direction="up" delay={60}>
            <div className="storytelling-col-text">
              <span className="storytelling-tag">CÂU CHUYỆN 02</span>
              <h2 className="storytelling-chapter-title">Giữ hồn trà, mở lối tương lai</h2>
              <div className="storytelling-chapter-body">
                <p>
                  TeaSmart kết nối những giá trị truyền thống của chè Thái Nguyên với trải nghiệm công nghệ hiện đại. Từ việc khám phá các vùng chè, tìm hiểu người làm nghề đến lựa chọn sản phẩm phù hợp, mọi trải nghiệm được thiết kế để câu chuyện của trà trở nên gần gũi và dễ tiếp cận hơn.
                </p>
                <p>
                  Công nghệ AI được sử dụng như một người đồng hành — hỗ trợ khách hàng tìm ra hương vị phù hợp và cung cấp thông tin tham khảo về tình trạng lá chè. Công nghệ không thay thế người làm trà, mà giúp những giá trị được gìn giữ và lan tỏa xa hơn.
                </p>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="fade" delay={100}>
            <div className="storytelling-col-media">
              <div className="storytelling-media-frame">
                <img
                  src={photos.cup}
                  alt="Chén trà xanh vàng sánh óng cùng hương vị cốm non thuần khiết"
                  className="storytelling-media-img"
                />
                <span className="storytelling-media-caption">
                  Chén trà thơm kết tinh văn hóa ngàn năm và công nghệ hiện đại
                </span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* PHẦN 4 — KẾT */}
      <section className="storytelling-finale">
        <ScrollReveal direction="up" delay={60}>
          <div className="storytelling-finale-card">
            <span className="storytelling-leaf-mark">
              <Icon name="leaf" size={24} />
            </span>
            <h2 className="storytelling-finale-title">Khi một chén trà kể một câu chuyện</h2>
            <p className="storytelling-finale-body">
              TeaSmart tin rằng mỗi búp chè đều mang theo dấu ấn của vùng đất, bàn tay người làm nghề và văn hóa thưởng trà. Chúng tôi muốn đưa câu chuyện ấy đến gần hơn với những người yêu trà.
            </p>
            <div className="storytelling-finale-actions">
              <Button variant="primary" onClick={() => navigate("tea-regions")}>
                Khám phá vùng chè →
              </Button>
              <Button variant="outline" onClick={() => navigate("explore")}>
                Khám phá sản phẩm →
              </Button>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </main>
  );
}

function PolicyPage() {
  return (
    <main className="page simple-page">
      <div className="simple-heading">
        <span>Chính sách & Điều khoản</span>
        <p>Cam kết chất lượng, bảo mật và quyền lợi khách hàng</p>
      </div>
      <div style={{ maxWidth: "800px", lineHeight: "1.85", fontSize: "13px", marginTop: "30px" }}>
        <h3 style={{ font: "500 18px 'Lora', serif", margin: "20px 0 8px" }}>1. Chính sách giao hàng</h3>
        <p>Miễn phí vận chuyển toàn quốc cho mọi đơn hàng từ 500.000₫ trở lên. Thời gian giao hàng từ 2 - 4 ngày làm việc.</p>
        <h3 style={{ font: "500 18px 'Lora', serif", margin: "20px 0 8px" }}>2. Chính sách đổi trả & bảo hành</h3>
        <p>Đổi trả miễn phí trong vòng 7 ngày nếu bao bì bị rách hỏng trong quá trình vận chuyển hoặc chè không đúng quy cách.</p>
        <h3 style={{ font: "500 18px 'Lora', serif", margin: "20px 0 8px" }}>3. Bảo mật thông tin</h3>
        <p>Cam kết bảo mật tuyệt đối thông tin cá nhân và dữ liệu thanh toán của khách hàng theo quy định pháp luật.</p>
      </div>
    </main>
  );
}

/* ========================================================
   ROUTER HELPERS (URL SYNCHRONIZATION)
   ======================================================== */
function getInitialRoute(path = typeof window === "undefined" ? "/" : window.location.pathname): {
  page: Page; adminSubView: AdminSubView; productId?: number;
} {
  const productId = Number(path.match(/^\/products\/([1-9][0-9]*)\/?$/)?.[1]);
  if (Number.isSafeInteger(productId)) return { page: "product", adminSubView: "Dashboard", productId };
  if (path === "/quen-mat-khau") return { page: "forgot-password", adminSubView: "Dashboard" };
  if (path === "/dat-lai-mat-khau") return { page: "reset-password", adminSubView: "Dashboard" };
  if (path === "/seller") return { page: "seller", adminSubView: "Dashboard" };
  if (/^\/account\/orders\/[1-9][0-9]*$/.test(path)) return { page: "order-detail", adminSubView: "Dashboard" };
  if (path === "/payment/vnpay-return") return { page: "payment-return", adminSubView: "Dashboard" };
  if (path === "/payment/incomplete") return { page: "payment-incomplete", adminSubView: "Dashboard" };
  if (path === "/dang-nhap" || path === "/login") {
    return { page: "login", adminSubView: "Dashboard" };
  }
  if (path === "/dang-ky" || path === "/register") {
    return { page: "register", adminSubView: "Dashboard" };
  }
  if (path.startsWith("/admin")) {
    return { page: "admin", adminSubView: getAdminViewFromPath(path) };
  }
  if (path === "/kham-pha" || path === "/explore") {
    return { page: "explore", adminSubView: "Dashboard" };
  }
  if (path === "/vung-che" || path === "/tea-regions") {
    return { page: "tea-regions", adminSubView: "Dashboard" };
  }
  if (path === "/cua-hang" || path === "/shops") {
    return { page: "shops", adminSubView: "Dashboard" };
  }
  if (path === "/gio-hang" || path === "/cart") {
    return { page: "cart", adminSubView: "Dashboard" };
  }
  if (path === "/thanh-toan" || path === "/checkout") {
    return { page: "checkout", adminSubView: "Dashboard" };
  }
  if (path === "/ai-tu-van" || path === "/ai") {
    return { page: "leaf", adminSubView: "Dashboard" };
  }
  if (path === "/nhan-dien-la" || path === "/leaf") {
    return { page: "leaf", adminSubView: "Dashboard" };
  }
  if (path === "/tai-khoan" || path === "/account") {
    return { page: "account", adminSubView: "Dashboard" };
  }
  if (path === "/about") {
    return { page: "about", adminSubView: "Dashboard" };
  }
  if (path === "/policy") {
    return { page: "policy", adminSubView: "Dashboard" };
  }
  return { page: "home", adminSubView: "Dashboard" };
}

const paymentLoginReturnKey = "teasmart_payment_return";
const orderLoginReturnKey = "teasmart_order_return";

function isAuthPage(page: Page) {
  return page === "login" || page === "register" || page === "forgot-password" || page === "reset-password";
}

function customerLoginDestination(value: string | null) {
  const target = parseLoginReturn(value, window.location.origin);
  if (!target) return null;
  const route = getInitialRoute(target.pathname);
  if (isAuthPage(route.page) || route.page === "admin" || route.page === "payment-return"
    || route.page === "payment-incomplete" || (route.page === "home" && target.pathname !== "/")) return null;
  return route;
}

function clearLoginReturns() {
  for (const key of [loginReturnKey, paymentLoginReturnKey, orderLoginReturnKey,
    "teasmart_seller_return", "teasmart_account_return"]) sessionStorage.removeItem(key);
}

function getPathForPage(p: Page, adminSubView?: AdminSubView): string {
  switch (p) {
    case "home":
      return "/";
    case "forgot-password": return "/quen-mat-khau";
    case "reset-password": return "/dat-lai-mat-khau";
    case "login":
      return "/dang-nhap";
    case "register":
      return "/dang-ky";
    case "admin":
      return adminSubView ? adminRoutes[adminSubView] : "/admin";
    case "explore":
      return "/explore";
    case "tea-regions":
      return "/tea-regions";
    case "tea-region-detail":
      return "/tea-regions";
    case "shops":
      return "/shops";
    case "shop-detail":
      return "/shops";
    case "cart":
      return "/cart";
    case "payment-return":
      return "/payment/vnpay-return";
    case "payment-incomplete":
      return "/payment/incomplete";
    case "checkout":
      return "/checkout";
    case "ai":
      return "/leaf";
    case "leaf":
      return "/leaf";
    case "seller":
      return "/seller";
    case "account":
      return "/account";
    case "about":
      return "/about";
    case "policy":
      return "/policy";
    default:
      return "/";
  }
}

/* ========================================================
   ROOT APP COMPONENT
   ======================================================== */
export default function App() {
  const initialRoute = useMemo(() => getInitialRoute(), []);
  const [page, setPage] = useState<Page>(initialRoute.page);
  const [chatOpenSignal, setChatOpenSignal] = useState(0);
  const [adminSubView, setAdminSubView] = useState<AdminSubView>(initialRoute.adminSubView);

  const [products, setProducts] = useState<Product[]>([]);
  const [ownedOrders, setOwnedOrders] = useState<{ owner: string; items: Order[] }>({ owner: "", items: [] });
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [regions, setRegions] = useState<TeaRegion[]>(teaRegionsData);
  const [shops, setShops] = useState<TeaShop[]>(teaShopsData);

  // Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const orders = ownedOrders.owner === String(currentUser?.id) ? ownedOrders.items : [];
  const setOrders = (next: Order[] | ((prev: Order[]) => Order[])) => {
    const owner = String(currentUser?.id);
    setOwnedOrders(prev => ({ owner, items: typeof next === "function" ? next(prev.owner === owner ? prev.items : []) : next }));
  };
  const [authState, setAuthState] = useState<"loading" | "ready" | "guest" | "error">("loading");
  const [authRetry, setAuthRetry] = useState(0);
  useEffect(()=>{const fn=()=>setAuthRetry(n=>n+1);window.addEventListener("teasmart-profile-updated",fn);return()=>window.removeEventListener("teasmart-profile-updated",fn)},[]);
  const [routeRevision, setRouteRevision] = useState(0);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem("teasmart_registered_users");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [authSuccessMsg, setAuthSuccessMsg] = useState("");

  const [selectedProductId, setSelectedProductId] = useState<number | undefined>(initialRoute.productId);
  const [selectedRegionId, setSelectedRegionId] = useState<string>("tan-cuong");
  const [selectedShopId, setSelectedShopId] = useState<string>("htx-hao-dat");

  // State: Cart & Wishlist
  const [ownedCart, setOwnedCart] = useState<{ owner: string; items: CartLine[] }>({ owner: "", items: [] });
  const cart = ownedCart.owner === String(currentUser?.id) ? ownedCart.items : [];
  const setCart = (items: CartLine[]) => setOwnedCart({ owner: String(currentUser?.id), items });
  const [commerceError, setCommerceError] = useState("");
  const [wishlist, setWishlist] = useState<{ owner: string; products: ApiProduct[] }>({ owner: "", products: [] });
  const favorites = currentUser?.role === "USER" && wishlist.owner === String(currentUser.id) ? wishlist.products.map(p => p.productId) : [];
  const wishlistBusy = useRef(false);
  const activeUserId = useRef(currentUser?.id); activeUserId.current = currentUser?.id;

  const [buyNow, setBuyNow] = useState<{owner:string;product:Product;qty:number;intentId?:string}|null>(() => {
    try { const d = JSON.parse(sessionStorage.getItem("teasmart_buy_now") ?? "null"); return d && typeof d.owner === "string" && d.product?.id && Number.isInteger(d.qty) && d.qty > 0 ? d : null; } catch { return null; }
  });
  const [buyAgain, setBuyAgain] = useState<{ owner: string; items: { product: Product; quantity: number }[] } | null>(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem("teasmart_buy_again") ?? "null");
      return draft && typeof draft.owner === "string" && Array.isArray(draft.items)
        && draft.items.length > 0 && draft.items.every((item: any) => item?.product?.id && Number.isInteger(item.quantity) && item.quantity > 0)
        ? draft : null;
    } catch { return null; }
  });
  const [selectedCart,setSelectedCart]=useState<{owner:string;items:{cartItemId:number;quantity:number}[]}|null>(()=>{try{return JSON.parse(sessionStorage.getItem("teasmart_selected_cart")??"null")}catch{return null}});
  const selectedDraft=selectedCart?.owner===String(currentUser?.id)?selectedCart:null;
  const checkoutSelected=(ids:number[])=>{
    if(!currentUser||readPendingCheckout(String(currentUser.id)))return;
    const items=cart.filter(x=>x.cartItemId&&ids.includes(x.cartItemId)&&x.available!==false).map(x=>({cartItemId:x.cartItemId!,quantity:x.qty}));
    if(!items.length)return;
    const draft={owner:String(currentUser.id),items};setSelectedCart(draft);sessionStorage.setItem("teasmart_selected_cart",JSON.stringify(draft));setBuyNow(null);sessionStorage.removeItem("teasmart_buy_now");setBuyAgain(null);sessionStorage.removeItem("teasmart_buy_again");navigate("checkout");
  };
  const directPurchase = buyNow?.owner === String(currentUser?.id) ? buyNow : null;
  const navigate = (p: Page, subView?: AdminSubView, productId?: number) => {
    if (p === "ai") { setChatOpenSignal(n => n + 1); return; }
    if (p === "checkout") sessionStorage.removeItem(checkoutReceiptKey);
    if (p !== "checkout") { setBuyAgain(null); sessionStorage.removeItem("teasmart_buy_again"); }
    if (p === "cart") { setBuyNow(null); sessionStorage.removeItem("teasmart_buy_now"); }

    setPage(p);
    if (p === "admin") {
      if (subView) setAdminSubView(subView);
    }
    const targetPath = p === "product" && productId !== undefined
      ? `/products/${productId}`
      : getPathForPage(p, subView || adminSubView);
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, "", targetPath);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const requireLogin = (replace = false, returnTo = window.location.pathname + window.location.search + window.location.hash) => {
    clearLoginReturns();
    if (customerLoginDestination(returnTo)) sessionStorage.setItem(loginReturnKey, returnTo);
    if (replace) window.history.replaceState(null, "", getPathForPage("login"));
    navigate("login");
  };

  const navigateWithLoginReturn = (next: Page) => {
    if (next === "login") requireLogin();
    else navigate(next);
  };

  const applyRoute = (route: ReturnType<typeof getInitialRoute>) => {
    if (route.page !== "checkout") { setBuyAgain(null); sessionStorage.removeItem("teasmart_buy_again"); }
    setRouteRevision(n => n + 1);
    setSelectedProductId(route.productId);
    setPage(route.page);
    setAdminSubView(route.adminSubView);
  };

  useEffect(() => {
    const handlePopState = () => applyRoute(getInitialRoute());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!isAuthPage(page)) clearLoginReturns();
  }, [page]);

  useEffect(() => {
    if (page === "cart" && authState === "guest") requireLogin(true);
  }, [page, authState]);

  const handleLogin = (user: User) => {
    const resume = sessionStorage.getItem(loginReturnKey);
    const detailReturn = sessionStorage.getItem(orderLoginReturnKey);
    const paymentReturn = sessionStorage.getItem(paymentLoginReturnKey);
    const accountReturn = sessionStorage.getItem("teasmart_account_return");
    const sellerReturn = sessionStorage.getItem("teasmart_seller_return");
    clearLoginReturns();
    setCurrentUser(user); setAuthState("ready"); setAuthSuccessMsg("");

    if (user.role === "USER") {
      const target = resume ?? (sellerReturn === "/seller" ? sellerReturn : null)
        ?? (accountReturn === "/account?tab=favorites" ? accountReturn : null)
        ?? (detailReturn && /^\/account\/orders\/[1-9][0-9]*$/.test(detailReturn) ? detailReturn : null);
      const route = customerLoginDestination(target);
      if (target && route) {
        window.history.replaceState(null, "", target);
        applyRoute(route);
        return;
      }
    }
    if (user.role === "USER" && (paymentReturn?.startsWith("/payment/vnpay-return?") || paymentReturn === "/payment/incomplete")) {
      window.history.replaceState(null, "", paymentReturn);
      setPage(paymentReturn === "/payment/incomplete" ? "payment-incomplete" : "payment-return");
    } else navigate(user.role === "ADMIN" ? "admin" : "home", "Dashboard");
  };

  const handleRegisterSuccess = (newUser: User) => {
    setRegisteredUsers((prev) => {
      const updated = [...prev, newUser];
      try {
        localStorage.setItem("teasmart_registered_users", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
    setAuthSuccessMsg("Đăng ký tài khoản thành công! Vui lòng đăng nhập với tài khoản mới.");
    navigate("login");
  };

  const handleLogout = () => {
    setCurrentUser(null); setAuthState("guest");
    setCart([]); setOrders([]); setWishlist({ owner: "", products: [] });
    sessionStorage.removeItem("teasmart_access_token");
    sessionStorage.removeItem("teasmart_checkout");
    sessionStorage.removeItem("teasmart_checkout_session");
    clearLoginReturns();
    sessionStorage.removeItem("teasmart_buy_now"); setBuyNow(null);
    sessionStorage.removeItem("teasmart_buy_again"); setBuyAgain(null);
    try {
      localStorage.removeItem("teasmart_current_user");
    } catch {
      // ignore
    }
    navigate("login");
  };

  async function refreshCart() { setCart(mapCart(await api<ApiCart>("/cart"))); }
  const addToCart = async (product: Product, _weight?: string, quantity = 1) => {
    if (!Number.isInteger(quantity) || quantity < 1) return false;
    if (!currentUser || currentUser.role !== "USER") { requireLogin(); return false; }
    if (!products.some(p => p.id === product.id && p.name === product.name)) {
      setCommerceError("Sản phẩm này chưa có trong danh mục bán hàng hiện tại."); return false;
    }
    try {
      setCart(mapCart(await api<ApiCart>("/cart/items", { method: "POST", body: JSON.stringify({ productId: product.id, quantity }) })));
      setCommerceError(""); return true;
    } catch (e) { setCommerceError(errorMessage(e)); return false; }
  };
  const handleBuyNow = (product: Product, weight?: string, quantity = 1) => {
    if (!currentUser || currentUser.role !== "USER") { requireLogin(); return; }
    if (!Number.isInteger(quantity) || quantity < 1) return;
    setSelectedCart(null);sessionStorage.removeItem("teasmart_selected_cart");
    setBuyAgain(null); sessionStorage.removeItem("teasmart_buy_again");
    const draft = { owner: String(currentUser.id), product: { ...product, weight: weight ?? product.weight }, qty: quantity, intentId: crypto.randomUUID() };
    sessionStorage.setItem("teasmart_buy_now", JSON.stringify(draft));
    setBuyNow(draft); navigate("checkout");
  };
  const handleBuyAgain = (items: { product: Product; quantity: number }[]) => {
    if (!currentUser || currentUser.role !== "USER") { requireLogin(); return; }
    if (!items.length || items.some(item => !Number.isInteger(item.quantity) || item.quantity < 1)) return;
    if (readPendingCheckout(String(currentUser.id))) { setCommerceError("Vui lòng kiểm tra yêu cầu checkout trước đó trước khi mua lại."); return; }
    setBuyNow(null); sessionStorage.removeItem("teasmart_buy_now");
    const draft = { owner: String(currentUser.id), items };
    setBuyAgain(draft); sessionStorage.setItem("teasmart_buy_again", JSON.stringify(draft));
    navigate("checkout");
  };
  const updateCart = async (productId: number, quantity: number | null) => {
    const item = cart.find(x => x.product.id === productId);
    if (!item?.cartItemId) return;
    try {
      await api(`/cart/items/${item.cartItemId}`, quantity === null ? { method: "DELETE" }
        : { method: "PUT", body: JSON.stringify({ quantity }) });
      await refreshCart(); setCommerceError("");
    } catch (e) { setCommerceError(errorMessage(e)); }
  };
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const first = await api<ApiPage<ApiProduct>>("/products?size=50");
        const rest = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) =>
          api<ApiPage<ApiProduct>>(`/products?size=50&page=${i + 1}`)));
        if (live) setProducts([first, ...rest].flatMap(p => p.content).filter(isCustomerTasteProduct).map(mapProduct));
      } catch (e) { if (live) setCommerceError(errorMessage(e)); }
    })(); return () => { live = false; };
  }, []);
  useEffect(() => {
    let live = true;
    if (currentUser?.role === "USER") {
      void api<ApiCart>("/cart").then(c => { if (live) setCart(mapCart(c)); }).catch(e => { if (live) setCommerceError(errorMessage(e)); });

    }
    return () => { live = false; };
  }, [currentUser?.id, page]);

  useEffect(() => {
    let live = true; setAuthState("loading");
    const restoringToken = sessionStorage.getItem("teasmart_access_token");
    if (!restoringToken) { setAuthState("guest"); return; }
    void api<ApiUser>("/users/me").then(u => { if (live && sessionStorage.getItem("teasmart_access_token") === restoringToken) { setCurrentUser(mapUser(u)); setAuthState("ready"); } })
      .catch(e => { if (live && (sessionStorage.getItem("teasmart_access_token") === restoringToken || e instanceof ApiError && e.status === 401 && !sessionStorage.getItem("teasmart_access_token"))) { setAuthState(e instanceof ApiError && e.status === 401 ? "guest" : "error"); } });
    return () => { live = false; };
  }, [authRetry]);
  const openOrder = (id: number) => {
    setBuyAgain(null); sessionStorage.removeItem("teasmart_buy_again");
    window.history.pushState(null, "", `/account/orders/${id}`); setRouteRevision(n => n + 1); setPage("order-detail"); window.scrollTo(0, 0);
  };
  const openOrders = () => {
    setBuyAgain(null); sessionStorage.removeItem("teasmart_buy_again");
    window.history.pushState(null, "", "/account?tab=orders"); setRouteRevision(n => n + 1); setPage("account"); window.scrollTo(0, 0);
  };
  const openFavorites = () => {
    if (!currentUser) {
      requireLogin(false, "/account?tab=favorites");
      return;
    }
    window.history.pushState(null, "", "/account?tab=favorites"); setRouteRevision(n => n + 1); setPage("account"); window.scrollTo(0, 0);
  };

  useEffect(() => {
    let live = true; setCart([]); setOrders([]); setWishlist({ owner: "", products: [] }); wishlistBusy.current = false;
    if (currentUser?.role === "USER") {
      const owner = String(currentUser.id);
      void api<ApiProduct[]>("/wishlist").then(products => { if (live) setWishlist({ owner, products }); })
        .catch(e => { if (live) setCommerceError(errorMessage(e)); });
    }
    return () => { live = false; };
  }, [currentUser?.id]);
  const toggleFavorite = async (productId: number) => {
    if (!currentUser || currentUser.role !== "USER") { requireLogin(); return; }
    if (wishlistBusy.current) return;
    const owner = currentUser.id; wishlistBusy.current = true;
    try {
      const products = await api<ApiProduct[]>(`/wishlist/products/${productId}`, { method: favorites.includes(productId) ? "DELETE" : "PUT" });
      if (activeUserId.current === owner) { setWishlist({ owner: String(owner), products }); setCommerceError(""); }
    } catch (e) { if (activeUserId.current === owner) setCommerceError(errorMessage(e)); }
    finally { if (activeUserId.current === owner) wishlistBusy.current = false; }
  };

  const handleSelectProduct = (prod: Product) => {
    setSelectedProductId(prod.id);
    navigate("product", undefined, prod.id);
  };

  // Chat answers can contain a newly available product absent from the initial catalog snapshot.
  const handleSelectChatProduct = (product: Product) => {
    setProducts(current => [...current.filter(p => p.id !== product.id), product]);
    handleSelectProduct(product);
  };

  const handleSelectRegion = (regionId: string) => {
    setSelectedRegionId(regionId);
    navigate("tea-region-detail");
  };

  const handleSelectShop = (shopId: string) => {
    setSelectedShopId(shopId);
    navigate("shop-detail");
  };

  // Admin handlers
  const refreshProductCatalog = async () => {
    const first = await api<ApiPage<ApiProduct>>("/products?size=50");
    const rest = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) =>
      api<ApiPage<ApiProduct>>(`/products?size=50&page=${i + 1}`)));
    setProducts([first, ...rest].flatMap(p => p.content).filter(isCustomerTasteProduct).map(mapProduct));
  };

  async function refreshCategoryCatalog() {
    await refreshProductCatalog();
  }

  const handleUpdateOrderStatus = (orderId: string, status: Order["status"]) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
  };

  const handleUpdateCustomerStatus = (customerId: number, status: Customer["status"]) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, status } : c))
    );
  };

  const handleToggleReviewStatus = (reviewId: number) => {
    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId ? { ...r, status: r.status === "Hiển thị" ? "Đã ẩn" : "Hiển thị" } : r
      )
    );
  };

  const handleOrderPlaced = (newOrder: Order, direct = false) => {
    setOrders((prev) => [newOrder, ...prev]);
    void refreshCart();
    setSelectedCart(null);sessionStorage.removeItem("teasmart_selected_cart");
    setBuyNow(null); sessionStorage.removeItem("teasmart_buy_now");
    setBuyAgain(null); sessionStorage.removeItem("teasmart_buy_again");
  };

  const count = cart.reduce((s, x) => s + x.qty, 0);

  // Selected current objects
  const currentProduct =
    products.find((p) => p.id === selectedProductId);
  const currentRegion =
    regions.find((r) => r.id === selectedRegionId) || regions[0];
  const currentShop =
    shops.find((s) => s.id === selectedShopId) || shops[0];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  if (page === "forgot-password" || page === "reset-password") return <PasswordRecovery key={page} reset={page === "reset-password"} navigate={navigate} />;

  // Dedicated Login Page (/dang-nhap)
  if (page === "login") {
    return (
      <LoginPage
        onLogin={handleLogin}
        navigate={navigate}
        registeredUsers={registeredUsers}
        successMessage={authSuccessMsg}
      />
    );
  }

  // Dedicated Register Page (/dang-ky)
  if (page === "register") {
    return (
      <RegisterPage
        onRegisterSuccess={handleRegisterSuccess}
        navigate={navigate}
      />
    );
  }

  // Admin view (/admin and sub-routes)
  if (page === "admin") {
    if (currentUser?.role !== "ADMIN") return <main className="page simple-page"><p>Vui lòng đăng nhập tài khoản quản trị viên.</p><Button onClick={() => navigate("login")}>Đăng nhập</Button></main>;
    return (
      <AdminPortal
        onProductsChanged={refreshProductCatalog}
        onCategoriesChanged={refreshCategoryCatalog}
        onPlacesChanged={refreshProductCatalog}
        orders={orders}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        customers={customers}
        onUpdateCustomerStatus={handleUpdateCustomerStatus}
        reviews={reviews}
        onToggleReviewStatus={handleToggleReviewStatus}
        onExitAdmin={() => navigate("home")}
        onLogout={handleLogout}
        currentUser={currentUser}
        initialSubView={adminSubView}
      />
    );
  }

  return (
    <div className="app">
      <Header
        page={page}
        navigate={navigate}
        cartCount={count}
        wishlistCount={favorites.length}
        products={products}
        onSelectProduct={handleSelectProduct}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenFavorites={openFavorites}
      />

      <div key={page} className="page-transition-wrap">
        {page === "home" && (
          <Home
            products={products}
            navigate={navigate}
            onSelectProduct={handleSelectProduct}
            onAddToCart={addToCart}
            onBuyNow={handleBuyNow}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onSelectRegion={handleSelectRegion}
            onSelectShop={handleSelectShop}
          />
        )}

      {page === "explore" && (
        <Explore
          products={products}
          onSelectProduct={handleSelectProduct}
          onAddToCart={addToCart}
          onBuyNow={handleBuyNow}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
        />
      )}

      {commerceError && <p className="page" role="alert">{commerceError}</p>}
      {page === "product" && currentProduct && (currentProduct.image.startsWith("/demo/tea/") ? <DemoProductDetail customer={currentUser?.role === "USER"} key={currentProduct.id} product={currentProduct} onAddToCart={addToCart} onBuyNow={handleBuyNow} navigate={navigate} favorite={favorites.includes(currentProduct.id)} onToggleFavorite={() => toggleFavorite(currentProduct.id)} onSelectProduct={handleSelectProduct} /> :
        <ProductDetail
          customer={currentUser?.role === "USER"}
          product={currentProduct}
          onAddToCart={addToCart}
          onBuyNow={handleBuyNow}
          navigate={navigate}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onSelectProduct={handleSelectProduct}
        />
      )}

      {page === "tea-regions" && <><PublicPlaces key="regions-current-hero" kind="regions" products={products} onSelectProduct={handleSelectProduct} heroOnly /><TeaRegionsList onSelectRegion={handleSelectRegion} onSelectProduct={handleSelectProduct} onAddToCart={addToCart} favorites={favorites} onToggleFavorite={toggleFavorite} navigate={navigate} showHero={false} /></>}
      {page === "tea-region-detail" && <TeaRegionDetail region={currentRegion} products={products} onSelectProduct={handleSelectProduct} onAddToCart={addToCart} onBuyNow={handleBuyNow} favorites={favorites} onToggleFavorite={toggleFavorite} onBack={() => navigate("tea-regions")} />}
      {page === "shops" && <TeaShopsList onSelectShop={handleSelectShop} onSelectProduct={handleSelectProduct} onAddToCart={addToCart} favorites={favorites} onToggleFavorite={toggleFavorite} />}
      {page === "shop-detail" && <TeaShopDetail shop={currentShop} products={products} onSelectProduct={handleSelectProduct} onAddToCart={addToCart} onBuyNow={handleBuyNow} favorites={favorites} onToggleFavorite={toggleFavorite} onBack={() => navigate("shops")} />}

      {page === "cart" && (authState === "loading" || authState === "guest" ? (
        <main className="page simple-page"><p role="status">Đang xác minh phiên đăng nhập…</p></main>
      ) : (
        <Cart key={String(currentUser?.id)} userId={String(currentUser?.id)} cart={cart} updateCart={updateCart} navigate={navigate} onCheckout={checkoutSelected} onSelectProduct={handleSelectProduct} />
      ))}

      {page === "payment-return" && <PaymentReturn key={String(currentUser?.id ?? "guest")} navigate={navigate} authState={authState} onAuthRetry={() => setAuthRetry(n => n + 1)} openOrder={openOrder} openOrders={openOrders} products={products} />}
      {page === "payment-incomplete" && <PaymentIncomplete key={String(currentUser?.id ?? "guest")} userId={currentUser ? String(currentUser.id) : null} authState={authState} navigate={navigate} openOrder={openOrder} />}

      {page === "order-detail" && <CustomerOrderDetail key={`${currentUser?.id}-${routeRevision}`} authState={authState} onAuthRetry={() => setAuthRetry(n => n + 1)} navigate={navigate} openOrders={openOrders} products={products} favorites={favorites} onAddToCart={addToCart} onToggleFavorite={toggleFavorite} onSelectProduct={handleSelectProduct} onBuyAgain={handleBuyAgain} />}

      {page === "checkout" && (
        <PaymentCheckout selectedItems={directPurchase||buyAgain?.owner===String(currentUser?.id)?undefined:selectedDraft?.items} buyNow={directPurchase ? { productId: directPurchase.product.id, quantity: directPurchase.qty, intentId: directPurchase.intentId ?? "legacy" } : undefined} buyAgain={buyAgain?.owner===String(currentUser?.id)?buyAgain.items:undefined} openOrder={openOrder} openOrders={openOrders} key={String(currentUser?.id)} products={products} cart={buyAgain?.owner===String(currentUser?.id)?buyAgain.items.map(item=>({product:item.product,qty:item.quantity})):directPurchase ? [directPurchase] : (selectedDraft?cart.filter(x=>selectedDraft.items.some(i=>x.cartItemId===i.cartItemId)):cart).map(x=>({...x,product:{...x.product,weight:products.find(p=>p.id===x.product.id)?.weight??x.product.weight}}))} user={currentUser} navigate={navigateWithLoginReturn} onOrderPlaced={handleOrderPlaced} />
      )}

      {page === "leaf" && <LeafAnalysis />}

      {page === "seller" && (authState === "loading" ? <main className="page"><p role="status">Đang xác minh phiên đăng nhập…</p></main> : authState === "error" ? <main className="page"><p role="alert">Không thể xác minh phiên đăng nhập.</p><button className="btn btn-outline" onClick={() => setAuthRetry(n => n + 1)}>Thử lại</button></main> : <SellerCenter key={String(currentUser?.id ?? "guest")} user={authState === "guest" ? null : currentUser} onLogin={() => requireLogin()} onShopping={() => navigate("home")} />)}
      {page === "account" && (
        <Account key={routeRevision} onOpenOrder={openOrder}
          favorites={favorites}
          products={[...products, ...wishlist.products.filter(p => !products.some(item => item.id === p.productId)).map(mapProduct)]}
          onAddToCart={addToCart}
          onToggleFavorite={toggleFavorite}
          onSelectProduct={handleSelectProduct}
          orders={orders}
          currentUser={currentUser}
          onLogout={handleLogout}
          navigate={navigateWithLoginReturn}
        />
      )}

      {page === "about" && <AboutPage navigate={navigate} />}
      {page === "policy" && <PolicyPage />}
      </div>

      <ChatbotWidget productId={page === "product" ? currentProduct?.id : undefined} key={String(currentUser?.id ?? "guest")} customer={currentUser?.role === "USER"} onLogin={() => requireLogin()} onProduct={handleSelectChatProduct} openSignal={chatOpenSignal} />
      {!["checkout", "admin"].includes(page) && (
        <Footer navigate={navigate} />
      )}
    </div>
  );
}
