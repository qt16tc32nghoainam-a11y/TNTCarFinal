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
  // Lọc giá bằng thanh kéo 2 đầu, thực hiện phía client (khoảng giá lấy động theo dữ liệu xe hiện có).
  const [priceBounds, setPriceBounds] = useState<[number, number]>([0, 0]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
  const [priceTouched, setPriceTouched] = useState(false);
  const [compare, setCompare] = useState<Car[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [editCar, setEditCar] = useState<any>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (brand) params.set('brand', brand);
    if (isAdmin) params.set('all', '1'); // Admin xem cả xe hết hàng để quản lý
    try {
      const data = await api.get<Car[]>('/cars?' + params);
      setCars(data);
      if (data.length) {
        const prices = data.map((c) => c.price);
        const lo = Math.min(...prices);
        const hi = Math.max(...prices);
        setPriceBounds([lo, hi]);
        if (!priceTouched) setPriceRange([lo, hi]); // chỉ tự set mặc định nếu người dùng chưa tự kéo
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [brand]);

  const brands = Array.from(new Set(cars.map((c) => c.brand)));
  const visibleCars = cars.filter((c) => c.price >= priceRange[0] && c.price <= priceRange[1]);

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
      <div className="card mb-4">
        <div className="flex flex-wrap items-end gap-2">
          <input className="input flex-1 min-w-[180px]" placeholder="Tìm xe..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
          <select className="input w-auto" value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="">Tất cả hãng</option>{brands.map((b) => <option key={b}>{b}</option>)}
          </select>
          <button onClick={load} className="btn-secondary">Tìm</button>
          {(q || brand || priceTouched) && (
            <button onClick={() => { setQ(''); setBrand(''); setPriceTouched(false); setTimeout(load, 0); }} className="text-xs text-gray-500 hover:underline">Xóa lọc</button>
          )}
        </div>

        {priceBounds[1] > 0 && (
          <div className="mt-3">
            <PriceRangeSlider
              min={priceBounds[0]}
              max={priceBounds[1]}
              value={priceRange}
              onChange={(v) => { setPriceTouched(true); setPriceRange(v); }}
            />
          </div>
        )}
      </div>

      {loading ? <Spinner /> : visibleCars.length === 0 ? <Empty text="Không tìm thấy xe phù hợp" /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCars.map((c) => (
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

/**
 * Thanh kéo chọn khoảng giá (2 đầu min/max). Dùng 2 input[type=range] chồng lên cùng 1 track,
 * mỗi input chỉ điều khiển nửa thanh của nó để tránh việc kéo tay này vượt qua tay kia.
 */
function PriceRangeSlider({ min, max, value, onChange }: {
  min: number; max: number; value: [number, number]; onChange: (v: [number, number]) => void;
}) {
  const [lo, hi] = value;
  const span = Math.max(1, max - min);
  const loPct = ((lo - min) / span) * 100;
  const hiPct = ((hi - min) / span) * 100;

  function setLo(v: number) { onChange([Math.min(v, hi), hi]); }
  function setHi(v: number) { onChange([lo, Math.max(v, lo)]); }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
        <span>Khoảng giá: <b className="text-brand-700">{formatVnd(lo)}</b> — <b className="text-brand-700">{formatVnd(hi)}</b></span>
      </div>
      <div className="relative h-6">
        {/* Track nền */}
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-gray-200" />
        {/* Track đoạn đã chọn */}
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-600"
          style={{ left: `${loPct}%`, width: `${Math.max(0, hiPct - loPct)}%` }}
        />
        <input
          type="range" min={min} max={max} step={1_000_000} value={lo}
          onChange={(e) => setLo(Number(e.target.value))}
          className="range-thumb pointer-events-none absolute top-1/2 h-1.5 w-full -translate-y-1/2 appearance-none bg-transparent"
          style={{ zIndex: lo > min + span * 0.85 ? 5 : 3 }}
        />
        <input
          type="range" min={min} max={max} step={1_000_000} value={hi}
          onChange={(e) => setHi(Number(e.target.value))}
          className="range-thumb pointer-events-none absolute top-1/2 h-1.5 w-full -translate-y-1/2 appearance-none bg-transparent"
          style={{ zIndex: 4 }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-gray-400">
        <span>{formatVnd(min)}</span>
        <span>{formatVnd(max)}</span>
      </div>
    </div>
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
