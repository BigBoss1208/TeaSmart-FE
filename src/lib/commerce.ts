import type { Product, User, Order } from "../types";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const token = sessionStorage.getItem("teasmart_access_token");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`/api${path}`, { ...init, headers, signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000) });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    if (response.status === 401 && token === sessionStorage.getItem("teasmart_access_token")) sessionStorage.removeItem("teasmart_access_token");
    throw new ApiError(response.status, data?.code ?? "REQUEST_FAILED", data?.message ?? "Không thể kết nối TeaSmart.");
  }
  return data as T;
}
export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.name === "TimeoutError") return "Yêu cầu quá thời gian chờ. Vui lòng thử lại; nếu vừa lưu dữ liệu, hãy tải lại để kiểm tra kết quả trước khi gửi lại.";
  if (error instanceof Error && error.name === "AbortError") return "Yêu cầu đã được hủy.";
  if (error instanceof ApiError) {
    if (error.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (error.status === 403) return "Tài khoản không có quyền thực hiện thao tác này.";
    if (error.code === "VNPAY_UNAVAILABLE") return "VNPay Sandbox chưa được cấu hình. Bạn có thể chọn COD.";
    return `${error.message} (${error.code})`;
  }
  return "Kết nối bị gián đoạn. Có thể gửi lại cùng yêu cầu để kiểm tra kết quả; không tạo đơn mới.";
}
export interface ApiUser { userId: number; fullName: string; email: string; phone?: string; avatarUrl?: string | null; role: string; createdAt: string; sellerEnabled?: boolean; authorities?: string[] }
export const mapUser = (u: ApiUser): User => ({ id: u.userId, name: u.fullName, email: u.email,
  sellerEnabled: u.sellerEnabled, authorities: u.authorities, phone: u.phone, avatarUrl: u.avatarUrl ?? undefined, role: u.role === "ADMIN" ? "ADMIN" : "USER", joinDate: u.createdAt?.slice(0, 7) });
export interface ApiProduct { shopId?: number | null; shopName?: string | null; productId: number; name: string; slug: string; price: number; weightGrams: number;
  imageUrl: string | null; tasteNote: string | null; description?: string; stockQuantity?: number; strengthLevel?: number | null; astringencyLevel?: number | null; aromaLevel?: number | null; aftertasteLevel?: number | null; categoryName: string; regionId: number; regionName: string }
export const mapProduct = (p: ApiProduct): Product => ({ id: p.productId, name: p.name, slug: p.slug,
  type: p.categoryName, taste: [], note: p.tasteNote ?? "", price: p.price, weight: `${p.weightGrams}g`,
  image: p.imageUrl ?? "", description: p.description, stockQuantity: p.stockQuantity, rating: 0, regionId: String(p.regionId), regionName: p.regionName,
  intensity: p.strengthLevel ?? undefined, astringency: p.astringencyLevel ?? undefined, aroma: p.aromaLevel ?? undefined, sweetness: p.aftertasteLevel ?? undefined });
export interface ApiPage<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number }
export interface ApiCartItem { cartItemId: number; productId: number; name: string; slug: string; imageUrl: string | null;
  shopId?: number | null; shopName?: string | null; unitPrice: number; quantity: number; subtotal: number; stockQuantity: number; available: boolean; availabilityReason: string | null }
export interface ApiCart { items: ApiCartItem[]; totalItems: number; totalAmount: number }
export type CartLine = { shopId?: number | null; shopName?: string | null; product: Product; qty: number; cartItemId?: number; available?: boolean; availabilityReason?: string | null };
export const mapCart = (cart: ApiCart): CartLine[] => cart.items.map(x => ({ cartItemId: x.cartItemId, qty: x.quantity, shopId:x.shopId, shopName:x.shopName,
  available: x.available, availabilityReason: x.availabilityReason,
  product: { id: x.productId, name: x.name, slug: x.slug, image: x.imageUrl ?? "", price: x.unitPrice,
    type: "", taste: [], note: "", weight: "", rating: 0 } }));
export interface ApiOrder { orderId: number; orderCode: string; orderStatus: string; recipientName: string;
  recipientPhone: string; shippingAddress: string; subtotal?: number; shippingFee?: number; note?: string | null; totalAmount: number; createdAt: string; paymentMethod: string;
  paymentStatus: string; items: { productId: number; productName: string; unitPrice: number; quantity: number }[] }
export const orderLabels: Record<string, Order["status"]> = { PENDING: "Chờ xử lý", CONFIRMED: "Đã xác nhận",
  SHIPPING: "Đang giao", DELIVERED: "Đã giao", CANCELLED: "Đã hủy" };
export const mapOrder = (o: ApiOrder): Order => ({ id: o.orderCode, backendId: o.orderId, customerName: o.recipientName,
  customerPhone: o.recipientPhone, customerEmail: "", shippingAddress: o.shippingAddress, total: o.totalAmount,
  date: o.createdAt, status: orderLabels[o.orderStatus], paymentMethod: o.paymentMethod, paymentStatus: o.paymentStatus,
  items: o.items.map(x => ({ qty: x.quantity, product: { id: x.productId, name: x.productName, price: x.unitPrice,
    image: "", type: "", taste: [], note: "", weight: "", rating: 0 } })) });
export interface PaymentStatus { orderId: number; paymentMethod: string; gateway: string | null;
  paymentStatus: "PENDING" | "PAID" | "FAILED"; amount: number; paidAt: string | null; expiresAt: string | null;
  reconciliationRequired: boolean; lastReconciliationAt: string | null }
export interface ShippingRequest { recipientName: string; recipientPhone: string; shippingAddress: string; note: string | null }
export interface CheckoutSession {
  shopId?: number | null; shopName?: string | null; checkoutSessionId: number; sessionCode: string; status: string; reservationStatus: string; expiresAt: string;
  recipientName: string; recipientPhone: string; shippingAddress: string; note: string | null; subtotal: number;
  shippingFee: number; totalAmount: number; latestAttemptStatus: "PENDING" | "UNKNOWN" | "FAILED_FINAL" | "SUCCEEDED" | null;
  latestReference: string | null; latestAttemptNumber: number | null; reconciliationRequired: boolean; orderId: number | null;
  items: { productId: number; productName: string; unitPrice: number; quantity: number; subtotal: number }[];
}
export interface CheckoutSessionAction { session: CheckoutSession; paymentUrl: string | null; attemptReference: string | null; replayed: boolean }
export interface PendingCheckout { key: string; userId: string; method: "COD" | "VNPAY"; request: ShippingRequest; buyNow?: { productId: number; quantity: number }; selectedItems?: {cartItemId:number;quantity:number}[] }
export function readPendingCheckout(userId: string): PendingCheckout | null {
  try { const p = JSON.parse(sessionStorage.getItem("teasmart_checkout") ?? "null"); return p?.userId === userId ? p : null; }
  catch { return null; }
}
export function sandboxRedirect(url: string): void {
  const target = new URL(url);
  if (target.protocol !== "https:" || target.hostname !== "sandbox.vnpayment.vn"
    || target.pathname !== "/paymentv2/vpcpay.html") throw new Error("Invalid payment destination");
  window.location.assign(target.href);
}
