import { api, ApiError, type ApiPage, type ApiProduct } from "./commerce";

export const tasteChoices = ["Đậm vị", "Ít chát", "Hậu ngọt", "Hương thơm", "Uống hằng ngày", "Làm quà"] as const;
export type TasteChoice = typeof tasteChoices[number];
export interface TasteProduct extends ApiProduct {
  strengthLevel?: number | null;
  astringencyLevel?: number | null;
  aromaLevel?: number | null;
  aftertasteLevel?: number | null;
  storeName?: string;
}
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

export function isCustomerTasteProduct(p: TasteProduct): boolean {
  const text = [p.name, p.tasteNote, p.description, p.categoryName, p.storeName].filter(Boolean).join(" ");
  return !/(?:^|[\s\[\]_-])(?:dev|test|fixture|synthetic)(?:$|[\s\[\]_-])/i.test(text);
}
const level = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5;

export function matchesTaste(p: TasteProduct, choice: TasteChoice): boolean {
  if (!isCustomerTasteProduct(p) || !Number.isFinite(p.price) || p.price <= 0 || !p.stockQuantity || p.stockQuantity <= 0) return false;
  switch (choice) {
    case "Đậm vị": return level(p.strengthLevel) && p.strengthLevel >= 4;
    case "Ít chát": return level(p.astringencyLevel) && p.astringencyLevel <= 2;
    case "Hậu ngọt": return level(p.aftertasteLevel) && p.aftertasteLevel >= 4;
    case "Hương thơm": return level(p.aromaLevel) && p.aromaLevel >= 4;
    case "Uống hằng ngày": {
      const note = normalize(p.tasteNote ?? "");
      return !/\b(?:khong|chua|tranh)\b/.test(note) && /\b(?:uong|dung|su dung) hang ngay\b/.test(note);
    }
    case "Làm quà": return /^(?:tra )?qua tang$/.test(normalize(p.categoryName.trim()));
  }
}

export function tasteCriteria(choice: TasteChoice): string {
  return ({
    "Đậm vị": "Độ đậm từ 4/5 trong dữ liệu sản phẩm.",
    "Ít chát": "Độ chát từ 1–2/5 trong dữ liệu sản phẩm.",
    "Hậu ngọt": "Hậu vị từ 4/5 trong dữ liệu sản phẩm.",
    "Hương thơm": "Hương thơm từ 4/5 trong dữ liệu sản phẩm.",
    "Uống hằng ngày": "Ghi chú sản phẩm nêu rõ phù hợp dùng hằng ngày.",
    "Làm quà": "Sản phẩm thuộc danh mục quà tặng.",
  })[choice];
}

export async function loadTasteCatalog(signal: AbortSignal): Promise<TasteProduct[]> {
  const first = await api<ApiPage<TasteProduct>>("/products?size=50", { signal });
  const summaries = [...first.content];
  for (let page = 1; page < first.totalPages; page++) {
    summaries.push(...(await api<ApiPage<TasteProduct>>(`/products?size=50&page=${page}`, { signal })).content);
  }
  const candidates = [...new Map(summaries.filter(isCustomerTasteProduct).map(p => [p.productId, p])).values()];
  const details: TasteProduct[] = [];
  // Public summaries do not contain the numeric taste fields. Read the existing
  // detail API, with bounded concurrency; changing a choice reuses these facts.
  for (let i = 0; i < candidates.length; i += 4) {
    const batch = await Promise.all(candidates.slice(i, i + 4).map(async p => {
      try { return await api<TasteProduct>(`/products/${encodeURIComponent(p.slug)}`, { signal }); }
      catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
    }));
    details.push(...batch.filter((p): p is TasteProduct => p !== null && isCustomerTasteProduct(p)));
  }
  return details;
}
