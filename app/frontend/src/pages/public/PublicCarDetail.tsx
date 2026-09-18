import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicApi } from '../../lib/api';
import { formatVnd } from '../../lib/format';
import QuickLeadForm from './QuickLeadForm';

export default function PublicCarDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [car, setCar] = useState<any>(null);
  const [cars, setCars] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [down, setDown] = useState(20);
  const [term, setTerm] = useState(60);
  const [bank, setBank] = useState(0);

  useEffect(() => {
    publicApi.get<any>(`/public/cars/${id}`).then(setCar).catch(() => {});
    publicApi.get<any[]>('/public/loan-rates').then(setRates);
    publicApi.get<any[]>('/public/cars').then(setCars).catch(() => {});
  }, [id]);

  if (!car) return <div className="p-16 text-center text-gray-400">Đang tải...</div>;

  const rate = (rates[bank]?.promo_rate || 8) / 100 / 12;
  const P = car.price * (1 - down / 100);
  const monthly = rate > 0 ? P * rate * Math.pow(1 + rate, term) / (Math.pow(1 + rate, term) - 1) : P / term;

  const specs = [
    ['Hãng', car.brand],
    ['Phân khúc', car.segment],
    ['Nhiên liệu', car.fuel_type],
    ['Hộp số', car.transmission],
    ['Năm', car.year],
    ['Màu', car.color],
  ].filter(([, v]) => v);

  return (
    <div>
      {/* Hero xe */}
      <section className="bg-gray-900 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-8 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl bg-gray-800">
            {car.image_url ? (
              <img src={car.image_url} alt={`${car.brand} ${car.name}`} className="aspect-[16/10] w-full object-cover" />
            ) : (
              <div className="flex aspect-[16/10] items-center justify-center text-7xl text-gray-600">🚗</div>
            )}
          </div>
          <div>
            <button onClick={() => nav('/site/cars')} className="mb-3 text-sm text-brand-300">← Danh mục xe</button>
            <h1 className="text-3xl font-extrabold">{car.brand} {car.name}</h1>
            <div className="mt-1 text-gray-300">{[car.segment, car.fuel_type, car.transmission, car.year].filter(Boolean).join(' · ')}</div>
            <div className="mt-4 text-4xl font-bold text-brand-300">{formatVnd(car.price)}</div>
            {car.promotion && <div className="mt-2 inline-block rounded bg-red-600 px-3 py-1 text-sm">Ưu đãi: {car.promotion}</div>}
            <div className="mt-6 flex gap-3">
              <a href="#dangky" className="rounded-lg bg-brand-600 px-6 py-3 font-semibold hover:bg-brand-700">Nhận báo giá</a>
              <a href="#dangky" className="rounded-lg border border-white/40 px-6 py-3 font-semibold hover:bg-white/10">Đăng ký lái thử</a>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        {/* Thông số + trả góp */}
        <div className="space-y-6 md:col-span-2">
          <div>
            <h2 className="mb-3 text-xl font-bold">Thông số nổi bật</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {specs.map(([k, v]) => (
                <div key={k as string} className="rounded-lg border bg-white p-3">
                  <div className="text-xs text-gray-500">{k}</div>
                  <div className="font-semibold text-gray-900">{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <h2 className="mb-3 text-xl font-bold">Ước tính trả góp</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="label">Ngân hàng</label>
                <select className="input" value={bank} onChange={(e) => setBank(Number(e.target.value))}>
                  {rates.map((r, i) => <option key={r.bank_name} value={i}>{r.bank_name} ({r.promo_rate}%/năm)</option>)}
                </select>
              </div>
              <div>
                <label className="label">Trả trước: {down}%</label>
                <input type="range" min={10} max={70} value={down} onChange={(e) => setDown(Number(e.target.value))} className="w-full" />
              </div>
              <div>
                <label className="label">Kỳ hạn</label>
                <select className="input" value={term} onChange={(e) => setTerm(Number(e.target.value))}>
                  {[12, 24, 36, 48, 60, 72, 84].map((t) => <option key={t} value={t}>{t} tháng</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-brand-50 p-4">
              <div className="text-sm text-gray-600">Số tiền vay: {formatVnd(Math.round(P))}</div>
              <div className="text-2xl font-bold text-brand-700">≈ {formatVnd(Math.round(monthly))}/tháng</div>
            </div>
            <div className="mt-2 text-xs text-gray-400">Số liệu chỉ mang tính tham khảo, không phải cam kết của ngân hàng.</div>
          </div>

          {/* Ưu đãi */}
          <div className="rounded-xl border bg-white p-5">
            <h2 className="mb-3 text-xl font-bold">Ưu đãi khi mua xe tại TNT CAR</h2>
            <ul className="grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
              <li>✔ Hỗ trợ vay đến 80% giá trị xe, lãi suất ưu đãi</li>
              <li>✔ Tư vấn, lái thử tận nơi miễn phí</li>
              <li>✔ Cứu hộ 24/7 miễn phí trong 03 năm</li>
              <li>✔ Thu xe cũ đổi xe mới giá cao</li>
            </ul>
          </div>
        </div>

        {/* Form đăng ký (sticky) */}
        <div id="dangky" className="md:sticky md:top-24 md:self-start">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <QuickLeadForm cars={cars} defaultCarId={car.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
