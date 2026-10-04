import { Page } from "../types";
import { Icon } from "./Icon";

export function Footer({ navigate }: { navigate: (p: Page) => void }) {
  return (
    <footer className="footer">
      <div className="footer-top" style={{ gridTemplateColumns: "1.8fr 1fr 1fr 1fr 1.2fr" }}>
        {/* Brand */}
        <div className="footer-brand">
          <div className="logo light-logo">
            <span className="logo-mark">
              <Icon name="leaf" />
            </span>
            TeaSmart
          </div>
          <p>Tinh hoa chè Thái Nguyên – Chạm vị tự nhiên.</p>
          <span>
            Hệ thống thương mại điện tử chè Thái Nguyên kết hợp công nghệ AI tư vấn khẩu vị và nhận diện sâu bệnh trên lá chè.
          </span>
          <div style={{ marginTop: "16px", fontSize: "10px", color: "var(--sage)" }}>
            📍 Tân Cương, TP. Thái Nguyên, Việt Nam
          </div>
        </div>

        {/* Group 1: TeaSmart */}
        <div>
          <strong>TeaSmart</strong>
          <button onClick={() => navigate("home")}>Trang chủ</button>
          <button onClick={() => navigate("about")}>Về TeaSmart</button>
          <button onClick={() => { navigate("home"); window.scrollTo({ top: 1800, behavior: "smooth" }); }}>
            Câu chuyện thương hiệu
          </button>
          <button onClick={() => navigate("tea-regions")}>Di sản trà xứ Thái</button>
        </div>

        {/* Group 2: Khám phá */}
        <div>
          <strong>Khám phá</strong>
          <button onClick={() => navigate("explore")}>Tất cả sản phẩm</button>
          <button onClick={() => navigate("tea-regions")}>4 Vùng chè đặc sản</button>
          <button onClick={() => navigate("shops")}>Cửa hàng & Thương hiệu</button>
          <button onClick={() => navigate("explore")}>Trà biếu & Quà tặng</button>
        </div>

        {/* Group 3: AI & Công nghệ */}
        <div>
          <strong>AI & Công nghệ</strong>
          <button onClick={() => navigate("ai")}>AI tư vấn chọn chè</button>
          <button onClick={() => navigate("leaf")}>AI phân loại lá chè</button>
          <button onClick={() => navigate("account")}>Tài khoản & Đơn hàng</button>
          <button onClick={() => navigate("account")}>Sản phẩm yêu thích</button>
        </div>

        {/* Group 4: Hỗ trợ & Liên hệ */}
        <div>
          <strong>Hỗ trợ</strong>
          <button onClick={() => navigate("policy")}>Giao hàng & Đổi trả</button>
          <button onClick={() => navigate("about")}>Liên hệ hợp tác</button>
          <button onClick={() => navigate("policy")}>Chính sách bảo mật</button>
          <button onClick={() => navigate("policy")}>Điều khoản sử dụng</button>
          <div className="socials" style={{ marginTop: "10px" }}>
            <button aria-label="Facebook">f</button>
            <button aria-label="LinkedIn">in</button>
            <button aria-label="Instagram">ig</button>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2025 - 2026 TeaSmart. Đồ án thương mại điện tử chuyên ngành CNTT.</span>
        <button onClick={() => navigate("admin")} style={{ textDecoration: "underline", color: "var(--gold)" }}>
          Cổng Quản trị Admin
        </button>
        <div>
          <button onClick={() => navigate("policy")}>Bảo mật</button>
          <button onClick={() => navigate("policy")}>Điều khoản</button>
        </div>
      </div>
    </footer>
  );
}
