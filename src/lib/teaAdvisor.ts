import { api } from "./commerce";
import type { ApiProduct } from "./commerce";
export interface TeaPreferences { categoryId?: number; regionId?: number; minPrice?: number; maxPrice?: number;
  strength?: number; astringency?: number; aroma?: number; aftertaste?: number; purpose?: "DAILY" | "GIFT" }
export interface TeaSuggestion { product: ApiProduct; stockQuantity: number; score: number; reasons: string[] }
export interface TeaRecommendations { method: string; fallback: boolean; items: TeaSuggestion[] }
export interface TeaAdvice { method: string; reply: string; preferences: TeaPreferences; notices: string[]; recommendations: TeaRecommendations }
export function recommendationPath(productId?: number, profile?: string): string {
  return `/recommendations?limit=4${productId === undefined ? "" : `&productId=${encodeURIComponent(productId)}`}${profile ? `&profile=${encodeURIComponent(profile)}` : ""}`;
}
export function validateTeaForm(message: string, min: string, max: string): string | null {
  if (!message.trim() || message.length > 1000) return "Vui lòng nhập nhu cầu trong 1–1.000 ký tự.";
  for (const v of [min, max]) if (v && (!/^\d+(?:\.\d{1,2})?$/.test(v) || Number(v) > 9999999999.99)) return "Ngân sách phải là số tiền hợp lệ, tối đa hai chữ số thập phân.";
  if (min && Number(min) < 0 || max && Number(max) <= 0) return "Giá tối đa phải lớn hơn 0.";
  if (min && max && Number(min) > Number(max)) return "Giá tối thiểu không được lớn hơn giá tối đa.";
  if (/\bBearer\s+\S+|eyJ[\w-]+\.[\w-]+\.[\w-]+/i.test(message)) return "Không gửi token hoặc thông tin đăng nhập trong hội thoại.";
  return null;
}

export function requestTeaAdvice(message: string, preferences: TeaPreferences, context: TeaPreferences | undefined, signal: AbortSignal): Promise<TeaAdvice> {
  return api<TeaAdvice>("/chatbot/advice", { method: "POST", signal,
    body: JSON.stringify({ message: message.trim(), preferences, ...(context && { context }) }) });
}
