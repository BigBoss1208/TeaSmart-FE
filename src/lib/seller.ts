import { api } from "./commerce";
export interface SellerProfile {
  businessType?: string | null; representativeEmail?: string | null; province?: string | null; ward?: string | null; addressDetail?: string | null; applicationLogoUrl?: string | null; coverUrl?: string | null;
  shopName: string; representativeName: string; phone: string; businessAddress: string; description: string;
}
export interface SellerApplication extends SellerProfile {
  applicationId: number; applicantUserId: number; status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null; reviewerUserId: number | null; createdAt: string; reviewedAt: string | null;
}
export interface SellerShop {
  shopId: number; ownerUserId: number; approvedApplicationId: number; name: string;
  representativeName: string; phone: string; businessAddress: string; description: string;
  businessType?: string | null; representativeEmail?: string | null; province?: string | null; ward?: string | null; addressDetail?: string | null; applicationLogoUrl?: string | null; coverUrl?: string | null;
  logoUrl: string | null; status: "ACTIVE" | "SUSPENDED"; statusReason: string | null;
  createdAt: string; updatedAt: string;
}
export interface SellerState {
  productsEnabled?: boolean; profileDetailsEnabled?: boolean;
  enabled: boolean; status: "NONE" | "PENDING" | "REJECTED" | "ACTIVE" | "SUSPENDED" | "DISABLED";
  application: SellerApplication | null; shop: SellerShop | null;
}
export interface SellerPage<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number }
export const sellerStatusLabel = (status: string) => ({
  NONE: "Chưa đăng ký", PENDING: "Chờ duyệt", REJECTED: "Bị từ chối",
  APPROVED: "Đã duyệt", ACTIVE: "Đang hoạt động", SUSPENDED: "Bị khóa", DISABLED: "Chưa mở"
}[status] ?? status);
export const emptySellerProfile: SellerProfile = { shopName: "", representativeName: "", phone: "", businessAddress: "", description: "" };
export function shopProfile(shop: SellerShop): SellerProfile {
  return { businessType: shop.businessType, representativeEmail: shop.representativeEmail, province: shop.province, ward: shop.ward, addressDetail: shop.addressDetail, applicationLogoUrl: shop.applicationLogoUrl, coverUrl: shop.coverUrl, shopName: shop.name, representativeName: shop.representativeName, phone: shop.phone, businessAddress: shop.businessAddress, description: shop.description };
}
export function applicationProfile(app: SellerApplication): SellerProfile {
  return { businessType: app.businessType, representativeEmail: app.representativeEmail, province: app.province, ward: app.ward, addressDetail: app.addressDetail, applicationLogoUrl: app.applicationLogoUrl, coverUrl: app.coverUrl, shopName: app.shopName, representativeName: app.representativeName, phone: app.phone, businessAddress: app.businessAddress, description: app.description };
}
// Whitelist request fields: never forward IDs, status, ownership or role from response objects.
export function profilePayload(profile: SellerProfile): SellerProfile {
  return { businessType: profile.businessType, representativeEmail: profile.representativeEmail, province: profile.province, ward: profile.ward, addressDetail: profile.addressDetail, applicationLogoUrl: profile.applicationLogoUrl, coverUrl: profile.coverUrl, shopName: profile.shopName.trim(), representativeName: profile.representativeName.trim(),
    phone: profile.phone.trim(), businessAddress: profile.businessAddress.trim(), description: profile.description.trim() };
}
export const getSellerState = (signal?: AbortSignal) => api<SellerState>("/seller-applications/me", { signal });
export const submitSeller = (profile: SellerProfile) => api<SellerApplication>("/seller-applications", { method: "POST", body: JSON.stringify(profilePayload(profile)) });
export const updateSellerShop = (profile: SellerProfile) => api<SellerShop>("/seller/shop", { method: "PATCH", body: JSON.stringify(profilePayload(profile)) });
