export type ProductStatus = "ACTIVE" | "INACTIVE";
export interface ProductRequest {
  categoryId: number; regionId: number; storeId: number; name: string; description: string | null;
  price: number; stockQuantity: number; weightGrams: number; imageUrl: string | null; tasteNote: string | null;
  strengthLevel: number | null; astringencyLevel: number | null; aromaLevel: number | null; aftertasteLevel: number | null;
  status: ProductStatus;
}
export interface AdminProduct extends ProductRequest {
  productId: number; slug: string; createdAt: string; updatedAt: string;
  categoryName: string; categoryStatus: string; regionName: string; regionStatus: string; storeName: string; storeStatus: string;
}
export interface ProductOption { id: number; name: string; status: string }
export interface ProductPage { content: AdminProduct[]; number: number; size: number; totalElements: number; totalPages: number }
export type ProductTransport = <T>(path: string, init?: RequestInit) => Promise<T>;
export const tasteFields = ["strengthLevel", "astringencyLevel", "aromaLevel", "aftertasteLevel"] as const;
export type ProductForm = Record<keyof ProductRequest, string>;
export function productForm(product?: AdminProduct): ProductForm {
  const empty: ProductForm = { categoryId: "", regionId: "", storeId: "", name: "", description: "", price: "", stockQuantity: "0", weightGrams: "", imageUrl: "", tasteNote: "", strengthLevel: "", astringencyLevel: "", aromaLevel: "", aftertasteLevel: "", status: "ACTIVE" };
  if (!product) return empty;
  for (const field of Object.keys(empty) as (keyof ProductRequest)[]) empty[field] = product[field] == null ? "" : String(product[field]);
  return empty;
}
export function productPayload(form: ProductForm): ProductRequest {
  const name = form.name.trim();
  if (!name || name.length > 200) throw new Error("Tên sản phẩm phải có từ 1 đến 200 ký tự.");
  if (!name.toLowerCase().replace(/đ/g, "d").normalize("NFD").replace(/\p{M}/gu, "").match(/[a-z0-9]/)) throw new Error("Tên sản phẩm cần có chữ hoặc số để tạo đường dẫn.");
  function integer(field: keyof ProductForm, label: string, min: number, max: number): number {
    const text = form[field].trim(); const value = Number(text);
    if (!/^\d+$/.test(text) || !Number.isSafeInteger(value) || value < min || value > max) throw new Error(`${label} không hợp lệ.`);
    return value;
  }
  const priceText = form.price.trim();
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(priceText) || Number(priceText) <= 0) throw new Error("Giá phải lớn hơn 0, tối đa 10 chữ số nguyên và 2 chữ số thập phân.");
  if (new TextEncoder().encode(form.description).length > 65535) throw new Error("Mô tả vượt quá 65535 byte UTF-8.");
  if (form.imageUrl.length > 500 || form.tasteNote.length > 500) throw new Error("URL ảnh và ghi chú hương vị không được vượt quá 500 ký tự.");
  if(form.imageUrl.trim()&&!(/^\/(?!\/)[^\\\s]*$/.test(form.imageUrl.trim())||/^https?:\/\/[^\s]+$/i.test(form.imageUrl.trim())))throw new Error("Ảnh phải là đường dẫn nội bộ hoặc URL http(s) hợp lệ.");
  if (form.status !== "ACTIVE" && form.status !== "INACTIVE") throw new Error("Trạng thái sản phẩm không hợp lệ.");
  const nullable = (value: string) => value.trim() === "" ? null : value;
  return {
    categoryId: integer("categoryId", "Danh mục", 1, Number.MAX_SAFE_INTEGER),
    regionId: integer("regionId", "Vùng chè", 1, Number.MAX_SAFE_INTEGER),
    storeId: integer("storeId", "Cửa hàng", 1, Number.MAX_SAFE_INTEGER),
    name, description: nullable(form.description), price: Number(priceText),
    stockQuantity: integer("stockQuantity", "Tồn kho", 0, 4294967295),
    weightGrams: integer("weightGrams", "Khối lượng", 1, 4294967295),
    imageUrl: nullable(form.imageUrl), tasteNote: nullable(form.tasteNote),
    ...Object.fromEntries(tasteFields.map(field => [field, form[field] === "" ? null : integer(field, "Điểm hương vị", 1, 5)])) as Pick<ProductRequest, typeof tasteFields[number]>,
    status: form.status,
  };
}
export function productApi(transport: ProductTransport) {
  return {
    async list(signal?: AbortSignal) {
      const first = await transport<ProductPage>("/admin/products?size=50", { signal });
      const all = [...first.content];
      for (let page = 1; page < first.totalPages; page++) {
        const next = await transport<ProductPage>(`/admin/products?size=50&page=${page}`, { signal });
        all.push(...next.content);
      }
      return all;
    },
    detail(id: number, signal?: AbortSignal) { return transport<AdminProduct>(`/admin/products/${id}`, { signal }); },
    save(id: number | null, request: ProductRequest & {expectedStockQuantity?:number}, signal?: AbortSignal) {
      return transport<AdminProduct>(id === null ? "/admin/products" : `/admin/products/${id}`, {
        method: id === null ? "POST" : "PUT", body: JSON.stringify(request), signal,
      });
    },
    status(id: number, status: ProductStatus, signal?: AbortSignal) {
      return transport<AdminProduct>(`/admin/products/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }), signal });
    },
    async options(signal?: AbortSignal) {
      const [categories, regions, stores] = await Promise.all([
        transport<{ categoryId: number; name: string; status: string }[]>("/admin/categories", { signal }),
        transport<{ regionId: number; name: string; status: string }[]>("/admin/tea-regions", { signal }),
        transport<{ storeId: number; name: string; status: string }[]>("/admin/stores", { signal }),
      ]);
      return {
        categories: categories.map(x => ({ id: x.categoryId, name: x.name, status: x.status })),
        regions: regions.map(x => ({ id: x.regionId, name: x.name, status: x.status })),
        stores: stores.map(x => ({ id: x.storeId, name: x.name, status: x.status })),
      };
    },
  };
}
