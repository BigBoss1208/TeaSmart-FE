import { useEffect, useRef, useState } from "react";
import { api, errorMessage } from "../lib/commerce";
import { sellerStatusLabel, type SellerApplication, type SellerShop, type SellerPage } from "../lib/seller";
import "./Seller.css";
import { ApplicationDetails } from "../components/SellerApplicationView";
import AdminShopCatalog from "../components/AdminShopCatalog";
type Tab = "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";
export default function AdminSellers({ enabled }: { enabled: boolean }) {
  const [tab, setTab] = useState<Tab>("PENDING"), [page,setPage] = useState(0);
  const [rows,setRows] = useState<(SellerApplication | SellerShop)[]>([]);
  const [pages,setPages] = useState(0), [revision,setRevision] = useState(0);
  const [selected,setSelected] = useState<SellerApplication | SellerShop | null>(null);
  const [reason,setReason] = useState(""), [busy,setBusy] = useState(false), [loading,setLoading] = useState(true);
  const [error,setError] = useState(""), [message,setMessage] = useState("");
  const [counts,setCounts]=useState<Record<string,number>>({});
  const [query,setQuery]=useState("");
  const [foundationEnabled,setFoundationEnabled]=useState(false);
  const [detailsEnabled,setDetailsEnabled]=useState<boolean|null>(null);
  useEffect(()=>{if(!enabled)return;const c=new AbortController();void api<{profileDetailsEnabled:boolean;foundationEnabled?:boolean}>("/admin/seller-capabilities",{signal:c.signal}).then(result=>{if(!c.signal.aborted){setDetailsEnabled(result.profileDetailsEnabled);setFoundationEnabled(result.foundationEnabled===true)}}).catch(()=>{if(!c.signal.aborted)setDetailsEnabled(false)});return()=>c.abort()},[enabled]);
  const [businessType,setBusinessType]=useState(""),[from,setFrom]=useState(""),[to,setTo]=useState("");
  const drawer=useRef<HTMLDialogElement>(null);
  const actionPending=useRef(false);
  useEffect(()=>{const el=drawer.current;if(selected&&!el?.open)el?.showModal();if(!selected&&el?.open)el.close()},[selected]);
  const applications = tab === "PENDING" || tab === "REJECTED";
  useEffect(()=>{if(!enabled)return;const c=new AbortController();Promise.all((["PENDING","ACTIVE","REJECTED","SUSPENDED"] as Tab[]).map(async status=>{const result=await api<SellerPage<unknown>>("/admin/"+(["PENDING","REJECTED"].includes(status)?"seller-applications":"shops")+"?status="+status+"&size=1",{signal:c.signal});return [status,result.totalElements] as const})).then(values=>{if(!c.signal.aborted)setCounts(Object.fromEntries(values))}).catch(()=>{if(!c.signal.aborted)setCounts({})});return()=>c.abort()},[enabled,revision]);
  useEffect(() => {
    if (!enabled) return;
    if(from&&to&&from>to){setError("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");setLoading(false);setRows([]);return;}
    const controller = new AbortController(); setLoading(true); setError(""); setSelected(null); setRows([]); setReason("");
    void api<SellerPage<SellerApplication | SellerShop>>("/admin/" + (applications ? "seller-applications" : "shops") + "?status=" + tab + "&page=" + page + "&q=" + encodeURIComponent(query) + "&businessType=" + encodeURIComponent(businessType) + "&from=" + from + "&to=" + to,
      { signal: controller.signal }).then(data => { if (!controller.signal.aborted) { setRows(data.content); setPages(data.totalPages); } })
      .catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [enabled,tab,page,revision,applications,query,businessType,from,to]);
  async function action(kind: "approve" | "reject" | "ACTIVE" | "SUSPENDED") {
    if (!selected || actionPending.current) return;
    if ((kind === "reject" || kind === "SUSPENDED") && !reason.trim()) { setError("Vui lòng nhập lý do."); return; }
    if(!window.confirm(kind==="approve"?"Duyệt hồ sơ và tạo gian hàng cho người bán?":"Xác nhận cập nhật trạng thái hồ sơ / gian hàng?"))return;
    actionPending.current=true; setBusy(true); setError(""); setMessage("");
    try {
      if ("applicationId" in selected) {
        await api("/admin/seller-applications/" + selected.applicationId + "/" + kind, { method: "POST", ...(kind === "reject" ? { body: JSON.stringify({ reason: reason.trim() }) } : {}) });
      } else {
        await api("/admin/shops/" + selected.shopId + "/status", { method: "PATCH", body: JSON.stringify({ status: kind, reason: reason.trim() || null }) });
      }
      setMessage("Đã cập nhật. Quyền người bán được kiểm tra lại ở mỗi yêu cầu.");
      setRevision(v => v + 1);
    } catch (e) { setError(errorMessage(e)); } finally { actionPending.current=false; setBusy(false); }
  }
  if (!enabled) return <section className="seller-card"><h2>Người bán & Gian hàng</h2><p>Kênh người bán chưa được mở trên môi trường này.</p></section>;
  return <section className="seller-admin">
    <div className="seller-heading"><div><h2>Người bán & Gian hàng</h2><p>Xét duyệt hồ sơ đăng ký bán hàng và quản lý trạng thái gian hàng trên TeaSmart.</p></div><button className="btn btn-outline" disabled={busy} onClick={() => setRevision(v => v + 1)}>Tải lại</button></div>
    <div className="seller-kpis">{(["PENDING","ACTIVE","REJECTED","SUSPENDED"] as Tab[]).map(t=><button key={t} className={"seller-kpi kpi-"+t.toLowerCase()} onClick={()=>{setTab(t);setPage(0)}}><span>{sellerStatusLabel(t)}</span><strong>{counts[t]??"—"}</strong></button>)}</div>
    <div className="seller-tabs" aria-label="Lọc hồ sơ và gian hàng">{(["PENDING","ACTIVE","REJECTED","SUSPENDED"] as Tab[]).map(t => <button key={t} type="button" disabled={busy} aria-pressed={tab===t} onClick={() => { setTab(t); setPage(0); setMessage(""); }}>{sellerStatusLabel(t)} ({counts[t]??"—"})</button>)}</div>
    <div className="seller-admin-tools"><label>Tìm gian hàng, người đại diện, email, số điện thoại<input type="search" value={query} onChange={e=>{setQuery(e.target.value);setPage(0)}} placeholder="Tìm hồ sơ hoặc gian hàng…"/></label>
      <label>Loại hình kinh doanh<select disabled={detailsEnabled!==true} aria-label="Loại hình kinh doanh" value={businessType} onChange={e=>{setBusinessType(e.target.value);setPage(0)}}><option value="">Tất cả loại hình</option><option value="INDIVIDUAL">Hộ kinh doanh cá thể</option><option value="COOPERATIVE">Hợp tác xã</option><option value="COMPANY">Doanh nghiệp</option></select></label>
      <label>Từ ngày<input type="date" value={from} max={to||undefined} onChange={e=>{setFrom(e.target.value);setPage(0)}}/></label>
      <label>Đến ngày<input type="date" value={to} min={from||undefined} onChange={e=>{setTo(e.target.value);setPage(0)}}/></label>
      {(query||businessType||from||to)&&<button className="btn btn-outline" onClick={()=>{setQuery("");setBusinessType("");setFrom("");setTo("");setPage(0)}}>Xóa bộ lọc</button>}
    </div>
    {detailsEnabled===false&&<p className="seller-notice" role="status">Bộ lọc loại hình kinh doanh chưa được mở trên môi trường này. Bạn vẫn có thể tìm kiếm và lọc theo thời gian.</p>}
    {message && <p role="status" className="seller-notice">{message}</p>}{error && <p role="alert" className="seller-error">{error}</p>}
    {loading ? <p role="status">Đang tải…</p> : <div className="seller-admin-layout">
      <div className="seller-card">{error ? <div role="alert" className="seller-empty"><p>Không thể tải danh sách. Vui lòng thử lại.</p><button className="btn btn-outline" onClick={()=>setRevision(v=>v+1)}>Thử lại</button></div> : rows.length === 0 ? <div className="seller-empty"><p>Không có hồ sơ hoặc gian hàng phù hợp.</p><small>Thử thay đổi trạng thái hoặc bộ lọc tìm kiếm.</small></div> : <div className="seller-table-scroll"><table className="seller-admin-table"><thead><tr>{["STT","Gian hàng","Người đại diện","Loại hình","Ngày đăng ký","Trạng thái","Thao tác"].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map((row,i)=>{const app="applicationId" in row;return <tr key={app?row.applicationId:row.shopId}><td>{page*12+i+1}</td><td><strong>{app?row.shopName:row.name}</strong><small>{row.description}</small></td><td>{row.representativeName}<small>{row.phone}</small><small>{row.representativeEmail||"Chưa có email liên hệ"}</small></td><td>{{INDIVIDUAL:"Hộ kinh doanh cá thể",COOPERATIVE:"Hợp tác xã",COMPANY:"Doanh nghiệp"}[row.businessType??""]||"Chưa bổ sung"}</td><td>{new Date(row.createdAt).toLocaleDateString("vi-VN")}</td><td><span className={"seller-badge seller-status-"+row.status.toLowerCase()}>{sellerStatusLabel(row.status)}</span></td><td><button className="btn btn-primary" disabled={busy} onClick={()=>{setSelected(row);setReason("");setError("")}}>Xem hồ sơ</button></td></tr>})}</tbody></table></div>}

      {pages>1&&<div className="seller-pagination"><button className="btn btn-outline" disabled={page===0||busy} onClick={() => setPage(p=>p-1)}>Trước</button><span>Trang {page+1} / {Math.max(1,pages)}</span><button className="btn btn-outline" disabled={page+1>=pages||busy} onClick={() => setPage(p=>p+1)}>Sau</button></div>}</div>
    </div>}
    <dialog ref={drawer} className="seller-drawer seller-application-drawer" aria-labelledby="seller-drawer-title" onCancel={e=>{if(busy)e.preventDefault();else setSelected(null)}} onClose={()=>{if(!busy)setSelected(null)}}>
      <header><div><span className="eyebrow">Người bán &amp; Gian hàng / Chi tiết hồ sơ</span><h2 id="seller-drawer-title">Chi tiết hồ sơ đăng ký gian hàng</h2></div><button className="btn btn-outline" aria-label="Đóng chi tiết hồ sơ" disabled={busy} onClick={()=>setSelected(null)}>← Quay lại danh sách</button></header>
      <div className="seller-drawer-content">{selected && <>
        {error&&<p role="alert" className="seller-error">{error}</p>}
        <ApplicationDetails record={selected}>{"shopId" in selected&&<AdminShopCatalog key={selected.shopId} shopId={selected.shopId} enabled={foundationEnabled} onBusyChange={setBusy}/>}</ApplicationDetails>
        {"rejectionReason" in selected && selected.rejectionReason && <p>Lý do từ chối: {selected.rejectionReason}</p>}
        {"statusReason" in selected && selected.statusReason && <p>Lý do khóa: {selected.statusReason}</p>}
        {(selected.status === "PENDING" || selected.status === "ACTIVE") && <label className="seller-reason">Lý do từ chối / khóa<textarea maxLength={1000} rows={3} disabled={busy} value={reason} onChange={e=>setReason(e.target.value)} /></label>}
        <div className="seller-actions">
          {selected.status === "PENDING" && <><button className="btn btn-primary" disabled={busy} onClick={() => void action("approve")}>Duyệt hồ sơ</button><button className="btn btn-outline" disabled={busy||!reason.trim()} onClick={() => void action("reject")}>Từ chối</button></>}
          {selected.status === "ACTIVE" && <button className="btn btn-outline" disabled={busy||!reason.trim()} onClick={() => void action("SUSPENDED")}>Khóa gian hàng</button>}
          {selected.status === "SUSPENDED" && <button className="btn btn-primary" disabled={busy} onClick={() => void action("ACTIVE")}>Mở lại gian hàng</button>}
        </div>
        <section className="seller-notice"><strong>Giấy tờ và thanh toán</strong><p>CCCD/CMND, giấy phép kinh doanh và thông tin ngân hàng: Chưa khả dụng – Phát triển sau. Hồ sơ này không xác nhận giấy tờ đã được kiểm chứng.</p></section>
      </>}</div>
    </dialog>
  </section>;
}
