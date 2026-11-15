import { useEffect, useState } from "react";
import { api } from "../lib/commerce";
import { filterPlaces, isThaiNguyenPlace, normalizePlace, type PublicPlace } from "../lib/publicPlaces";
import RegionVideo from "../components/RegionVideo";
import type { Product } from "../types";
import "./PublicPlaces.css";
type Region = { regionId: number; name: string; description: string | null; location: string | null; imageUrl: string | null };
type Store = { storeId: number; name: string; description: string | null; address: string | null; logoUrl: string | null; phone: string | null; email: string | null };
export default function PublicPlaces({kind, initialId, products, onSelectProduct, heroOnly = false}: {kind: "regions" | "stores"; initialId?: string; products: Product[]; onSelectProduct: (p: Product) => void; heroOnly?: boolean}) {
 const regions = kind === "regions";
 const [items,setItems] = useState<PublicPlace[]>([]), [loading,setLoading] = useState(true), [error,setError] = useState(false), [retry,setRetry] = useState(0);
 const [query,setQuery] = useState(""), [location,setLocation] = useState("");
 const [selected,setSelected] = useState<string | null>(() => new URLSearchParams(window.location.search).get("id") ?? initialId ?? null);
 useEffect(() => {const sync=()=>setSelected(new URLSearchParams(window.location.search).get("id"));window.addEventListener("popstate",sync);return()=>window.removeEventListener("popstate",sync)},[]);
 useEffect(() => {
  if (heroOnly) return;
  const controller = new AbortController(); setLoading(true);setError(false);
  const path = regions ? "/tea-regions" : "/stores";
  api<(Region | Store)[]>(path,{signal:controller.signal}).then(rows => {
   const mapped=rows.map(row => "regionId" in row ? {id:row.regionId,name:row.name,description:row.description,location:row.location,image:row.imageUrl} : {id:row.storeId,name:row.name,description:row.description,location:row.address,image:row.logoUrl,phone:row.phone,email:row.email});
   setItems(mapped.filter(isThaiNguyenPlace));
  }).catch(()=>{if(!controller.signal.aborted)setError(true)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});
  return()=>controller.abort();
 },[regions,retry,heroOnly]);
 const visible=filterPlaces(items,query,location);
 const detail=items.find(item=>String(item.id)===selected || normalizePlace(item.name).replace(/ /g,"-")===selected);
 const select=(id: number | null)=>{setSelected(id===null?null:String(id));window.history.pushState(null,"",`${regions?"/tea-regions":"/shops"}${id===null?"":`?id=${id}`}`);window.scrollTo({top:0,behavior:"instant"})};
 const state=loading?<p role="status">Đang tải {regions?"vùng chè":"cửa hàng & HTX"}…</p>:error?<div role="alert"><p>Không thể tải dữ liệu. Vui lòng thử lại.</p><button className="btn btn-primary" onClick={()=>setRetry(n=>n+1)}>Thử lại</button></div>:null;
 // The catalog does not publish reuse rights for remote place photos; use a clearly labelled CC0 landscape illustration.
 const photo=(item: PublicPlace)=><div className="place-photo"><img src="/assets/home/thai-nguyen-hill.jpg" alt="Ảnh minh họa cảnh quan chè Vô Tranh, Thái Nguyên" loading="lazy"/><small>Ảnh minh họa Vô Tranh · Bacthai20 · CC0</small></div>;
 if (heroOnly) return <main className="page public-places"><section className="region-video-hero"><RegionVideo/><div className="region-video-overlay"/><div className="region-video-copy"><div className="eyebrow">Đất chè & con người</div><h1>Khám phá vùng chè<br/>Thái Nguyên</h1><p>Khám phá những vùng đất gắn liền với nghề trồng và chế biến chè Thái Nguyên, từ Tân Cương, Trại Cài đến La Hiên và Sông Cầu – mỗi vùng mang một nét đẹp riêng về cảnh quan và văn hóa trà.</p><a className="btn btn-primary" href="#legacy-region-list">Khám phá vùng chè</a></div></section></main>;
 return <main className="page public-places">
  {!selected && (regions?<section className="region-video-hero"><RegionVideo/><div className="region-video-overlay"/><div className="region-video-copy"><div className="eyebrow">Đất chè & con người</div><h1>Khám phá vùng chè<br/>Thái Nguyên</h1>  <p>Khám phá những vùng đất gắn liền với nghề trồng và chế biến chè Thái Nguyên, từ Tân Cương, Trại Cài đến La Hiên và Sông Cầu – mỗi vùng mang một nét đẹp riêng về cảnh quan và văn hóa trà.</p><a className="btn btn-primary" href="#place-list">Khám phá vùng chè</a></div></section>:<section className="section places-heading"><div className="eyebrow">Cơ sở sản xuất & hợp tác xã</div><h1 className="page-title">Cửa hàng & HTX Thái Nguyên</h1><p>Thông tin đơn vị trong danh mục công khai có địa chỉ hoặc mô tả liên quan đến Thái Nguyên.</p></section>)}
  <section className="section" id="place-list">
   {selected && <button className="btn btn-light" onClick={()=>select(null)}>← {regions?"Tất cả vùng chè":"Tất cả cửa hàng & HTX"}</button>}
   {state}
   {!loading&&!error&&(selected ? detail?<article className="place-detail"><h1>{detail.name}</h1>{detail.location&&<p>{detail.location}</p>}{photo(detail)}{detail.description&&<p className="place-description">{detail.description}</p>}{!regions&&<>{detail.phone&&<p>Điện thoại: {detail.phone}</p>}{detail.email&&<p>Email: {detail.email}</p>}</>}<h2>Sản phẩm liên quan</h2>{regions&&<div className="place-products">{products.filter(p=>p.regionId===String(detail.id)).map(p=><button key={p.id} className="btn btn-light" onClick={()=>onSelectProduct(p)}>{p.name}</button>)}</div>}</article>:<p role="status">Không tìm thấy bản ghi phù hợp trong danh mục công khai.</p>:<>
    <div className="places-filters"><label>Tìm {regions?"vùng chè":"cửa hàng / HTX"}<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nhập tên hoặc địa chỉ"/></label>{items.some(x=>x.location)&&<label>Địa phương theo danh mục<select value={location} onChange={e=>setLocation(e.target.value)}><option value="">Tất cả địa phương</option>{[...new Set(items.map(x=>x.location).filter((x):x is string=>!!x))].map(x=><option key={x}>{x}</option>)}</select></label>}</div>
    <p role="status">{visible.length} {regions?"vùng chè":"đơn vị"}</p>
    {!visible.length&&<div className="places-empty">{items.length?"Không tìm thấy kết quả phù hợp.":regions?"Chưa có vùng chè để hiển thị.":"Chưa có cửa hàng hoặc hợp tác xã để hiển thị."}</div>}
    <div className={regions?"regions-grid":"shops-grid"}>{visible.map(item=><article className="region-card" key={item.id}>{photo(item)}<div className="region-card-body"><h2 className="region-card-title">{item.name}</h2>{item.location&&<p>{item.location}</p>}{item.description&&<p className="place-excerpt">{item.description}</p>}<button className="btn btn-primary" onClick={()=>select(item.id)}>Xem chi tiết</button></div></article>)}</div>
   </>)}
  </section>
 </main>;
}
