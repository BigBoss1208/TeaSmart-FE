import { ApiError, type ApiUser } from "./commerce.ts";

export interface GoogleIdentitySdk {
  initialize(options: { client_id: string; nonce: string; auto_select: false;
    callback: (response: { credential?: string }) => void }): void;
  renderButton(parent: HTMLElement, options: { type: "standard"; theme: "outline";
    size: "large"; text: "continue_with"; width: number; locale: "vi" }): void;
}
export interface GoogleAuthResponse { accessToken: string; user: ApiUser }
export type GoogleLoginState = "sdk" | "challenge" | "ready" | "verifying" | "error" | "expired" | "done";

let sdkPromise: Promise<GoogleIdentitySdk> | undefined;
export function loadGoogleSdk(): Promise<GoogleIdentitySdk> {
  if (window.google?.accounts.id) return Promise.resolve(window.google.accounts.id);
  if (sdkPromise) return sdkPromise;
  const pending = new Promise<GoogleIdentitySdk>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client?hl=vi";
    script.async = true;
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      script.onload = null; script.onerror = null;
      if (!error && window.google?.accounts.id) resolve(window.google.accounts.id);
      else { script.remove(); reject(new Error("GOOGLE_SDK_UNAVAILABLE")); }
    };
    const timeout = setTimeout(() => finish(new Error("GOOGLE_SDK_UNAVAILABLE")), 12000);
    script.onload = () => finish();
    script.onerror = () => finish(new Error("GOOGLE_SDK_UNAVAILABLE"));
    document.head.appendChild(script);
  });
  sdkPromise = pending.catch(error => { sdkPromise = undefined; throw error; });
  return sdkPromise;
}

// Google auth deliberately uses same-origin, credentialed requests without an old
// TeaSmart Authorization header. Its 401 must not clear an existing session.
export async function googleAuthApi<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  // Each request has its own deadline, even when the flow supplies cancellation.
  // Keep it active while reading JSON; release timer/listener on every exit path.
  const controller = new AbortController();
  const cancel = () => controller.abort(signal?.reason);
  if (signal?.aborted) cancel();
  else signal?.addEventListener("abort", cancel, { once: true });
  const timeout = setTimeout(() => controller.abort(new DOMException("Google request timed out", "TimeoutError")), 20000);
  try {
    const response = await fetch(`/api/auth/google${path}`, {
      method: "POST", credentials: "same-origin", cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok) throw new ApiError(response.status, data?.code ?? "GOOGLE_AUTH_FAILED", "Google authentication failed");
    return data as T;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
}

export function googleLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "GOOGLE_LINK_REQUIRED") return "Email này đã có tài khoản TeaSmart chưa liên kết Google. Hãy đăng nhập bằng email/SĐT và mật khẩu đã đăng ký, rồi mở Hồ sơ cá nhân để liên kết Google an toàn.";
    if (error.status === 401) return "Không thể xác thực Google. Vui lòng thử lại để lấy phiên đăng nhập mới.";
    if (error.status === 503) return "Đăng nhập Google chưa sẵn sàng hoặc tạm thời gián đoạn. Vui lòng đăng nhập bằng email hoặc số điện thoại.";
    return "Không thể đăng nhập Google. Vui lòng thử lại.";
  }
  if (error instanceof Error && error.message === "GOOGLE_SDK_UNAVAILABLE") return "Không tải được Google Login. Vui lòng kiểm tra kết nối và thử lại.";
  if (error instanceof Error && error.name === "TimeoutError") return "Đăng nhập Google quá thời gian chờ. Vui lòng thử lại.";
  return "Không thể kết nối đăng nhập Google. Vui lòng kiểm tra mạng và thử lại.";
}

export interface GoogleLoginDependencies {
  loadSdk: () => Promise<GoogleIdentitySdk>;
  request: <T>(path: string, body?: unknown, signal?: AbortSignal) => Promise<T>;
  now: () => number;
  schedule: (callback: () => void, milliseconds: number) => ReturnType<typeof setTimeout>;
  unschedule: (timer: ReturnType<typeof setTimeout>) => void;
}

// Prepare nonce before renderButton, never asynchronously inside its click event.
// GIS has no button-popup cancellation callback; ready stays usable without a
// loading flag until a credential actually arrives. Expiry makes retry explicit.
export function createGoogleLoginFlow(clientId: string, element: HTMLElement,
  onState: (state: GoogleLoginState, message: string) => void,
  onSuccess: (response: GoogleAuthResponse) => void,
  dependencies: GoogleLoginDependencies = { loadSdk: loadGoogleSdk, request: googleAuthApi,
    now: Date.now, schedule: (callback, milliseconds) => setTimeout(callback, milliseconds),
    unschedule: timer => clearTimeout(timer) }) {
  let disposed = false, generation = 0, phase: GoogleLoginState = "ready";
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  let abort: AbortController | undefined;
  const clearButton = () => element.replaceChildren();
  const publish = (state: GoogleLoginState, message = "") => {
    phase = state; onState(state, message);
  };
  const stopTimer = () => { if (expiryTimer !== undefined) dependencies.unschedule(expiryTimer); };
  const start = async () => {
    if (disposed) return;
    const current = ++generation;
    abort?.abort(); abort = new AbortController(); stopTimer(); clearButton();
    const active = () => !disposed && current === generation;
    let stage: "sdk" | "challenge" | "initialize" | "render" | "expiry_timer" = "sdk";
    try {
      if (!clientId.trim()) return;
      publish("sdk", "Đang tải Google Login…");
      const sdk = await dependencies.loadSdk(); if (!active()) return;
      publish("challenge", "Đang chuẩn bị đăng nhập Google…");
      stage = "challenge";
      const startedAt = dependencies.now();
      const challenge = await dependencies.request<{ nonce: string; expiresIn: number }>("/challenge", undefined, abort.signal);
      if (!active()) return;
      if (!challenge.nonce || !Number.isFinite(challenge.expiresIn) || challenge.expiresIn <= 0 || challenge.expiresIn > 300)
        throw new Error("Invalid challenge");
      // Start at request time and use a small safety margin; the server is authoritative.
      const deadline = startedAt + challenge.expiresIn * 1000 - 1000;
      const expire = () => { clearButton(); publish("expired", "Phiên Google đã hết hạn. Vui lòng thử lại."); };
      if (dependencies.now() >= deadline) { expire(); return; }
      stage = "initialize";
      sdk.initialize({ client_id: clientId, nonce: challenge.nonce, auto_select: false,
        callback: response => {
          if (!active() || phase !== "ready") return;
          if (dependencies.now() >= deadline) { expire(); return; }
          if (typeof response.credential !== "string" || !response.credential.trim()) {
            stopTimer(); clearButton(); publish("error", "Google chưa trả thông tin đăng nhập. Vui lòng thử lại."); return;
          }
          stopTimer(); clearButton(); publish("verifying", "Đang xác minh đăng nhập Google…");
          void dependencies.request<GoogleAuthResponse>("", { idToken: response.credential }, abort!.signal)
            .then(result => {
              if (!active()) return;
              if (typeof result.accessToken !== "string" || !result.accessToken || result.user?.role !== "CUSTOMER") throw new Error("Invalid Google response");
              publish("done"); onSuccess(result);
            }).catch(error => { if (active()) publish("error", googleLoginErrorMessage(error)); });
        },
      });
      stage = "render";
      sdk.renderButton(element, { type: "standard", theme: "outline", size: "large",
        text: "continue_with", locale: "vi",
        width: Math.max(200, Math.min(400, element.clientWidth || element.parentElement?.clientWidth || 280)) });
      publish("ready");
      stage = "expiry_timer";
      expiryTimer = dependencies.schedule(() => { if (active() && phase === "ready") expire(); }, deadline - dependencies.now());
    } catch (error) {
      if (active()) {
        // Fixed diagnostic codes only: never log SDK exception messages or payloads.
        const kind = error instanceof TypeError && /illegal invocation/i.test(error.message) ? "ILLEGAL_INVOCATION"
          : error instanceof TypeError ? "TYPE_ERROR"
          : error instanceof DOMException ? "DOM_ERROR" : "OTHER_ERROR";
        console.warn(`[TeaSmart Google] ${stage.toUpperCase()}_${kind}`);
        const message = stage === "initialize" || stage === "render" || stage === "expiry_timer"
          ? "Không thể hiển thị nút Google Login. Vui lòng thử lại."
          : stage === "challenge" && !(error instanceof ApiError) && !(error instanceof Error && error.name === "TimeoutError")
            ? "Không thể chuẩn bị phiên đăng nhập Google. Vui lòng thử lại."
            : googleLoginErrorMessage(error);
        clearButton(); publish("error", message);
      }
    }
  };
  return { start, dispose() { disposed = true; generation++; stopTimer(); abort?.abort(); clearButton(); } };
}
