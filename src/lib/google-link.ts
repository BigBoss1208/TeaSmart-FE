import {ApiError} from "./commerce.ts";
/** A failed OAuth state must not discard an otherwise valid TeaSmart session. */
export async function googleLinkPost<T>(step:"start"|"complete"):Promise<T>{
 const token=sessionStorage.getItem("teasmart_access_token");if(!token)throw new ApiError(401,"UNAUTHORIZED","Vui lòng đăng nhập lại.");
 const response=await fetch(`/api/auth/google/link/${step}`,{method:"POST",credentials:"same-origin",cache:"no-store",headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(20000)});
 const data=await response.json();if(!response.ok)throw new ApiError(response.status,data?.code??"GOOGLE_LINK_FAILED","Không thể hoàn tất liên kết Google.");return data as T;
}