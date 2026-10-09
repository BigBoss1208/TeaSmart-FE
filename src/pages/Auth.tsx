import { api, errorMessage, mapUser, type ApiUser } from "../lib/commerce";
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

  const [busy, setBusy] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (busy) return; setError(""); setBusy(true);
    try {
      const result = await api<{ accessToken: string; user: ApiUser }>("/auth/login", {
        method: "POST", body: JSON.stringify({ email: email.trim(), password }) });
      sessionStorage.setItem("teasmart_access_token", result.accessToken);
      onLogin(mapUser(result.user));
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
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
                onClick={() => setError("Chức năng khôi phục mật khẩu chưa được triển khai.")}
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

          <button type="submit" disabled={busy} className="btn btn-primary auth-submit-btn">
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

  const [busy, setBusy] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (busy) return; setError("");
    if (password !== confirmPassword) { setError("Mật khẩu nhập lại không khớp."); return; }
    if (password.length < 8 || new TextEncoder().encode(password).length > 72) {
      setError("Mật khẩu cần ít nhất 8 ký tự và tối đa 72 byte UTF-8."); return;
    }
    setBusy(true);
    try {
      const user = await api<ApiUser>("/auth/register", { method: "POST", body: JSON.stringify({
        fullName: name.trim(), email: email.trim(), phone: phone.trim().replace(/\s/g, ""), password }) });
      onRegisterSuccess(mapUser(user));
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
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
                  placeholder="Tối thiểu 8 ký tự"
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

          <button type="submit" disabled={busy} className="btn btn-primary auth-submit-btn">
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
