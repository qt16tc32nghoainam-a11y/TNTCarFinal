import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Car } from '../lib/types';
import { Spinner, Empty } from '../components/ui';
import { formatVnd } from '../lib/format';

export default function Cars() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [brand, setBrand] = useState('');
  const [compare, setCompare] = useState<Car[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (brand) params.set('brand', brand);
    try { setCars(await api.get<Car[]>('/cars?' + params)); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [brand]);

  const brands = Array.from(new Set(cars.map((c) => c.brand)));

  function toggleCompare(car: Car) {
    if (compare.find((c) => c.id === car.id)) setCompare(compare.filter((c) => c.id !== car.id));
    else if (compare.length < 3) setCompare([...compare, car]);
    else alert('Chỉ so sánh tối đa 3 xe');
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Tra cứu kho xe</h1>
        {compare.length > 0 && <button onClick={() => setShowCompare(true)} className="btn-primary">So sánh ({compare.length})</button>}
      </div>
      <div className="card mb-4 flex flex-wrap gap-2">
        <input className="input flex-1 min-w-[180px]" placeholder="Tìm xe..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
        <select className="input w-auto" value={brand} onChange={(e) => setBrand(e.target.value)}>
          <option value="">Tất cả hãng</option>{brands.map((b) => <option key={b}>{b}</option>)}
        </select>
        <button onClick={load} className="btn-secondary">Tìm</button>
      </div>

      {loading ? <Spinner /> : cars.length === 0 ? <Empty text="Không tìm thấy xe phù hợp" /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cars.map((c) => (
            <div key={c.id} className="card">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <div className="font-semibold">{c.brand} {c.name}</div>
                  <div className="text-xs text-gray-500">{c.segment} · {c.fuel_type}</div>
                </div>
                <span className={`badge ${c.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{c.status}</span>
              </div>
              <div className="text-lg font-bold text-brand-700">{formatVnd(c.price)}</div>
              {c.promotion && <div className="text-xs text-red-600">{c.promotion}</div>}
              <div className="mt-3 flex gap-2">
                <Link to={`/cars/${c.id}`} className="btn-secondary flex-1 text-xs">Chi tiết</Link>
                <button onClick={() => toggleCompare(c)} className={`btn text-xs ${compare.find((x) => x.id === c.id) ? 'bg-brand-700 text-white' : 'bg-gray-100'}`}>So sánh</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCompare && <CompareModal cars={compare} onClose={() => setShowCompare(false)} />}
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
