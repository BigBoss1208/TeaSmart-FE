import { useEffect, useState } from "react";
import { getSellerState, type SellerState } from "../lib/seller";
import { Icon } from "./Icon";
export default function SellerAccountLink({ userId, onOpen }: { userId: string | number; onOpen: () => void }) {
  const [state,setState]=useState<SellerState|null>(null);
  useEffect(()=>{const controller=new AbortController();const refresh=()=>{void getSellerState(controller.signal).then(s=>{if(!controller.signal.aborted)setState(s)}).catch(()=>{if(!controller.signal.aborted)setState(null)});};refresh();window.addEventListener("teasmart-profile-updated",refresh);window.addEventListener("focus",refresh);return()=>{controller.abort();window.removeEventListener("teasmart-profile-updated",refresh);window.removeEventListener("focus",refresh)}},[userId]);
  const label=state?.status==="NONE"?"Đăng ký kênh người bán":state?.status==="PENDING"?"Hồ sơ người bán":state?.status==="REJECTED"?"Đăng ký lại kênh người bán":state?.status==="SUSPENDED"?"Gian hàng tạm khóa":"Kênh người bán";
  return <button type="button" className="account-seller-entry" onClick={onOpen}><span><Icon name="store"/>{label}</span><Icon name="chevron"/></button>;
}