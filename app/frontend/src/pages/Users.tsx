import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { cacheUsers, getCachedUsers } from '../lib/db';
import { Modal, Spinner, Field } from '../components/ui';

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [offline, setOffline] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<any[]>('/users');
      setUsers(data);
      setOffline(false);
      cacheUsers(data); // lưu để xem offline
    } catch {
      // Offline: đọc từ cache
      const cached = await getCachedUsers();
      setUsers(cached);
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function toggleStatus(u: any) {
    const status = u.status === 'Hoạt động' ? 'Tạm khóa' : 'Hoạt động';
    await api.patch(`/users/${u.id}/status`, { status });
    load();
  }

  async function resetPassword(u: any) {
    if (!confirm(`Đặt lại mật khẩu của ${u.full_name} về mặc định (123456)?`)) return;
    const r = await api.post<any>(`/users/${u.id}/reset-password`, {});
    alert(`Đã đặt lại mật khẩu. Mật khẩu mới: ${r.password}`);
  }

  if (loading) return <Spinner />;
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">Quản lý người dùng</h1>
          {offline && <span className="badge bg-amber-100 text-amber-700">Đang xem dữ liệu offline</span>}
        </div>
        <button onClick={() => setShowCreate(true)} disabled={offline} className="btn-primary disabled:opacity-40" title={offline ? 'Cần có mạng để tạo tài khoản' : ''}>+ Tạo tài khoản</button>
      </div>
      {offline && <div className="mb-3 rounded bg-amber-50 p-2 text-sm text-amber-700">Bạn đang offline. Có thể xem danh sách nhưng các thao tác tạo/sửa/khóa cần kết nối mạng.</div>}
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr><th className="p-3">Họ tên</th><th className="p-3">Email</th><th className="p-3">Vai trò</th><th className="p-3">Showroom</th><th className="p-3">Quản lý</th><th className="p-3">Trạng thái</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3 font-medium">{u.full_name}</td>
                <td className="p-3 text-gray-500">{u.email}</td>
                <td className="p-3"><span className="badge bg-brand-50 text-brand-700">{u.role}</span></td>
                <td className="p-3 text-gray-500">{u.showroom_name || '-'}</td>
                <td className="p-3 text-gray-500">{u.manager_name || '-'}</td>
                <td className="p-3"><span className={`badge ${u.status === 'Hoạt động' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.status}</span></td>
                <td className="p-3">
                  {offline ? <span className="text-xs text-gray-400">—</span> : (
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button onClick={() => setEditUser(u)} className="text-brand-700 hover:underline">Sửa</button>
                      {u.role !== 'Admin' && (
                        <button onClick={() => toggleStatus(u)} className="text-amber-700 hover:underline">{u.status === 'Hoạt động' ? 'Tạm khóa' : 'Kích hoạt'}</button>
                      )}
                      <button onClick={() => resetPassword(u)} className="text-gray-500 hover:underline">Đặt lại MK</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
      {editUser && <EditUserModal user={editUser} onClose={() => setEditUser(null)} onSaved={() => { setEditUser(null); load(); }} />}
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }: any) {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', role: 'Sales', showroom_id: '', manager_id: '' });
  const [showrooms, setShowrooms] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [err, setErr] = useState('');
  useEffect(() => {
    api.get<any[]>('/users/meta/showrooms').then(setShowrooms);
    api.get<any[]>('/users/managers').then(setManagers);
  }, []);
  async function save() {
    setErr('');
    try { await api.post('/users', form); onCreated(); } catch (e: any) { setErr(e.message); }
  }
  return (
    <Modal open onClose={onClose} title="Tạo tài khoản">
      <Field label="Họ tên *"><input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
      <Field label="Email *"><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
      <Field label="Số điện thoại *"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      <Field label="Vai trò"><select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option>Sales</option><option>Manager</option><option>Admin</option></select></Field>
      <Field label="Showroom"><select className="input" value={form.showroom_id} onChange={(e) => setForm({ ...form, showroom_id: e.target.value })}><option value="">-- Chọn --</option>{showrooms.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
      {form.role === 'Sales' && <Field label="Manager quản lý"><select className="input" value={form.manager_id} onChange={(e) => setForm({ ...form, manager_id: e.target.value })}><option value="">-- Chọn --</option>{managers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></Field>}
      <div className="text-xs text-gray-400 mb-2">Mật khẩu mặc định: 123456</div>
      {err && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{err}</div>}
      <div className="flex justify-end gap-2"><button onClick={onClose} className="btn-secondary">Hủy</button><button onClick={save} className="btn-primary">Tạo</button></div>
    </Modal>
  );
}

function EditUserModal({ user, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    full_name: user.full_name || '',
    email: user.email || '',
    phone: user.phone || '',
    role: user.role || 'Sales',
    showroom_id: user.showroom_id || '',
    manager_id: user.manager_id || '',
  });
  const [showrooms, setShowrooms] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<any[]>('/users/meta/showrooms').then(setShowrooms);
    api.get<any[]>('/users/managers').then(setManagers);
  }, []);

  async function save() {
    setErr('');
    setSaving(true);
    try {
      await api.patch(`/users/${user.id}`, {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        showroom_id: form.showroom_id || null,
        manager_id: form.role === 'Sales' ? (form.manager_id || null) : null,
      });
      onSaved();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Sửa: ${user.full_name}`}>
      <Field label="Email *"><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@tntcar.vn" /></Field>
      <Field label="Họ tên *"><input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
      <Field label="Số điện thoại *"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      <Field label="Vai trò">
        <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option>Sales</option><option>Manager</option><option>Admin</option>
        </select>
      </Field>
      <Field label="Showroom">
        <select className="input" value={form.showroom_id} onChange={(e) => setForm({ ...form, showroom_id: e.target.value })}>
          <option value="">-- Chọn --</option>
          {showrooms.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </Field>
      {form.role === 'Sales' && (
        <Field label="Manager quản lý">
          <select className="input" value={form.manager_id} onChange={(e) => setForm({ ...form, manager_id: e.target.value })}>
            <option value="">-- Chọn --</option>
            {managers.filter((m) => m.id !== user.id).map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
        </Field>
      )}
      {err && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{err}</div>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-secondary">Hủy</button>
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Đang lưu...' : 'Lưu'}</button>
      </div>
    </Modal>
  );
}
