import type {DashboardData} from "./adminData";
export function dateRangeError(from:string,to:string):string {
 const valid=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
 if(!valid(from)||!valid(to))return "Vui lòng chọn ngày hợp lệ.";
 const days=(Date.parse(to)-Date.parse(from))/86400000;
 if(days<0)return "Từ ngày không được sau Đến ngày.";
 if(days>365)return "Khoảng ngày tối đa 366 ngày.";
 if(from<"2000-01-01"||to>"9998-12-31")return "Ngày nằm ngoài phạm vi hỗ trợ.";
 return "";
}
export function validateDashboard(d:DashboardData,range:{from:string;to:string}):DashboardData {
 const n=(v:unknown)=>typeof v==="number"&&Number.isFinite(v)&&v>=0;
 if(!d||d.from!==range.from||d.to!==range.to||d.timezone!=="Asia/Ho_Chi_Minh"||![d.revenue,d.paidPayments,d.ordersCount,d.productsCount,d.customersCount].every(n)||!d.ordersByStatus||!Object.values(d.ordersByStatus).every(n)||!Array.isArray(d.revenueByDay)||!d.revenueByDay.every(x=>x&&/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&x.date>=d.from&&x.date<=d.to&&n(x.revenue)&&n(x.paymentsCount)))throw new Error("Dữ liệu thống kê không hợp lệ. Vui lòng tải lại.");
 return d;
}
export function latestOrders<T extends {createdAt:string;orderId:number}>(rows:T[],limit=5):T[]{return [...rows].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.orderId-a.orderId).slice(0,limit)}
