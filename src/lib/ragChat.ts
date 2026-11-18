import { api, ApiError, type ApiProduct } from "./commerce.ts"

import type { TeaAdvice, TeaPreferences } from "./teaAdvisor.ts"

export interface RagSource {
  id: string
  title: string
  url: string
  publisher: string
  accessedAt: string
}

export interface BusinessProduct {
  productId: number
  name: string
  slug: string
  price: number
  stockQuantity: number
  unitsSold: number | null
  averageRating: number | null
  reviewCount: number | null
}

export interface RagAdvice extends TeaAdvice {
  sources?: RagSource[]
  embeddingMethod?: string | null
  llmUsed?: boolean
  evidenceStatus?: "CITED_EVIDENCE" | "NO_RETRIEVAL" | "MODEL_ABSTAINED" | null
  businessKind?: string
  businessProducts?: BusinessProduct[]
}

export function requestRagAdvice(
  message: string,
  preferences: TeaPreferences,
  context: TeaPreferences | undefined,
  history: string[],
  signal: AbortSignal,
  allowLlm = true,
  productId?: number,
  suggestedProductIds?: number[],
  conversationId?: string,
): Promise<RagAdvice> {
  return api<RagAdvice>("/chatbot/rag", {
    method: "POST",
    signal: AbortSignal.any([signal, AbortSignal.timeout(45000)]),
    body: JSON.stringify({
      message: message.trim(),
      ...(conversationId && { conversationId }),
      preferences,
      ...(suggestedProductIds?.length && {
        suggestedProductIds: suggestedProductIds.slice(0, 4),
      }),
      ...(productId !== undefined && { productId }),
      ...(!allowLlm && { allowLlm: false }),
      ...(context && { context }),
      history: history.slice(-6).map((h) => h.slice(0, 1000)),
    }),
  })
}

export function currentBusinessProduct(slug: string, signal: AbortSignal) {
  return api<ApiProduct>(`/products/${encodeURIComponent(slug)}`, { signal })
}

/** Preserve provider errors: unavailable knowledge is never disguised as an LLM answer. */

export function chatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.name === "TimeoutError")
    return "Yêu cầu quá thời gian chờ. Bạn có thể thử lại."

  if (!(error instanceof ApiError))
    return "Kết nối bị gián đoạn. Hãy kiểm tra mạng và thử lại."

  if (error.status === 401)
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."

  if (error.status === 403)
    return "Chức năng tư vấn dành cho tài khoản khách hàng."

  if (["RAG_DISABLED", "RAG_NOT_CONFIGURED"].includes(error.code ?? ""))
    return "Tư vấn kiến thức chưa được cấu hình. Bạn vẫn có thể hỏi sản phẩm, ngân sách, khẩu vị và tồn kho từ danh mục TeaSmart."

  if (error.status === 429 || ["RAG_RATE_LIMITED", "RAG_DEMO_LIMIT_REACHED"].includes(error.code ?? ""))
    return "Tư vấn kiến thức đã chạm giới hạn lượt hỏi. Bạn có thể quay lại sau hoặc hỏi mình về sản phẩm TeaSmart."

  if (error.code === "RAG_BUSY")
    return "Mình đang xử lý một câu hỏi kiến thức khác. Bạn có thể thử lại sau ít phút."

  if (error.code === "RAG_CALLS_DISABLED" || error.code === "RAG_LLM_DISABLED")
    return "Mình chưa thể trả lời câu hỏi kiến thức này lúc này. Bạn vẫn có thể hỏi về sản phẩm hoặc cách mua hàng."

  if (error.status === 504 || error.code === "RAG_TIMEOUT")
    return "Tư vấn mất quá nhiều thời gian. Bạn có thể thử lại."

  if (error.status >= 500)
    return "Dịch vụ tư vấn kiến thức hiện không sẵn sàng. Hãy thử lại sau; tư vấn sản phẩm vẫn dùng dữ liệu cửa hàng."

  return "Không thể xử lý yêu cầu. Hãy kiểm tra câu hỏi và bộ lọc rồi thử lại."
}

export function canRetryChat(error: unknown): boolean {
  return !(error instanceof ApiError && (
    error.status === 429 || ["RAG_RATE_LIMITED", "RAG_CALLS_DISABLED", "RAG_DEMO_LIMIT_REACHED"].includes(error.code ?? "")
  ))
}

export function hasGroundedSources(answer: Pick<RagAdvice, "method" | "llmUsed" | "sources" | "evidenceStatus">): boolean {
  return answer.method === "RAG_LLM_V1" && answer.llmUsed === true && !!answer.sources?.length
    && (answer.evidenceStatus == null || answer.evidenceStatus === "CITED_EVIDENCE")
}

/** Calling a provider is not proof that a grounded answer was produced. */
export function ragAnswerLabel(answer: Pick<RagAdvice, "method" | "llmUsed" | "sources" | "evidenceStatus">): string {
  if (answer.method === "RAG_NO_EVIDENCE" || answer.method === "KNOWLEDGE_UNAVAILABLE")
    return "Chưa có đủ tài liệu để trả lời"
  if (hasGroundedSources(answer))
    return "Có tham khảo tài liệu"
  return "Thông tin từ TeaSmart"
}
