import { useState, useRef, useEffect } from "react";
import { Page, Product, User } from "../types";
import { Icon } from "./Icon";
import { money } from "./ProductCard";

function removeDiacritics(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

export function Header({
  page,
  navigate,
  cartCount,
  wishlistCount,
  products,
  onSelectProduct,
  currentUser,
  onLogout
}: {
  page: Page;
  navigate: (p: Page) => void;
  cartCount: number;
  wishlistCount: number;
  products: Product[];
  onSelectProduct: (p: Product) => void;
  currentUser?: User | null;
  onLogout?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [badgeBump, setBadgeBump] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Trigger brief bounce animation on cart count changes
  useEffect(() => {
    if (cartCount > 0) {
      setBadgeBump(true);
      const t = setTimeout(() => setBadgeBump(false), 300);
      return () => clearTimeout(t);
    }
  }, [cartCount]);

  // Handle sticky header on scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const cleanQuery = query.trim().toLowerCase();
  const normQuery = removeDiacritics(cleanQuery);

  const allMatches = cleanQuery
    ? products.filter((p) => {
        const nameLower = p.name.toLowerCase();
        const typeLower = p.type.toLowerCase();
        const noteLower = (p.note || "").toLowerCase();
        const nameNorm = removeDiacritics(nameLower);
        const typeNorm = removeDiacritics(typeLower);
        const noteNorm = removeDiacritics(noteLower);
        const tasteNorm = p.taste.map((t) => removeDiacritics(t.toLowerCase())).join(" ");

        return (
          nameLower.includes(cleanQuery) ||
          typeLower.includes(cleanQuery) ||
          noteLower.includes(cleanQuery) ||
          nameNorm.includes(normQuery) ||
          typeNorm.includes(normQuery) ||
          noteNorm.includes(normQuery) ||
          tasteNorm.includes(normQuery)
        );
      })
    : [];

  const searchResults = allMatches.slice(0, 6);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const go = (p: Page) => {
    navigate(p);
    setOpen(false);
    setShowDropdown(false);
    setMobileSearchOpen(false);
  };

  const handlePickProduct = (product: Product) => {
    onSelectProduct(product);
    setShowDropdown(false);
    setMobileSearchOpen(false);
    setQuery("");
  };

  return (
    <>
      <div className="announcement">
        Miễn phí giao hàng cho đơn từ 500.000₫ <span>•</span> Thu hái mới theo vụ <span>•</span> Trực tiếp từ nương chè Thái Nguyên
      </div>
      <header className={`header ${scrolled ? "scrolled" : ""}`}>
        {/* Left: Mobile Hamburger */}
        <button
          className="mobile-menu"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Đóng menu" : "Mở menu"}
        >
          <Icon name={open ? "close" : "menu"} size={22} />
        </button>

        {/* Center/Left: Brand Logo */}
        <button className="logo" onClick={() => go("home")}>
          <span className="logo-mark">
            <Icon name="leaf" size={22} />
          </span>
          <span>TeaSmart</span>
        </button>

        {/* Desktop Navigation & Mobile Navigation Drawer */}
        <nav className={open ? "nav open" : "nav"}>
          {/* Mobile Drawer Header */}
          <div className="mobile-drawer-header">
            <div className="mobile-drawer-brand">
              <span className="logo-mark">
                <Icon name="leaf" size={18} />
              </span>
              <span>TeaSmart</span>
            </div>
            <button
              type="button"
              className="mobile-drawer-close"
              onClick={() => setOpen(false)}
              aria-label="Đóng menu"
            >
              <Icon name="close" size={20} />
            </button>
          </div>

          <div className="nav-links-wrap">
            <button className={page === "home" ? "active" : ""} onClick={() => go("home")}>
              Trang chủ
            </button>
            <button className={page === "explore" ? "active" : ""} onClick={() => go("explore")}>
              Khám phá chè
            </button>
            <button
              className={page === "tea-regions" || page === "tea-region-detail" ? "active" : ""}
              onClick={() => go("tea-regions")}
            >
              Vùng chè
            </button>
            <button
              className={page === "shops" || page === "shop-detail" ? "active" : ""}
              onClick={() => go("shops")}
            >
              Cửa hàng & HTX
            </button>
            <button className={page === "about" ? "active" : ""} onClick={() => go("about")}>
              Câu chuyện TeaSmart
            </button>
            <button
              className={page === "ai" || page === "leaf" ? "active" : ""}
              onClick={() => go("ai")}
            >
              AI Tư vấn
            </button>
          </div>

          {/* Mobile Drawer Auth section */}
          <div className="mobile-drawer-auth">
            {currentUser ? (
              <div className="mobile-drawer-user-box">
                <div className="mobile-user-info">
                  <strong>{currentUser.name}</strong>
                  <small>{currentUser.email}</small>
                </div>
                {currentUser.role === "ADMIN" && (
                  <button
                    className="mobile-nav-item admin-link"
                    onClick={() => go("admin")}
                  >
                    🛡️ Bảng điều khiển Quản trị
                  </button>
                )}
                <button
                  className="mobile-nav-item"
                  onClick={() => go("account")}
                >
                  👤 Trang cá nhân & Đơn hàng
                </button>
                {onLogout && (
                  <button
                    className="mobile-nav-item logout-link"
                    onClick={() => {
                      setOpen(false);
                      onLogout();
                    }}
                  >
                    Đăng xuất
                  </button>
                )}
              </div>
            ) : (
              <div className="mobile-drawer-auth-btns">
                <button
                  className="btn btn-primary"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => go("login")}
                >
                  Đăng nhập
                </button>
                <button
                  className="btn btn-outline"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => go("register")}
                >
                  Đăng ký tài khoản
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Mobile backdrop */}
        {open && (
          <div
            className="mobile-nav-backdrop"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Right: Actions (Desktop: Search + Icons; Mobile: 4 Icons) */}
        <div className="header-actions">
          {/* Desktop Search input with dropdown */}
          <div className="header-search-wrap" ref={searchRef}>
            <span className="header-search-icon-btn">
              <Icon name="search" size={15} />
            </span>
            <input
              type="text"
              className="header-search-input"
              placeholder="Tìm kiếm chè Thái Nguyên..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  go("explore");
                }
              }}
            />
            {showDropdown && query.trim().length > 0 && (
              <div className="search-dropdown" role="region" aria-label="Kết quả tìm kiếm">
                <div className="search-header">
                  <span>KẾT QUẢ CHO "{query.toUpperCase()}" ({allMatches.length})</span>
                  <button
                    type="button"
                    className="search-header-close"
                    onClick={() => setShowDropdown(false)}
                    aria-label="Đóng kết quả tìm kiếm"
                  >
                    ✕
                  </button>
                </div>

                <div className="search-results-scroll">
                  {allMatches.length === 0 ? (
                    <div className="search-empty-box">
                      <p className="search-empty-text">Không tìm thấy sản phẩm phù hợp với "{query}".</p>
                      <div className="search-suggest-heading">GỢI Ý SẢN PHẨM NỔI BẬT:</div>
                      {products.slice(0, 3).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="search-result-item"
                          onClick={() => handlePickProduct(item)}
                        >
                          <div className="search-col-image">
                            <img src={item.image} alt={item.name} loading="lazy" />
                          </div>
                          <div className="search-col-info">
                            <div className="search-item-title">{item.name}</div>
                            <div className="search-item-sub">{item.type} {item.weight ? `· ${item.weight}` : ""}</div>
                          </div>
                          <div className="search-col-price">{money(item.price)}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    searchResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="search-result-item"
                        onClick={() => handlePickProduct(item)}
                      >
                        <div className="search-col-image">
                          <img src={item.image} alt={item.name} loading="lazy" />
                        </div>
                        <div className="search-col-info">
                          <div className="search-item-title">{item.name}</div>
                          <div className="search-item-sub">{item.type} {item.weight ? `· ${item.weight}` : ""}</div>
                        </div>
                        <div className="search-col-price">{money(item.price)}</div>
                      </button>
                    ))
                  )}
                </div>

                <div className="search-footer">
                  <button
                    type="button"
                    className="search-footer-btn"
                    onClick={() => go("explore")}
                  >
                    XEM TẤT CẢ SẢN PHẨM {allMatches.length > 0 ? `(${allMatches.length})` : ""} →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile search icon trigger (Mobile only: 🔍) */}
          <button
            type="button"
            className="header-icon-btn mobile-search-btn"
            aria-label="Tìm kiếm"
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            title="Tìm kiếm chè"
          >
            <Icon name="search" size={20} />
          </button>

          {/* Wishlist Icon: ♡ */}
          <button
            type="button"
            aria-label="Sản phẩm yêu thích"
            onClick={() => go("account")}
            className="header-icon-btn"
            title="Sản phẩm yêu thích"
          >
            <Icon name="heart" size={20} />
            {wishlistCount > 0 && <span className="wishlist-count">{wishlistCount}</span>}
          </button>

          {/* Account Icon: 👤 */}
          <button
            type="button"
            aria-label="Tài khoản"
            className="header-icon-btn"
            onClick={() => {
              if (currentUser) {
                if (currentUser.role === "ADMIN") {
                  go("admin");
                } else {
                  go("account");
                }
              } else {
                go("login");
              }
            }}
            title={currentUser ? `Tài khoản: ${currentUser.name}` : "Đăng nhập / Đăng ký"}
          >
            <Icon name="user" size={20} />
            {currentUser && <span className="user-logged-dot" />}
          </button>

          {/* Cart Icon: 🛒 */}
          <button
            type="button"
            className={`cart-icon header-icon-btn ${badgeBump ? "badge-bump" : ""}`}
            aria-label="Giỏ hàng"
            onClick={() => go("cart")}
            title="Giỏ hàng"
          >
            <Icon name="bag" size={20} />
            {cartCount > 0 && <span>{cartCount}</span>}
          </button>
        </div>
      </header>

      {/* Mobile search expanded panel */}
      {mobileSearchOpen && (
        <div className="mobile-search-panel-wrapper">
          <div
            className="mobile-search-backdrop"
            onClick={() => setMobileSearchOpen(false)}
            aria-hidden="true"
          />
          <div className="mobile-search-panel" role="search">
            <div className="mobile-search-bar">
              <span className="mobile-search-icon">
                <Icon name="search" size={17} />
              </span>
              <input
                type="text"
                className="mobile-search-input"
                placeholder="Tìm kiếm chè Thái Nguyên..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    go("explore");
                  }
                }}
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  className="mobile-search-clear"
                  onClick={() => setQuery("")}
                  aria-label="Xóa từ khóa"
                >
                  ✕
                </button>
              )}
              <button
                type="button"
                className="mobile-search-close-btn"
                onClick={() => setMobileSearchOpen(false)}
                aria-label="Đóng tìm kiếm"
              >
                Đóng
              </button>
            </div>

            {/* Mobile search results if query is typed */}
            {query.trim().length > 0 ? (
              <div className="mobile-search-results">
                <div className="mobile-search-count">
                  KẾT QUẢ CHO "{query.toUpperCase()}" ({allMatches.length})
                </div>

                <div className="mobile-search-scroll">
                  {allMatches.length === 0 ? (
                    <div className="search-empty-box">
                      <p className="search-empty-text">Không tìm thấy sản phẩm phù hợp.</p>
                      <div className="search-suggest-heading">GỢI Ý SẢN PHẨM NỔI BẬT:</div>
                      {products.slice(0, 3).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="search-result-item"
                          onClick={() => handlePickProduct(item)}
                        >
                          <div className="search-col-image">
                            <img src={item.image} alt={item.name} loading="lazy" />
                          </div>
                          <div className="search-col-info">
                            <div className="search-item-title">{item.name}</div>
                            <div className="search-item-sub">{item.type} {item.weight ? `· ${item.weight}` : ""}</div>
                          </div>
                          <div className="search-col-price">{money(item.price)}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    searchResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="search-result-item"
                        onClick={() => handlePickProduct(item)}
                      >
                        <div className="search-col-image">
                          <img src={item.image} alt={item.name} loading="lazy" />
                        </div>
                        <div className="search-col-info">
                          <div className="search-item-title">{item.name}</div>
                          <div className="search-item-sub">{item.type} {item.weight ? `· ${item.weight}` : ""}</div>
                        </div>
                        <div className="search-col-price">{money(item.price)}</div>
                      </button>
                    ))
                  )}
                </div>

                <div className="mobile-search-footer">
                  <button
                    type="button"
                    className="search-footer-btn"
                    onClick={() => go("explore")}
                  >
                    XEM TẤT CẢ SẢN PHẨM {allMatches.length > 0 ? `(${allMatches.length})` : ""} →
                  </button>
                </div>
              </div>
            ) : (
              <div className="mobile-search-hints">
                <span className="mobile-search-hint-title">GỢI Ý TÌM KIẾM NHANH:</span>
                <div className="mobile-search-tags">
                  {["Tân Cương", "Chè Đinh", "Nõn Tôm", "Trà Sen", "Hộp quà", "Chè xanh"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className="mobile-search-tag"
                      onClick={() => setQuery(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
