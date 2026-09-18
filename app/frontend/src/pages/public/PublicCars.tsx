import React, { useEffect, useState } from 'react';
import { publicApi } from '../../lib/api';
import { formatVnd } from '../../lib/format';
import CarCard from './CarCard';

export default function PublicCars() {
  const [cars, setCars] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [brand, setBrand] = useState('');
  const [compare, setCompare] = useState<any[]>([]);

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (brand) params.set('brand', brand);
    setCars(await publicApi.get<any[]>('/public/cars?' + params));
  }
  useEffect(() => { load(); }, [brand]);
  const brands = Array.from(new Set(cars.map((c) => c.brand)));

  function toggle(c: any) {
    if (compare.find((x) => x.id === c.id)) setCompare(compare.filter((x) => x.id !== c.id));
    else if (compare.length < 3) setCompare([...compare, c]);
    else alert('Chỉ so sánh tối đa 3 xe');
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Danh mục xe</h1>
      <p className="mb-5 text-sm text-gray-500">Khám phá các dòng xe đang có tại TNT CAR</p>
      <div className="mb-6 flex flex-wrap gap-2">
        <input className="input flex-1 min-w-[180px]" placeholder="Tìm theo tên xe..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
        <select className="input w-auto" value={brand} onChange={(e) => setBrand(e.target.value)}><option value="">Tất cả hãng</option>{brands.map((b) => <option key={b}>{b}</option>)}</select>
        <button onClick={load} className="btn-secondary">Tìm</button>
      </div>

      {cars.length === 0 ? <div className="p-8 text-center text-gray-400">Không tìm thấy xe phù hợp</div> : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cars.map((c) => (
            <CarCard key={c.id} car={c} onCompare={toggle} comparing={!!compare.find((x) => x.id === c.id)} />
          ))}
        </div>
      )}

      {compare.length >= 2 && <CompareBar cars={compare} onClear={() => setCompare([])} />}
    </div>
  );
}

function CompareBar({ cars, onClear }: any) {
  const [open, setOpen] = useState(false);
  const [rates, setRates] = useState<any[]>([]);
  useEffect(() => { publicApi.get<any[]>('/public/loan-rates').then(setRates); }, []);
  const estimate = (price: number) => {
    const rate = (rates[0]?.promo_rate || 8) / 100 / 12;
    const P = price * 0.8; const n = 60;
    const m = P * rate * Math.pow(1 + rate, n) / (Math.pow(1 + rate, n) - 1);
    return Math.round(m);
  };
  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-brand-800 px-6 py-2 text-white shadow-lg">
        <button onClick={() => setOpen(true)}>So sánh {cars.length} xe →</button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex justify-between"><h3 className="text-lg font-semibold">So sánh xe</h3><button onClick={() => { setOpen(false); onClear(); }}>✕</button></div>
            <table className="w-full text-sm">
              <thead><tr><th></th>{cars.map((c: any) => <th key={c.id} className="p-2 text-left">{c.brand} {c.name}</th>)}</tr></thead>
              <tbody>
                <tr className="border-t"><td className="p-2 font-medium text-gray-500">Giá</td>{cars.map((c: any) => <td key={c.id} className="p-2">{formatVnd(c.price)}</td>)}</tr>
                <tr className="border-t"><td className="p-2 font-medium text-gray-500">Nhiên liệu</td>{cars.map((c: any) => <td key={c.id} className="p-2">{c.fuel_type}</td>)}</tr>
                <tr className="border-t"><td className="p-2 font-medium text-gray-500">Trả góp/tháng*</td>{cars.map((c: any) => <td key={c.id} className="p-2">{formatVnd(estimate(c.price))}</td>)}</tr>
              </tbody>
            </table>
            <div className="mt-2 text-xs text-gray-400">* Ước tính trả trước 20%, vay 60 tháng, lãi suất tham khảo {rates[0]?.promo_rate}%/năm. Chỉ mang tính tham khảo.</div>
          </div>
        </div>
      )}
    </>
  );
}
