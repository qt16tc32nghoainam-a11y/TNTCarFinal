import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { publicApi } from '../../lib/api';
import { formatVnd } from '../../lib/format';

export default function PublicCarDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [car, setCar] = useState<any>(null);
  const [rates, setRates] = useState<any[]>([]);
  const [down, setDown] = useState(20);
  const [term, setTerm] = useState(60);
  const [bank, setBank] = useState(0);

  useEffect(() => {
    publicApi.get<any>(`/public/cars/${id}`).then(setCar).catch(() => {});
    publicApi.get<any[]>('/public/loan-rates').then(setRates);
  }, [id]);

  if (!car) return <div className="p-8 text-center text-gray-400">Đang tải...</div>;

  const rate = (rates[bank]?.promo_rate || 8) / 100 / 12;
  const P = car.price * (1 - down / 100);
  const monthly = rate > 0 ? P * rate * Math.pow(1 + rate, term) / (Math.pow(1 + rate, term) - 1) : P / term;

  return (
    <div>
      <button onClick={() => nav('/site/cars')} className="mb-3 text-sm text-brand-700">← Danh mục xe</button>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card">
          <h1 className="text-2xl font-bold">{car.brand} {car.name}</h1>
          <div className="text-gray-500">{car.segment} · {car.fuel_type} · {car.transmission} · {car.year}</div>
          <div className="mt-3 text-3xl font-bold text-brand-700">{formatVnd(car.price)}</div>
          {car.promotion && <div className="mt-1 text-sm text-red-600">Khuyến mãi: {car.promotion}</div>}
          <Link to="/site/request" className="btn-primary mt-4 inline-block">Đăng ký lái thử / tư vấn</Link>
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">Ước tính trả góp</h2>
          <div className="mb-2 text-sm">
            <label className="label">Ngân hàng</label>
            <select className="input" value={bank} onChange={(e) => setBank(Number(e.target.value))}>
              {rates.map((r, i) => <option key={r.bank_name} value={i}>{r.bank_name} ({r.promo_rate}%/năm)</option>)}
            </select>
          </div>
          <div className="mb-2 text-sm">
            <label className="label">Trả trước: {down}%</label>
            <input type="range" min={10} max={70} value={down} onChange={(e) => setDown(Number(e.target.value))} className="w-full" />
          </div>
          <div className="mb-2 text-sm">
            <label className="label">Kỳ hạn (tháng)</label>
            <select className="input" value={term} onChange={(e) => setTerm(Number(e.target.value))}>
              {[12, 24, 36, 48, 60, 72, 84].map((t) => <option key={t} value={t}>{t} tháng</option>)}
            </select>
          </div>
          <div className="mt-3 rounded-lg bg-brand-50 p-3">
            <div className="text-sm text-gray-600">Số tiền vay: {formatVnd(Math.round(P))}</div>
            <div className="text-xl font-bold text-brand-700">≈ {formatVnd(Math.round(monthly))}/tháng</div>
          </div>
          <div className="mt-2 text-xs text-gray-400">Số liệu chỉ mang tính tham khảo, không phải cam kết của ngân hàng.</div>
        </div>
      </div>
    </div>
  );
}
