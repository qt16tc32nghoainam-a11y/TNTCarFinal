import React, { useState } from 'react';
import { publicApi } from '../../lib/api';

/**
 * Form đăng ký nhanh (khách không cần đăng nhập).
 * Gửi tới /public/requests -> tự tạo Lead + gán Sales ngẫu nhiên.
 * - compact: bản gọn dùng trong hero (nền tối).
 * - defaultCarId: chọn sẵn xe (dùng ở trang chi tiết).
 */
export default function QuickLeadForm({ cars, compact, defaultCarId }: { cars: any[]; compact?: boolean; defaultCarId?: string }) {
  const [form, setForm] = useState({
    request_type: 'Đăng ký lái thử',
    full_name: '',
    phone: '',
    email: '',
    car_model_id: defaultCarId || '',
    note: '',
  });
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!form.full_name || !form.phone) return setErr('Vui lòng nhập họ tên và số điện thoại');
    if (form.request_type === 'Đăng ký lái thử' && !form.email) return setErr('Vui lòng nhập email để nhận xác nhận lịch lái thử');
    if (form.request_type === 'Đăng ký lái thử' && !form.car_model_id) return setErr('Vui lòng chọn xe muốn lái thử');
    setSaving(true);
    try {
      await publicApi.post('/public/requests', form);
      setDone(true);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg bg-green-50 p-4 text-center">
        <div className="text-2xl">✅</div>
        <div className="mt-1 font-semibold text-green-700">Đã tiếp nhận yêu cầu</div>
        <div className="text-sm text-gray-600">TNT CAR sẽ liên hệ với bạn sớm nhất.</div>
      </div>
    );
  }

  const labelCls = compact ? 'text-brand-100' : 'text-gray-600';
  const inputCls = 'w-full rounded-lg border px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none';

  return (
    <form onSubmit={submit} className="space-y-2.5">
      {!compact && <div className="text-lg font-bold text-gray-900">Đăng ký tư vấn / lái thử</div>}
      <div>
        <label className={`text-xs ${labelCls}`}>Loại yêu cầu</label>
        <select className={inputCls} value={form.request_type} onChange={(e) => setForm({ ...form, request_type: e.target.value })}>
          <option>Đăng ký lái thử</option><option>Tư vấn</option><option>CSKH</option>
        </select>
      </div>
      <div>
        <label className={`text-xs ${labelCls}`}>Họ tên *</label>
        <input className={inputCls} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Nguyễn Văn A" />
      </div>
      <div>
        <label className={`text-xs ${labelCls}`}>Số điện thoại *</label>
        <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="09xx xxx xxx" />
      </div>
      {(!compact || form.request_type === 'Đăng ký lái thử') && (
        <div>
          <label className={`text-xs ${labelCls}`}>Email{form.request_type === 'Đăng ký lái thử' ? ' *' : ''}</label>
          <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="khachhang@email.com" />
        </div>
      )}
      <div>
        <label className={`text-xs ${labelCls}`}>Xe quan tâm{form.request_type === 'Đăng ký lái thử' ? ' *' : ''}</label>
        <select className={inputCls} value={form.car_model_id} onChange={(e) => setForm({ ...form, car_model_id: e.target.value })}>
          <option value="">-- Chọn xe --</option>
          {cars.map((c) => <option key={c.id} value={c.id}>{c.brand} {c.name}</option>)}
        </select>
      </div>
      {err && <div className="rounded bg-red-50 p-2 text-xs text-red-600">{err}</div>}
      <button disabled={saving} className="w-full rounded-lg bg-brand-600 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
        {saving ? 'Đang gửi...' : 'Nhận báo giá ngay'}
      </button>
    </form>
  );
}
