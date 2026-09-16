import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Modal, Spinner, Field } from '../components/ui';

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

  if (loading) return <Spinner />;
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Quản lý nội dung website</h1>
        <button onClick={() => setShowNew(true)} className="btn-primary">+ Thêm nội dung</button>
      </div>
      <div className="space-y-3">
        {rows.map((c) => (
          <div key={c.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <span className="badge bg-brand-50 text-brand-700">{c.content_type}</span>
                <div className="mt-1 font-medium">{c.title}</div>
                <div className="text-sm text-gray-500">{c.body}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEdit(c)} className="text-xs text-brand-700 hover:underline">Sửa</button>
                <button onClick={() => remove(c.id)} className="text-xs text-red-600 hover:underline">Xóa</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {(edit || showNew) && <ContentModal item={edit} onClose={() => { setEdit(null); setShowNew(false); }} onDone={() => { setEdit(null); setShowNew(false); load(); }} />}
    </div>
  );
}

function ContentModal({ item, onClose, onDone }: any) {
  const [form, setForm] = useState(item || { content_type: 'banner', title: '', body: '', image_url: '', active: 1 });
  async function save() {
    if (item) await api.put(`/content/${item.id}`, { ...form, active: form.active ? 1 : 0 });
    else await api.post('/content', form);
    onDone();
  }
  return (
    <Modal open onClose={onClose} title={item ? 'Sửa nội dung' : 'Thêm nội dung'}>
      <Field label="Loại"><select className="input" value={form.content_type} onChange={(e) => setForm({ ...form, content_type: e.target.value })}><option value="banner">Banner</option><option value="contact">Liên hệ</option><option value="brand">Thương hiệu</option><option value="homepage">Trang chủ</option></select></Field>
      <Field label="Tiêu đề"><input className="input" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
      <Field label="Nội dung"><textarea className="input" rows={3} value={form.body || ''} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
      <div className="flex justify-end gap-2"><button onClick={onClose} className="btn-secondary">Hủy</button><button onClick={save} className="btn-primary">Lưu</button></div>
    </Modal>
  );
}
