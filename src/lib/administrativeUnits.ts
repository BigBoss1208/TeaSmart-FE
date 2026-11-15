export interface AdministrativeUnit {
  code: string;
  name: string;
  type: string;
  legalBasis: string;
}

export interface AdministrativeProvince extends AdministrativeUnit {
  units: AdministrativeUnit[];
}

export interface AdministrativeDataset {
  schemaVersion: number;
  sourceSystem: string;
  effectiveAsOf: string;
  sourceFiles: string[];
  provinceCount: number;
  communeLevelCount: number;
  provinces: AdministrativeProvince[];
}

let datasetPromise: Promise<AdministrativeDataset> | undefined;

export function loadAdministrativeDataset(): Promise<AdministrativeDataset> {
  datasetPromise ??= fetch("/data/vietnam-administrative-units-2026-11-08.json")
    .then(async response => {
      if (!response.ok) throw new Error("Không tải được danh mục hành chính.");
      const data = await response.json() as AdministrativeDataset;
      if (data.provinceCount !== 34 || data.provinces.length !== 34 ||
          data.communeLevelCount !== 3321 ||
          data.provinces.some(province => !/^\d{2}$/.test(province.code) ||
            province.units.some(unit => !/^\d{5}$/.test(unit.code)))) {
        throw new Error("Danh mục hành chính không hợp lệ hoặc thiếu dữ liệu.");
      }
      return data;
    })
    .catch(error => {
      datasetPromise = undefined;
      throw error;
    });
  return datasetPromise;
}

export function normalizeAdministrativeSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi").replace(/đ/g, "d").replace(/[\s-]+/g, " ").trim();
}

function withoutUnitType(value: string): string {
  return normalizeAdministrativeSearch(value)
    .replace(/^(tinh|thanh pho|phuong|xa|dac khu)\s+/, "");
}

export function findAdministrativeUnit<T extends AdministrativeUnit>(units: T[], label: string): T | undefined {
  const wanted = withoutUnitType(label);
  if (!wanted) return undefined;
  return units.find(unit => withoutUnitType(unit.name) === wanted);
}

export function buildShippingAddress(address: {
  detailAddress: string;
  ward: string;
  district: string;
  province: string;
}): string {
  return [address.detailAddress, address.ward, address.district, address.province]
    .filter(Boolean).join(", ");
}
