import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Modal, Spinner, Field } from '../components/ui';
import { formatDate } from '../lib/format';

export default function Slots() {
  const [showrooms, setShowrooms] = useState<any[]>([]);
  const [showroomId, setShowroomId] = useState('');
  const [slots, setSlots] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [bookSlot, setBookSlot] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get<any[]>('/meta/showrooms').then((s) => { setShowrooms(s); if (s[0]) setShowroomId(s[0].id); }); }, []);

  async function load() {
    if (!showroomId) return;
    setLoading(true);
    try {
      // Lấy tất cả slot (kèm ai đặt / xe gì / còn trống) cho showroom đang chọn
      setSlots(await api.get<any[]>(`/cars/slots/manage?showroom_id=${showroomId}`));
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [showroomId]);

  const now = Date.now();
  const upcoming = slots.filter((s) => new Date(s.start_time).getTime() >= now - 3600000);
  const booked = upcoming.filter((s) => s.booking_id);
  const free = upcoming.filter((s) => !s.booking_id && s.is_available && !s.is_holiday);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Cấu hình khung giờ lái thử</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ Thêm khung giờ</button>
      </div>
      <div className="card mb-4">
        <Field label="Showroom"><select className="input" value={showroomId} onChange={(e) => setShowroomId(e.target.value)}>{showrooms.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
      </div>

      {/* Tổng quan */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-white p-3 text-center"><div className="text-2xl font-bold text-gray-800">{upcoming.length}</div><div className="text-xs text-gray-500">Tổng khung giờ</div></div>
        <div className="rounded-xl border bg-white p-3 text-center"><div className="text-2xl font-bold text-green-600">{free.length}</div><div className="text-xs text-gray-500">Còn trống</div></div>
        <div className="rounded-xl border bg-white p-3 text-center"><div className="text-2xl font-bold text-blue-600">{booked.length}</div><div className="text-xs text-gray-500">Đã có khách đặt</div></div>
      </div>

      {loading ? <Spinner /> : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="p-3">Khung giờ</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Khách đặt</th>
                <th className="p-3">Xe</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {upcoming.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-gray-400">Chưa có khung giờ nào</td></tr>
              ) : upcoming.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3">{formatDate(s.start_time)}</td>
                  <td className="p-3">
                    {s.booking_id
                      ? <span className="badge bg-blue-100 text-blue-700">Đã đặt · {s.booking_status}</span>
                      : s.is_holiday
                        ? <span className="badge bg-gray-100 text-gray-600">Ngày nghỉ</span>
                        : s.is_available
                          ? <span className="badge bg-green-100 text-green-700">Còn trống</span>
                          : <span className="badge bg-gray-100 text-gray-500">Không nhận</span>}
                  </td>
                  <td className="p-3">
                    {s.booking_id
                      ? (s.lead_id
                          ? <Link to={`/leads/${s.lead_id}`} className="text-brand-700 hover:underline">{s.customer_name}<span className="block text-xs text-gray-400">{s.customer_phone} · {s.booking_code}</span></Link>
                          : <span>{s.customer_name}<span className="block text-xs text-gray-400">{s.customer_phone} · {s.booking_code}</span></span>)
                      : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="p-3 text-gray-600">
                    {s.booking_id
                      ? (s.booked_car_brand ? `${s.booked_car_brand} ${s.booked_car_name}` : '-')
                      : (s.slot_car_brand ? `${s.slot_car_brand} ${s.slot_car_name}` : <span className="text-gray-400">(mọi xe)</span>)}
                  </td>
                  <td className="p-3 text-right">
                    {s.booking_id
                      ? <Link to="/test-drives" className="text-xs text-brand-700 hover:underline">Xem lịch lái thử →</Link>
                      : (!s.is_holiday && s.is_available
                          ? <button onClick={() => setBookSlot(s)} className="text-xs font-medium text-brand-700 hover:underline">+ Đặt cho khách</button>
                          : <span className="text-xs text-gray-300">—</span>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showCreate && <CreateSlotModal showroomId={showroomId} onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); load(); }} />}
      {bookSlot && <BookLeadModal slot={bookSlot} onClose={() => setBookSlot(null)} onDone={() => { setBookSlot(null); load(); }} />}
    </div>
  );
}

/**
 * Dropdown tìm & chọn Lead (dùng chung cho Thêm khung giờ / Đặt cho khách).
 * - Gõ để tìm -> danh sách nổi phía dưới; chọn xong danh sách đóng lại và hiện thẻ Lead đã chọn ở trên.
 * - Có nút "Đổi" để chọn lại; hiển thị rõ Lead có/chưa có email (bắt buộc có email để gửi mail xác nhận).
 */
function LeadPicker({ selected, onSelect, onClear, label = 'Đặt cho khách (Lead)' }: {
  selected: any;
  onSelect: (l: any) => void;
  onClear: () => void;
  label?: string;
}) {
  const [q, setQ] = useState('');
  const [leads, setLeads] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      api.get<any[]>(`/cars/leads/search?q=${encodeURIComponent(q)}`).then(setLeads).catch(() => setLeads([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q, open]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function handlePick(l: any) {
    onSelect(l);
    setOpen(false);
    setQ('');
  }

  if (selected) {
    return (
      <div className="mb-3">
        <div className="label">{label}</div>
        <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-3 py-2">
          <div className="text-sm">
            <div className="font-medium text-brand-800">{selected.full_name} <span className="text-gray-500">· {selected.phone}</span></div>
            <div className="text-xs">
              {selected.email
                ? <span className="text-gray-500">{selected.email}</span>
                : <span className="text-amber-600">⚠ Lead chưa có email</span>}
              {selected.car_name && <span className="text-gray-400"> · {selected.car_brand} {selected.car_name}</span>}
            </div>
          </div>
          <button type="button" onClick={onClear} className="text-xs font-medium text-brand-700 hover:underline">Đổi</button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mb-3" ref={boxRef}>
      <div className="label">{label}</div>
      <input
        className="input"
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        placeholder="Nhập tên hoặc SĐT khách để tìm Lead..."
      />
      {open && (
        <div className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-lg border bg-white shadow-lg">
          {leads.length === 0 ? (
            <div className="p-3 text-center text-sm text-gray-400">Không tìm thấy Lead</div>
          ) : leads.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => handlePick(l)}
              className="flex w-full items-center justify-between border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-brand-50"
            >
              <span>
                <span className="font-medium">{l.full_name}</span>
                <span className="block text-xs text-gray-500">
                  {l.phone}
                  {l.email ? ` · ${l.email}` : ' · chưa có email'}
                  {l.car_name ? ` · ${l.car_brand} ${l.car_name}` : ' · chưa có xe'}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BookLeadModal({ slot, onClose, onDone }: any) {
  const [selected, setSelected] = useState<any>(null);
  const [cars, setCars] = useState<any[]>([]);
  const [carId, setCarId] = useState('');
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get<any[]>('/meta/car-models').then(setCars).catch(() => {}); }, []);

  function pick(l: any) {
    setSelected(l);
    setEmail(l.email || '');
    setCarId(slot.slot_car_name ? '' : (l.car_model_id || ''));
  }

  const slotHasCar = !!slot.slot_car_name; // slot cấu hình cho 1 xe cụ thể
  const needCar = !slotHasCar && selected && !selected.car_model_id; // lead chưa có xe & slot mọi xe

  async function save() {
    setErr('');
    if (!selected) return setErr('Vui lòng chọn một Lead');
    if (needCar && !carId) return setErr('Lead này chưa có xe quan tâm — vui lòng chọn xe cho lịch lái thử');
    if (!email.trim()) return setErr('Vui lòng nhập email khách để gửi xác nhận lịch lái thử');
    setSaving(true);
    try {
      await api.post(`/cars/slots/${slot.id}/book-lead`, {
        lead_id: selected.id,
        car_model_id: slotHasCar ? undefined : (carId || undefined),
        customer_email: email,
      });
      onDone();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Đặt lịch lái thử cho khách">
      <div className="mb-2 rounded bg-brand-50 p-2 text-xs text-brand-700">
        Khung giờ: <b>{formatDate(slot.start_time)}</b>
        {slotHasCar ? <> · Xe: <b>{slot.slot_car_brand} {slot.slot_car_name}</b></> : ' · Áp dụng mọi xe'}
      </div>

      <LeadPicker selected={selected} onSelect={pick} onClear={() => setSelected(null)} label="Tìm Lead (theo tên hoặc số điện thoại)" />

      {selected && (
        <>
          {needCar && (
            <Field label="Xe lái thử * (Lead chưa có xe quan tâm)">
              <select className="input" value={carId} onChange={(e) => setCarId(e.target.value)}>
                <option value="">-- Chọn xe --</option>
                {cars.map((c) => <option key={c.id} value={c.id}>{c.brand} {c.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Email khách nhận xác nhận *">
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="khach@email.com" />
          </Field>
        </>
      )}

      {err && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{err}</div>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-secondary">Hủy</button>
        <button onClick={save} disabled={saving || !selected} className="btn-primary">{saving ? 'Đang đặt...' : 'Đặt lịch'}</button>
      </div>
    </Modal>
  );
}

function CreateSlotModal({ showroomId, onClose, onDone }: any) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [carId, setCarId] = useState('');
  const [cars, setCars] = useState<any[]>([]);
  const [carsErr, setCarsErr] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  // Chọn Lead ngay lúc tạo khung giờ: nếu chọn -> tạo xong sẽ đặt lịch cho khách đó luôn.
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [leadEmail, setLeadEmail] = useState('');

  useEffect(() => {
    api.get<any[]>('/meta/car-models')
      .then((list) => { setCars(list || []); if (!list || list.length === 0) setCarsErr('Chưa có xe nào trong danh mục. Vào mục "Tra cứu xe" để thêm xe trước, hoặc để "Mọi xe".'); })
      .catch((e) => setCarsErr(e?.message || 'Không tải được danh mục xe'));
  }, []);

  function pickLead(l: any) {
    setSelectedLead(l);
    setLeadEmail(l.email || '');
    if (!carId && l.car_model_id) setCarId(l.car_model_id);
  }

  const needCarForLead = selectedLead && !carId; // đã chọn khách nhưng chưa xác định xe

  async function save() {
    setErr('');
    if (!start || !end) return setErr('Vui lòng chọn thời gian bắt đầu và kết thúc');
    if (needCarForLead) return setErr('Khách chưa có xe quan tâm — vui lòng chọn xe cho khung giờ này');
    if (selectedLead && !leadEmail.trim()) return setErr('Vui lòng nhập email khách để gửi xác nhận lịch lái thử');
    setSaving(true);
    try {
      const res = await api.post<{ id: string }>('/cars/slots', {
        showroom_id: showroomId,
        car_model_id: carId || null,
        start_time: new Date(start).toISOString(),
        end_time: new Date(end).toISOString(),
      });
      // Nếu có chọn khách -> đặt lịch lái thử cho khách đó vào khung giờ vừa tạo.
      if (selectedLead) {
        await api.post(`/cars/slots/${res.id}/book-lead`, {
          lead_id: selectedLead.id,
          car_model_id: carId || undefined,
          customer_email: leadEmail,
        });
      }
      onDone();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal open onClose={onClose} title="Thêm khung giờ">
      <Field label="Xe áp dụng cho khung giờ">
        <select className="input" value={carId} onChange={(e) => setCarId(e.target.value)}>
          <option value="">-- Mọi xe (không giới hạn) --</option>
          {cars.map((c) => <option key={c.id} value={c.id}>{c.brand} {c.name}</option>)}
        </select>
        {carsErr && <div className="mt-1 text-xs text-amber-600">{carsErr}</div>}
      </Field>
      <Field label="Bắt đầu"><input type="datetime-local" className="input" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
      <Field label="Kết thúc"><input type="datetime-local" className="input" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>

      <LeadPicker
        selected={selectedLead}
        onSelect={pickLead}
        onClear={() => setSelectedLead(null)}
        label="Đặt sẵn cho khách (Lead) — không bắt buộc"
      />

      {selectedLead && (
        <>
          {needCarForLead && <div className="mb-2 text-xs text-amber-600">Khách chưa có xe quan tâm, vui lòng chọn xe ở ô "Xe áp dụng cho khung giờ" phía trên.</div>}
          <Field label="Email khách nhận xác nhận *">
            <input type="email" className="input" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} placeholder="khach@email.com" />
          </Field>
        </>
      )}

      {err && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{err}</div>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-secondary">Hủy</button>
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Đang lưu...' : 'Thêm'}</button>
      </div>
    </Modal>
  );
}
