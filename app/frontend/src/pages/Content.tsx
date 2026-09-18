import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Modal, Spinner, Field } from '../components/ui';

/**
 * Quản lý nội dung website công khai (FR-08).
 * Admin chỉnh ở đây -> khách xem ngay ở trang /site.
 * Mỗi "loại" nội dung hiển thị ở một vị trí cụ thể trên landing page.
 */
const CONTENT_TYPES: { value: string; label: string; where: string; hasImage?: boolean }[] = [
  { value: 'banner', label: 'Banner (Hero trang chủ)', where: 'Tiêu đề lớn + mô tả + ảnh nền đầu trang chủ', hasImage: true },
  { value: 'brand', label: 'Giới thiệu thương hiệu', where: 'Khối "Về TNT CAR" ở trang chủ' },
  { value: 'contact', label: 'Thông tin liên hệ', where: 'Hotline/email/địa chỉ ở chân trang & thanh trên cùng' },
  { value: 'promo', label: 'Ưu đãi', where: 'Dải ưu đãi (mỗi mục 1 dòng) ở trang chủ', hasImage: true },
];

function typeInfo(v: string) {
  return CONTENT_TYPES.find((t) => t.value === v);
}

export default function Content() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<any>(null);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    setLoading(true);
    try { setRows(await api.get<any[]>('/content')); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm('Xóa nội dung này?')) return;
    await api.del(`/content/${id}`);
    load();
  }

  async function toggleActive(c: any) {
    await api.put(`/content/${c.id}`, { ...c, active: c.active ? 0 : 1 });
    load();
  }

  if (loading) return <Spinner />;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-bold">Quản lý nội dung website</h1>
        <button onClick={() => setShowNew(true)} className="btn-primary">+ Thêm nội dung</button>
      </div>
      <p className="mb-4 text-sm text-gray-500">Chỉnh sửa tại đây, khách hàng sẽ thấy ngay ở trang web công khai (mục Trang chủ).</p>

      <div className="space-y-3">
        {rows.map((c) => {
          const info = typeInfo(c.content_type);
          return (
            <div key={c.id} className={`card ${c.active ? '' : 'opacity-60'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  {c.image_url && <img src={c.image_url} alt="" className="h-16 w-24 rounded object-cover" />}
                  <div>
                    <span className="badge bg-brand-50 text-brand-700">{info?.label || c.content_type}</span>
                    {!c.active && <span className="ml-2 badge bg-gray-100 text-gray-500">Đang ẩn</span>}
                    <div className="mt-1 font-medium">{c.title}</div>
                    <div className="text-sm text-gray-500">{c.body}</div>
                    {info && <div className="mt-1 text-xs text-gray-400">Hiển thị: {info.where}</div>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2 text-xs">
                  <button onClick={() => toggleActive(c)} className="text-amber-700 hover:underline">{c.active ? 'Ẩn' : 'Hiện'}</button>
                  <button onClick={() => setEdit(c)} className="text-brand-700 hover:underline">Sửa</button>
                  <button onClick={() => remove(c.id)} className="text-red-600 hover:underline">Xóa</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {(edit || showNew) && <ContentModal item={edit} onClose={() => { setEdit(null); setShowNew(false); }} onDone={() => { setEdit(null); setShowNew(false); load(); }} />}
    </div>
  );
}

function ContentModal({ item, onClose, onDone }: any) {
  const [form, setForm] = useState(item || { content_type: 'banner', title: '', body: '', image_url: '', active: 1 });
  const [saving, setSaving] = useState(false);
  const info = typeInfo(form.content_type);

  async function save() {
    setSaving(true);
    try {
      if (item) await api.put(`/content/${item.id}`, { ...form, active: form.active ? 1 : 0 });
      else await api.post('/content', form);
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={item ? 'Sửa nội dung' : 'Thêm nội dung'}>
      <Field label="Loại nội dung">
        <select className="input" value={form.content_type} onChange={(e) => setForm({ ...form, content_type: e.target.value })} disabled={!!item}>
          {CONTENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </Field>
      {info && <div className="mb-3 rounded bg-brand-50 p-2 text-xs text-brand-700">Vị trí hiển thị: {info.where}</div>}
      <Field label="Tiêu đề"><input className="input" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
      <Field label="Nội dung"><textarea className="input" rows={3} value={form.body || ''} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
      {info?.hasImage && (
        <Field label="Ảnh (dán đường dẫn URL)">
          <input className="input" placeholder="https://..." value={form.image_url || ''} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
        </Field>
      )}
      {info?.hasImage && form.image_url && <img src={form.image_url} alt="" className="mb-3 h-28 w-full rounded object-cover" />}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-secondary">Hủy</button>
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Đang lưu...' : 'Lưu'}</button>
      </div>
    </Modal>
  );
}
