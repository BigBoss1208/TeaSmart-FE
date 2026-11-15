export interface PaymentReturnStatus {
  checkoutSessionId?: number;
  orderId: number | null;
  attemptStatus: string;
  sessionStatus: string;
  reconciliationRequired: boolean;
}

/** Return unresolved/non-final payments to Checkout; only a created order stays on the result page. */
export function paymentReturnDestination(result: PaymentReturnStatus): "checkout" | "result" {
  if (result.orderId != null) return "result";
  if (result.attemptStatus === "FAILED_FINAL") return "checkout";
  if (["PENDING", "UNKNOWN"].includes(result.attemptStatus)
      || result.sessionStatus === "PAID_PENDING_ORDER" || result.reconciliationRequired) return "checkout";
  return "result";
}

/** Create a fresh, non-submitting checkout draft only after the backend reports
 * a verified terminal cancellation for the exact saved session/reference. */
export function checkoutAfterVerifiedCancellation(
  saved: Record<string, unknown>, reference: string, checkoutSessionId: number, nextIdempotencyKey: string,
): Record<string, unknown> | null {
  if (!reference || saved.attemptReference !== reference
      || saved.sessionId !== checkoutSessionId || !saved.requestBody
      || typeof saved.requestBody !== "object") return null;
  const { attemptKey: _attemptKey, attemptReference: _attemptReference, ...draft } = saved;
  return { ...draft, key: nextIdempotencyKey, sessionId: null, method: "COD", verifiedCancellationDraft: true };
}
