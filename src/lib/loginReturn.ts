export const loginReturnKey = "teasmart_login_return";

const sensitiveKey = /^(?:token|accesstoken|refreshtoken|idtoken|jwt|bearer|authorization|code|password|otp|secret|resetcode|resetkey|resettoken|verificationcode|apikey|vnpsecurehash|vnpsecurehashtype)$/i;

export function parseLoginReturn(value: string | null, origin: string): URL | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value)) return null;

  let target: URL;
  try {
    target = new URL(value, origin);
  } catch {
    return null;
  }
  const rawPath = value.split(/[?#]/, 1)[0];
  if (target.origin !== origin || target.pathname !== rawPath) return null;

  const hashParams = target.hash.slice(1).split("?");
  const params = [target.searchParams, ...hashParams.map(part => new URLSearchParams(part))];
  const hasSensitiveParam = params.some(entries =>
    Array.from(entries.keys()).some(key => sensitiveKey.test(key.replace(/[-_ ]/g, ""))),
  );
  return hasSensitiveParam ? null : target;
}
