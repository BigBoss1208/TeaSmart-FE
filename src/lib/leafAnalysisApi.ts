import type { LeafContentType, LeafMediaMode } from "./leafMedia";

interface LeafClassProbability {
  class_index: number;
  label: string;
  probability: number;
}

interface LeafVideoAgreement {
  sampled_frames: number;
  agreeing_frames: number;
  agreement_ratio: number;
}

export interface LeafPrediction {
  media_type: LeafMediaMode;
  model_id: string;
  class_index: number;
  label: string;
  prediction_score: number;
  class_probabilities: LeafClassProbability[];
  video: LeafVideoAgreement | null;
  warnings: string[];
  notice: string;
}

const TOKEN_KEY = "teasmart_access_token";
const REQUEST_TIMEOUT_MS = 90_000;
const errorMessages: Readonly<Record<number, string>> = {
  400: "Không đọc được tệp. Vui lòng chọn lại tệp và thử lại.",
  401: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để phân tích.",
  403: "Tài khoản không có quyền sử dụng tính năng phân tích.",
  413: "Tệp vượt giới hạn dung lượng hoặc kích thước khung hình.",
  415: "Định dạng tệp không được hỗ trợ. Hãy chọn ảnh JPG, PNG hoặc video MP4.",
  422: "Không thể đọc nội dung tệp. Hãy chọn ảnh rõ nét hoặc video MP4 hợp lệ dài tối đa 15 giây.",
  429: "Dịch vụ AI đang bận. Vui lòng thử lại sau ít phút.",
  502: "Dịch vụ AI trả về kết quả không hợp lệ. Vui lòng thử lại.",
  503: "Dịch vụ AI chưa sẵn sàng. Vui lòng thử lại sau.",
  504: "Phân tích quá thời gian chờ. Vui lòng thử lại.",
};

export class LeafAnalysisError extends Error {
  constructor(readonly status: number, message = errorMessages[status] ?? "Không thể phân tích tệp. Vui lòng thử lại.") {
    super(message);
  }
}

export function leafAnalysisErrorMessage(error: unknown): string {
  if (error instanceof LeafAnalysisError) return error.message;
  if (error instanceof Error && error.name === "TimeoutError") return errorMessages[504];
  return "Không thể kết nối để phân tích tệp. Kiểm tra kết nối rồi thử lại.";
}

function isProbability(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isLeafPrediction(value: unknown, mode: LeafMediaMode): value is LeafPrediction {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<LeafPrediction>;
  if (data.media_type !== mode || typeof data.model_id !== "string" || typeof data.label !== "string"
    || !Array.isArray(data.class_probabilities) || data.class_probabilities.length !== 7
    || !data.class_probabilities.every((item, index) => item?.class_index === index
      && typeof item.label === "string" && isProbability(item.probability))
    || data.class_index === undefined || !Number.isInteger(data.class_index)
    || data.class_probabilities[data.class_index]?.label !== data.label || !isProbability(data.prediction_score)
    || !Array.isArray(data.warnings) || !data.warnings.every(warning => typeof warning === "string")
    || typeof data.notice !== "string") return false;

  if (mode === "image") return data.video === null;
  const video = data.video;
  return !!video && Number.isInteger(video.sampled_frames) && video.sampled_frames >= 1 && video.sampled_frames <= 8
    && Number.isInteger(video.agreeing_frames) && video.agreeing_frames >= 0
    && video.agreeing_frames <= video.sampled_frames && isProbability(video.agreement_ratio);
}

export async function predictLeaf(file: File, contentType: LeafContentType, signal: AbortSignal): Promise<LeafPrediction> {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) throw new LeafAnalysisError(401, "Vui lòng đăng nhập để phân tích lá chè.");

  const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]);
  const response = await fetch("/api/leaf-classifications/predict", {
    method: "POST",
    headers: { "Content-Type": contentType, Authorization: `Bearer ${token}` },
    body: file,
    signal: requestSignal,
  });
  if (!response.ok) {
    if (response.status === 401 && sessionStorage.getItem(TOKEN_KEY) === token) {
      sessionStorage.removeItem(TOKEN_KEY);
    }
    throw new LeafAnalysisError(response.status);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    requestSignal.throwIfAborted();
    throw new LeafAnalysisError(502);
  }
  const mode = contentType === "video/mp4" ? "video" : "image";
  if (!isLeafPrediction(data, mode)) throw new LeafAnalysisError(502);
  return data;
}
