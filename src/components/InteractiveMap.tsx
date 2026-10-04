import { useState } from "react";
import { teaRegionsData, teaShopsData } from "../data/teaData";
import { TeaRegion, TeaShop, Page } from "../types";
import { Icon } from "./Icon";

export function InteractiveMap({
  onSelectRegion,
  onSelectShop
}: {
  onSelectRegion: (regionId: string) => void;
  onSelectShop: (shopId: string) => void;
}) {
  const [filterMode, setFilterMode] = useState<"all" | "regions" | "shops">("all");
  const [activeItem, setActiveItem] = useState<{
    type: "region" | "shop";
    data: TeaRegion | TeaShop;
  }>({
    type: "region",
    data: teaRegionsData[0]
  });

  return (
    <section className="map-section">
      <div className="section-title">
        <div className="eyebrow">Địa lý & Vùng nguyên liệu</div>
        <div className="title">Bản đồ 4 vùng chè danh tiếng Thái Nguyên</div>
        <p>Khám phá vị trí địa lý, địa hình thổ nhưỡng và các hợp tác xã sản xuất chè tiêu biểu trên khắp tỉnh Thái Nguyên.</p>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button
          className={`btn ${filterMode === "all" ? "btn-primary" : "btn-light"}`}
          style={{ minHeight: "36px", padding: "0 16px", fontSize: "11px" }}
          onClick={() => setFilterMode("all")}
        >
          Tất cả điểm đến
        </button>
        <button
          className={`btn ${filterMode === "regions" ? "btn-primary" : "btn-light"}`}
          style={{ minHeight: "36px", padding: "0 16px", fontSize: "11px" }}
          onClick={() => setFilterMode("regions")}
        >
          4 Vùng chè đặc sản
        </button>
        <button
          className={`btn ${filterMode === "shops" ? "btn-primary" : "btn-light"}`}
          style={{ minHeight: "36px", padding: "0 16px", fontSize: "11px" }}
          onClick={() => setFilterMode("shops")}
        >
          Cơ sở & HTX tiêu biểu
        </button>
      </div>

      <div className="map-container">
        <div className="map-canvas-wrap">
          <svg className="map-bg-svg" viewBox="0 0 800 600" preserveAspectRatio="none">
            {/* Topographical contours & river paths representing Song Cau & Song Cong */}
            <defs>
              <linearGradient id="terrainGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#dce8d5" />
                <stop offset="50%" stopColor="#cfdfc6" />
                <stop offset="100%" stopColor="#c2d5b6" />
              </linearGradient>
            </defs>
            <rect width="800" height="600" fill="url(#terrainGrad)" />
            {/* Mountain ranges silhouette (Tam Dao ridge on the west) */}
            <path
              d="M0 100 Q 80 180 140 280 T 120 480 L 0 540 Z"
              fill="#b7ceaa"
              opacity="0.6"
            />
            <text x="30" y="320" fill="#708a63" fontSize="12" fontWeight="700" letterSpacing="0.2em">
              DÃY TAM ĐẢO
            </text>
            {/* Song Cong River */}
            <path
              d="M 120 290 Q 220 340 320 380 T 400 500"
              fill="none"
              stroke="#95b9c7"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <text x="210" y="350" fill="#587f90" fontSize="10" fontStyle="italic">
              Sông Công
            </text>
            {/* Song Cau River */}
            <path
              d="M 520 80 Q 480 200 540 320 T 620 540"
              fill="none"
              stroke="#95b9c7"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <text x="560" y="240" fill="#587f90" fontSize="10" fontStyle="italic">
              Sông Cầu
            </text>
            {/* Region borders */}
            <circle cx="350" cy="370" r="70" fill="none" stroke="#b49762" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.8" />
            <circle cx="540" cy="290" r="60" fill="none" stroke="#b49762" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.8" />
            <circle cx="180" cy="320" r="60" fill="none" stroke="#b49762" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.8" />
            <circle cx="420" cy="150" r="60" fill="none" stroke="#b49762" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.8" />
          </svg>

          {/* Region Pins */}
          {(filterMode === "all" || filterMode === "regions") &&
            teaRegionsData.map((reg) => {
              const isSelected = activeItem.type === "region" && activeItem.data.id === reg.id;
              return (
                <div
                  key={reg.id}
                  className={`map-pin ${isSelected ? "active" : ""}`}
                  style={{ left: `${reg.mapCoords.xPercent}%`, top: `${reg.mapCoords.yPercent}%` }}
                  onClick={() => setActiveItem({ type: "region", data: reg })}
                >
                  <div className="map-pin-inner">
                    <Icon name="leaf" size={17} />
                  </div>
                  <div className="map-pin-label">{reg.name}</div>
                </div>
              );
            })}

          {/* Shop Pins */}
          {(filterMode === "all" || filterMode === "shops") &&
            teaShopsData.map((shop) => {
              const isSelected = activeItem.type === "shop" && activeItem.data.id === shop.id;
              return (
                <div
                  key={shop.id}
                  className={`map-pin shop ${isSelected ? "active" : ""}`}
                  style={{ left: `${shop.mapCoords.xPercent}%`, top: `${shop.mapCoords.yPercent}%` }}
                  onClick={() => setActiveItem({ type: "shop", data: shop })}
                >
                  <div className="map-pin-inner">
                    <Icon name="mapPin" size={17} />
                  </div>
                  <div className="map-pin-label">{shop.name}</div>
                </div>
              );
            })}
        </div>

        {/* Selected Info Card */}
        <div className="map-info-card">
          <div className="eyebrow" style={{ color: activeItem.type === "region" ? "var(--forest)" : "var(--brown)" }}>
            {activeItem.type === "region" ? "Điểm đến: Vùng chè đặc sản" : "Cơ sở / Hợp tác xã chè"}
          </div>
          <h4>{activeItem.data.name}</h4>
          {"tagline" in activeItem.data && (
            <div style={{ color: "var(--gold)", fontSize: "11px", fontWeight: "600", marginBottom: "8px" }}>
              {activeItem.data.tagline}
            </div>
          )}
          {"brandTitle" in activeItem.data && (
            <div style={{ color: "var(--gold)", fontSize: "11px", fontWeight: "600", marginBottom: "8px" }}>
              {activeItem.data.brandTitle}
            </div>
          )}
          <p style={{ margin: "10px 0 16px", fontSize: "11px", color: "var(--muted)", lineHeight: "1.7" }}>
            {"shortDesc" in activeItem.data ? activeItem.data.shortDesc : activeItem.data.description}
          </p>

          <div style={{ borderTop: "1px solid var(--line)", paddingTop: "12px", marginBottom: "18px", fontSize: "10px" }}>
            {"altitude" in activeItem.data ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div><strong>Độ cao:</strong> <span>{activeItem.data.altitude}</span></div>
                <div><strong>Khu vực:</strong> <span>{activeItem.data.district}</span></div>
              </div>
            ) : (
              <div>
                <strong>Địa chỉ:</strong> <span>{activeItem.data.address}</span>
              </div>
            )}
          </div>

          {activeItem.type === "region" ? (
            <button
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={() => onSelectRegion(activeItem.data.id)}
            >
              Khám phá vùng {activeItem.data.name} <Icon name="arrow" />
            </button>
          ) : (
            <button
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={() => onSelectShop(activeItem.data.id)}
            >
              Xem thông tin {activeItem.data.name} <Icon name="arrow" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
