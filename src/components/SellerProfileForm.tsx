import { useEffect, useState, type FormEvent } from "react";
import type { SellerProfile } from "../lib/seller";
import { SearchableUnit } from "./AddressBook";
import { loadAdministrativeDataset, findAdministrativeUnit, type AdministrativeDataset } from "../lib/administrativeUnits";
export default function SellerProfileForm({ initial, busy, submitLabel, onSubmit, detailsEnabled = false }: {
  detailsEnabled?: boolean; initial: SellerProfile; busy: boolean; submitLabel: string; onSubmit: (value: SellerProfile) => Promise<void>;
}) {
  const [value, setValue] = useState(initial);
  const [dataset,setDataset]=useState<AdministrativeDataset|null>(null);
  const [locationError,setLocationError]=useState("");
  const [loadError,setLoadError]=useState("");
  const [retry,setRetry]=useState(0);
  useEffect(()=>{if(!detailsEnabled)return;let alive=true;setLoadError("");loadAdministrativeDataset().then(d=>{if(alive)setDataset(d)}).catch(()=>{if(alive)setLoadError("Không tải được danh mục địa chỉ.")});return()=>{alive=false}},[detailsEnabled,retry]);
  const province=findAdministrativeUnit(dataset?.provinces??[],value.province??"");
  const ward=findAdministrativeUnit(province?.units??[],value.ward??"");
  const locationChanged=value.province!==initial.province||value.ward!==initial.ward;
  const fields = [
    ["shopName", "Tên gian hàng", 150], ["representativeName", "Họ tên người đại diện", 100],
    ["phone", "Số điện thoại", 20], ["businessAddress", "Địa chỉ kinh doanh", 500]
  ] as const;
  function submit(event: FormEvent) {
    event.preventDefault(); if(busy)return;
    if(detailsEnabled && ((locationChanged && (!province || !ward)) || !value.province || !value.ward)) {setLocationError("Vui lòng chọn tỉnh/thành phố và phường/xã trong danh sách.");return;}
    setLocationError("");
    const changed=locationChanged||value.addressDetail!==initial.addressDetail;
    void onSubmit(detailsEnabled && changed ? {...value,businessAddress:[value.addressDetail,value.ward,value.province].filter(Boolean).join(", ")} : value);
  }
  return <form className="seller-form" onSubmit={submit}>
    <fieldset disabled={busy}>
      {fields.filter(([name]) => !detailsEnabled || name !== "businessAddress").map(([name, label, max]) => <label key={name}>{label}
        <input required maxLength={max} type={name === "phone" ? "tel" : "text"} autoComplete={name === "phone" ? "tel" : "off"}
          value={value[name]} onChange={e => setValue(v => ({ ...v, [name]: e.target.value }))} />
      </label>)}
      {detailsEnabled && <>
        <label>Loại hình kinh doanh<select required value={value.businessType ?? ""} onChange={e=>setValue(v=>({...v,businessType:e.target.value}))}><option value="">Chọn loại hình</option><option value="INDIVIDUAL">Hộ kinh doanh cá thể</option><option value="COOPERATIVE">Hợp tác xã</option><option value="COMPANY">Doanh nghiệp</option></select></label>
        <label>Email liên hệ<input required type="email" maxLength={254} value={value.representativeEmail ?? ""} onChange={e=>setValue(v=>({...v,representativeEmail:e.target.value}))}/></label>
        {loadError&&<p role="alert">{loadError} <button type="button" onClick={()=>setRetry(n=>n+1)}>Thử lại</button></p>}
        <SearchableUnit label="Tỉnh/Thành phố" placeholder={dataset?"Chọn tỉnh/thành phố":"Đang tải danh mục…"} value={value.province??""} options={dataset?.provinces??[]} selectedCode={province?.code} disabled={!dataset||busy} onInput={text=>setValue(v=>({...v,province:text,ward:""}))} onSelect={unit=>setValue(v=>({...v,province:unit.name,ward:unit.name===v.province?v.ward:""}))}/>
        <SearchableUnit label="Phường/Xã" placeholder="Chọn phường/xã" value={value.ward??""} options={province?.units??[]} selectedCode={ward?.code} disabled={!province||busy} onInput={text=>setValue(v=>({...v,ward:text}))} onSelect={unit=>setValue(v=>({...v,ward:unit.name}))}/>
        {dataset&&(!province||!ward)&&initial.province&&!locationChanged&&<p className="seller-wide">Địa chỉ đã lưu được giữ nguyên. Nếu cần cập nhật, hãy chọn tỉnh và phường/xã trong danh sách hiện hành.</p>}
        {locationError&&<p className="seller-wide" role="alert">{locationError}</p>}
        <label>Địa chỉ chi tiết<input required maxLength={250} value={value.addressDetail??""} onChange={e=>setValue(v=>({...v,addressDetail:e.target.value}))}/></label>
        {([["applicationLogoUrl","URL logo"],["coverUrl","URL ảnh bìa"]] as const).map(([name,label])=><label key={name}>{label}<input inputMode="url" maxLength={500} value={value[name] ?? ""} onChange={e=>setValue(v=>({...v,[name]:e.target.value}))}/>{value[name]&&<img style={{maxWidth:"100%",maxHeight:120,objectFit:"contain"}} src={value[name] ?? undefined} alt={label}/>}</label>)}
      </>}
      <label className="seller-wide">Mô tả gian hàng
        <textarea required maxLength={3000} rows={5} value={value.description} onChange={e => setValue(v => ({ ...v, description: e.target.value }))} />
      </label>
      <div className="seller-wide"><button className="btn btn-primary" type="submit">{busy ? "Đang lưu…" : submitLabel}</button></div>
    </fieldset>
  </form>;
}
