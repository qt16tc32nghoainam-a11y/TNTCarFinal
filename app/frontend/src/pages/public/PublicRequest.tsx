import React, { useEffect, useState } from 'react';
import { publicApi } from '../../lib/api';

export default function PublicRequest() {
  const [form, setForm] = useState({ request_type: 'Đăng ký lái thử', full_name: '', phone: '', email: '', car_model_id: '', note: '' });
  const [cars, setCars] = useState<any[]>([]);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { publicApi.get<any[]>('/public/cars').then(setCars).catch(() => {}); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      await publicApi.post('/public/requests', form);
      setDone(true);
    } catch (e: any) { setErr(e.message); }
  }

  if (done) return (
    <div className="mx-auto max-w-md rounded-xl bg-green-50 p-8 text-center">
      <div className="text-2xl">✅</div>
      <h2 className="mt-2 text-lg font-bold text-green-700">Yêu cầu đã được tiếp nhận</h2>
      <p className="mt-1 text-sm text-gray-600">TNT CAR sẽ liên hệ lại với bạn trong thời gian sớm nhất.</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-xl font-bold">Đăng ký lái thử / Tư vấn</h1>
      <form onSubmit={submit} className="card space-y-3">
        <div>
          <label className="label">Loại yêu cầu</label>
          <select className="input" value={form.request_type} onChange={(e) => setForm({ ...form, request_type: e.target.value })}>
            <option>Đăng ký lái thử</option><option>Tư vấn</option><option>CSKH</option>
          </select>
        </div>
        <div><label className="label">Họ tên *</label><input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
        <div><label className="label">Số điện thoại *</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <div><label className="label">Email</label><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div>
          <label className="label">Xe quan tâm</label>
          <select className="input" value={form.car_model_id} onChange={(e) => setForm({ ...form, car_model_id: e.target.value })}>
            <option value="">-- Chọn --</option>{cars.map((c) => <option key={c.id} value={c.id}>{c.brand} {c.name}</option>)}
          </select>
        </div>
        <div><label className="label">Nội dung</label><textarea className="input" rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
        {err && <div className="rounded bg-red-50 p-2 text-sm text-red-600">{err}</div>}
        <button className="btn-primary w-full">Gửi yêu cầu</button>
      </form>
    </div>
  );
}
