import {useState} from "react";
import {money} from "./ProductCard";
export function shortVnd(value:number):string {const f=(n:number)=>n.toLocaleString("vi-VN",{maximumFractionDigits:1});return value>=1e9?`${f(value/1e9)} tỷ`:value>=1e6?`${f(value/1e6)} triệu`:value>=1000?`${f(value/1000)} nghìn`:f(value)}
export function dateTicks(length:number,max=6):number[]{if(!length)return [];if(length===1)return [0];return [...new Set(Array.from({length:Math.min(length,max)},(_,i)=>Math.round(i*(length-1)/(Math.min(length,max)-1))))]}
type Day={date:string;revenue:number;paymentsCount:number};
export default function AdminRevenueChart({days}:{days:Day[]}){
 const [selected,setSelected]=useState<number|null>(null);const max=Math.max(0,...days.map(d=>d.revenue)),width=640/Math.max(1,days.length),day=selected===null?null:days[selected];
 const date=(s:string)=>`${s.slice(8,10)}/${s.slice(5,7)}`;
 return <div className="admin-revenue-visual" onMouseLeave={()=>setSelected(null)}>
 <svg viewBox="0 0 720 210" role="img" aria-label="Doanh thu PAID theo từng ngày, đơn vị VND">
 {[0,.5,1].map(f=><g key={f}><line x1="70" y1={160-f*135} x2="710" y2={160-f*135} stroke="var(--line)"/><text x="62" y={164-f*135} textAnchor="end" fontSize="11">{shortVnd(max*f)}</text></g>)}<text x="12" y="12" fontSize="10">VND</text>
 {days.map((d,i)=>{const height=max?d.revenue/max*135:0;return <g key={d.date}><title>{d.date}: {money(d.revenue)} · {d.paymentsCount} khoản PAID</title><rect className="revenue-bar" x={70+i*width+width*.15} y={160-height} width={width*.7} height={height} fill="var(--forest)" opacity={selected===i?1:.8}/><rect className="revenue-target" x={70+i*width} y={20} width={width} height={140} fill="transparent" tabIndex={0} role="button" aria-label={`${d.date}: ${money(d.revenue)}, ${d.paymentsCount} khoản PAID`} onMouseEnter={()=>setSelected(i)} onFocus={()=>setSelected(i)} onBlur={()=>setSelected(null)} onClick={()=>setSelected(i)}/></g>})}
 {dateTicks(days.length).map(i=><text key={i} x={70+(i+.5)*width} y="185" textAnchor={i===0?"start":i===days.length-1?"end":"middle"} fontSize="11">{date(days[i].date)}</text>)}
 </svg><div className="revenue-tooltip" role="status">{day?<><strong>{day.date}</strong><span>{money(day.revenue)} · {day.paymentsCount} khoản PAID</span></>:<span>Di chuột, chạm hoặc dùng Tab trên cột để xem số liệu chính xác.</span>}</div>
 </div>
}
