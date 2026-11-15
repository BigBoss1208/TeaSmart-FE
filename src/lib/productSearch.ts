import type {Product} from "../types";
export function normalizeProductSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().replace(/\s+/g, " ").trim();
}
export function matchesProductSearch(product: Product, query: string): boolean {
  const text = normalizeProductSearch([product.name, product.type, product.regionName, product.weight, product.note, ...product.taste].filter(Boolean).join(" "));
  return normalizeProductSearch(query).split(" ").filter(Boolean).every(term => text.includes(term));
}
