import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createServer } from "vite";

test("Seller client whitelists profile fields and retains buyer role", async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: "custom" });
  try {
    const seller = await server.ssrLoadModule("/src/lib/seller.ts");
    const commerce = await server.ssrLoadModule("/src/lib/commerce.ts");
    assert.deepEqual(JSON.parse(JSON.stringify(seller.profilePayload({ shopName: " Shop ", representativeName: " Owner ", phone: "0912345678",
      businessAddress: " Address ", description: " Tea ", role: "ADMIN", shopId: 99, status: "ACTIVE" }))),
      { shopName: "Shop", representativeName: "Owner", phone: "0912345678", businessAddress: "Address", description: "Tea" });
    const extended = seller.profilePayload({ shopName: "Shop", representativeName: "Owner", phone: "0912345678", businessAddress: "Address", description: "Tea", businessType: "COOPERATIVE", representativeEmail: "contact@example.invalid", province: "Province", ward: "Ward", addressDetail: "Street", applicationLogoUrl: "/placeholder-teasmart.svg", coverUrl: "/placeholder-teasmart.svg", role: "SELLER", ownerUserId: 99, catalogStoreId: 1 });
    assert.equal(extended.businessType, "COOPERATIVE"); assert.equal(extended.representativeEmail, "contact@example.invalid");
    assert.equal(extended.ward, "Ward"); assert.equal(extended.coverUrl, "/placeholder-teasmart.svg");
    for (const key of ["role", "ownerUserId", "catalogStoreId", "shopId", "status"]) assert.equal(Object.hasOwn(extended,key), false);
    const user = commerce.mapUser({ userId: 1, fullName: "Seller", email: "test@example.invalid", role: "CUSTOMER",
      sellerEnabled: true, authorities: ["CUSTOMER", "SELLER"], createdAt: "2026-11-04" });
    assert.equal(user.role, "USER"); assert.deepEqual(user.authorities, ["CUSTOMER", "SELLER"]);
  } finally { await server.close(); }
});

test("Seller screens expose authentication and disabled states without fake commerce menus", async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: "custom" });
  try {
    const { default: Seller } = await server.ssrLoadModule("/src/pages/SellerCenter.tsx");
    const { default: Admin } = await server.ssrLoadModule("/src/pages/AdminSellers.tsx");
    const guest = renderToString(createElement(Seller, { user: null, onLogin() {}, onShopping() {} }));
    assert.match(guest, /Đăng nhập/); assert.doesNotMatch(guest, /Gửi đăng ký/);
    const disabled = renderToString(createElement(Seller, { user: { id: 1, role: "USER", sellerEnabled: false }, onLogin() {}, onShopping() {} }));
    assert.match(disabled, /chưa được mở/);
    const admin = renderToString(createElement(Admin, { enabled: true }));
    assert.match(admin, /Chờ duyệt/); assert.match(admin, /Bị từ chối/); assert.match(admin, /Bị khóa/);
    assert.doesNotMatch(admin, /doanh thu|rút tiền|hoa hồng/i);
  } finally { await server.close(); }
});
