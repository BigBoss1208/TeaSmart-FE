import { useState } from "react";
import { TeaRegion, Product, Page } from "../types";
import { teaRegionsData } from "../data/teaData";
import { Icon } from "../components/Icon";
import { ProductCard } from "../components/ProductCard";
import { VideoCard } from "../components/VideoModal";
import { InteractiveMap } from "../components/InteractiveMap";
import { ScrollReveal } from "../components/ScrollReveal";

export function TeaRegionsList({
  onSelectRegion,
  onSelectProduct,
  onAddToCart,
  favorites,
  onToggleFavorite,
  navigate
}: {
  onSelectRegion: (id: string) => void;
  onSelectProduct: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  favorites: number[];
  onToggleFavorite: (id: number) => void;
  navigate: (p: Page) => void;
}) {
  return (
    <main className="page">
      {/* Hero */}
      <section className="explore-hero">
        <div>
          <div className="eyebrow">Di sản văn hóa & Địa lý</div>
          <div className="page-title">
            Khám phá 4 vùng chè<br />Thái Nguyên
          </div>
          <p>
            Mỗi vùng đất là một nốt hương riêng biệt: Tân Cương cốm non dịu ngọt, Trại Cài đượm đà sông Cầu, La Bằng thanh mát suối Kẹm và Khe Cốc tinh khôi hữu cơ.
          </p>
        </div>
        <img src={teaRegionsData[0].heroImage} alt="Đồi chè Thái Nguyên" />
      </section>

      {/* Grid of Regions */}
      <ScrollReveal direction="up" delay={80}>
        <section className="section">
          <div className="section-title">
            <div className="eyebrow">Tứ đại danh trà</div>
            <div className="title">Bản sắc thổ nhưỡng từng vùng chè</div>
            <p>Mỗi vùng nguyên liệu được thiên nhiên ưu đãi khí hậu và thổ nhưỡng độc nhất vô nhị tạo nên phẩm chất trà không thể hòa lẫn.</p>
          </div>

          <div className="regions-grid">
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
                  <div className="region-card-specialty">
                    <strong>Trà đặc sản tiêu biểu:</strong>
                    <span>{reg.specialtyTea}</span>
                  </div>
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
        </section>
      </ScrollReveal>

      {/* Video Documentary Section */}
      <ScrollReveal direction="up" delay={80}>
        <section className="section" style={{ paddingTop: "0" }}>
          <div className="section-title">
            <div className="eyebrow">Thước phim tư liệu</div>
            <div className="title">Hành trình khám phá các vùng chè</div>
            <p>Lắng nghe câu chuyện từ những nghệ nhân và thưởng ngoạn vẻ đẹp nương chè xanh ngát trải dài khắp miền trung du Thái Nguyên qua các thước phim thực tế.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
            <VideoCard
              videoId="cSnLRsksS7U"
              title="Thái Nguyên - Khám phá Đệ nhất danh trà Tân Cương"
              subtitle="Phim tư liệu di sản chè"
              image={teaRegionsData[0].heroImage}
              duration="Tập 1 · Vùng Tân Cương"
            />
            <VideoCard
              videoId="xaQGl2cGK68"
              title="Hương chè sương sớm dưới chân dãy Tam Đảo - La Bằng"
              subtitle="Văn hóa làng nghề truyền thống"
              image={teaRegionsData[2].heroImage}
              duration="Tập 2 · Vùng La Bằng"
            />
          </div>
        </section>
      </ScrollReveal>

      {/* Interactive Map */}
      <ScrollReveal direction="up" delay={80}>
        <InteractiveMap
          onSelectRegion={(id) => onSelectRegion(id)}
          onSelectShop={() => navigate("shops")}
        />
      </ScrollReveal>
    </main>
  );
}

export function TeaRegionDetail({
  region,
  products,
  onSelectProduct,
  onAddToCart,
  onBuyNow,
  favorites,
  onToggleFavorite,
  onBack
}: {
  region: TeaRegion;
  products: Product[];
  onSelectProduct: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  onBuyNow?: (p: Product) => void;
  favorites: number[];
  onToggleFavorite: (id: number) => void;
  onBack: () => void;
}) {
  const [activeGallery, setActiveGallery] = useState(region.gallery[0]);
  const relatedProducts = products.filter((p) => p.regionId === region.id);

  return (
    <main className="page">
      {/* Breadcrumb */}
      <div className="breadcrumbs">
        <button onClick={onBack} style={{ background: "none", border: 0, cursor: "pointer", color: "inherit", padding: 0 }}>
          Vùng chè
        </button>{" "}
        <span>/</span> {region.name}
      </div>

      {/* Hero Banner */}
      <section className="region-hero-banner">
        <img src={region.heroImage} alt={region.name} />
        <div className="region-hero-overlay" />
        <div className="region-hero-content">
          <div className="eyebrow" style={{ color: "var(--cream-2)" }}>{region.district} · Thái Nguyên</div>
          <h1 className="region-hero-title">{region.name}</h1>
          <p style={{ color: "rgba(255,255,255,.85)", fontSize: "15px", lineHeight: "1.7", maxWidth: "680px" }}>
            {region.tagline}
          </p>
        </div>
      </section>

      {/* Key Metrics Strip */}
      <div className="region-stats">
        <div className="region-stat-item">
          <span>Độ cao</span>
          <strong>{region.altitude}</strong>
          <small>Khí hậu ôn hòa</small>
        </div>
        <div className="region-stat-item">
          <span>Thổ nhưỡng</span>
          <strong>{region.soilType.split(",")[0]}</strong>
          <small>Khoáng chất dồi dào</small>
        </div>
        <div className="region-stat-item">
          <span>Khí hậu</span>
          <strong>Tam Đảo che chắn</strong>
          <small>{region.climate}</small>
        </div>
        <div className="region-stat-item">
          <span>Dòng trà nổi bật</span>
          <strong>{region.specialtyTea.split(",")[0]}</strong>
          <small>Thu hái thủ công</small>
        </div>
      </div>

      {/* Detailed Story & Video Section */}
      <section className="section" style={{ paddingTop: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: "60px", alignItems: "center" }}>
          <div>
            <div className="eyebrow">Thổ nhưỡng & Nghề chè</div>
            <h2 className="title" style={{ font: "500 32px 'Lora', serif", margin: "10px 0 20px" }}>
              Nơi búp chè ngậm sương mai
            </h2>
            <p style={{ color: "var(--muted)", lineHeight: "1.85", marginBottom: "20px" }}>
              {region.fullDesc}
            </p>

            <div style={{ background: "var(--cream)", padding: "20px", borderLeft: "3px solid var(--forest)", margin: "25px 0" }}>
              <div style={{ font: "600 12px 'Be Vietnam Pro'", textTransform: "uppercase", letterSpacing: ".1em", color: "var(--brown)", marginBottom: "6px" }}>
                Chuyện người & Nghề chè
              </div>
              <p style={{ color: "var(--ink)", margin: 0, fontSize: "12px", lineHeight: "1.75" }}>
                {region.heritageStory}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "20px" }}>
              {region.features.map((feat) => (
                <div key={feat} style={{ display: "flex", gap: "8px", alignItems: "flex-start", fontSize: "11px", color: "var(--forest)" }}>
                  <Icon name="check" size={16} />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* YouTube Video Player Embed */}
          <div>
            {region.youtubeVideoId && (
              <VideoCard
                videoId={region.youtubeVideoId}
                title={region.videoTitle || `Phim tư liệu: ${region.name}`}
                subtitle="Thước phim di sản trà xứ Thái"
                image={region.heroImage}
              />
            )}
          </div>
        </div>
      </section>

      {/* Photo Gallery */}
      <section className="section" style={{ paddingTop: "0" }}>
        <div className="section-title">
          <div className="eyebrow">Góc nhìn bản xứ</div>
          <div className="title">Hình ảnh nương chè {region.name}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr", gap: "20px" }}>
          <div style={{ height: "460px", overflow: "hidden" }}>
            <img src={activeGallery} alt={region.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {region.gallery.map((img) => (
              <button
                key={img}
                style={{
                  height: "140px",
                  padding: "0",
                  border: activeGallery === img ? "2px solid var(--forest)" : "1px solid var(--line)",
                  cursor: "pointer",
                  overflow: "hidden"
                }}
                onClick={() => setActiveGallery(img)}
              >
                <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Related Products from this region */}
      <section className="section" style={{ background: "var(--cream)", margin: "0 auto 60px", padding: "80px 34px" }}>
        <div className="section-title">
          <div className="eyebrow">Sản phẩm tiêu biểu</div>
          <div className="title">Thưởng thức hương vị {region.name}</div>
          <p>Các dòng sản phẩm trà chính gốc được thu hái và chế biến trực tiếp từ vùng nguyên liệu {region.name}.</p>
        </div>
        <div className="product-grid">
          {(relatedProducts.length > 0 ? relatedProducts : products.slice(0, 3)).map((prod) => (
            <ProductCard
              key={prod.id}
              product={prod}
              onView={() => onSelectProduct(prod)}
              onAdd={() => onAddToCart(prod)}
              onBuyNow={onBuyNow ? () => onBuyNow(prod) : undefined}
              isFavorite={favorites.includes(prod.id)}
              onToggleFavorite={() => onToggleFavorite(prod.id)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
