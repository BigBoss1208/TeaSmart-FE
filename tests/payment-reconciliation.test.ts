import test from "node:test";
import assert from "node:assert/strict";
import { queryOutcomeDescription } from "../src/lib/paymentReconciliation.ts";

test("unsigned response does not imply merchant mismatch or final failure", () => {
  assert.match(queryOutcomeDescription("SIGNATURE_REJECTED"), /thiếu hoặc sai chữ ký/);
  assert.match(queryOutcomeDescription("SIGNATURE_REJECTED"), /giữ nguyên UNKNOWN/);
});
test("verified query rejection remains distinct from payment failure", () => {
  assert.match(queryOutcomeDescription("VERIFIED_QUERY_REJECTED"), /không tự giải phóng reservation/);
  assert.match(queryOutcomeDescription("SIGNED_REFERENCE_MISMATCH"), /TxnRef/);
  assert.match(queryOutcomeDescription("SIGNED_MERCHANT_MISMATCH"), /TMN Code/);
});
test("verified response and unsent query are not described as an HTTP-only failure", () => {
  assert.match(queryOutcomeDescription("VERIFIED_RESPONSE"), /kiểm tra số tiền/);
  assert.match(queryOutcomeDescription("GATEWAY_NOT_CONFIGURED"), /chưa được gửi/);
  assert.match(queryOutcomeDescription("NOT_REQUESTED"), /Không gửi QueryDR/);
  assert.match(queryOutcomeDescription("FUTURE_CODE"), /không tự xác nhận thanh toán/);
});
