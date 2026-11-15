export interface OrderViewRow {orderStatus:string;orderCode:string;customerName:string;customerEmail:string;createdAt:string;payment?:{paymentStatus:string}}
export function filterOrders<T extends OrderViewRow>(rows:T[],query:string,status:string,payment:string,from:string,to:string):T[]{
 const term=query.trim().toLocaleLowerCase("vi");
 return rows.filter(o=>(!status||o.orderStatus===status)&&(!payment||o.payment?.paymentStatus===payment)&&(!from||o.createdAt.slice(0,10)>=from)&&(!to||o.createdAt.slice(0,10)<=to)&&`${o.orderCode} ${o.customerName} ${o.customerEmail}`.toLocaleLowerCase("vi").includes(term));
}
export const nextOrderStatus=(status:string)=>({PENDING:"CONFIRMED",CONFIRMED:"SHIPPING",SHIPPING:"DELIVERED"} as Record<string,string>)[status];
