import { useEffect, useRef, useState } from "react";
import { createGoogleLoginFlow, loadGoogleSdk, type GoogleLoginDependencies, type GoogleAuthResponse, type GoogleLoginState } from "../lib/google-login";

export default function GoogleLoginButton({ onAuthenticated, onBusyChange, disabled = false, request }: {
  request?: GoogleLoginDependencies["request"];
  onAuthenticated: (response: GoogleAuthResponse) => void;
  onBusyChange: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? "";
  const parent = useRef<HTMLDivElement>(null);
  const flow = useRef<ReturnType<typeof createGoogleLoginFlow> | null>(null);
  const callbacks = useRef({ onAuthenticated, onBusyChange });
  callbacks.current = { onAuthenticated, onBusyChange };
  const [state, setState] = useState<GoogleLoginState>("sdk");
  const [message, setMessage] = useState("");
  const validOrigin = typeof window !== "undefined" && (window.location.protocol === "https:"
    || ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname));
  useEffect(() => {
    if (!clientId || !parent.current || !validOrigin || disabled) return;
    const current = createGoogleLoginFlow(clientId, parent.current, (next, text) => {
      setState(next); setMessage(text); callbacks.current.onBusyChange(next === "verifying");
    }, result => callbacks.current.onAuthenticated(result), request ? {loadSdk:loadGoogleSdk,request,now:Date.now,schedule:(f,ms)=>setTimeout(f,ms),unschedule:clearTimeout}:undefined);
    flow.current = current; void current.start();
    return () => { current.dispose(); flow.current = null; callbacks.current.onBusyChange(false); };
  }, [clientId, validOrigin, disabled, request]);
  if (!clientId) return null;
  return <section className="mt-5" aria-label="Đăng nhập Google">
    <div className="flex items-center gap-3 mb-4 text-sm text-gray-500">
      <span className="h-px flex-1 bg-gray-200" /><span>hoặc</span><span className="h-px flex-1 bg-gray-200" />
    </div>
    {!validOrigin ? <p className="text-sm text-gray-600">Google Login cần localhost hoặc HTTPS. Đăng nhập email/SĐT vẫn hoạt động trên LAN.</p> : <>
      <div ref={parent} className="justify-center w-full min-h-10"
        style={{ display: state === "ready" ? "flex" : "none" }}
        inert={disabled || state !== "ready"} />
      {state === "ready" && <p className="text-xs text-gray-500 text-center mt-2">Nếu đóng cửa sổ Google, bạn có thể bấm nút để thử lại.</p>}
      {message && <p className="text-sm mt-2 text-center" role={state === "error" || state === "expired" ? "alert" : "status"}>{message}</p>}
      {(state === "error" || state === "expired") && <button type="button" className="auth-link-subtle block mx-auto mt-2"
        disabled={disabled} onClick={() => void flow.current?.start()}>Thử lại Google Login</button>}
    </>}
  </section>;
}
