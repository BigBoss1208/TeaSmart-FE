import { api, type ApiOrder, type ApiPage, type PaymentStatus } from "./commerce.ts";
export interface OrderSummary { orderId:number; orderCode:string; orderStatus:string; totalAmount:number; createdAt:string; updatedAt:string }
export interface OwnReview { productId:number; status:string }
export const orderTabs = [["ALL","Tất cả"],["PENDING","Chờ xác nhận"],["CONFIRMED","Chờ lấy hàng"],["SHIPPING","Chờ giao hàng"],["REVIEW","Đánh giá"],["CANCELLED","Đã hủy"]] as const;
export type OrderTab = typeof orderTabs[number][0];
export async function orderPage(page:number, signal:AbortSignal) {
  const result=await api<ApiPage<OrderSummary>>(`/orders?size=50&page=${page}`,{signal});
  if(!Array.isArray(result.content)||result.page!==page||!Number.isInteger(result.totalPages)||result.totalPages<0||!Number.isInteger(result.totalElements)||result.totalElements<0) throw new Error("Invalid pagination");
  return result;
}
export async function allReviewProducts(signal:AbortSignal):Promise<Set<number>> {
  const ids=new Set<number>();let pages=1;
  for(let page=0;page<pages;page++) {
    signal.throwIfAborted();
    const result=await api<ApiPage<OwnReview>>(`/reviews/my?size=50&page=${page}`,{signal});
    if(!Array.isArray(result.content)||result.page!==page||!Number.isInteger(result.totalPages)||result.totalPages<0||result.totalPages>1000)throw new Error("Incomplete review pagination");
    pages=result.totalPages;
    result.content.forEach(r=>ids.add(r.productId));
  }
  signal.throwIfAborted();return ids;
}
export async function limitedMap<T,R>(rows:T[],signal:AbortSignal,load:(row:T)=>Promise<R>):Promise<R[]> {
  const result:R[]=new Array(rows.length);let next=0;
  await Promise.all(Array.from({length:Math.min(3,rows.length)},async()=>{while(next<rows.length){signal.throwIfAborted();const index=next++;result[index]=await load(rows[index]);signal.throwIfAborted();}}));
  return result;
}
export function unreviewedProducts(order:ApiOrder, reviewed:Set<number>):number[] {
  return order.orderStatus==="DELIVERED" ? [...new Set(order.items.map(i=>i.productId))].filter(id=>!reviewed.has(id)) : [];
}
export function filterOrders(rows:OrderSummary[],tab:OrderTab,eligible:Record<number,number[]>):OrderSummary[] {
  return rows.filter(o=>tab==="ALL"||tab==="REVIEW"&&o.orderStatus==="DELIVERED"&&!!eligible[o.orderId]?.length||o.orderStatus===tab);
}
export function canCancelCod(order:OrderSummary,payment?:PaymentStatus):boolean {
  return order.orderStatus==="PENDING"&&payment?.orderId===order.orderId&&payment.paymentMethod==="COD"&&payment.paymentStatus==="PENDING"&&!payment.paidAt&&!payment.reconciliationRequired;
}
