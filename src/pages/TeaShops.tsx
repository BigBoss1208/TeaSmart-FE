import { useState } from "react";
import { TeaShop, Product, Page } from "../types";
import { teaShopsData } from "../data/teaData";
import { Icon } from "../components/Icon";
import { ProductCard } from "../components/ProductCard";
import { VideoCard } from "../components/VideoModal";
import { ScrollReveal } from "../components/ScrollReveal";

export function TeaShopsList({
  onSelectShop,
  onSelectProduct,
  onAddToCart,
  favorites,
  onToggleFavorite
}: {
  onSelectShop: (id: string) => void;
  onSelectProduct: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  favorites: number[];
  onToggleFavorite: (id: number) => void;
}) {
  const [filterRegion, setFilterRegion] = useState("all");

  const visibleShops =
    filterRegion === "all"
      ? teaShopsData
      : teaShopsData.filter((s) => s.regionId === filterRegion);

  return (
    <main className="page">
      <section className="explore-hero">
        <div>
          <div className="eyebrow">Cơ sở sản xuất & Hợp tác xã</div>
          <div className="page-title">
            Cửa hàng & Thương hiệu<br />chè Thái Nguyên
          </div>
          <p>
            Giới thiệu những hợp tác xã và thương hiệu chè tiêu biểu gìn giữ văn hóa làng nghề truyền thống, đạt chứng nhận OCOP 4 - 5 sao và tiêu chuẩn VietGAP.
          </p>
        </div>
        <img src={teaShopsData[0].coverImage} alt="HTX chè Thái Nguyên" />
      </section>

      <section className="section">
        {/* Filter bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "35px", flexWrap: "wrap", gap: "15px" }}>
          <div>
            <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: ".1em", color: "var(--brown)", fontWeight: 700, marginRight: "15px" }}>
              Lọc theo vùng nguyên liệu:
            </span>
            <div style={{ display: "inline-flex", gap: "8px", flexWrap: "wrap" }}>
              {[
                { id: "all", label: "Tất cả cơ sở" },
                { id: "tan-cuong", label: "Tân Cương" },
                { id: "la-bang", label: "La Bằng" },
                { id: "khe-coc", label: "Khe Cốc" },
                { id: "trai-cai", label: "Trại Cài" }
              ].map((r) => (
                <button
                  key={r.id}
                  className={`btn ${filterRegion === r.id ? "btn-primary" : "btn-light"}`}
                  style={{ minHeight: "34px", padding: "0 14px", fontSize: "10px" }}
                  onClick={() => setFilterRegion(r.id)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <span style={{ color: "var(--muted)", fontSize: "11px" }}>
            Hiển thị {visibleShops.length} đơn vị tiêu biểu
          </span>
        </div>

        {/* Shops Grid */}
        <ScrollReveal direction="up" delay={80}>
          <div className="shops-grid">
            {visibleShops.map((shop) => (
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
                    <div style={{ fontSize: "10px", color: "var(--forest)", marginBottom: "8px", display: "flex", gap: "12px" }}>
                      <span>📞 {shop.phone}</span>
                      <span>🗓️ Thành lập: {shop.established}</span>
                    </div>
                    <div className="shop-tags">
                      {shop.certifications.map((c) => (
                        <span className="shop-tag" key={c}>
                          ✓ {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    className="btn btn-outline"
                    style={{ color: "var(--forest)", width: "100%", marginTop: "12px", minHeight: "38px" }}
                    onClick={() => onSelectShop(shop.id)}
                  >
                    Xem thông tin & Sản phẩm <Icon name="arrow" size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </ScrollReveal>

        {/* Video Documentary Section in Shops */}
        <ScrollReveal direction="up" delay={80}>
          <div style={{ marginTop: "70px" }}>
            <div className="section-title">
              <div className="eyebrow">Phóng sự thực tế</div>
              <div className="title">Làng nghề & Quy trình chế biến chè</div>
              <p>Khám phá công đoạn sao chè, lấy hương và quy trình sản xuất đạt chuẩn OCOP 5 sao quốc gia tại các cơ sở chè Thái Nguyên.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
              <VideoCard
                videoId="cSnLRsksS7U"
                title="Quy trình chế biến chè OCOP 5 Sao tại HTX Hảo Đạt Tân Cương"
                subtitle="Phóng sự HTX tiêu biểu"
                image={teaShopsData[0].coverImage}
                duration="Phóng sự · Tân Cương"
              />
              <VideoCard
                videoId="cTfOKJjDNGk"
                title="Kỹ nghệ sao chè củi gang truyền thống lưu vực sông Cầu"
                subtitle="Nghệ nhân làng nghề"
                image={teaShopsData[3].coverImage}
                duration="Phóng sự · Đồng Hỷ"
              />
            </div>
          </div>
        </ScrollReveal>
      </section>
    </main>
  );
}

export function TeaShopDetail({
  shop,
  products,
  onSelectProduct,
  onAddToCart,
  onBuyNow,
  favorites,
  onToggleFavorite,
  onBack
}: {
  shop: TeaShop;
  products: Product[];
  onSelectProduct: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  onBuyNow?: (p: Product) => void;
  favorites: number[];
  onToggleFavorite: (id: number) => void;
  onBack: () => void;
}) {
  const shopProducts = products.filter((p) => p.regionId === shop.regionId);

  return (
    <main className="page">
      <div className="breadcrumbs">
        <button onClick={onBack} style={{ background: "none", border: 0, cursor: "pointer", color: "inherit", padding: 0 }}>
          Cửa hàng & Hợp tác xã
        </button>{" "}
        <span>/</span> {shop.name}
      </div>

      <section className="detail" style={{ paddingBottom: "40px" }}>
        <div style={{ position: "relative", height: "460px", overflow: "hidden" }}>
          <img src={shop.coverImage} alt={shop.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <span style={{ position: "absolute", bottom: "20px", left: "20px", background: "rgba(18,56,43,.9)", color: "#fff", padding: "8px 16px", fontSize: "11px", fontWeight: 600 }}>
            {shop.regionName}
          </span>
        </div>

        <div className="detail-info">
          <div className="eyebrow">{shop.brandTitle}</div>
          <h1 className="detail-title">{shop.name}</h1>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", margin: "20px 0", borderBlock: "1px solid var(--line)", padding: "16px 0", fontSize: "11px" }}>
            <div><strong>Địa chỉ cơ sở:</strong> <span>{shop.address}</span></div>
            <div><strong>Số điện thoại:</strong> <span>{shop.phone}</span></div>
            <div><strong>Thư điện tử:</strong> <span>{shop.email}</span></div>
            <div><strong>Đại diện pháp nhân:</strong> <span>{shop.founder} ({shop.established})</span></div>
          </div>

          <p style={{ color: "var(--muted)", lineHeight: "1.8", fontSize: "12px" }}>
            {shop.description}
          </p>

          <div style={{ marginTop: "24px" }}>
            <div className="option-label">Chứng nhận chất lượng</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
              {shop.certifications.map((c) => (
                <span key={c} style={{ background: "var(--cream)", border: "1px solid #c7d6c2", padding: "6px 12px", fontSize: "10px", color: "var(--forest)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Icon name="check" size={14} /> {c}
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginTop: "24px" }}>
            <div className="option-label">Dòng sản phẩm thế mạnh</div>
            <ul style={{ paddingLeft: "18px", fontSize: "11px", color: "var(--muted)", lineHeight: "1.7" }}>
              {shop.specialties.map((sp) => (
                <li key={sp}>{sp}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Video if present */}
      {shop.youtubeVideoId && (
        <section className="section" style={{ paddingTop: "0", maxWidth: "980px" }}>
          <div className="section-title">
            <div className="eyebrow">Phim tư liệu cơ sở</div>
            <div className="title">Quy trình sản xuất & Chế biến</div>
          </div>
          <VideoCard
            videoId={shop.youtubeVideoId}
            title={`Phóng sự quy trình sản xuất tại ${shop.name}`}
            subtitle="Phóng sự thực tế làng nghề"
            image={shop.coverImage}
            duration="Phóng sự thực tế"
          />
        </section>
      )}

      {/* Signature products */}
      <section className="section" style={{ background: "var(--cream)", padding: "80px 34px" }}>
        <div className="section-title">
          <div className="eyebrow">Sản phẩm cung ứng</div>
          <div className="title">Các dòng chè tiêu biểu</div>
          <p>Các sản phẩm chè chất lượng cao được sản xuất theo quy chuẩn của {shop.name} và phân phối chính hãng qua TeaSmart.</p>
        </div>
        <div className="product-grid">
          {(shopProducts.length > 0 ? shopProducts : products.slice(0, 3)).map((prod) => (
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
