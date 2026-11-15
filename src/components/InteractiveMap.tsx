import { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { teaRegionsData, teaShopsData } from "../data/teaData";
import { TeaRegion, TeaShop } from "../types";
import { Icon } from "./Icon";

function MapLayoutRefresh({ selectedRegionId }: { selectedRegionId: string }) {
  const map = useMap();
  useEffect(() => {
    const refresh = () => map.invalidateSize({ pan: false });
    const frame = requestAnimationFrame(refresh);
    const observer = new ResizeObserver(refresh);
    observer.observe(map.getContainer());
    window.addEventListener("resize", refresh);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", refresh);
    };
  }, [map, selectedRegionId]);
  return null;
}

export function InteractiveMap({
  selectedRegionId,
  onSelectedRegionChange,
  onSelectRegion,
  onSelectShop
}: {
  selectedRegionId: string;
  onSelectedRegionChange: (regionId: string) => void;
  onSelectRegion: (regionId: string) => void;
  onSelectShop: (shopId: string) => void;
}) {
  const selected = teaRegionsData.find(region => region.id === selectedRegionId) ?? teaRegionsData[0];
  const [tileError, setTileError] = useState(false);
  const locationQuery = selected ? `${selected.name}, Thái Nguyên, Việt Nam` : "Thái Nguyên, Việt Nam";
  const encoded = encodeURIComponent(locationQuery);
  return <section className="map-section">
    <div className="section-title">
      <div className="eyebrow">Địa lý & Vùng nguyên liệu</div>
      <h2 className="title">Bản đồ 4 vùng chè Thái Nguyên</h2>
      <p>Chọn vùng chè để xem thông tin và mở chỉ đường trên Google Maps.</p>
    </div>
    <div className="map-container map-live-layout">
      <div className="map-canvas-wrap map-live-canvas">
        <div className="map-region-controls" role="group" aria-label="Chọn vùng chè">
          {teaRegionsData.map(region =>
            <button type="button" key={region.id} className={selected?.id === region.id ? "is-selected" : ""}
              aria-pressed={selected?.id === region.id} onClick={() => onSelectedRegionChange(region.id)}>
              {region.name.replace("Vùng chè ", "")}
            </button>
          )}
        </div>
        <MapContainer className="tea-region-leaflet" center={[21.58, 105.78] as [number, number]} zoom={11} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            eventHandlers={{ tileerror: () => setTileError(true), tileload: () => setTileError(false) }}
          />
          <MapLayoutRefresh selectedRegionId={selectedRegionId} />
        </MapContainer>
        {tileError && <p className="map-tile-error" role="status">Không tải được một số ô bản đồ. Hãy kiểm tra kết nối mạng.</p>}
        <p className="map-coordinate-note">Vị trí ghim riêng cho từng vùng chưa được xác minh; bản đồ hiển thị khu vực Thái Nguyên.</p>
      </div>
      <aside className="map-info-card" aria-live="polite">
        {selected ? <>
          <div className="eyebrow">Điểm đến: Vùng chè đặc sản</div>
          <h3>{selected.name}</h3>
          <strong className="map-region-tagline">{selected.tagline}</strong>
          <div className="map-region-summary"><img src={selected.heroImage} alt={`Ảnh minh họa ${selected.name}`} loading="lazy"/><p>{selected.shortDesc}</p></div>
          <div className="map-action-row">
            <button type="button" className="btn btn-outline" onClick={() => onSelectRegion(selected.id)}>Xem chi tiết vùng chè</button>
            <a className="btn btn-primary" href={`https://www.google.com/maps/dir/?api=1&destination=${encoded}`} target="_blank" rel="noreferrer">Chỉ đường</a>
          </div>
        </> : <p className="map-empty">Chọn một vùng chè để xem thông tin.</p>}
      </aside>
    </div>
    <p className="place-note"><button className="btn btn-light" onClick={() => onSelectShop("")}>Cửa hàng & HTX</button></p>
  </section>;
}

function LegacyIllustrativeMap({
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
                <button type="button" aria-label={reg.name}
                  key={reg.id}
                  className={`map-pin ${isSelected ? "active" : ""}`}
                  style={{ left: `${reg.mapCoords.xPercent}%`, top: `${reg.mapCoords.yPercent}%` }}
                  onClick={() => setActiveItem({ type: "region", data: reg })}
                >
                  <div className="map-pin-inner">
                    <Icon name="leaf" size={17} />
                  </div>
                  <div className="map-pin-label">{reg.name}</div>
                </button>
              );
            })}

          {/* Shop Pins */}
          {(filterMode === "all" || filterMode === "shops") &&
            teaShopsData.map((shop) => {
              const isSelected = activeItem.type === "shop" && activeItem.data.id === shop.id;
              return (
                <button type="button" aria-label={shop.name}
                  key={shop.id}
                  className={`map-pin shop ${isSelected ? "active" : ""}`}
                  style={{ left: `${shop.mapCoords.xPercent}%`, top: `${shop.mapCoords.yPercent}%` }}
                  onClick={() => setActiveItem({ type: "shop", data: shop })}
                >
                  <div className="map-pin-inner">
                    <Icon name="mapPin" size={17} />
                  </div>
                  <div className="map-pin-label">{shop.name}</div>
                </button>
              );
            })}
        </div>

        <div className="map-destination-list" aria-label="Danh sách điểm trên sơ đồ">
          {teaRegionsData.map(reg => <button key={reg.id} aria-pressed={activeItem.type === "region" && activeItem.data.id === reg.id} onClick={() => setActiveItem({type:"region",data:reg})}>{reg.name}</button>)}
          {filterMode !== "regions" && teaShopsData.map(shop => <button key={shop.id} aria-pressed={activeItem.type === "shop" && activeItem.data.id === shop.id} onClick={() => setActiveItem({type:"shop",data:shop})}>{shop.name}</button>)}
          <small>Sơ đồ minh họa, không dùng để dẫn đường.</small>
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
