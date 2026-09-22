import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Car } from '../lib/types';
import { Modal, Spinner, Empty, Field } from '../components/ui';
import { formatVnd } from '../lib/format';
import { fileToCompressedDataUrl } from '../lib/image';

export default function Cars() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [brand, setBrand] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [compare, setCompare] = useState<Car[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [editCar, setEditCar] = useState<any>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (brand) params.set('brand', brand);
    if (minPrice) params.set('minPrice', String(Number(minPrice) * 1_000_000));
    if (maxPrice) params.set('maxPrice', String(Number(maxPrice) * 1_000_000));
    if (isAdmin) params.set('all', '1'); // Admin xem cả xe hết hàng để quản lý
    try { setCars(await api.get<Car[]>('/cars?' + params)); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [brand]);

  const brands = Array.from(new Set(cars.map((c) => c.brand)));

  function toggleCompare(car: Car) {
    if (compare.find((c) => c.id === car.id)) setCompare(compare.filter((c) => c.id !== car.id));
    else if (compare.length < 3) setCompare([...compare, car]);
    else alert('Chỉ so sánh tối đa 3 xe');
  }

  async function backfillImages() {
    if (!confirm('Bơm bộ ảnh mẫu (7 ảnh) cho các xe chưa có ảnh? Xe đã có ảnh sẽ được giữ nguyên.')) return;
    try {
      const r = await api.post<any>('/cars/images/backfill');
      alert(r.message || 'Đã bơm ảnh xong');
      load();
    } catch (e: any) {
      alert(e.message || 'Bơm ảnh thất bại');
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Tra cứu kho xe</h1>
        <div className="flex gap-2">
          {isAdmin && (
            <button onClick={backfillImages} className="btn-secondary text-xs" title="Bơm bộ ảnh mẫu cho các xe chưa có ảnh">🖼️ Bơm ảnh mẫu</button>
          )}
          {compare.length > 0 && <button onClick={() => setShowCompare(true)} className="btn-primary">So sánh ({compare.length})</button>}
        </div>
      </div>
      <div className="card mb-4 flex flex-wrap items-end gap-2">
        <input className="input flex-1 min-w-[180px]" placeholder="Tìm xe..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
        <select className="input w-auto" value={brand} onChange={(e) => setBrand(e.target.value)}>
          <option value="">Tất cả hãng</option>{brands.map((b) => <option key={b}>{b}</option>)}
        </select>
        <div>
          <label className="label">Giá từ (triệu)</label>
          <input type="number" min={0} className="input w-32" placeholder="VD: 500" value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
        </div>
        <div>
          <label className="label">Giá đến (triệu)</label>
          <input type="number" min={0} className="input w-32" placeholder="VD: 1000" value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
        </div>
        <button onClick={load} className="btn-secondary">Tìm</button>
        {(q || brand || minPrice || maxPrice) && (
          <button onClick={() => { setQ(''); setBrand(''); setMinPrice(''); setMaxPrice(''); setTimeout(load, 0); }} className="text-xs text-gray-500 hover:underline">Xóa lọc</button>
        )}
      </div>

      {loading ? <Spinner /> : cars.length === 0 ? <Empty text="Không tìm thấy xe phù hợp" /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cars.map((c) => (
            <div key={c.id} className="overflow-hidden rounded-xl border bg-white shadow-sm">
              <div className="relative aspect-[16/10] bg-gray-100">
                {(c as any).image_url ? (
                  <img src={(c as any).image_url} alt={`${c.brand} ${c.name}`} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-5xl text-gray-300">🚗</div>
                )}
                <span className={`absolute right-2 top-2 badge ${c.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{c.status}</span>
                {isAdmin && (
                  <button onClick={() => setEditCar(c)} className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-medium text-amber-900 shadow hover:bg-amber-300">✏️ Sửa</button>
                )}
              </div>
              <div className="p-4">
                <div className="font-semibold">{c.brand} {c.name}</div>
                <div className="text-xs text-gray-500">{c.segment} · {c.fuel_type}</div>
                <div className="mt-2 text-lg font-bold text-brand-700">{formatVnd(c.price)}</div>
                {c.promotion && <div className="text-xs text-red-600">{c.promotion}</div>}
                <div className="mt-3 flex gap-2">
                  <Link to={`/cars/${c.id}`} className="btn-secondary flex-1 text-xs">Chi tiết</Link>
                  <button onClick={() => toggleCompare(c)} className={`btn text-xs ${compare.find((x) => x.id === c.id) ? 'bg-brand-700 text-white' : 'bg-gray-100'}`}>So sánh</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCompare && <CompareModal cars={compare} onClose={() => setShowCompare(false)} />}
      {editCar && <EditCarModal car={editCar} onClose={() => setEditCar(null)} onSaved={() => { setEditCar(null); load(); }} />}
    </div>
  );
}

function EditCarModal({ car, onClose, onSaved }: { car: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>({
    name: car.name || '', brand: car.brand || '', price: car.price || 0,
    fuel_type: car.fuel_type || '', segment: car.segment || '', year: car.year || 2025,
    transmission: car.transmission || '', color: car.color || '',
    promotion: car.promotion || '', status: car.status || 'Available',
    image_url: car.image_url || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr('');
    setUploading(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file, 1000, 0.8);
      setForm((f: any) => ({ ...f, image_url: dataUrl }));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setErr('');
    setSaving(true);
    try {
      await api.patch(`/cars/${car.id}`, { ...form, price: Number(form.price), year: Number(form.year) });
      onSaved();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Sửa xe: ${car.brand} ${car.name}`}>
      <div className="mb-3">
        <label className="label">Ảnh xe</label>
        <div className="mb-2 aspect-[16/10] overflow-hidden rounded-lg bg-gray-100">
          {form.image_url ? <img src={form.image_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-5xl text-gray-300">🚗</div>}
        </div>
        <input type="file" accept="image/*" onChange={onPickImage} className="text-sm" />
        {uploading && <div className="text-xs text-gray-500">Đang xử lý ảnh...</div>}
        {form.image_url && <button type="button" onClick={() => setForm({ ...form, image_url: '' })} className="ml-2 text-xs text-red-600">Xóa ảnh</button>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Tên xe"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Hãng"><input className="input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></Field>
        <Field label="Giá (đ)"><input className="input" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
        <Field label="Năm"><input className="input" type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></Field>
        <Field label="Nhiên liệu"><input className="input" value={form.fuel_type} onChange={(e) => setForm({ ...form, fuel_type: e.target.value })} /></Field>
        <Field label="Phân khúc"><input className="input" value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value })} /></Field>
        <Field label="Hộp số"><input className="input" value={form.transmission} onChange={(e) => setForm({ ...form, transmission: e.target.value })} /></Field>
        <Field label="Màu"><input className="input" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></Field>
      </div>
      <Field label="Khuyến mãi"><input className="input" value={form.promotion} onChange={(e) => setForm({ ...form, promotion: e.target.value })} /></Field>
      <Field label="Trạng thái">
        <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="Available">Còn hàng</option>
          <option value="In-transit">Sắp về</option>
          <option value="OutOfStock">Hết hàng</option>
        </select>
      </Field>
      {err && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{err}</div>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-secondary">Hủy</button>
        <button onClick={save} disabled={saving || uploading} className="btn-primary">{saving ? 'Đang lưu...' : 'Lưu'}</button>
      </div>
    </Modal>
  );
}

function CompareModal({ cars, onClose }: { cars: Car[]; onClose: () => void }) {
  const fields: [string, (c: Car) => any][] = [
    ['Giá', (c) => formatVnd(c.price)], ['Hãng', (c) => c.brand], ['Phân khúc', (c) => c.segment],
    ['Nhiên liệu', (c) => c.fuel_type], ['Hộp số', (c) => c.transmission], ['Năm', (c) => c.year],
    ['Màu', (c) => c.color], ['Khuyến mãi', (c) => c.promotion || '-'],
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex justify-between"><h3 className="text-lg font-semibold">So sánh xe</h3><button onClick={onClose}>✕</button></div>
        <table className="w-full text-sm">
          <thead><tr><th className="p-2 text-left"></th>{cars.map((c) => <th key={c.id} className="p-2 text-left">{c.brand} {c.name}</th>)}</tr></thead>
          <tbody>{fields.map(([label, fn]) => (
            <tr key={label} className="border-t"><td className="p-2 font-medium text-gray-500">{label}</td>{cars.map((c) => <td key={c.id} className="p-2">{fn(c)}</td>)}</tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
