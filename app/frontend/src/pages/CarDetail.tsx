import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Car } from '../lib/types';
import { Modal, Spinner, Field } from '../components/ui';
import { formatVnd, formatDate } from '../lib/format';

export default function CarDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [car, setCar] = useState<Car | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBook, setShowBook] = useState(false);
  useEffect(() => { api.get<Car>(`/cars/${id}`).then(setCar).finally(() => setLoading(false)); }, [id]);

  if (loading || !car) return <Spinner />;
  const inStock = (car.inventory || []).some((i) => i.quantity > 0);

  return (
    <div className="mx-auto max-w-2xl">
      <button onClick={() => nav('/cars')} className="mb-3 text-sm text-brand-700">← Danh sách xe</button>
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{car.brand} {car.name}</h1>
            <div className="text-gray-500">{car.segment} · {car.fuel_type} · {car.transmission} · {car.year}</div>
          </div>
          <span className={`badge ${car.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{car.status}</span>
        </div>
        <div className="mt-3 text-2xl font-bold text-brand-700">{formatVnd(car.price)}</div>
        {car.promotion && <div className="text-sm text-red-600">Khuyến mãi: {car.promotion}</div>}

        <h2 className="mt-5 mb-2 font-semibold">Tồn kho theo showroom</h2>
        <table className="w-full text-sm">
          <tbody>
            {(car.inventory || []).map((i) => (
              <tr key={i.showroom_id} className="border-t">
                <td className="py-2">{i.showroom_name}</td>
                <td className="py-2 text-gray-500">{i.address}</td>
                <td className="py-2 text-right font-medium">{i.quantity > 0 ? `${i.quantity} xe` : 'Hết'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-5">
          {inStock ? (
            <button onClick={() => setShowBook(true)} className="btn-primary">Đặt lịch lái thử</button>
          ) : (
            <button disabled className="btn-secondary opacity-60">Hết hàng - Đăng ký nhận thông báo</button>
          )}
        </div>
      </div>
      {showBook && <BookModal car={car} onClose={() => setShowBook(false)} onDone={() => { setShowBook(false); alert('Đã đặt lịch lái thử'); }} />}
    </div>
  );
}

function BookModal({ car, onClose, onDone }: any) {
  const [showrooms, setShowrooms] = useState<any[]>([]);
  const [showroomId, setShowroomId] = useState('');
  const [slots, setSlots] = useState<any[]>([]);
  const [slotId, setSlotId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => { api.get<any[]>('/meta/showrooms').then(setShowrooms); }, []);
  useEffect(() => {
    if (showroomId) api.get<any[]>(`/cars/slots/available/${showroomId}`).then(setSlots);
  }, [showroomId]);

  async function save() {
    setErr('');
    try {
      await api.post('/cars/test-drives', { car_model_id: car.id, showroom_id: showroomId, slot_id: slotId, customer_name: name, customer_phone: phone });
      onDone();
    } catch (e: any) { setErr(e.message); }
  }
  return (
    <Modal open onClose={onClose} title="Đặt lịch lái thử">
      <Field label="Showroom"><select className="input" value={showroomId} onChange={(e) => setShowroomId(e.target.value)}><option value="">-- Chọn --</option>{showrooms.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
      <Field label="Khung giờ">
        <select className="input" value={slotId} onChange={(e) => setSlotId(e.target.value)}>
          <option value="">-- Chọn khung giờ --</option>
          {slots.map((s) => <option key={s.id} value={s.id}>{formatDate(s.start_time)}</option>)}
        </select>
        {showroomId && slots.length === 0 && <div className="mt-1 text-xs text-amber-600">Không còn khung giờ trống, thử showroom hoặc ngày khác.</div>}
      </Field>
      <Field label="Họ tên khách *"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Số điện thoại *"><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
      {err && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{err}</div>}
      <div className="flex justify-end gap-2"><button onClick={onClose} className="btn-secondary">Hủy</button><button onClick={save} className="btn-primary">Đặt lịch</button></div>
    </Modal>
  );
}
