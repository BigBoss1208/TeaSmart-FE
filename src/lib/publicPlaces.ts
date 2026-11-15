export interface PublicPlace { id: number; name: string; description: string | null; location: string | null; image: string | null; phone?: string | null; email?: string | null }
export const normalizePlace = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
export function isThaiNguyenPlace(place: PublicPlace) {
 const text = normalizePlace(`${place.name} ${place.description ?? ""} ${place.location ?? ""}`);
 return text.includes("thai nguyen") && !/\b(test\d*|demo|development|dev)\b|thu nghiem|minh hoa/.test(text);
}
export function filterPlaces(items: PublicPlace[], query: string, location: string) {
 const term = normalizePlace(query.trim());
 return items.filter(item => normalizePlace(`${item.name} ${item.location ?? ""}`).includes(term) && (!location || item.location === location));
}
