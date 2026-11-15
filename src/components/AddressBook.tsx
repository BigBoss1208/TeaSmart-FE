import { normalizeShippingPhone, validShippingPhone } from "../lib/phone";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { api, errorMessage } from "../lib/commerce";
import {
  findAdministrativeUnit,
  buildShippingAddress,
  loadAdministrativeDataset,
  normalizeAdministrativeSearch,
  type AdministrativeDataset,
  type AdministrativeUnit,
} from "../lib/administrativeUnits";

export interface SavedAddress {
  addressId: number;
  recipientName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  detailAddress: string;
  isDefault: boolean;
}

type Draft = Omit<SavedAddress, "addressId" | "isDefault">;
const empty: Draft = {
  recipientName: "", phone: "", province: "", district: "", ward: "", detailAddress: "",
};

export const addressText = buildShippingAddress;

export function SearchableUnit({
  label,
  value,
  options,
  disabled,
  selectedCode,
  error,
  onInput,
  onSelect,
  placeholder,
}: {
  label: string;
  value: string;
  options: AdministrativeUnit[];
  disabled?: boolean;
  selectedCode?: string;
  error?: string;
  onInput: (value: string) => void;
  onSelect: (unit: AdministrativeUnit) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchText, setSearchText] = useState(value);
  const rootRef = useRef<HTMLLabelElement>(null);
  const needle = normalizeAdministrativeSearch(searchText);
  const filtered = needle
    ? options.filter(unit => normalizeAdministrativeSearch(unit.name).includes(needle))
    : options;
  const listId = `address-options-${label.replace(/\W/g, "-").toLowerCase()}`;
  const errorId = `${listId}-error`;

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", closeOutside);
    return () => window.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  useEffect(() => setActiveIndex(0), [value, open]);
  useEffect(() => { if (!open) setSearchText(value); }, [value, open]);

  function toggleOpen() {
    if (open) setOpen(false);
    else { setSearchText(""); setOpen(true); }
  }

  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(index => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(index => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open && filtered[activeIndex]) {
      event.preventDefault();
      onSelect(filtered[activeIndex]);
      setOpen(false);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <label className="address-search-field" ref={rootRef}>
      <span className="address-field-label">{label} <b aria-hidden="true">*</b></span>
      <div className="address-search-menu">
        <div className="address-search-control">
          <input
          type="text"
          role="combobox"
          aria-label={label}
          aria-autocomplete="list"
          aria-expanded={open && !disabled}
          aria-controls={listId}
          aria-activedescendant={open && filtered[activeIndex] ? `${listId}-option-${filtered[activeIndex].code}` : undefined}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={open ? searchText : value}
          onFocus={() => { setSearchText(""); setOpen(true); }}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={keyDown}
          onChange={event => { setSearchText(event.target.value); onInput(event.target.value); setOpen(true); }}
          />
          <button
          type="button"
          className="address-search-toggle"
          aria-label={`Mở danh sách ${label}`}
          aria-expanded={open && !disabled}
          disabled={disabled}
          onMouseDown={event => event.preventDefault()}
          onClick={toggleOpen}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5"/></svg>
          </button>
        </div>
        {open && !disabled && <div className="address-search-results" id={listId} role="listbox">
          {filtered.length ? filtered.map((unit, index) => <button
            type="button"
            role="option"
            id={`${listId}-option-${unit.code}`}
            aria-selected={unit.code === selectedCode}
            key={unit.code}
            className={`${unit.code === selectedCode ? "is-selected " : ""}${index === activeIndex ? "is-active" : ""}`}
            tabIndex={-1}
            onMouseDown={event => event.preventDefault()}
            onClick={() => { onSelect(unit); setOpen(false); }}
          >{unit.name}</button>) : <span className="address-search-empty">Không có kết quả phù hợp</span>}
        </div>}
      </div>
      {error && <small className="address-field-error" id={errorId} role="alert">{error}</small>}
    </label>
  );
}

export default function AddressBook({
  onSelect,
  onDraftChange,
  onAddressSaved,
  continueAfterCreate = false,
  locked = false,
  note = "",
  onNoteChange,
}: {
  onSelect: (address: SavedAddress) => void;
  onDraftChange?: (open: boolean) => void;
  onAddressSaved?: (address: SavedAddress, created: boolean) => void;
  continueAfterCreate?: boolean;
  locked?: boolean;
  note?: string;
  onNoteChange?: (value: string) => void;
}) {
  const [rows, setRows] = useState<SavedAddress[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [edit, setEdit] = useState<number | null>(null);
  const [dataset, setDataset] = useState<AdministrativeDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [provinceCode, setProvinceCode] = useState("");
  const [wardCode, setWardCode] = useState("");
  const [provinceChanged, setProvinceChanged] = useState(false);
  const [wardChanged, setWardChanged] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const saveLock = useRef(false);
  const [makeDefault, setMakeDefault] = useState(true);

  useEffect(() => {
    let alive = true;
    void loadAdministrativeDataset().then(data => { if (alive) setDataset(data); })
      .catch(reason => { if (alive) setError(errorMessage(reason)); });
    const abort = new AbortController();
    void api<SavedAddress[]>("/addresses", { signal: AbortSignal.any([abort.signal, AbortSignal.timeout(20000)]) })
      .then(data => {
        if (!alive) return;
        setRows(data);
        if (!data.length) startNew();
        const valid = data.filter(item => item.recipientName.trim() && validShippingPhone(item.phone) && item.province.trim() && item.ward.trim() && item.detailAddress.trim() && addressText(item).length <= 500);
        const address = valid.find(item => item.isDefault) ?? valid[0];
        if (address) { setSelected(address.addressId); onSelect(address); }
      })
      .catch(reason => { if (alive && !abort.signal.aborted) setError(errorMessage(reason)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; abort.abort(); };
  }, []);

  const provinces = dataset?.provinces ?? [];
  const activeProvince = provinces.find(province => province.code === provinceCode);
  const wards = activeProvince?.units ?? [];

  async function refresh(id?: number) {
    const data = await api<SavedAddress[]>("/addresses");
    setRows(data);
    const address = data.find(item => item.addressId === (id ?? selected)) ?? data.find(item => item.isDefault) ?? data[0];
    if (address) { setSelected(address.addressId); onSelect(address); }
    else { setSelected(null); onSelect({ ...empty, addressId: 0, isDefault: false }); startNew(); setMakeDefault(true); }
  }

  function startNew() {
    setMakeDefault(rows.length === 0);
    setEdit(null);
    setDraft({ ...empty });
    setProvinceCode("");
    setWardCode("");
    setProvinceChanged(false);
    setWardChanged(false);
    setError("");
    setFieldErrors({});
    onDraftChange?.(true);
  }

  function startEdit(address: SavedAddress) {
    const province = findAdministrativeUnit(provinces, address.province);
    const ward = province && findAdministrativeUnit(province.units, address.ward);
    setMakeDefault(address.isDefault);
    setEdit(address.addressId);
    setDraft({
      recipientName: address.recipientName,
      phone: address.phone,
      province: address.province,
      district: address.district,
      ward: address.ward,
      detailAddress: address.detailAddress,
    });
    setProvinceCode(province?.code ?? "");
    setWardCode(ward?.code ?? "");
    setProvinceChanged(false);
    setWardChanged(false);
    setError("");
    setFieldErrors({});
    onDraftChange?.(true);
  }

  async function save() {
    if (!draft || busy || locked || saveLock.current) return;
    const values = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim()])) as Draft;
    values.phone = normalizeShippingPhone(values.phone);
    const old = edit == null ? undefined : rows.find(address => address.addressId === edit);
    const locationUnchanged = !!old && !provinceChanged && !wardChanged &&
      values.province === old.province && values.ward === old.ward;
    const selectedProvince = provinces.find(province => province.code === provinceCode);
    const selectedWard = selectedProvince?.units.find(unit => unit.code === wardCode);
    if (selectedProvince && provinceChanged) values.province = selectedProvince.name;
    if (selectedWard && wardChanged) values.ward = selectedWard.name;
    const nextErrors: Record<string, string> = {};
    if (!values.recipientName) nextErrors.recipientName = "Vui lòng nhập họ tên người nhận.";
    if (!values.phone) nextErrors.phone = "Vui lòng nhập số điện thoại.";
    else if (!validShippingPhone(values.phone)) nextErrors.phone = "Số điện thoại cần có 10 chữ số hợp lệ.";
    if ((!selectedProvince && !locationUnchanged) || !values.province) nextErrors.province = "Vui lòng chọn tỉnh/thành phố trong danh sách.";
    if ((!selectedWard && !locationUnchanged) || !values.ward) nextErrors.ward = "Vui lòng chọn phường/xã trong danh sách.";
    if (!values.detailAddress) nextErrors.detailAddress = "Vui lòng nhập địa chỉ chi tiết.";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setError("");
      return;
    }
    if (addressText(values).length > 500) { setError("Địa chỉ đầy đủ vượt quá 500 ký tự."); return; }
    setBusy(true);
    saveLock.current = true;
    setError("");
    try {
      const created = edit == null;
      const saved = await api<SavedAddress>(edit ? `/addresses/${edit}` : "/addresses", {
        method: edit ? "PUT" : "POST",
        body: JSON.stringify(values),
      });
      setRows(current => {
        const next = edit == null
          ? [saved, ...current]
          : current.map(address => address.addressId === saved.addressId ? saved : address);
        return next.sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.addressId - b.addressId);
      });
      setSelected(saved.addressId);
      onSelect(saved);
      setDraft(null);
      setEdit(null);
      onDraftChange?.(false);
      onAddressSaved?.(saved, created);
      // Creation has committed: subsequent failures must not leave a form that
      // could accidentally POST the same address a second time.
      if (makeDefault && !saved.isDefault) await api(`/addresses/${saved.addressId}/default`, { method: "PATCH" });
      await refresh(saved.addressId);
    } catch (reason) { setError(errorMessage(reason)); }
    finally { saveLock.current = false; setBusy(false); }
  }

  async function action(address: SavedAddress, remove: boolean) {
    if (busy || locked) return;
    if (remove && !window.confirm("Xóa địa chỉ này? Địa chỉ trong các đơn hàng cũ không thay đổi.")) return;
    setBusy(true);
    setError("");
    try {
      await api(`/addresses/${address.addressId}${remove ? "" : "/default"}`, { method: remove ? "DELETE" : "PATCH" });
      await refresh();
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  }

  function inputProvince(value: string) {
    setDraft(current => current && ({ ...current, province: value, district: "", ward: "" }));
    setProvinceCode("");
    setWardCode("");
    setProvinceChanged(true);
    setWardChanged(true);
    setFieldErrors(current => ({ ...current, province: "", ward: value ? "Vui lòng chọn phường/xã trong danh sách." : "" }));
  }

  function chooseProvince(unit: AdministrativeUnit) {
    const changed = provinceCode !== unit.code;
    setDraft(current => current && ({ ...current, province: unit.name,
      district: changed ? "" : current.district, ward: changed ? "" : current.ward }));
    setProvinceCode(unit.code);
    if (changed) { setWardCode(""); setWardChanged(true); }
    setProvinceChanged(true);
    setFieldErrors(current => ({ ...current, province: "", ward: "" }));
  }

  function inputWard(value: string) {
    setDraft(current => current && ({ ...current, ward: value }));
    setWardCode("");
    setWardChanged(true);
    setFieldErrors(current => ({ ...current, ward: value ? "Vui lòng chọn phường/xã trong danh sách." : "" }));
  }

  function chooseWard(unit: AdministrativeUnit) {
    setDraft(current => current && ({ ...current, ward: unit.name }));
    setWardCode(unit.code);
    setWardChanged(true);
    setFieldErrors(current => ({ ...current, ward: "" }));
  }

  return <section className="form-section address-book">
    <div className="address-heading">
      <div className="form-title"><span>1</span>Địa chỉ nhận hàng</div>
      {!loading && rows.length > 0 && <button type="button" className="btn btn-outline" disabled={busy || locked} onClick={startNew}>+ Thêm địa chỉ mới</button>}
    </div>
    {loading && <p role="status">Đang tải địa chỉ…</p>}

    <fieldset disabled={busy || locked} style={{ border: 0, padding: 0 }}>
      {rows.map(address => <div key={address.addressId} className={`saved-address ${selected === address.addressId ? "selected" : ""}`}>
        <label>
          <input type="radio" name="delivery-address" checked={selected === address.addressId} onChange={() => {
            setSelected(address.addressId); onSelect(address); setDraft(null); onDraftChange?.(false);
          }}/>
          <span><strong>{address.recipientName}</strong>{address.isDefault && <small className="admin-badge badge-success">Mặc định</small>}<br/>{address.phone}<br/>{addressText(address)}</span>
        </label>
        <div>
          <button type="button" onClick={() => startEdit(address)}>Sửa</button>
          <button type="button" onClick={() => void action(address, true)}>Xóa</button>
          {!address.isDefault && <button type="button" onClick={() => void action(address, false)}>Đặt mặc định</button>}
        </div>
      </div>)}
      {draft && <div className="address-editor">
        <h3 className="address-editor-title">{edit ? "Chỉnh sửa địa chỉ" : rows.length ? "Thêm địa chỉ mới" : "Lần đầu mua sắm? Hãy điền thông tin giao hàng của bạn."}</h3>
        {!dataset && <p role="status">Đang tải danh mục tỉnh, xã chính thức…</p>}
        <div className="address-contact-grid">
          <label><span className="address-field-label">Họ và tên <b aria-hidden="true">*</b></span><input aria-invalid={!!fieldErrors.recipientName} aria-describedby={fieldErrors.recipientName ? "address-name-error" : undefined} autoComplete="name" maxLength={100} placeholder="Nhập họ tên người nhận" value={draft.recipientName} onChange={event => { setDraft({ ...draft, recipientName: event.target.value }); setFieldErrors(current => ({ ...current, recipientName: "" })); }}/>{fieldErrors.recipientName && <small className="address-field-error" id="address-name-error" role="alert">{fieldErrors.recipientName}</small>}</label>
          <label><span className="address-field-label">Số điện thoại <b aria-hidden="true">*</b></span><input type="tel" aria-invalid={!!fieldErrors.phone} aria-describedby={fieldErrors.phone ? "address-phone-error" : undefined} autoComplete="tel" maxLength={20} placeholder="Ví dụ: 0912345678" value={draft.phone} onChange={event => { setDraft({ ...draft, phone: event.target.value }); setFieldErrors(current => ({ ...current, phone: "" })); }}/>{fieldErrors.phone && <small className="address-field-error" id="address-phone-error" role="alert">{fieldErrors.phone}</small>}</label>
        </div>
        <div className="address-location-grid">
          <SearchableUnit
            label="Tỉnh / Thành phố"
            value={draft.province}
            options={provinces}
            disabled={!dataset}
            selectedCode={provinceCode}
            error={fieldErrors.province}
            placeholder="Tìm tỉnh/thành phố, có thể gõ không dấu"
            onInput={inputProvince}
            onSelect={chooseProvince}
          />
          <SearchableUnit
            label="Phường / Xã / Đặc khu"
            value={draft.ward}
            options={wards}
            disabled={!activeProvince}
            selectedCode={wardCode}
            error={fieldErrors.ward}
            placeholder={activeProvince ? "Tìm phường/xã, có thể gõ không dấu" : "Chọn tỉnh/thành phố trước"}
            onInput={inputWard}
            onSelect={chooseWard}
          />
        </div>
        <label className="address-detail-field">
          <span className="address-field-label">Địa chỉ chi tiết <b aria-hidden="true">*</b></span>
          <input aria-invalid={!!fieldErrors.detailAddress} aria-describedby={fieldErrors.detailAddress ? "address-detail-error" : undefined} autoComplete="street-address" maxLength={255} placeholder="Số nhà, tên đường, thôn/xóm, tòa nhà" value={draft.detailAddress} onChange={event => { setDraft({ ...draft, detailAddress: event.target.value }); setFieldErrors(current => ({ ...current, detailAddress: "" })); }}/>
          {fieldErrors.detailAddress && <small className="address-field-error" id="address-detail-error" role="alert">{fieldErrors.detailAddress}</small>}
        </label>
        {edit && draft.district && <p className="address-legacy-note">Địa chỉ này còn lưu thông tin quận/huyện cũ. Hệ thống sẽ giữ nguyên khi bạn chỉ sửa thông tin khác.</p>}
        <label className="address-default-choice"><input type="checkbox" checked={makeDefault} disabled={!rows.length} onChange={event => setMakeDefault(event.target.checked)}/>Đặt làm địa chỉ mặc định</label>
        {!rows.length && <p className="address-save-hint">Thông tin sẽ được lưu vào tài khoản để sử dụng cho các đơn hàng sau.</p>}
        {draft && <div className="shipping-note address-editor-note">
          <label htmlFor="checkout-note-editor">Lời nhắn cho shop (không bắt buộc)</label>
          <textarea id="checkout-note-editor" aria-label="Lời nhắn cho shop (không bắt buộc)" placeholder="Ví dụ: Gói quà giúp mình, đóng gói cẩn thận..." rows={3} maxLength={500} value={note} onChange={event => onNoteChange?.(event.target.value)} />
          <small className="note-count">{note.length}/500</small>
        </div>}
        <div className="address-editor-actions">
          {rows.length > 0 && <button type="button" className="btn btn-outline" onClick={() => { setDraft(null); setEdit(null); setError(""); onDraftChange?.(false); }}>Hủy chỉnh sửa</button>}
          <button type="button" className="btn btn-primary" disabled={busy || !dataset} onClick={() => void save()}>{busy ? "Đang lưu…" : !rows.length ? "Lưu địa chỉ nhận hàng" : continueAfterCreate && !edit ? "Lưu địa chỉ và tiếp tục" : "Lưu địa chỉ"}</button>
        </div>
      </div>}
    </fieldset>
    {error && <p role="alert">{error}</p>}
  </section>;
}
