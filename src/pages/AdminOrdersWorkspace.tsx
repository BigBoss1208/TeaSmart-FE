import { useState } from "react";
import AdminOrders from "./AdminOrders";
import { CheckoutSessionReconciliationQueue } from "./AdminPayments";

export default function AdminOrdersWorkspace() {
  const [view, setView] = useState<"orders" | "reconciliation">("orders");
  return <>
    <nav className="operations-tabs" aria-label="Đơn hàng và đối soát">
      <button type="button" aria-pressed={view === "orders"} onClick={() => setView("orders")}>Đơn hàng</button>
      <button type="button" aria-pressed={view === "reconciliation"} onClick={() => setView("reconciliation")}>Phiên thanh toán cần đối soát</button>
    </nav>
    {view === "orders" ? <AdminOrders /> : <CheckoutSessionReconciliationQueue />}
  </>;
}
