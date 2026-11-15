import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import type { Page } from "../types";
import "./PasswordRecovery.css";

class RecoveryError extends Error { constructor(message: string, readonly code: string) { super(message); } }

// Public recovery requests deliberately exclude a possibly expired login Bearer token.
async function recoveryApi(path: string, body: object) {
  const response = await fetch(`/api/auth/${path}`, { method: "POST", credentials: "omit",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    referrerPolicy: "no-referrer", signal: AbortSignal.timeout(20000) });
  const result = await response.json();
  if (!response.ok) throw new RecoveryError(result.message || "Không thể xử lý yêu cầu. Vui lòng thử lại.", result.code);
  return result;
}
export default function PasswordRecovery({ reset, navigate }: { reset: boolean; navigate: (page: Page) => void }) {
  const [step, setStep] = useState<"email" | "otp" | "password" | "done">("email");
  const [email, setEmail] = useState("");
  const [challenge, setChallenge] = useState("");
  const [otp, setOtp] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const otpInputs = useRef<Array<HTMLInputElement | null>>([]);
  // Grants and OTPs stay in memory only. Reload/old email links restart safely.
  useEffect(() => { if(reset)window.history.replaceState(null, "", window.location.pathname); }, [reset]);
  useEffect(() => {
    if(cooldown<=0)return;
    const timer=window.setTimeout(()=>setCooldown(n=>Math.max(0,n-1)),1000);
    return ()=>window.clearTimeout(timer);
  }, [cooldown]);
  const send = async () => {
    const result = await recoveryApi("forgot-password", { email: email.trim() });
    if(typeof result.challenge!=="string" || !/^[A-Za-z0-9_-]{43}$/.test(result.challenge))throw new Error("Backend chưa được cập nhật cho OTP. Vui lòng thử lại sau khi cập nhật hoàn tất.");
    setChallenge(result.challenge); setOtp(""); setToken(""); setCooldown(60); setStep("otp");
  };
  const run = async (action: () => Promise<void>) => {
    if(lock.current)return;
    lock.current=true; setBusy(true); setError("");
    try { await action(); }
    catch(e) { setError(e instanceof Error ? e.message : "Kết nối bị gián đoạn. Vui lòng thử lại."); }
    finally { lock.current=false; setBusy(false); }
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    void run(async () => {
      if(step==="email")await send();
      else if(step==="otp") {
        if(!/^[0-9]{6}$/.test(otp))throw new Error("Vui lòng nhập đủ 6 chữ số.");
        const result=await recoveryApi("reset-password/verify", { challenge, otp });
        setToken(result.token); setOtp(""); setChallenge(""); setStep("password");
      } else if(step==="password") {
        if(password!==confirm || password.length<8 || new TextEncoder().encode(password).length>72)
          throw new Error("Mật khẩu phải khớp, dài ít nhất 8 ký tự và không quá 72 byte UTF-8.");
        await recoveryApi("reset-password", { token, password, confirmPassword: confirm });
        setToken(""); setPassword(""); setConfirm(""); setStep("done");
      }
    });
  };
  return <main className="page auth-page password-recovery"><section className="auth-card" aria-labelledby="recovery-title">
    <div className="auth-header"><div className="auth-logo"><span className="logo-mark"><Icon name="leaf" /></span><span>TeaSmart</span></div>
      <div className="recovery-symbol"><Icon name={step==="otp" ? "mail" : step==="done" ? "check" : "leaf"} size={30} /></div>
      <h1 id="recovery-title" className="auth-title">{step==="email" ? "Quên mật khẩu?" : step==="otp" ? "Nhập mã xác minh" : step==="password" ? "Đặt lại mật khẩu" : "Đặt lại mật khẩu thành công!"}</h1>
      <p className="auth-subtitle">{step==="email" ? "Nhập email đã đăng ký để nhận mã OTP đặt lại mật khẩu." : step==="otp" ? "Nếu email đã được đăng ký, TeaSmart sẽ gửi mã OTP đến hộp thư của bạn. Mã có hiệu lực trong 5 phút." : step==="password" ? "OTP đã được xác minh. Hãy đặt mật khẩu mới trong 5 phút." : "Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại."}</p>
    </div>
    {reset && step==="email" && <p className="recovery-note">TeaSmart đã chuyển sang xác minh bằng OTP. Vui lòng yêu cầu mã mới; liên kết cũ không còn sử dụng được.</p>}
    {error && <p role="alert" className="auth-alert auth-alert-error">{error}</p>}
    {step!=="done" && <form onSubmit={submit} className="auth-form">
      {step==="email" && <div className="auth-field"><label htmlFor="recovery-email">Email đã đăng ký</label><div className="auth-input-wrap"><input id="recovery-email" type="email" autoComplete="email" maxLength={255} required value={email} onChange={e=>setEmail(e.target.value)} placeholder="ten@example.com" disabled={busy}/></div></div>}
      {step==="otp" && <div className="auth-field"><label id="recovery-otp-label">Mã OTP 6 số</label><div className="recovery-otp-grid" role="group" aria-labelledby="recovery-otp-label" onPaste={event=>{const digits=event.clipboardData.getData("text").replace(/\D/g,"").slice(0,6);if(digits){event.preventDefault();setOtp(digits);otpInputs.current[Math.min(digits.length,5)]?.focus();}}}>{Array.from({length:6},(_,index)=><input key={index} ref={el=>{otpInputs.current[index]=el;}} className="recovery-otp-cell" type="text" inputMode="numeric" autoComplete={index===0?"one-time-code":"off"} aria-label={`Mã OTP chữ số ${index+1}`} value={otp[index]||""} disabled={busy} onChange={event=>{const digit=event.target.value.replace(/\D/g,"").slice(-1);const next=otp.split("");next[index]=digit;setOtp(next.join("").slice(0,6));if(digit&&index<5)otpInputs.current[index+1]?.focus();}} onKeyDown={event=>{if(event.key==="Backspace"&&!otp[index]&&index>0)otpInputs.current[index-1]?.focus();if(event.key==="ArrowLeft"&&index>0)otpInputs.current[index-1]?.focus();if(event.key==="ArrowRight"&&index<5)otpInputs.current[index+1]?.focus();}} onFocus={event=>event.currentTarget.select()} />)}</div><small id="otp-help">Kiểm tra cả thư mục Spam. Mã chỉ dùng một lần, tối đa 5 lần nhập sai.</small></div>}
      {step==="password" && <>{[["recovery-password", "Mật khẩu mới", password, setPassword], ["recovery-confirm", "Nhập lại mật khẩu", confirm, setConfirm]].map(([id,label,value,setter]) => <div className="auth-field" key={String(id)}><label htmlFor={String(id)}>{String(label)}</label><div className="auth-input-wrap"><input id={String(id)} type={show ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={72} value={String(value)} onChange={e=>(setter as (v:string)=>void)(e.target.value)} disabled={busy}/></div></div>)}
        <button type="button" className="auth-link-subtle" aria-pressed={show} onClick={()=>setShow(!show)}>{show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}</button><small>Ít nhất 8 ký tự, tối đa 72 byte UTF-8.</small></>}
      <button type="submit" className="btn btn-primary auth-submit-btn" disabled={busy || step==="otp" && otp.length!==6}>{busy ? "Đang xử lý…" : step==="email" ? "Gửi mã OTP" : step==="otp" ? "Xác nhận OTP" : "Đặt lại mật khẩu"}</button>
    </form>}
    {step==="otp" && <button type="button" className="auth-link-subtle" disabled={busy || cooldown>0} onClick={()=>{void run(async()=>{await send();});}}>{busy?"Đang gửi mã…":cooldown>0 ? `Bạn có thể gửi lại mã sau ${cooldown}s` : "Gửi lại mã OTP"}</button>}
    {(step==="otp" || step==="password") && <button type="button" className="auth-link-subtle" disabled={busy} onClick={()=>{setStep("email");setChallenge("");setToken("");setOtp("");setPassword("");setConfirm("");setError("");}}>Bắt đầu lại</button>}
    <div className="auth-footer-switch"><button type="button" disabled={busy} onClick={()=>navigate("login")}>← Quay lại đăng nhập</button></div>
  </section></main>;
}
