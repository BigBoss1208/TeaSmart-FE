import { ApiError, errorMessage } from "./commerce.ts";

export function registrationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "DUPLICATE_EMAIL") return "Email đã được đăng ký.";
    if (error.code === "DUPLICATE_PHONE") return "Số điện thoại đã được đăng ký.";
    if (error.code === "VALIDATION_ERROR") return "Thông tin đăng ký không hợp lệ. Vui lòng kiểm tra các trường đã nhập.";
  }
  return errorMessage(error);
}

export function normalizeRegistrationPhone(phone: string): string {
  const compact = phone.replace(/\s/g, "");
  return compact.startsWith("+84") ? "0" + compact.slice(3) : compact;
}
