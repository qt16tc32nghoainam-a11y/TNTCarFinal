import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Modal, Spinner, Field } from '../components/ui';
import { formatDate } from '../lib/format';

export default function Slots() {
  const [showrooms, setShowrooms] = useState<any[]>([]);
  const [showroomId, setShowroomId] = useState('');
  const [slots, setSlots] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
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
              </tr>
            </thead>
            <tbody>
              {upcoming.length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-gray-400">Chưa có khung giờ nào</td></tr>
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
                      ? <span>{s.customer_name}<span className="block text-xs text-gray-400">{s.customer_phone} · {s.booking_code}</span></span>
                      : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="p-3 text-gray-600">
                    {s.booking_id
                      ? (s.booked_car_brand ? `${s.booked_car_brand} ${s.booked_car_name}` : '-')
                      : (s.slot_car_brand ? `${s.slot_car_brand} ${s.slot_car_name}` : <span className="text-gray-400">(mọi xe)</span>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showCreate && <CreateSlotModal showroomId={showroomId} onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

function CreateSlotModal({ showroomId, onClose, onDone }: any) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [carId, setCarId] = useState('');
  const [cars, setCars] = useState<any[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => { api.get<any[]>('/meta/car-models').then(setCars).catch(() => {}); }, []);

  async function save() {
    setErr('');
    if (!start || !end) return setErr('Vui lòng chọn thời gian bắt đầu và kết thúc');
    try {
      await api.post('/cars/slots', {
        showroom_id: showroomId,
        car_model_id: carId || null,
        start_time: new Date(start).toISOString(),
        end_time: new Date(end).toISOString(),
      });
      onDone();
    } catch (e: any) { setErr(e.message); }
  }
  return (
    <Modal open onClose={onClose} title="Thêm khung giờ">
      <Field label="Xe áp dụng cho khung giờ">
        <select className="input" value={carId} onChange={(e) => setCarId(e.target.value)}>
          <option value="">-- Mọi xe (không giới hạn) --</option>
          {cars.map((c) => <option key={c.id} value={c.id}>{c.brand} {c.name}</option>)}
        </select>
      </Field>
      <Field label="Bắt đầu"><input type="datetime-local" className="input" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
      <Field label="Kết thúc"><input type="datetime-local" className="input" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
      {err && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{err}</div>}
      <div className="flex justify-end gap-2"><button onClick={onClose} className="btn-secondary">Hủy</button><button onClick={save} className="btn-primary">Thêm</button></div>
    </Modal>
  );
}
