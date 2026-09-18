import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Car } from '../lib/types';
import { Modal, Spinner, Field } from '../components/ui';
import { formatVnd, formatDate } from '../lib/format';
import CarGallery from '../components/CarGallery';
import { fileToCompressedDataUrl } from '../lib/image';

export default function CarDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [car, setCar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showBook, setShowBook] = useState(false);
  const [manageImg, setManageImg] = useState(false);

  function load() {
    api.get<any>(`/cars/${id}`).then(setCar).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, [id]);

  if (loading || !car) return <Spinner />;
  const inStock = (car.inventory || []).some((i: any) => i.quantity > 0);

  return (
    <div className="mx-auto max-w-2xl">
      <button onClick={() => nav('/cars')} className="mb-3 text-sm text-brand-700">← Danh sách xe</button>

      {/* Thư viện ảnh xe */}
      <div className="mb-4">
        <CarGallery images={car.images || []} alt={`${car.brand} ${car.name}`} />
        {isAdmin && (
          <div className="mt-2 text-right">
            <button onClick={() => setManageImg(true)} className="rounded-full bg-amber-400 px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-300">🖼️ Quản lý ảnh ({(car.images || []).length})</button>
          </div>
        )}
      </div>

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
            {(car.inventory || []).map((i: any) => (
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
      {manageImg && <ManageImagesModal car={car} onClose={() => setManageImg(false)} onChanged={load} />}
    </div>
  );
}

const CAPTIONS = ['Ngoại thất', 'Ngoại thất phía sau', 'Nội thất - khoang lái', 'Vô lăng & bảng đồng hồ', 'Bánh xe & mâm', 'Khoang máy', 'Cốp xe', 'Khác'];

function ManageImagesModal({ car, onClose, onChanged }: { car: any; onClose: () => void; onChanged: () => void }) {
  const [images, setImages] = useState<any[]>(car.images || []);
  const [caption, setCaption] = useState('Ngoại thất');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function reload() {
    const list = await api.get<any[]>(`/cars/${car.id}/images`);
    setImages(list);
    onChanged();
  }

  async function addByUrl() {
    if (!url) return;
    setBusy(true); setErr('');
    try {
      await api.post(`/cars/${car.id}/images`, { url, caption });
      setUrl('');
      await reload();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setBusy(true); setErr('');
    try {
      const imgs: any[] = [];
      for (const f of files) {
        const dataUrl = await fileToCompressedDataUrl(f, 1000, 0.8);
        imgs.push({ url: dataUrl, caption });
      }
      await api.post(`/cars/${car.id}/images`, { images: imgs });
      await reload();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  async function remove(imgId: string) {
    if (!confirm('Xóa ảnh này?')) return;
    await api.del(`/cars/${car.id}/images/${imgId}`);
    await reload();
  }

  return (
    <Modal open onClose={onClose} title={`Ảnh xe: ${car.brand} ${car.name}`}>
      <div className="mb-3 rounded-lg bg-gray-50 p-3">
        <Field label="Loại ảnh">
          <select className="input" value={caption} onChange={(e) => setCaption(e.target.value)}>
            {CAPTIONS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <div className="mb-2">
          <label className="label">Tải ảnh từ máy (chọn nhiều được)</label>
          <input type="file" accept="image/*" multiple onChange={onPickFiles} className="text-sm" />
        </div>
        <div className="text-center text-xs text-gray-400">hoặc</div>
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="Dán link ảnh (https://...)" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button onClick={addByUrl} disabled={busy} className="btn-primary">Thêm</button>
        </div>
        {busy && <div className="mt-1 text-xs text-gray-500">Đang xử lý...</div>}
        {err && <div className="mt-1 rounded bg-red-50 p-2 text-xs text-red-600">{err}</div>}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {images.map((img) => (
          <div key={img.id} className="relative overflow-hidden rounded-lg border">
            <img src={img.url} alt={img.caption || ''} className="aspect-square w-full object-cover" />
            <div className="truncate px-1 py-0.5 text-[10px] text-gray-500">{img.caption}</div>
            <button onClick={() => remove(img.id)} className="absolute right-1 top-1 rounded-full bg-red-600 px-1.5 text-xs text-white">✕</button>
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs text-gray-400">Gợi ý: mỗi xe nên có tối thiểu 7 ảnh (ngoại thất, nội thất, vô lăng, bánh xe, khoang máy, cốp).</div>
      <div className="mt-3 flex justify-end"><button onClick={onClose} className="btn-secondary">Đóng</button></div>
    </Modal>
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
