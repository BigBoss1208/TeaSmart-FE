export const checkoutReceiptKey="teasmart_checkout_receipt";
export function readCheckoutReceipt(userId:string):number|null {
 try {const r=JSON.parse(sessionStorage.getItem(checkoutReceiptKey)??"null");return r?.userId===userId&&Number.isSafeInteger(r.orderId)&&r.orderId>0?r.orderId:null}catch{return null}
}
export function rememberCheckoutReceipt(userId:string,orderId:number){sessionStorage.setItem(checkoutReceiptKey,JSON.stringify({userId,orderId}))}
