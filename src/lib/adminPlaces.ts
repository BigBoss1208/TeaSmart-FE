import { ApiError, errorMessage } from "./commerce.ts";
export type PlaceKind = "region" | "store";
export type PlaceStatus = "ACTIVE" | "INACTIVE";
export interface TeaRegionRequest { name: string; description: string | null; location: string | null; imageUrl: string | null; status: PlaceStatus }
export interface StoreRequest { name: string; description: string | null; address: string | null; phone: string | null; email: string | null; logoUrl: string | null; status: PlaceStatus }
export interface AdminTeaRegion extends TeaRegionRequest { regionId: number; createdAt: string; updatedAt: string }
export interface AdminStore extends StoreRequest { storeId: number; createdAt: string; updatedAt: string }
export type AdminPlace = AdminTeaRegion | AdminStore;
export type PlaceRequest = TeaRegionRequest | StoreRequest;
export interface PlaceForm { name: string; description: string; location: string; imageUrl: string; address: string; phone: string; email: string; logoUrl: string; status: PlaceStatus }
export type PlaceTransport = <T>(path: string, init?: RequestInit) => Promise<T>;
export const placeFields = (kind: PlaceKind): (keyof PlaceForm)[] => kind === "region" ? ["name", "location", "imageUrl", "description", "status"] : ["name", "address", "phone", "email", "logoUrl", "description", "status"];
export function placeId(record: AdminPlace): number { return "regionId" in record ? record.regionId : record.storeId; }
export function placeForm(record?: AdminPlace): PlaceForm {
  const form: PlaceForm = { name: "", description: "", location: "", imageUrl: "", address: "", phone: "", email: "", logoUrl: "", status: "ACTIVE" };
  if (record) for (const field of Object.keys(form) as (keyof PlaceForm)[]) if (field in record) { if (field === "status") form.status = record.status; else form[field] = (record as unknown as Record<string, string | null>)[field] ?? ""; }
  return form;
}
export function placePayload(kind: PlaceKind, form: PlaceForm): PlaceRequest {
  const name = form.name.trim(), description = form.description.trim();
  if (!name || name.length > 150) throw new Error("Tên phải có từ 1 đến 150 ký tự.");
  if (new TextEncoder().encode(description).length > 65535) throw new Error("Mô tả vượt quá 65535 byte UTF-8.");
  if (form.status !== "ACTIVE" && form.status !== "INACTIVE") throw new Error("Trạng thái không hợp lệ.");
  const optional = (field: keyof PlaceForm, max: number, label: string): string | null => {
    const value = form[field].trim(); if (value.length > max) throw new Error(`${label} không được vượt quá ${max} ký tự.`); return value || null;
  };
  const common = { name, description: description || null, status: form.status };
  if (kind === "region") return { ...common, location: optional("location", 255, "Khu vực"), imageUrl: optional("imageUrl", 500, "URL ảnh") };
  const email = optional("email", 255, "Email");
  if (email && !/^[^\s@]+@[^\s@]+$/.test(email)) throw new Error("Email cửa hàng không hợp lệ.");
  return { ...common, address: optional("address", 255, "Địa chỉ"), phone: optional("phone", 20, "Số điện thoại"), email, logoUrl: optional("logoUrl", 500, "URL logo") };
}
export function placeFailure(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) return "Dữ liệu không hợp lệ. Kiểm tra tên, độ dài, email và trạng thái.";
    if (error.status === 404) return "Vùng chè hoặc cửa hàng không còn tồn tại. Vui lòng làm mới.";
    if (error.status === 409) return "Tên vùng chè đã tồn tại. Vui lòng chọn tên khác.";
    return errorMessage(error);
  }
  if (error instanceof Error && error.name === "TimeoutError") return "Yêu cầu quá thời gian chờ. Làm mới để kiểm tra kết quả trước khi gửi lại.";
  if (error instanceof TypeError) return "Không thể kết nối Backend. Vui lòng thử lại.";
  return error instanceof Error ? error.message : "Không thể xử lý yêu cầu.";
}
export function placeApi(kind: PlaceKind, transport: PlaceTransport) {
  const path = kind === "region" ? "/admin/tea-regions" : "/admin/stores";
  return {
    list: (signal?: AbortSignal) => transport<AdminPlace[]>(path, { signal }),
    detail: (id: number, signal?: AbortSignal) => transport<AdminPlace>(`${path}/${id}`, { signal }),
    save: (id: number | null, request: PlaceRequest, signal?: AbortSignal) => transport<AdminPlace>(id === null ? path : `${path}/${id}`, { method: id === null ? "POST" : "PUT", body: JSON.stringify(request), signal }),
    status: (id: number, status: PlaceStatus, signal?: AbortSignal) => transport<AdminPlace>(`${path}/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }), signal }),
  };
}
