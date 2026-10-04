import { useState } from "react";
import { User, Page } from "../types";
import { Icon } from "../components/Icon";

export function LoginPage({
  onLogin,
  navigate,
  registeredUsers = [],
  successMessage
}: {
  onLogin: (user: User) => void;
  navigate: (p: Page) => void;
  registeredUsers?: User[];
  successMessage?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      setError("Vui lòng nhập đầy đủ Email và Mật khẩu.");
      return;
    }

    // 1. Check Demo Admin
    if (cleanEmail === "admin@teasmart.vn" && cleanPass === "admin123") {
      const adminUser: User = {
        id: "admin-1",
        name: "Quản trị viên TeaSmart",
        email: "admin@teasmart.vn",
        phone: "0988 888 888",
        role: "ADMIN",
        joinDate: "01/2024"
      };
      onLogin(adminUser);
      return;
    }

    // 2. Check Demo User
    if (cleanEmail === "nguyenan@gmail.com" && cleanPass === "123456") {
      const demoUser: User = {
        id: "user-1",
        name: "Nguyễn An",
        email: "nguyenan@gmail.com",
        phone: "0912 345 678",
        role: "USER",
        joinDate: "03/2024"
      };
      onLogin(demoUser);
      return;
    }

    // 3. Check registered users list
    const found = registeredUsers.find(
      (u) => u.email.toLowerCase() === cleanEmail
    );

    if (found) {
      // In prototype with local state, registered user credentials match
      onLogin(found);
      return;
    }

    // If user entered valid format but not in demo/registered, create account or check
    if (cleanEmail.includes("@") && cleanPass.length >= 6) {
      // Allow seamless prototype login as general user
      const dynamicUser: User = {
        id: `user-${Date.now()}`,
        name: cleanEmail.split("@")[0].toUpperCase(),
        email: cleanEmail,
        role: "USER",
        joinDate: "03/2026"
      };
      onLogin(dynamicUser);
      return;
    }

    setError("Email hoặc Mật khẩu không chính xác. Mẹo: Dùng admin@teasmart.vn (mk: admin123) hoặc tài khoản khách hàng bên dưới.");
  };

  const handleFillDemo = (type: "admin" | "user") => {
    if (type === "admin") {
      setEmail("admin@teasmart.vn");
      setPassword("admin123");
    } else {
      setEmail("nguyenan@gmail.com");
      setPassword("123456");
    }
    setError("");
  };

  return (
    <main className="page auth-page">
      <div className="auth-card">
        {/* Back Link */}
        <button
          type="button"
          onClick={() => navigate("home")}
          className="auth-back-btn"
        >
          ← Quay về trang chủ TeaSmart
        </button>

        <div className="auth-header">
          <div className="auth-logo" onClick={() => navigate("home")}>
            <span className="logo-mark">
              <Icon name="leaf" />
            </span>
            <span>TeaSmart</span>
          </div>
          <h1 className="auth-title">Đăng nhập tài khoản</h1>
          <p className="auth-subtitle">
            Chào mừng bạn quay trở lại với không gian danh trà Thái Nguyên
          </p>
        </div>

        {/* Success Message from registration */}
        {successMessage && (
          <div className="auth-alert auth-alert-success">
            <Icon name="check" size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="auth-alert auth-alert-error">
            <Icon name="close" size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Forgot password notice */}
        {forgotSent && (
          <div className="auth-alert auth-alert-info">
            <Icon name="spark" size={16} />
            <span>
              Liên kết khôi phục mật khẩu đã được gửi đến email của bạn (mô phỏng).
            </span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="login-email">Email đăng nhập</label>
            <div className="auth-input-wrap">
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                placeholder="ten@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="auth-field">
            <div className="auth-field-header">
              <label htmlFor="login-password">Mật khẩu</label>
              <button
                type="button"
                className="auth-link-subtle"
                onClick={() => setForgotSent(true)}
              >
                Quên mật khẩu?
              </button>
            </div>
            <div className="auth-input-wrap">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary auth-submit-btn">
            Đăng nhập <Icon name="arrow" size={15} />
          </button>
        </form>

        {/* Switch to Register */}
        <div className="auth-footer-switch">
          Chưa có tài khoản?{" "}
          <button type="button" onClick={() => navigate("register")}>
            Đăng ký ngay
          </button>
        </div>

        {/* Quick Demo Credentials Box for easy testing */}
        <div className="auth-demo-box">
          <span className="auth-demo-label">Tài khoản demo sẵn sàng:</span>
          <div className="auth-demo-chips">
            <button
              type="button"
              className="auth-demo-chip"
              onClick={() => handleFillDemo("admin")}
              title="admin@teasmart.vn / admin123"
            >
              🛡️ Quản trị viên (Admin)
            </button>
            <button
              type="button"
              className="auth-demo-chip"
              onClick={() => handleFillDemo("user")}
              title="nguyenan@gmail.com / 123456"
            >
              👤 Khách hàng (User)
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export function RegisterPage({
  onRegisterSuccess,
  navigate
}: {
  onRegisterSuccess: (newUser: User) => void;
  navigate: (p: Page) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validations
    if (!name.trim()) {
      setError("Vui lòng nhập Họ và tên.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError("Email không đúng định dạng. Ví dụ: ten@gmail.com");
      return;
    }

    const cleanPhone = phone.trim().replace(/\s+/g, "");
    if (!cleanPhone || cleanPhone.length < 9) {
      setError("Vui lòng nhập số điện thoại hợp lệ (tối thiểu 9 số).");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu nhập lại không khớp. Vui lòng kiểm tra lại.");
      return;
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: cleanPhone,
      role: "USER",
      joinDate: new Date().toLocaleDateString("vi-VN", { month: "2-digit", year: "numeric" })
    };

    onRegisterSuccess(newUser);
  };

  return (
    <main className="page auth-page">
      <div className="auth-card">
        {/* Back Link */}
        <button
          type="button"
          onClick={() => navigate("home")}
          className="auth-back-btn"
        >
          ← Quay về trang chủ TeaSmart
        </button>

        <div className="auth-header">
          <div className="auth-logo" onClick={() => navigate("home")}>
            <span className="logo-mark">
              <Icon name="leaf" />
            </span>
            <span>TeaSmart</span>
          </div>
          <h1 className="auth-title">Đăng ký tài khoản</h1>
          <p className="auth-subtitle">
            Trở thành thành viên TeaSmart để nhận ưu đãi đặc quyền và lưu trữ dòng trà yêu thích
          </p>
        </div>

        {/* Error alert */}
        {error && (
          <div className="auth-alert auth-alert-error">
            <Icon name="close" size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="reg-name">Họ và tên *</label>
            <div className="auth-input-wrap">
              <input
                id="reg-name"
                type="text"
                required
                placeholder="Ví dụ: Nguyễn Văn An"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="reg-email">Địa chỉ Email *</label>
            <div className="auth-input-wrap">
              <input
                id="reg-email"
                type="email"
                required
                placeholder="ten@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="reg-phone">Số điện thoại *</label>
            <div className="auth-input-wrap">
              <input
                id="reg-phone"
                type="tel"
                required
                placeholder="0912 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="auth-form-row">
            <div className="auth-field">
              <label htmlFor="reg-pass">Mật khẩu *</label>
              <div className="auth-input-wrap">
                <input
                  id="reg-pass"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Tối thiểu 6 ký tự"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="reg-repass">Nhập lại mật khẩu *</label>
              <div className="auth-input-wrap">
                <input
                  id="reg-repass"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Khớp mật khẩu trên"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="auth-link-subtle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            </button>
          </div>

          <button type="submit" className="btn btn-primary auth-submit-btn">
            Đăng ký tài khoản <Icon name="arrow" size={15} />
          </button>
        </form>

        <div className="auth-footer-switch">
          Đã có tài khoản?{" "}
          <button type="button" onClick={() => navigate("login")}>
            Đăng nhập
          </button>
        </div>
      </div>
    </main>
  );
}
