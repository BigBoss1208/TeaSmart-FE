import { useEffect, useState } from "react";
import { ApiError, api, errorMessage, type ApiOrder, type ShippingRequest } from "../lib/commerce";
import { normalizeShippingPhone, validShippingPhone } from "../lib/phone";

export default function ShippingInfoEditor({ order, onSaved, disabledMessage }: {
  order: ApiOrder;
  onSaved: (order: ApiOrder) => void;
  disabledMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(order.recipientName);
  const [phone, setPhone] = useState(order.recipientPhone);
  const [address, setAddress] = useState(order.shippingAddress);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setName(order.recipientName);
    setPhone(order.recipientPhone);
    setAddress(order.shippingAddress);
  }, [order.orderId, order.recipientName, order.recipientPhone, order.shippingAddress]);
  if (order.orderStatus !== "PENDING") return null;
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !validShippingPhone(phone) || !address.trim() || address.length > 500) {
      setError("Vui lòng nhập tên, số điện thoại và địa chỉ hợp lệ."); return;
    }
    setBusy(true); setError("");
    try {
      const updated = await api<ApiOrder>(`/orders/${order.orderId}/shipping-info`, { method: "PATCH", body: JSON.stringify({
        recipientName: name.trim(), recipientPhone: normalizeShippingPhone(phone), shippingAddress: address.trim(),
      } satisfies Omit<ShippingRequest, "note">) });
      onSaved(updated); setOpen(false);
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 409) {
        setError("Đơn hàng đã được xử lý hoặc đang đối soát. Thông tin giao hàng không được thay đổi.");
      } else if (reason instanceof ApiError && reason.status === 403) {
        setError("Bạn không có quyền chỉnh sửa thông tin giao hàng của đơn này.");
      } else setError(errorMessage(reason));
    }
    finally { setBusy(false); }
  }
  return <div className={`shipping-info-editor${open ? " is-open" : ""}${disabledMessage ? " is-disabled" : ""}`}>
    {disabledMessage ? <p className="shipping-info-editor-note" role="status">{disabledMessage}</p> : !open ? <button type="button" className="btn btn-outline" onClick={() => setOpen(true)}>Chỉnh sửa</button> :
      <form onSubmit={save} className="shipping-info-form">
        <label>Tên người nhận<input autoComplete="name" maxLength={100} disabled={busy} value={name} onChange={e => setName(e.target.value)} required /></label>
        <label>Số điện thoại<input autoComplete="tel" inputMode="tel" maxLength={20} disabled={busy} value={phone} onChange={e => setPhone(e.target.value)} required /></label>
        <label>Địa chỉ giao hàng<textarea autoComplete="street-address" rows={3} maxLength={500} disabled={busy} value={address} onChange={e => setAddress(e.target.value)} required /></label>
        {error && <p role="alert">{error}</p>}
        <div className="shipping-info-form-actions"><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Đang lưu…" : "Lưu thay đổi"}</button>
          <button type="button" className="btn btn-outline" disabled={busy} onClick={() => { setName(order.recipientName); setPhone(order.recipientPhone); setAddress(order.shippingAddress); setOpen(false); setError(""); }}>Hủy</button></div>
      </form>}
  </div>;
}
