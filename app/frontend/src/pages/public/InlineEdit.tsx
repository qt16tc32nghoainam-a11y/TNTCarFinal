import React, { useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';

/**
 * Nút sửa nội dung tại chỗ trên trang public (FR-08).
 * Chỉ hiện với tài khoản Admin đã đăng nhập. Khách thường không thấy gì.
 * Backend /content vẫn kiểm tra quyền Admin khi lưu -> an toàn.
 */
export function useIsContentAdmin() {
  const { user } = useAuth();
  return user?.role === 'Admin';
}

interface Field { key: 'title' | 'body' | 'image_url'; label: string; multiline?: boolean; isImage?: boolean }

export function EditButton({
  item,
  contentType,
  fields,
  onSaved,
  label = 'Sửa',
}: {
  item?: any;                 // bản ghi hiện có (nếu sửa)
  contentType: string;        // loại nội dung (tạo mới nếu chưa có item)
  fields: Field[];
  onSaved: () => void;
  label?: string;
}) {
  const isAdmin = useIsContentAdmin();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(() => ({
    title: item?.title || '',
    body: item?.body || '',
    image_url: item?.image_url || '',
  }));
  const [saving, setSaving] = useState(false);

  if (!isAdmin) return null;

  async function save() {
    setSaving(true);
    try {
      if (item?.id) {
        await api.put(`/content/${item.id}`, { ...item, ...form, active: 1 });
      } else {
        await api.post('/content', { content_type: contentType, ...form });
      }
      setOpen(false);
      onSaved();
    } catch (e: any) {
      alert(e.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-medium text-amber-900 shadow hover:bg-amber-300"
        title="Sửa nội dung (Admin)"
      >
        ✏️ {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 text-gray-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-lg font-semibold">Sửa nội dung website</h3>
            {fields.map((f) => (
              <div key={f.key} className="mb-3">
                <label className="mb-1 block text-xs text-gray-500">{f.label}</label>
                {f.multiline ? (
                  <textarea className="w-full rounded-lg border px-3 py-2 text-sm" rows={4} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                ) : (
                  <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder={f.isImage ? 'https://...' : ''} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                )}
                {f.isImage && form[f.key] && <img src={form[f.key]} alt="" className="mt-2 h-24 w-full rounded object-cover" />}
              </div>
            ))}
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2 text-sm">Hủy</button>
              <button onClick={save} disabled={saving} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
