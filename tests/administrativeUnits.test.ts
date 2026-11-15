import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  findAdministrativeUnit,
  buildShippingAddress,
  normalizeAdministrativeSearch,
  type AdministrativeDataset,
} from "../src/lib/administrativeUnits.ts";

const dataset = JSON.parse(await readFile(new URL(
  "../public/data/vietnam-administrative-units-2026-11-08.json",
  import.meta.url,
), "utf8")) as AdministrativeDataset;

test("official export contains 34 provinces and 3,321 commune-level units with string codes", () => {
  assert.equal(dataset.provinces.length, 34);
  assert.equal(dataset.provinceCount, 34);
  assert.equal(dataset.provinces.reduce((total, province) => total + province.units.length, 0), 3321);
  assert.equal(dataset.communeLevelCount, 3321);
  assert.equal(new Set(dataset.provinces.map(province => province.code)).size, 34);
  assert.ok(dataset.provinces.every(province => typeof province.code === "string" && /^\d{2}$/.test(province.code)));
  assert.ok(dataset.provinces.every(province => province.units.every(unit =>
    typeof unit.code === "string" && /^\d{5}$/.test(unit.code))));
  const units = dataset.provinces.flatMap(province => province.units);
  assert.equal(new Set(units.map(unit => unit.code)).size, 3321);
  assert.deepEqual(units.reduce((counts, unit) => {
    counts[unit.type] = (counts[unit.type] ?? 0) + 1;
    return counts;
  }, {} as Record<string, number>), { "Phường": 709, "Xã": 2599, "Đặc khu": 13 });
});

test("accent-insensitive lookup scopes communes to the selected official province", () => {
  const thaiNguyen = dataset.provinces.find(province => province.code === "19");
  const bacNinh = dataset.provinces.find(province => province.code === "24");
  assert.ok(thaiNguyen);
  assert.ok(bacNinh);
  assert.equal(findAdministrativeUnit(dataset.provinces, "thai nguyen")?.code, "19");
  assert.equal(findAdministrativeUnit(dataset.provinces, "bac ninh")?.code, "24");
  assert.ok(thaiNguyen.units.length > 0);
  assert.ok(bacNinh.units.length > 0);
  assert.equal(findAdministrativeUnit(thaiNguyen.units, "tan cuong")?.name, "Xã Tân Cương");
  assert.equal(findAdministrativeUnit(bacNinh.units, "tan cuong"), undefined);
  assert.equal(normalizeAdministrativeSearch("Phường Ba Đình"), "phuong ba dinh");
  assert.ok(!thaiNguyen.units.some(unit => unit.code === bacNinh.units[0].code));
});

test("new checkout shipping address omits empty district and legacy district remains in the snapshot", () => {
  assert.equal(buildShippingAddress({
    detailAddress: "Số 1 đường Trà", ward: "Xã Tân Cương", district: "", province: "Tỉnh Thái Nguyên",
  }), "Số 1 đường Trà, Xã Tân Cương, Tỉnh Thái Nguyên");
  assert.equal(buildShippingAddress({
    detailAddress: "Số 2 đường Trà", ward: "Phường Trưng Vương", district: "Thành phố Thái Nguyên", province: "Thái Nguyên",
  }), "Số 2 đường Trà, Phường Trưng Vương, Thành phố Thái Nguyên, Thái Nguyên");
});
