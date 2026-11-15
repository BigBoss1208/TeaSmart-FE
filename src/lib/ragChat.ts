import { api, type ApiProduct } from "./commerce.ts";
import type { TeaAdvice, TeaPreferences } from "./teaAdvisor.ts";
export interface RagSource { id: string; title: string; url: string; publisher: string; accessedAt: string }
export interface BusinessProduct { productId: number; name: string; slug: string; price: number; stockQuantity: number; unitsSold: number | null; averageRating: number | null; reviewCount: number | null }
export interface RagAdvice extends TeaAdvice { sources?: RagSource[]; embeddingMethod?: string | null; llmUsed?: boolean; businessKind?: string; businessProducts?: BusinessProduct[] }
export function requestRagAdvice(message: string, preferences: TeaPreferences, context: TeaPreferences | undefined, history: string[], signal: AbortSignal, allowLlm = true): Promise<RagAdvice> {
  return api<RagAdvice>("/chatbot/rag",{method:"POST",signal:AbortSignal.any([signal,AbortSignal.timeout(45000)]),body:JSON.stringify({message:message.trim(),preferences,...(!allowLlm && {allowLlm:false}),...(context && {context}),history:history.slice(-6).map(h=>h.slice(0,1000))})});
}
export function currentBusinessProduct(slug: string, signal: AbortSignal){return api<ApiProduct>(`/products/${encodeURIComponent(slug)}`,{signal});}
