import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, errorMessage } from "../lib/commerce";
import type { SellerPage } from "../lib/seller";
import "./SellerProducts.css";

type Product = { productId: number; name: string; description: string; price: number; weightGrams: number; stockQuantity: number; categoryId: number; regionId: number; imageUrl: string | null; status: string; archivedAt?: string | null };
type Option = { id: number; name: string };
const base = "/seller/products";
export default function SellerProducts({ initialCreate = false }: { initialCreate?: boolean }) {
  const [rows,setRows] = useState<SellerPage<Product> | null>(null);
  const [options,setOptions] = useState<{categories:Option[];regions:Option[];archiveEnabled?:boolean}>({categories:[],regions:[]});
  const [query,setQuery]=useState(""), [filter,setFilter]=useState(""), [page,setPage]=useState(0);
  const [revision,refresh]=useState(0), [mode,setMode]=useState<"list"|"edit"|"stock">(initialCreate ? "edit" : "list");
  const [item,select]=useState<Product|null>(null), [busy,setBusy]=useState(false);
  const [error,setError]=useState(""), [message,setMessage]=useState("");
  const [archiveTarget,setArchiveTarget]=useState<Product|null>(null),[archiveError,setArchiveError]=useState("");
  const [viewId,setViewId]=useState<number|null>(null),[view,setView]=useState<Product|null>(null),[viewError,setViewError]=useState("");
  const viewDialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{if(viewId===null)return;const controller=new AbortController();setView(null);setViewError("");viewDialog.current?.showModal();void api<Product>(base+"/"+viewId,{signal:controller.signal}).then(p=>{if(!controller.signal.aborted)setView(p)}).catch(e=>{if(!controller.signal.aborted)setViewError(errorMessage(e))});return()=>controller.abort()},[viewId]);
  const archiveDialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const d=archiveDialog.current;if(archiveTarget&&!d?.open)d?.showModal();if(!archiveTarget&&d?.open)d.close()},[archiveTarget]);
  const pending=useRef(false), retry=useRef({payload:"",key:""});
  useEffect(()=>{
    const controller=new AbortController();
    setRows(null);setError("");
    const init={signal:controller.signal};
    Promise.all([api<SellerPage<Product>>(base+"?"+new URLSearchParams({q:query,status:filter,page:String(page)}),init),api<typeof options>(base+"/options",init)])
      .then(([result,choices])=>{if(!controller.signal.aborted){setRows(result);setOptions({...choices,archiveEnabled:choices.archiveEnabled===true});}})
      .catch(e=>{if(!controller.signal.aborted)setError(errorMessage(e));});
    return ()=>controller.abort();
  },[query,filter,page,revision]);
  function open(next:"edit"|"stock",product:Product|null){
    select(product);setMode(next);setMessage("");setError("");retry.current={payload:"",key:""};
  }
  async function save(path:string,method:string,body:object,key?:string){
    if(pending.current)return;
    pending.current=true;setBusy(true);setError("");setMessage("");
    try{
      await api(base+path,{method,body:JSON.stringify(body),headers:key?{"Idempotency-Key":key}:{}});
      setMode("list");setMessage("Đã lưu thay đổi.");refresh(v=>v+1);
    }catch(e){setError(errorMessage(e));}finally{pending.current=false;setBusy(false);}
  }
  async function archive(){
    if(!archiveTarget||pending.current)return;
    pending.current=true;setBusy(true);setArchiveError("");setError("");setMessage("");
    try{await api(base+"/"+archiveTarget.productId+"/archive",{method:"POST"});setArchiveTarget(null);setMessage("Đã lưu trữ sản phẩm. Lịch sử đơn hàng và các checkout đã giữ kho được bảo toàn.");refresh(v=>v+1);}
    catch(e){setArchiveError(errorMessage(e));}finally{pending.current=false;setBusy(false);}
  }
  function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    if(mode==="stock" && item){
      const delta=Number(f.get("delta")),reason=String(f.get("reason")).trim();
      if(!Number.isSafeInteger(delta)||!delta||!reason){setError("Nhập số lượng khác 0 và lý do điều chỉnh.");return;}
      const payload=JSON.stringify([item.productId,delta,reason]);
      if(retry.current.payload!==payload)retry.current={payload,key:crypto.randomUUID()};
      void save("/"+item.productId+"/stock-adjustments","POST",{delta,reason},retry.current.key);
    }else{
      void save(item?"/"+item.productId:"",item?"PATCH":"POST",{name:String(f.get("name")).trim(),description:String(f.get("description")).trim(),categoryId:Number(f.get("category")),regionId:Number(f.get("region")),price:Number(f.get("price")),weightGrams:Number(f.get("weight")),imageUrl:String(f.get("imageUrl")??"").trim()||null});
    }
  }
  return <div className="seller-products"><h2>Sản phẩm của gian hàng</h2><p>Quản lý sản phẩm, tồn kho và trạng thái đăng bán của gian hàng.</p>
    {message && <p role="status">{message}</p>}{error && <p role="alert" className="seller-error">{error} {mode==="list" && <button onClick={()=>refresh(v=>v+1)}>Tải lại</button>}</p>}
    {mode!=="list"?<form className="seller-form" onSubmit={submit}><h3>{mode==="stock"?"Điều chỉnh tồn kho":item?"Sửa sản phẩm":"Thêm sản phẩm"}</h3>
      <fieldset disabled={busy}>{mode==="stock"?<>
       <p className="seller-wide">{item?.name} · Tồn khả dụng: {item?.stockQuantity}</p>
       <label>Số lượng tăng (+) hoặc giảm (−)<input name="delta" type="number" min="-4294967295" max="4294967295" required/></label>
       <label>Lý do<input name="reason" maxLength={500} required/></label>
      </>:<>
       <label className="seller-wide">Tên sản phẩm<input name="name" maxLength={200} required defaultValue={item?.name}/></label>
       <label>Danh mục<select name="category" required defaultValue={item?.categoryId??""}><option value="">Chọn danh mục</option>{options.categories.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
       <label>Vùng chè<select name="region" required defaultValue={item?.regionId??""}><option value="">Chọn vùng chè</option>{options.regions.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
       <label>Giá (đồng)<input name="price" type="number" min=".01" max="9999999999.99" step=".01" required defaultValue={item?.price}/></label>
       <label>Khối lượng (g)<input name="weight" type="number" min="1" max="4294967295" required defaultValue={item?.weightGrams}/></label>
       <label className="seller-wide">URL ảnh bìa<input name="imageUrl" type="text" inputMode="url" maxLength={500} defaultValue={item?.imageUrl??""} placeholder="https://… hoặc /placeholder-teasmart.svg"/><small>Dùng một URL HTTPS hoặc đường dẫn ảnh cùng website. Chưa hỗ trợ tải tệp ảnh lên.</small></label>
       <label className="seller-wide">Mô tả<textarea name="description" maxLength={10000} defaultValue={item?.description}/></label>
      </>}</fieldset><div className="seller-actions"><button className="btn btn-primary" disabled={busy}>Lưu</button><button className="btn btn-outline" type="button" disabled={busy} onClick={()=>setMode("list")}>Hủy</button></div></form>:<>
      <div className="product-tools"><input aria-label="Tìm sản phẩm" type="search" placeholder="Tìm theo tên" value={query} onChange={e=>{setPage(0);setQuery(e.target.value);}}/>
       <select aria-label="Lọc trạng thái" value={filter} onChange={e=>{setPage(0);setFilter(e.target.value);}}><option value="">Mọi trạng thái</option><option value="ACTIVE">Sẵn sàng bán</option><option value="INACTIVE">Ngừng bán</option>{options.archiveEnabled&&<option value="ARCHIVED">Đã lưu trữ</option>}</select>
       <button className="btn btn-primary" disabled={!rows||busy} onClick={()=>open("edit",null)}>Thêm sản phẩm</button></div>
      {rows&&!options.archiveEnabled&&<p className="seller-notice">Lưu trữ sản phẩm chưa được mở trên môi trường này.</p>}
      {!rows&&!error&&<p role="status">Đang tải sản phẩm…</p>}{rows&&!rows.content.length&&<p>Không tìm thấy sản phẩm.</p>}
      {!!rows?.content.length&&<table><thead><tr><th>Sản phẩm</th><th>Giá</th><th>Tồn</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{rows.content.map(p=><tr key={p.productId}>
       <td>{p.imageUrl&&<img className="seller-product-thumb" src={p.imageUrl} alt=""/>}<strong>{p.name}</strong></td><td data-label="Giá">{p.price.toLocaleString("vi-VN")} đ</td><td data-label="Tồn">{p.stockQuantity}</td><td><span className={p.status==="ARCHIVED"?"product-archived-badge":""}>{p.status==="ARCHIVED"?"Đã lưu trữ":p.status==="ACTIVE"?"Sẵn sàng bán":"Ngừng bán"}</span>{p.archivedAt&&<small className="product-archived-date">{new Date(p.archivedAt).toLocaleString("vi-VN")}</small>}</td>
       <td><button type="button" disabled={busy} onClick={()=>setViewId(p.productId)}>Xem</button>{p.status==="ARCHIVED"?<small>Chỉ xem · Đã lưu trữ</small>:<div className="product-actions"><button disabled={busy} onClick={()=>open("edit",p)}>Sửa</button><button disabled={busy} onClick={()=>open("stock",p)}>Điều chỉnh kho</button><button disabled={busy} onClick={()=>void save("/"+p.productId+"/status","PATCH",{status:p.status==="ACTIVE"?"INACTIVE":"ACTIVE"})}>{p.status==="ACTIVE"?"Ngừng bán":"Sẵn sàng bán"}</button>{options.archiveEnabled&&<details className="product-more"><summary aria-label={"Thao tác khác cho "+p.name}>⋯</summary><div className="product-more-menu"><button type="button" disabled={busy} onClick={()=>{setArchiveTarget(p);setArchiveError("")}}>Lưu trữ sản phẩm</button></div></details>}</div>}</td>
      </tr>)}</tbody></table>}
      {rows&&(rows.totalPages>1||page>0)&&<div className="seller-pagination"><button disabled={!page} onClick={()=>setPage(p=>p-1)}>Trước</button>Trang {page+1}<button disabled={page+1>=rows.totalPages} onClick={()=>setPage(p=>p+1)}>Sau</button></div>}
    </>}
    <dialog ref={viewDialog} className="product-archive-dialog" aria-labelledby="product-view-title" onClose={()=>setViewId(null)}>
      <h2 id="product-view-title">Chi tiết sản phẩm</h2>
      {!view&&!viewError&&<p role="status">Đang tải sản phẩm…</p>}{viewError&&<p role="alert">{viewError}</p>}
      {view&&<><h3>{view.name}</h3>{view.imageUrl&&<img src={view.imageUrl} style={{maxWidth:"100%",maxHeight:180,objectFit:"contain"}} alt={view.name}/>}<dl className="seller-details"><dt>Giá</dt><dd>{view.price.toLocaleString("vi-VN")} đ</dd><dt>Khối lượng</dt><dd>{view.weightGrams} g</dd><dt>Tồn khả dụng</dt><dd>{view.stockQuantity}</dd><dt>Danh mục</dt><dd>{options.categories.find(o=>o.id===view.categoryId)?.name ?? `#${view.categoryId}`}</dd><dt>Vùng chè</dt><dd>{options.regions.find(o=>o.id===view.regionId)?.name ?? `#${view.regionId}`}</dd><dt>Trạng thái</dt><dd>{view.status==="ARCHIVED"?"Đã lưu trữ":view.status==="ACTIVE"?"Sẵn sàng bán":"Ngừng bán"}</dd><dt>Mô tả</dt><dd>{view.description || "Chưa có mô tả"}</dd></dl></>}
      <button className="btn btn-outline" type="button" onClick={()=>viewDialog.current?.close()}>Đóng</button>
    </dialog>
    <dialog ref={archiveDialog} className="product-archive-dialog" aria-labelledby="product-archive-title" onCancel={e=>{if(busy)e.preventDefault();else setArchiveTarget(null)}} onClose={()=>{if(!busy)setArchiveTarget(null)}}>
      <h2 id="product-archive-title">Lưu trữ sản phẩm?</h2><p><strong>{archiveTarget?.name}</strong></p>
      <p>Sản phẩm sẽ ngừng xuất hiện để mua mới. Lịch sử đơn hàng, doanh thu và các checkout đã giữ kho vẫn được giữ nguyên.</p>
      <p>Sản phẩm đã lưu trữ chỉ còn để xem; chưa hỗ trợ khôi phục trong giai đoạn này.</p>
      {archiveError&&<p role="alert" className="seller-error">{archiveError}</p>}
      <div className="seller-actions"><button type="button" className="btn btn-outline" disabled={busy} onClick={()=>setArchiveTarget(null)}>Hủy</button><button type="button" className="btn btn-primary" disabled={busy||!archiveTarget} onClick={()=>void archive()}>{busy?"Đang lưu trữ…":"Xác nhận lưu trữ"}</button></div>
    </dialog>
    </div>;
}
