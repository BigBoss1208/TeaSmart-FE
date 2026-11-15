export function pageNumbers(page: number, pages: number): (number | "…")[] {
 const selected = new Set([0, pages - 1, page - 1, page, page + 1].filter(n => n >= 0 && n < pages));
 const result: (number | "…")[] = []; let previous = -1;
 for (const n of [...selected].sort((a,b)=>a-b)) { if (previous >= 0 && n - previous > 1) result.push("…"); result.push(n); previous=n; }
 return result;
}
export default function AdminPagination({page,total,size=12,onChange,disabled=false,label}:{page:number;total:number;size?:number;onChange:(page:number)=>void;disabled?:boolean;label:string}) {
 const pages=Math.ceil(total/size), current=Math.min(page,Math.max(0,pages-1));
 return <div className="admin-b2-pagination"><span>Hiển thị {total?current*size+1:0}–{Math.min((current+1)*size,total)} trong tổng số {total} {label}</span><nav aria-label={`Phân trang ${label}`}><button disabled={disabled||current===0} onClick={()=>onChange(current-1)} aria-label="Trang trước">‹</button>{pageNumbers(current,pages).map((n,i)=>n==="…"?<span key={`gap-${i}`}>…</span>:<button key={n} aria-current={n===current?"page":undefined} disabled={disabled} onClick={()=>onChange(n)}>{n+1}</button>)}<button disabled={disabled||!pages||current+1>=pages} onClick={()=>onChange(current+1)} aria-label="Trang sau">›</button></nav></div>;
}
