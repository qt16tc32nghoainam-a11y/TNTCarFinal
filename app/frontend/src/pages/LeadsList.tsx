import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { v4 as uuid } from '../lib/uuid';
import { api } from '../lib/api';
import { enqueue } from '../lib/db';
import { runSync } from '../lib/sync';
import { useAuth } from '../lib/auth';
import { Lead, PROCESSING_STATUSES } from '../lib/types';
import { Modal, Spinner, Empty, Field } from '../components/ui';
import { formatDate, statusColor } from '../lib/format';

export default function LeadsList() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [sources, setSources] = useState<string[]>([]);
  const [cars, setCars] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [dupGroups, setDupGroups] = useState<any[]>([]);
  const [showDup, setShowDup] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (status) params.set('status', status);
      if (source) params.set('source', source);
      const data = await api.get<Lead[]>('/leads?' + params.toString());
      setLeads(data);
    } catch {
      // offline: bỏ qua, danh sách rỗng
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api.get<string[]>('/leads/meta/sources').then(setSources).catch(() => {});
    api.get<any[]>('/meta/car-models').then(setCars).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [status, source]);

  async function loadDuplicates() {
    const d = await api.get<any[]>('/leads/duplicates');
    setDupGroups(d);
    setShowDup(true);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Quản lý Lead</h1>
        <div className="flex gap-2">
          <button onClick={loadDuplicates} className="btn-secondary">Lead trùng</button>
          <button onClick={() => setShowCreate(true)} className="btn-primary">+ Tạo Lead</button>
        </div>
      </div>

      <div className="card mb-4 flex flex-wrap gap-2">
        <input className="input flex-1 min-w-[180px]" placeholder="Tìm theo tên hoặc SĐT..."
          value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          {[...PROCESSING_STATUSES, 'Thành công', 'Lead thất bại'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className="input w-auto" value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">Tất cả nguồn</option>
          {sources.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button onClick={load} className="btn-secondary">Lọc</button>
      </div>

      {loading ? <Spinner /> : leads.length === 0 ? <Empty text="Chưa có Lead nào" /> : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="p-3">Khách hàng</th>
                <th className="p-3">SĐT</th>
                <th className="p-3">Xe</th>
                <th className="p-3">Nguồn</th>
                <th className="p-3">Trạng thái</th>
                {user?.role !== 'Sales' && <th className="p-3">Sales</th>}
                <th className="p-3">Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">
                    <Link to={`/leads/${l.id}`} className="font-medium text-brand-700 hover:underline">{l.full_name}</Link>
                    {!!l.flag_duplicate_phone && <span className="ml-1 badge bg-amber-100 text-amber-700">trùng</span>}
                  </td>
                  <td className="p-3">{l.phone}</td>
                  <td className="p-3">{l.car_name || '-'}</td>
                  <td className="p-3 text-gray-500">{l.source}</td>
                  <td className="p-3"><span className={`badge ${statusColor(l.status_detail)}`}>{l.status_detail}</span></td>
                  {user?.role !== 'Sales' && <td className="p-3 text-gray-500">{l.sales_name}</td>}
                  <td className="p-3 text-xs text-gray-400">{formatDate(l.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateLeadModal sources={sources} cars={cars} onClose={() => setShowCreate(false)} onCreated={load} />}
      {showDup && <DuplicatesModal groups={dupGroups} onClose={() => setShowDup(false)} onMerged={() => { setShowDup(false); load(); }} />}
    </div>
  );
}

function CreateLeadModal({ sources, cars, onClose, onCreated }: any) {
  const [form, setForm] = useState({ full_name: '', phone: '', car_model_id: '', source: 'Sale tự nhập' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setErr('');
    if (!form.full_name || !form.phone) return setErr('Vui lòng nhập Họ tên và Số điện thoại');
    if (!form.source) return setErr('Vui lòng chọn Nguồn Lead');
    setSaving(true);
    const id = uuid();
    try {
      if (navigator.onLine) {
        const res = await api.post<any>('/leads', { id, ...form });
        if (res.duplicate_warning) {
          alert('Cảnh báo: SĐT này đã tồn tại trong Lead của bạn. Lead vẫn được tạo, bạn có thể gộp sau ở mục "Lead trùng".');
        }
      } else {
        // Offline: lưu vào outbox
        await enqueue({ id, entity_type: 'lead', payload: { ...form, status_detail: 'Đang tìm hiểu' }, updated_at: new Date().toISOString() });
        alert('Đã lưu cục bộ (offline), sẽ đồng bộ khi có mạng.');
      }
      onCreated();
      onClose();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Tạo Lead mới">
      <Field label="Họ tên *"><input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
      <Field label="Số điện thoại *"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      <Field label="Dòng xe quan tâm">
        <select className="input" value={form.car_model_id} onChange={(e) => setForm({ ...form, car_model_id: e.target.value })}>
          <option value="">-- Chọn xe --</option>
          {cars.map((c: any) => <option key={c.id} value={c.id}>{c.brand} {c.name}</option>)}
        </select>
      </Field>
      <Field label="Nguồn Lead *">
        <select className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
          {sources.map((s: string) => <option key={s}>{s}</option>)}
        </select>
      </Field>
      {err && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{err}</div>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-secondary">Hủy</button>
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Đang lưu...' : 'Lưu'}</button>
      </div>
    </Modal>
  );
}

function DuplicatesModal({ groups, onClose, onMerged }: any) {
  const [selected, setSelected] = useState<Record<string, string>>({}); // phone -> keep_id

  async function merge(group: any) {
    const keepId = selected[group.phone] || group.leads[0].id;
    const mergeIds = group.leads.map((l: any) => l.id).filter((id: string) => id !== keepId);
    await api.post('/leads/merge', { keep_id: keepId, merge_ids: mergeIds });
    onMerged();
  }

  return (
    <Modal open onClose={onClose} title="Lead trùng số điện thoại">
      {groups.length === 0 ? <Empty text="Không có Lead trùng" /> : (
        <div className="space-y-4">
          {groups.map((g: any) => (
            <div key={g.phone} className="rounded-lg border p-3">
              <div className="mb-2 text-sm font-medium">SĐT: {g.phone} ({g.leads.length} Lead)</div>
              {g.leads.map((l: any) => (
                <label key={l.id} className="mb-1 flex items-center gap-2 text-sm">
                  <input type="radio" name={g.phone} defaultChecked={g.leads[0].id === l.id}
                    onChange={() => setSelected({ ...selected, [g.phone]: l.id })} />
                  <span>{l.full_name} — {l.status_detail}</span>
                </label>
              ))}
              <button onClick={() => merge(g)} className="btn-primary mt-2 text-xs">Gộp (giữ Lead đã chọn)</button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
