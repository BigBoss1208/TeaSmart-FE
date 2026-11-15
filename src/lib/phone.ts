// Shipping only: account registration keeps its stricter AUTH-03 policy.
export function normalizeShippingPhone(value: string): string {
  const compact = value.replace(/[\s-]/g, "");
  return compact.startsWith("+84") ? "0" + compact.slice(3) : compact;
}
export function validShippingPhone(value: string): boolean {
  return /^0[0-9]{9}$/.test(normalizeShippingPhone(value));
}
