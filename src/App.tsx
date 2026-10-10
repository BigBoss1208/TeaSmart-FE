import TeaAdvisor from "./pages/TeaAdvisor";
import TeaRecommendations from "./components/TeaRecommendations";
import PaymentCheckout from "./pages/PaymentCheckout";
import PaymentReturn from "./pages/PaymentReturn";
import { api, errorMessage, mapUser, mapProduct, mapCart, mapOrder, type ApiUser, type ApiProduct, type ApiPage, type ApiCart, type ApiOrder, type CartLine } from "./lib/commerce";
import { useState, useMemo, useRef, useEffect } from "react";
import { Product, Page, Order, Category, Customer, Review, TeaRegion, TeaShop, User, AdminSubView } from "./types";
import {
  initialProducts,
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
  onBuyNow: (p: Product) => void;
  favorites: number[];
  onToggleFavorite: (id: number) => void;
  onSelectRegion: (id: string) => void;
  onSelectShop: (id: string) => void;
}) {
  const [taste, setTaste] = useState("Hậu ngọt");
  const recommendationProfile: Record<string, string> = { "Đậm vị": "STRONG", "Ít chát": "LOW_ASTRINGENCY", "Hậu ngọt": "SWEET", "Hương thơm": "AROMATIC", "Uống hằng ngày": "DAILY", "Làm quà": "GIFT" };

  const heroSlides = useMemo(() => [
    {
      kicker: "NGUYÊN BẢN TỪ ĐỆ NHẤT DANH TRÀ THÁI NGUYÊN",
      title: "Tinh hoa chè Thái Nguyên\nChạm vị tự nhiên",
      desc: "Khám phá những dòng chè đặc sản Thái Nguyên được tuyển chọn từ những vùng chè nổi tiếng.",
      image: photos.hero,
      cta1: { label: "Khám phá bộ sưu tập", action: () => navigate("explore") },
      cta2: { label: "Tìm chè phù hợp", action: () => navigate("ai") }
    },
    {
      kicker: "TỪ NHỮNG VÙNG CHÈ ĐẶC SẢN",
      title: "Khám phá hương vị\ntừ vùng đất chè",
      desc: "Tìm hiểu Tân Cương, Trại Cài, La Bằng và Khe Cốc – những vùng chè tạo nên bản sắc riêng của chè Thái Nguyên.",
      image: photos.hills,
      cta1: { label: "Khám phá vùng chè", action: () => navigate("tea-regions") },
      cta2: { label: "Xem sản phẩm", action: () => navigate("explore") }
    }
  ], [navigate]);

  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Exact 2-second (2000ms) automatic slide transition with light fade
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev === 0 ? 1 : 0));
    }, 2000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const prevSlide = () => {
    setActiveSlide((prev) => (prev === 0 ? 1 : 0));
  };

  const nextSlide = () => {
    setActiveSlide((prev) => (prev === 0 ? 1 : 0));
  };

  const collections = [
    { name: "Chè Tân Cương", copy: "Tinh tuyển từ vùng chè danh tiếng nhất xứ Thái Nguyên.", image: photos.hills },
    { name: "Chè xanh", copy: "Vị chát thanh, hậu ngọt dịu cho mỗi sớm tinh mơ.", image: photos.cup },
    { name: "Chè đặc sản", copy: "Những búp trà đinh, nõn tôm quý được sao thủ công.", image: photos.leaf },
    { name: "Trà quà tặng", copy: "Trao tặng tinh hoa trà Việt trong thiết kế trang nhã.", image: photos.bowls }
  ];

  return (
    <main>
      {/* 1. Hero Section — 2-Slide Luxury Slideshow (TWG-Inspired) */}
      <section
        className="hero"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        aria-label="Khám phá chè Thái Nguyên"
      >
        {heroSlides.map((slide, idx) => (
          <div
            key={idx}
            className={`hero-slide-bg ${idx === activeSlide ? "active" : ""}`}
            style={{ backgroundImage: `url(${slide.image})` }}
          />
        ))}
        <div className="hero-overlay" />

        <div className="hero-content" key={activeSlide}>
          <div className="hero-kicker">
            <span className="hero-kicker-line" />
            <span className="hero-kicker-text">{heroSlides[activeSlide].kicker}</span>
          </div>
          <h1 className="hero-title">
            {heroSlides[activeSlide].title}
          </h1>
          <p className="hero-desc">{heroSlides[activeSlide].desc}</p>
          <div className="hero-buttons">
            <Button variant="light" onClick={heroSlides[activeSlide].cta1.action}>
              {heroSlides[activeSlide].cta1.label} <Icon name="arrow" />
            </Button>
            {heroSlides[activeSlide].cta2 && (
              <Button variant="outline" onClick={heroSlides[activeSlide].cta2.action}>
                <Icon name="spark" /> {heroSlides[activeSlide].cta2.label}
              </Button>
            )}
          </div>
        </div>

        {/* Previous & Next Navigation Arrows */}
        <div className="hero-nav-arrows">
          <button
            type="button"
            className="hero-arrow-btn prev"
            onClick={prevSlide}
            aria-label="Slide trước"
          >
            ‹
          </button>
          <button
            type="button"
            className="hero-arrow-btn next"
            onClick={nextSlide}
            aria-label="Slide kế tiếp"
          >
            ›
          </button>
        </div>

        {/* Bottom Bar: Indicators 01 / 02 with Progress Bars */}
        <div className="hero-bottom-bar">
          <div className="hero-dots">
            {heroSlides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`hero-dot ${idx === activeSlide ? "active" : ""}`}
                onClick={() => setActiveSlide(idx)}
                aria-label={`Chuyển tới slide ${idx + 1}`}
              >
                <span className="hero-dot-bar" />
              </button>
            ))}
            <span className="hero-slide-counter">
              0{activeSlide + 1} / 02
            </span>
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
                <img src={c.image} alt={c.name} />
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
        <section className="taste-finder">
          <div className="taste-copy">
            <div className="eyebrow">Chọn theo khẩu vị</div>
            <div className="taste-title">
              Bạn thích vị chè<br />như thế nào?
            </div>
            <p>
              Chọn một cảm nhận bạn yêu thích. TeaSmart sẽ gợi ý những dòng chè gần nhất với gu thưởng thức của bạn.
            </p>
            <Button onClick={() => navigate("ai")}>
              <Icon name="spark" /> Để TeaSmart AI tư vấn
            </Button>
          </div>
          <div className="taste-panel">
            <div className="taste-options">
              {["Đậm vị", "Ít chát", "Hậu ngọt", "Hương thơm", "Uống hằng ngày", "Làm quà"].map((t) => (
                <button
                  key={t}
                  className={taste === t ? "selected" : ""}
                  onClick={() => setTaste(t)}
                >
                  {t}
                  {taste === t && <Icon name="check" size={17} />}
                </button>
              ))}
            </div>
            <div className="mini-recommend">
              <TeaRecommendations profile={recommendationProfile[taste]} compact onSelectProduct={onSelectProduct} onAddToCart={onAddToCart} />
            </div>
          </div>
        </section>
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
                onBuyNow={() => onBuyNow(p)}
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
                  <img src={reg.heroImage} alt={reg.name} />
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
              ["Cẩm nang", "Cách pha chè Thái Nguyên ngon đúng điệu", photos.cup],
              ["Văn hóa", "Khám phá văn hóa chè Thái Nguyên trăm năm", photos.hills],
              ["Bảo quản", "Giữ trọn hương cốm non qua từng mùa", photos.leaf]
            ].map((a, i) => (
              <article className={`journal-card j${i}`} key={a[1]}>
                <img src={a[2]} alt={a[1]} />
                <div>
                  <span>{a[0]} · 6 phút đọc</span>
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
  onBuyNow?: (p: Product) => void;
  favorites: number[];
  onToggleFavorite: (id: number) => void;
}) {
  const [filter, setFilter] = useState("Tất cả");
  const [tasteFilter, setTasteFilter] = useState("Tất cả");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("Phổ biến");

  const visible = useMemo(() => {
    let result = products.filter(
      (p) =>
        (filter === "Tất cả" || p.type === filter) &&
        (tasteFilter === "Tất cả" || p.taste.includes(tasteFilter)) &&
        p.name.toLowerCase().includes(query.toLowerCase())
    );
    if (sort === "Giá thấp → cao") result = [...result].sort((a, b) => a.price - b.price);
    if (sort === "Giá cao → thấp") result = [...result].sort((a, b) => b.price - a.price);
    return result;
  }, [products, filter, tasteFilter, query, sort]);

  return (
    <main className="page">
      <section className="explore-hero">
        <div>
          <div className="eyebrow">Khám phá theo cách của bạn</div>
          <div className="page-title">
            Tìm vị chè<br />thuộc về bạn
          </div>
          <p>Từ vị đậm truyền thống đến hương thanh nhẹ, mỗi tách trà là một hành trình riêng.</p>
        </div>
        <img src={photos.hills} alt="Đồi chè" />
      </section>

      <section className="explore-content">
        <div className="search-box">
          <Icon name="search" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm loại chè bạn yêu thích…"
          />
        </div>

        <div className="explore-chips">
          <div>
            <span>Khám phá theo loại</span>
            {["Tất cả", "Chè xanh", "Chè Tân Cương", "Chè đặc sản", "Quà tặng"].map((f) => (
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
            <strong>{visible.length} sản phẩm chè</strong>
            <span>Thu hái và đóng gói tại Thái Nguyên</span>
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
          {visible.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
              <Icon name="search" size={40} />
              <p style={{ marginTop: "12px" }}>Không tìm thấy sản phẩm chè nào phù hợp với bộ lọc.</p>
              <button className="btn btn-primary" onClick={() => { setFilter("Tất cả"); setTasteFilter("Tất cả"); setQuery(""); }}>
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
                  onBuyNow={onBuyNow ? () => onBuyNow(p) : undefined}
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
  onSelectProduct
}: {
  product: Product;
  onAddToCart: (p: Product, weight?: string) => void;
  onBuyNow?: (p: Product, weight?: string) => void;
  navigate: (p: Page) => void;
  favorites: number[];
  onToggleFavorite: (id: number) => void;
  onSelectProduct: (p: Product) => void;
}) {
  const p = product;
  const [weight, setWeight] = useState(p.weight || "200g");
  const [activeTab, setActiveTab] = useState<"desc" | "brew" | "reviews">("desc");
  const isFav = favorites.includes(p.id);

  const add = () => onAddToCart({ ...p, weight }, weight);

  return (
    <main className="page product-page">
      <div className="breadcrumbs">
        <button onClick={() => navigate("home")} style={{ background: "none", border: 0, cursor: "pointer", padding: 0 }}>
          Trang chủ
        </button>{" "}
        <span>/</span>{" "}
        <button onClick={() => navigate("explore")} style={{ background: "none", border: 0, cursor: "pointer", padding: 0 }}>
          {p.type}
        </button>{" "}
        <span>/</span> {p.name}
      </div>

      <section className="detail">
        <div className="gallery">
          <div className="thumbs">
            {(p.gallery && p.gallery.length > 0 ? p.gallery : [p.image, photos.cup, photos.leaf]).filter(Boolean).map((im, i) => (
              <button key={i} className={i === 0 ? "active" : ""}>
                <img src={im} alt="" />
              </button>
            ))}
          </div>
          <div className="main-photo">
            {p.image ? <img src={p.image} alt={p.name} /> : <p>Chưa có ảnh sản phẩm</p>}
            <span>{p.regionName || "Đặc sản Thái Nguyên"}</span>
          </div>
        </div>

        <div className="detail-info">
          <div className="eyebrow">{p.type}</div>
          <div className="detail-title">{p.name}</div>
          <div className="detail-rating">
            <span>★★★★★</span> {p.rating} · {p.reviewsCount || 126} đánh giá
            <button
              onClick={() => onToggleFavorite(p.id)}
              style={{
                marginLeft: "15px",
                background: "none",
                border: "1px solid var(--line)",
                padding: "3px 8px",
                fontSize: "10px",
                cursor: "pointer",
                color: isFav ? "var(--gold)" : "inherit"
              }}
            >
              <Icon name="heart" size={13} /> {isFav ? "Đã lưu vào yêu thích" : "Lưu vào yêu thích"}
            </button>
          </div>
          <div className="detail-price">{money(p.price)}</div>
          <p className="detail-desc">{p.description || p.note}</p>

          <div className="option-label">Chọn khối lượng</div>
          <div className="weight-options">
            {[product.weight].map((w) => (
              <button
                key={w}
                className={weight === w ? "active" : ""}
                onClick={() => setWeight(w)}
              >
                {w}
                <small>
                  {w === "100g" ? money(Math.round(p.price * 0.55)) : w === "200g" ? money(p.price) : money(Math.round(p.price * 2.3))}
                </small>
              </button>
            ))}
          </div>

          <div className="tea-profile">
            <div className="option-label">Hồ sơ hương vị chè</div>
            {[
              ["Hương vị", p.taste.join(" · ")],
              ["Độ đậm", String(p.intensity || 4)],
              ["Độ chát", String(p.astringency || 3)],
              ["Hậu vị ngọt", String(p.sweetness || 5)],
              ["Hương thơm", String(p.aroma || 4)]
            ].map(([k, v], i) => (
              <div key={k}>
                <span>{k}</span>
                {i === 0 ? (
                  <strong>{v}</strong>
                ) : (
                  <div className="dots">
                    {[1, 2, 3, 4, 5].map((d) => (
                      <i key={d} className={d <= +v ? "fill" : ""} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="detail-actions">
            <Button onClick={add}>
              <Icon name="bag" /> Thêm vào giỏ
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                add();
                navigate("checkout");
              }}
            >
              Mua ngay
            </Button>
          </div>

          <div className="benefits">
            <span><Icon name="leaf" /> Chè vụ mới</span>
            <span><Icon name="check" /> Nguồn gốc minh bạch</span>
            <span><Icon name="bag" /> Đổi trả 7 ngày</span>
          </div>
        </div>
      </section>

      {/* SECTION 10: Cam kết chất lượng & nguồn gốc */}
      <section className="section quality-section" style={{ maxWidth: "1240px", margin: "0 auto", padding: "40px 34px" }}>
        <div className="section-title" style={{ marginBottom: "20px" }}>
          <div className="eyebrow">Minh bạch & Trách nhiệm</div>
          <div className="title">Cam kết chất lượng & Nguồn gốc</div>
          <p>TeaSmart đồng hành cùng các hợp tác xã Thái Nguyên cam kết nguồn gốc xuất xứ và an toàn thực phẩm trên từng hộp chè.</p>
        </div>
        <div className="quality-grid">
          <div className="quality-card">
            <div className="quality-card-icon"><Icon name="mapPin" size={18} /></div>
            <strong>Vùng nguyên liệu</strong>
            <p>{p.qualityCommitment?.origin || "Vùng chỉ dẫn địa lý Tân Cương, TP. Thái Nguyên, Việt Nam"}</p>
            <small style={{ color: "var(--forest)", fontWeight: 600 }}>Độ cao: {p.qualityCommitment?.altitude || "220m"}</small>
          </div>
          <div className="quality-card">
            <div className="quality-card-icon"><Icon name="leaf" size={18} /></div>
            <strong>Quy chuẩn thu hái</strong>
            <p>{p.qualityCommitment?.harvestMethod || "Thu hái thủ công 1 tôm 2 lá vào sáng sớm trước khi mặt trời gắt"}</p>
            <small style={{ color: "var(--forest)", fontWeight: 600 }}>Nghệ nhân sao củi truyền thống</small>
          </div>
          <div className="quality-card">
            <div className="quality-card-icon"><Icon name="award" size={18} /></div>
            <strong>Chứng nhận & Tiêu chuẩn</strong>
            <p>{p.qualityCommitment?.standard || "Tiêu chuẩn VietGAP & Chứng nhận OCOP 4 sao tỉnh Thái Nguyên"}</p>
            <small style={{ color: "var(--forest)", fontWeight: 600 }}>{p.qualityCommitment?.safetyCertificate || "Chứng nhận ATTP Quốc gia"}</small>
          </div>
          <div className="quality-card">
            <div className="quality-card-icon"><Icon name="shieldCheck" size={18} /></div>
            <strong>Đóng gói & Bảo quản</strong>
            <p>Túi thiếc tráng bạc hút chân không cao cấp, giữ trọn hương cốm tự nhiên.</p>
            <small style={{ color: "var(--forest)", fontWeight: 600 }}>Hạn dùng: {p.qualityCommitment?.shelfLife || "24 tháng"}</small>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="detail-tabs">
        <div className="tab-nav">
          <button
            className={activeTab === "desc" ? "active" : ""}
            onClick={() => setActiveTab("desc")}
          >
            Mô tả sản phẩm
          </button>
          <button
            className={activeTab === "brew" ? "active" : ""}
            onClick={() => setActiveTab("brew")}
          >
            Hướng dẫn pha chè
          </button>
          <button
            className={activeTab === "reviews" ? "active" : ""}
            onClick={() => setActiveTab("reviews")}
          >
            Đánh giá ({p.reviewsCount || 126})
          </button>
        </div>

        <div className="tab-content">
          {activeTab === "desc" && (
            <>
              <div>
                <div className="tab-title">Một tách trà mang hương vị của đất</div>
                <p>
                  Chè được canh tác theo quy trình chăm sóc chọn lọc, hái một tôm hai lá vào sáng sớm và sao thủ công ngay trong ngày. Mỗi cánh trà xoăn đều, xanh đen tự nhiên, đượm vị chát dịu và hậu ngọt bền lâu.
                </p>
              </div>
              <div className="brew-steps">
                {[
                  ["01", "Tráng ấm", "Làm nóng ấm và chén bằng nước sôi"],
                  ["02", "5g chè", "Cho 150ml nước 80°C - 85°C"],
                  ["03", "80°C", "Nước vừa đủ nóng, không làm cháy búp non"],
                  ["04", "3 phút", "Chờ trà mở hương và thưởng thức"]
                ].map((x) => (
                  <div key={x[0]}>
                    <strong>{x[0]}</strong>
                    <span>
                      <b>{x[1]}</b>
                      <small>{x[2]}</small>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === "brew" && (
            <div style={{ gridColumn: "span 2" }}>
              <div className="tab-title">Nghệ thuật thưởng trà Thái Nguyên</div>
              <p style={{ maxWidth: "700px", margin: "10px 0 20px" }}>
                Để có một ấm trà tròn vị, người xưa có câu: "Nhất nước, nhì trà, tam bôi, tứ ấm".
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
                <div style={{ background: "var(--paper)", padding: "20px", border: "1px solid var(--line)" }}>
                  <strong style={{ display: "block", marginBottom: "6px" }}>Nước pha trà</strong>
                  <p style={{ margin: 0, fontSize: "11px" }}>Nên dùng nước lọc tinh khiết hoặc nước suối đầu nguồn. Đun sôi và để nguội xuống 80 - 85°C.</p>
                </div>
                <div style={{ background: "var(--paper)", padding: "20px", border: "1px solid var(--line)" }}>
                  <strong style={{ display: "block", marginBottom: "6px" }}>Định lượng trà</strong>
                  <p style={{ margin: 0, fontSize: "11px" }}>Dùng khoảng 5g đến 7g chè cho ấm 150ml - 200ml phục vụ 3 - 4 người thưởng ẩm.</p>
                </div>
                <div style={{ background: "var(--paper)", padding: "20px", border: "1px solid var(--line)" }}>
                  <strong style={{ display: "block", marginBottom: "6px" }}>Thời gian hãm</strong>
                  <p style={{ margin: 0, fontSize: "11px" }}>Hãm từ 2 đến 3 phút. Rót hết nước trà ra chén tống rồi mới chia đều ra các chén quân.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "reviews" && (
            <div style={{ gridColumn: "span 2" }}>
              <div className="tab-title">Nhận xét từ người sành trà</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "20px" }}>
                {[
                  { name: "Trần Quang Minh", star: 5, date: "15/06/2025", text: "Trà rất ngon, đúng chuẩn búp chè Tân Cương. Hương cốm ngào ngạt, hậu ngọt lưu luyến." },
                  { name: "Nguyễn Hải Yến", star: 5, date: "08/06/2025", text: "Bao bì hút chân không rất kín đáo, giữ nguyên hương vị. Uống mỗi sáng rất sảng khoái." }
                ].map((r, i) => (
                  <div key={i} style={{ background: "var(--paper)", padding: "16px", border: "1px solid var(--line)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "11px" }}>
                      <strong>{r.name}</strong>
                      <span style={{ color: "var(--gold)" }}>{"★".repeat(r.star)}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: "11px", color: "var(--muted)" }}>"{r.text}"</p>
                    <small style={{ color: "var(--muted)", fontSize: "9px" }}>{r.date}</small>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <TeaRecommendations productId={p.id} onSelectProduct={onSelectProduct} onAddToCart={onAddToCart} />
    </main>
  );
}

/* ========================================================
   CART & CHECKOUT
   ======================================================== */
function Cart({
  cart,
  updateCart,
  navigate
}: {
  cart: CartLine[];
  updateCart: (id: number, quantity: number | null) => Promise<void>;
  navigate: (p: Page) => void;
}) {
  const total = cart.reduce((s, x) => s + x.product.price * x.qty, 0);
  const qty = (id: number, delta: number) => {
    const item = cart.find(x => x.product.id === id);
    if (item) void updateCart(id, Math.max(1, item.qty + delta));
  };

  return (
    <main className="page simple-page">
      <div className="simple-heading">
        <span>Giỏ hàng của bạn</span>
        <p>{cart.length} sản phẩm đang chờ bạn</p>
      </div>
      <div className="cart-layout">
        <section className="cart-items">
          <div className="cart-table-head">
            <span>Sản phẩm</span>
            <span>Số lượng</span>
            <span>Thành tiền</span>
          </div>
          {cart.length === 0 ? (
            <div className="empty">
              <Icon name="bag" size={42} />
              <strong>Giỏ hàng đang trống</strong>
              <Button onClick={() => navigate("explore")}>Khám phá sản phẩm</Button>
            </div>
          ) : (
            cart.map((x) => (
              <div className="cart-row" key={x.product.id}>
                <img src={x.product.image} alt="" />
                <div className="cart-name">
                  <small>{x.product.type}</small>
                  <strong>{x.product.name}</strong>
                  <span>{x.product.weight}</span>
                  <button onClick={() => void updateCart(x.product.id, null)}>
                    <Icon name="trash" size={16} /> Xóa
                  </button>
                </div>
                <div className="quantity">
                  <button onClick={() => qty(x.product.id, -1)}>
                    <Icon name="minus" size={15} />
                  </button>
                  <span>{x.qty}</span>
                  <button onClick={() => qty(x.product.id, 1)}>
                    <Icon name="plus" size={15} />
                  </button>
                </div>
                <strong className="row-price">{money(x.product.price * x.qty)}</strong>
              </div>
            ))
          )}
          <button className="continue" onClick={() => navigate("explore")}>
            <Icon name="arrow" /> Tiếp tục mua sắm
          </button>
        </section>
        <aside className="order-summary">
          <div className="summary-title">Tóm tắt đơn hàng</div>
          <div>
            <span>Tạm tính</span>
            <strong>{money(total)}</strong>
          </div>
          <div>
            <span>Phí vận chuyển</span>
            <strong>{"Miễn phí"}</strong>
          </div>
          <div className="coupon">
            <input placeholder="Mã ưu đãi" />
            <button>Áp dụng</button>
          </div>
          <div className="total">
            <span>Tổng cộng</span>
            <strong>{money(total)}</strong>
          </div>
          <Button onClick={() => navigate("checkout")} disabled={total === 0}>
            Thanh toán <Icon name="arrow" />
          </Button>
          <small>Thanh toán an toàn · Bảo mật thông tin</small>
        </aside>
      </div>
    </main>
  );
}

/* ========================================================
   AI TEA CONSULTANT (Intact as requested in Section 13)
   ======================================================== */

function LeafDisease() {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "ready" | "loading" | "result">("idle");

  const upload = (file?: File) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setStatus("ready");
  };

  const analyze = () => {
    setStatus("loading");
    setTimeout(() => setStatus("result"), 1600);
  };

  return (
    <main className="page leaf-page">
      <section className="leaf-hero">
        <span><Icon name="camera" size={30} /></span>
        <div className="eyebrow">Công cụ hỗ trợ người trồng chè</div>
        <div className="page-title">
          AI hỗ trợ phân loại<br />tình trạng lá chè
        </div>
        <p>Tải lên ảnh lá chè rõ nét để nhận thông tin tham khảo nhanh về tình trạng của cây.</p>
      </section>

      <section className="leaf-workspace">
        <div className="upload-card">
          <div className="step-label">Bước 1 · Tải ảnh lên</div>
          <button
            className={`dropzone ${preview ? "has-image" : ""}`}
            onClick={() => input.current?.click()}
            onDrop={(e) => {
              e.preventDefault();
              upload(e.dataTransfer.files[0]);
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            {preview ? (
              <>
                <img src={preview} alt="Ảnh lá chè đã tải lên" />
                <span className="change-image">Chọn ảnh khác</span>
              </>
            ) : (
              <>
                <span><Icon name="upload" size={30} /></span>
                <strong>Kéo thả ảnh lá chè vào đây</strong>
                <small>hoặc chọn ảnh JPG, PNG từ thiết bị · Tối đa 10MB</small>
                <b>Chọn ảnh từ thiết bị</b>
              </>
            )}
          </button>
          <input
            ref={input}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => upload(e.target.files?.[0])}
          />

          <div className="photo-tips">
            <strong>Mẹo chụp ảnh tốt</strong>
            <span>Đủ ánh sáng tự nhiên</span>
            <span>Lá nằm trọn trong khung hình</span>
            <span>Ảnh rõ nét, không rung</span>
          </div>

          <Button onClick={analyze} disabled={!preview || status === "loading"}>
            {status === "loading" ? (
              <><span className="loader" /> Đang phân tích ảnh lá chè...</>
            ) : (
              <><Icon name="spark" /> Phân tích bằng AI</>
            )}
          </Button>
        </div>

        <div className="result-area">
          {status === "result" ? (
            <div className="result-card">
              <div className="result-head">
                <span><Icon name="check" /></span>
                <div>
                  <small>Kết quả phân loại</small>
                  <strong>Có dấu hiệu sâu bệnh</strong>
                </div>
                <b>92% tin cậy</b>
              </div>
              <div className="result-image">
                <img src={preview!} alt="" />
                <span>Khu vực cần chú ý</span>
              </div>
              <div className="severity">
                <span>Mức độ tham khảo</span>
                <div><i /><i /><i /><i /><i /></div>
                <strong>Trung bình</strong>
              </div>
              <div className="finding">
                <strong>Thông tin tham khảo</strong>
                <p>
                  Hình ảnh có một số đặc điểm tương đồng với nhóm bệnh đốm lá: vùng đổi màu, viền nâu và mô lá không đều.
                </p>
              </div>
              <div className="recommendation">
                <strong>Khuyến nghị xử lý ban đầu</strong>
                <ul>
                  <li>Cách ly và theo dõi các lá có dấu hiệu tương tự.</li>
                  <li>Giữ nương chè thông thoáng, tránh độ ẩm kéo dài.</li>
                  <li>Liên hệ cán bộ nông nghiệp địa phương để xác định chính xác.</li>
                </ul>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setPreview(null);
                  setStatus("idle");
                }}
              >
                Phân tích ảnh khác
              </Button>
              <small className="disclaimer">
                Kết quả chỉ mang tính hỗ trợ tham khảo, không thay thế chẩn đoán của chuyên gia nông nghiệp.
              </small>
            </div>
          ) : (
            <div className="result-placeholder">
              <div><Icon name="leaf" size={42} /></div>
              <strong>Kết quả sẽ hiển thị tại đây</strong>
              <p>Sau khi tải ảnh và nhấn phân tích, TeaSmart AI sẽ cung cấp thông tin tham khảo về lá chè.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

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
  navigate
}: {
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
  const [tab, setTab] = useState("Sản phẩm yêu thích");
  const [profileSaved, setProfileSaved] = useState(false);
  const favoriteProducts = products.filter((p) => favorites.includes(p.id));

  const userName = currentUser?.name || "Nguyễn An";
  const userEmail = currentUser?.email || "nguyenan@email.com";
  const userPhone = currentUser?.phone || "0912 345 678";
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
      setTab(x);
    }
  };

  return (
    <main className="page account-page">
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

      <div className="account-cover">
        <div className="account-avatar">{userInitials}</div>
        <div>
          <div className="detail-title">{userName}</div>
          <p>
            {currentUser?.joinDate
              ? `Thành viên TeaSmart từ tháng ${currentUser.joinDate}`
              : "Thành viên TeaSmart từ tháng 03/2024"}
          </p>
        </div>
      </div>

      <div className="account-layout">
        <aside>
          {[
            "Sản phẩm yêu thích",
            "Đơn hàng của tôi",
            "Hồ sơ cá nhân",
            "Đánh giá của tôi",
            "Đăng xuất"
          ].map((x) => (
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

          {/* Tab 2: Orders */}
          {tab === "Đơn hàng của tôi" && (
            <>
              {orders.map((ord) => (
                <article className="order-card" key={ord.id}>
                  <div>
                    <span>Mã đơn <strong>{ord.id}</strong></span>
                    <span>{ord.date}</span>
                    <b style={{ color: "var(--leaf)" }}>{ord.status}</b>
                  </div>
                  <div>
                    <img src={ord.items[0]?.product.image || photos.tea} alt="" />
                    <span>
                      <strong>{ord.items[0]?.product.name || "Sản phẩm chè"}</strong>
                      <small>{ord.items.length} mặt hàng · {ord.paymentMethod} · {ord.paymentStatus}</small>
                    </span>
                    <strong>{money(ord.total)}</strong>
                  </div>
                  <button>Xem chi tiết <Icon name="arrow" /></button>
                </article>
              ))}
            </>
          )}

          {/* Tab 3: Profile */}
          {tab === "Hồ sơ cá nhân" && (
            <div className="profile-card">
              {profileSaved && (
                <div style={{ background: "#eef7ee", border: "1px solid #c7d6c2", color: "var(--forest)", padding: "10px 14px", borderRadius: "3px", marginBottom: "16px", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Icon name="check" size={16} /> Đã lưu thông tin hồ sơ của bạn thành công!
                </div>
              )}
              <div className="form-grid">
                <label>Họ và tên<input key={userName} defaultValue={userName} /></label>
                <label>Số điện thoại<input key={userPhone} defaultValue={userPhone} /></label>
                <label className="full">Email<input key={userEmail} defaultValue={userEmail} /></label>
              </div>
              <Button onClick={() => setProfileSaved(true)}>Lưu thay đổi</Button>
            </div>
          )}

          {/* Other Tabs */}
          {tab === "Đánh giá của tôi" && (
            <div style={{ padding: "40px 0", color: "var(--muted)" }}>
              Tính năng đánh giá của tôi đang hiển thị các sản phẩm bạn đã mua và gửi phản hồi.
            </div>
          )}
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
function getInitialRoute(): { page: Page; adminSubView: AdminSubView } {
  if (typeof window === "undefined") {
    return { page: "home", adminSubView: "Dashboard" };
  }
  const path = window.location.pathname;
  if (path === "/payment/vnpay-return") return { page: "payment-return", adminSubView: "Dashboard" };
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
    return { page: "ai", adminSubView: "Dashboard" };
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

function getPathForPage(p: Page, adminSubView?: AdminSubView): string {
  switch (p) {
    case "home":
      return "/";
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
    case "checkout":
      return "/checkout";
    case "ai":
      return "/ai";
    case "leaf":
      return "/leaf";
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
  const [adminSubView, setAdminSubView] = useState<AdminSubView>(initialRoute.adminSubView);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [regions, setRegions] = useState<TeaRegion[]>(teaRegionsData);
  const [shops, setShops] = useState<TeaShop[]>(teaShopsData);

  // Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem("teasmart_registered_users");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [authSuccessMsg, setAuthSuccessMsg] = useState("");

  const [selectedProductId, setSelectedProductId] = useState<number>(initialProducts[0].id);
  const [selectedRegionId, setSelectedRegionId] = useState<string>("tan-cuong");
  const [selectedShopId, setSelectedShopId] = useState<string>("htx-hao-dat");

  // State: Cart & Wishlist
  const [cart, setCart] = useState<CartLine[]>([]);
  const [commerceError, setCommerceError] = useState("");
  const [favorites, setFavorites] = useState<number[]>([1, 4]); // Initial favorited products

  const navigate = (p: Page, subView?: AdminSubView) => {
    setPage(p);
    if (p === "admin") {
      if (subView) setAdminSubView(subView);
    }
    const targetPath = getPathForPage(p, subView || adminSubView);
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, "", targetPath);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const handlePopState = () => {
      const route = getInitialRoute();
      setPage(route.page);
      setAdminSubView(route.adminSubView);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user); setAuthSuccessMsg("");
    const returnPath = sessionStorage.getItem("teasmart_payment_return");
    if (user.role === "USER" && returnPath?.startsWith("/payment/vnpay-return?")) {
      sessionStorage.removeItem("teasmart_payment_return"); window.history.replaceState(null, "", returnPath); setPage("payment-return");
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
    setCurrentUser(null);
    setCart([]); setOrders([]);
    sessionStorage.removeItem("teasmart_access_token");
    sessionStorage.removeItem("teasmart_checkout");
    try {
      localStorage.removeItem("teasmart_current_user");
    } catch {
      // ignore
    }
    navigate("login");
  };

  async function refreshCart() { setCart(mapCart(await api<ApiCart>("/cart"))); }
  const addToCart = async (product: Product, _weight?: string) => {
    if (!currentUser || currentUser.role !== "USER") { navigate("login"); return false; }
    if (!products.some(p => p.id === product.id && p.name === product.name)) {
      setCommerceError("Sản phẩm này chưa có trong danh mục bán hàng hiện tại."); return false;
    }
    try {
      setCart(mapCart(await api<ApiCart>("/cart/items", { method: "POST", body: JSON.stringify({ productId: product.id, quantity: 1 }) })));
      setCommerceError(""); return true;
    } catch (e) { setCommerceError(errorMessage(e)); return false; }
  };
  const handleBuyNow = async (product: Product, weight?: string) => {
    if (await addToCart(product, weight)) navigate("checkout");
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
        if (live) setProducts([first, ...rest].flatMap(p => p.content).map(mapProduct));
      } catch (e) { if (live) setCommerceError(errorMessage(e)); }
      if (sessionStorage.getItem("teasmart_access_token")) {
        try { const user = mapUser(await api<ApiUser>("/users/me")); if (live) setCurrentUser(user); }
        catch { sessionStorage.removeItem("teasmart_access_token"); }
      }
    })(); return () => { live = false; };
  }, []);
  useEffect(() => {
    let live = true;
    if (currentUser?.role === "USER") {
      void api<ApiCart>("/cart").then(c => { if (live) setCart(mapCart(c)); }).catch(e => { if (live) setCommerceError(errorMessage(e)); });
      void api<ApiPage<{ orderId: number }>>("/orders?size=50").then(async result => {
        const details = await Promise.all(result.content.map(o => api<ApiOrder>(`/orders/${o.orderId}`)));
        if (live) setOrders(details.map(mapOrder));
      }).catch(e => { if (live) setCommerceError(errorMessage(e)); });
    }
    return () => { live = false; };
  }, [currentUser?.id, page]);

  const toggleFavorite = (productId: number) => {
    setFavorites((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleSelectProduct = (prod: Product) => {
    setSelectedProductId(prod.id);
    navigate("product");
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
  const handleAddProduct = (newProd: Omit<Product, "id">) => {
    const id = Date.now();
    setProducts((prev) => [{ id, ...newProd }, ...prev]);
  };

  const handleUpdateProduct = (updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleDeleteProduct = (id: number) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleAddCategory = (name: string, desc: string) => {
    setCategories((prev) => [
      ...prev,
      { id: `cat-${Date.now()}`, name, description: desc, productsCount: 0 }
    ]);
  };

  const handleUpdateCategory = (cat: Category) => {
    setCategories((prev) => prev.map((c) => (c.id === cat.id ? cat : c)));
  };

  const handleDeleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

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

  const handleAddRegion = (reg: TeaRegion) => {
    setRegions((prev) => [reg, ...prev]);
  };

  const handleUpdateRegion = (reg: TeaRegion) => {
    setRegions((prev) => prev.map((r) => (r.id === reg.id ? reg : r)));
  };

  const handleDeleteRegion = (id: string) => {
    setRegions((prev) => prev.filter((r) => r.id !== id));
  };

  const handleAddShop = (shop: TeaShop) => {
    setShops((prev) => [shop, ...prev]);
  };

  const handleUpdateShop = (shop: TeaShop) => {
    setShops((prev) => prev.map((s) => (s.id === shop.id ? shop : s)));
  };

  const handleDeleteShop = (id: string) => {
    setShops((prev) => prev.filter((s) => s.id !== id));
  };

  const handleOrderPlaced = (newOrder: Order) => {
    setOrders((prev) => [newOrder, ...prev]);
    setCart([]);
  };

  const count = cart.reduce((s, x) => s + x.qty, 0);

  // Selected current objects
  const currentProduct =
    products.find((p) => p.id === selectedProductId) || products[0];
  const currentRegion =
    regions.find((r) => r.id === selectedRegionId) || regions[0];
  const currentShop =
    shops.find((s) => s.id === selectedShopId) || shops[0];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

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
        products={products}
        onAddProduct={handleAddProduct}
        onUpdateProduct={handleUpdateProduct}
        onDeleteProduct={handleDeleteProduct}
        categories={categories}
        onAddCategory={handleAddCategory}
        onUpdateCategory={handleUpdateCategory}
        onDeleteCategory={handleDeleteCategory}
        orders={orders}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        customers={customers}
        onUpdateCustomerStatus={handleUpdateCustomerStatus}
        reviews={reviews}
        onToggleReviewStatus={handleToggleReviewStatus}
        regions={regions}
        onAddRegion={handleAddRegion}
        onUpdateRegion={handleUpdateRegion}
        onDeleteRegion={handleDeleteRegion}
        shops={shops}
        onAddShop={handleAddShop}
        onUpdateShop={handleUpdateShop}
        onDeleteShop={handleDeleteShop}
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
      {page === "product" && currentProduct && (
        <ProductDetail
          product={currentProduct}
          onAddToCart={addToCart}
          onBuyNow={handleBuyNow}
          navigate={navigate}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onSelectProduct={handleSelectProduct}
        />
      )}

      {page === "tea-regions" && (
        <TeaRegionsList
          onSelectRegion={handleSelectRegion}
          onSelectProduct={handleSelectProduct}
          onAddToCart={addToCart}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          navigate={navigate}
        />
      )}

      {page === "tea-region-detail" && (
        <TeaRegionDetail
          region={currentRegion}
          products={products}
          onSelectProduct={handleSelectProduct}
          onAddToCart={addToCart}
          onBuyNow={handleBuyNow}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onBack={() => navigate("tea-regions")}
        />
      )}

      {page === "shops" && (
        <TeaShopsList
          onSelectShop={handleSelectShop}
          onSelectProduct={handleSelectProduct}
          onAddToCart={addToCart}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
        />
      )}

      {page === "shop-detail" && (
        <TeaShopDetail
          shop={currentShop}
          products={products}
          onSelectProduct={handleSelectProduct}
          onAddToCart={addToCart}
          onBuyNow={handleBuyNow}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onBack={() => navigate("shops")}
        />
      )}

      {page === "cart" && (
        <Cart cart={cart} updateCart={updateCart} navigate={navigate} />
      )}

      {page === "payment-return" && <PaymentReturn navigate={navigate} />}

      {page === "checkout" && (
        <PaymentCheckout key={String(currentUser?.id)} cart={cart} user={currentUser} navigate={navigate} onOrderPlaced={handleOrderPlaced} />
      )}

      {page === "ai" && (
        <TeaAdvisor
          navigate={navigate}
          onAddToCart={addToCart}
          customer={currentUser?.role === "USER"}
          onSelectProduct={handleSelectProduct}
        />
      )}

      {page === "leaf" && <LeafDisease />}

      {page === "account" && (
        <Account
          favorites={favorites}
          products={products}
          onAddToCart={addToCart}
          onToggleFavorite={toggleFavorite}
          onSelectProduct={handleSelectProduct}
          orders={orders}
          currentUser={currentUser}
          onLogout={handleLogout}
          navigate={navigate}
        />
      )}

      {page === "about" && <AboutPage navigate={navigate} />}
      {page === "policy" && <PolicyPage />}
      </div>

      {!["ai", "leaf", "checkout", "admin"].includes(page) && (
        <Footer navigate={navigate} />
      )}
    </div>
  );
}
