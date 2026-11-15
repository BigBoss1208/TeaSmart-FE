import type { GoogleIdentitySdk } from "../lib/google-login";
declare global {
  interface Window { google?: { accounts: { id: GoogleIdentitySdk } } }
}
export {};
