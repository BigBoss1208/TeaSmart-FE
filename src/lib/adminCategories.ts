import { ApiError, errorMessage } from "./commerce.ts";
export type CategoryStatus = "ACTIVE" | "INACTIVE";
export interface CategoryRequest { name: string; description: string | null; status: CategoryStatus }
export interface AdminCategory extends CategoryRequest { categoryId: number; slug: string; createdAt: string; updatedAt: string }
export interface CategoryForm { name: string; description: string; status: CategoryStatus }
export type CategoryTransport = <T>(path: string, init?: RequestInit) => Promise<T>;
export function categoryForm(value?: AdminCategory): CategoryForm {
  return { name: value?.name ?? "", description: value?.description ?? "", status: value?.status ?? "ACTIVE" };
}
export function categoryPayload(form: CategoryForm): CategoryRequest {
  const name = form.name.trim(), description = form.description.trim();
  if (!name || name.length > 100) throw new Error("Tên danh mục phải có từ 1 đến 100 ký tự.");
  if (new TextEncoder().encode(description).length > 65535) throw new Error("Mô tả vượt quá 65535 byte UTF-8.");
  if (!["ACTIVE", "INACTIVE"].includes(form.status)) throw new Error("Trạng thái danh mục không hợp lệ.");
  return { name, description: description || null, status: form.status };
}
export function categoryFailure(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) return "Dữ liệu danh mục không hợp lệ. Kiểm tra tên, mô tả và trạng thái.";
    if (error.status === 404) return "Danh mục không còn tồn tại. Vui lòng làm mới danh sách.";
    if (error.status === 409) return "Tên hoặc đường dẫn danh mục đã tồn tại. Vui lòng chọn tên khác.";
    return errorMessage(error);
  }
  if (error instanceof Error && error.name === "TimeoutError") return "Yêu cầu quá thời gian chờ. Làm mới để kiểm tra kết quả trước khi gửi lại.";
  if (error instanceof TypeError) return "Không thể kết nối Backend. Vui lòng thử lại.";
  return error instanceof Error ? error.message : "Không thể xử lý danh mục.";
}
export function categoryApi(transport: CategoryTransport) {
  return {
    list: (signal?: AbortSignal) => transport<AdminCategory[]>("/admin/categories", { signal }),
    detail: (id: number, signal?: AbortSignal) => transport<AdminCategory>(`/admin/categories/${id}`, { signal }),
    save: (id: number | null, request: CategoryRequest, signal?: AbortSignal) => transport<AdminCategory>(id === null ? "/admin/categories" : `/admin/categories/${id}`, { method: id === null ? "POST" : "PUT", body: JSON.stringify(request), signal }),
    status: (id: number, status: CategoryStatus, signal?: AbortSignal) => transport<AdminCategory>(`/admin/categories/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }), signal }),
  };
}
