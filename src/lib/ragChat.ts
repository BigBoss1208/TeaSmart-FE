import { api, ApiError, type ApiProduct } from "./commerce.ts";
import type { TeaAdvice, TeaPreferences } from "./teaAdvisor.ts";
export interface RagSource { id: string; title: string; url: string; publisher: string; accessedAt: string }
export interface BusinessProduct { productId: number; name: string; slug: string; price: number; stockQuantity: number; unitsSold: number | null; averageRating: number | null; reviewCount: number | null }
export interface RagAdvice extends TeaAdvice { sources?: RagSource[]; embeddingMethod?: string | null; llmUsed?: boolean; businessKind?: string; businessProducts?: BusinessProduct[] }
export function requestRagAdvice(message: string, preferences: TeaPreferences, context: TeaPreferences | undefined, history: string[], signal: AbortSignal, allowLlm = true, productId?: number, suggestedProductIds?: number[]): Promise<RagAdvice> {
  return api<RagAdvice>("/chatbot/rag",{method:"POST",signal:AbortSignal.any([signal,AbortSignal.timeout(45000)]),body:JSON.stringify({message:message.trim(),preferences,...(suggestedProductIds?.length && {suggestedProductIds:suggestedProductIds.slice(0,4)}),...(productId !== undefined && {productId}),...(!allowLlm && {allowLlm:false}),...(context && {context}),history:history.slice(-6).map(h=>h.slice(0,1000))})});
}
export function currentBusinessProduct(slug: string, signal: AbortSignal){return api<ApiProduct>(`/products/${encodeURIComponent(slug)}`,{signal});}

/** Preserve provider errors: unavailable knowledge is never disguised as an LLM answer. */
export function chatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.name === "TimeoutError") return "Yêu cầu quá thời gian chờ. Bạn có thể thử lại.";
  if (!(error instanceof ApiError)) return "Kết nối bị gián đoạn. Hãy kiểm tra mạng và thử lại.";
  if (error.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (error.status === 403) return "Chức năng tư vấn dành cho tài khoản khách hàng.";
  if (["RAG_DISABLED", "RAG_NOT_CONFIGURED"].includes(error.code ?? "")) return "Tư vấn kiến thức chưa được cấu hình. Bạn vẫn có thể hỏi sản phẩm, ngân sách, khẩu vị và tồn kho từ danh mục TeaSmart.";
  if (error.code === "RAG_LLM_DISABLED") return "Mình chưa thể trả lời câu hỏi kiến thức này lúc này. Bạn vẫn có thể hỏi về sản phẩm hoặc cách mua hàng.";
  if (error.status === 504 || error.code === "RAG_TIMEOUT") return "Tư vấn mất quá nhiều thời gian. Bạn có thể thử lại.";
  if (error.status >= 500) return "Dịch vụ tư vấn kiến thức hiện không sẵn sàng. Hãy thử lại sau; tư vấn sản phẩm vẫn dùng dữ liệu cửa hàng.";
  return "Không thể xử lý yêu cầu. Hãy kiểm tra câu hỏi và bộ lọc rồi thử lại.";
}
