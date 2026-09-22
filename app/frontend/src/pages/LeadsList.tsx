import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { v4 as uuid } from '../lib/uuid';
import { api } from '../lib/api';
import { enqueue, cacheLeads, getCachedLeads, getOutboxLeads, cacheMeta, getCachedMeta } from '../lib/db';
import { useAuth } from '../lib/auth';
import { Lead, PROCESSING_STATUSES } from '../lib/types';
import { Modal, Spinner, Empty, Field } from '../components/ui';
import { formatDate, statusColor } from '../lib/format';

const LEAD_STATUS_LABEL: Record<string, string> = {
  new: 'Mới', assigned: 'Đã gán', won: 'Thành công', lost: 'Thất bại', deleted: 'Đã xóa',
};
const LEAD_STATUS_COLOR: Record<string, string> = {
  new: 'bg-gray-100 text-gray-600',
  assigned: 'bg-blue-100 text-blue-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
  deleted: 'bg-gray-200 text-gray-500',
};

export default function LeadsList() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sources, setSources] = useState<string[]>([]);
  const [cars, setCars] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [offline, setOffline] = useState(false);

  async function load(targetPage = page) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (status) params.set('status', status);
      if (source) params.set('source', source);
      if (fromDate) params.set('from_date', fromDate);
      if (toDate) params.set('to_date', toDate);
      params.set('page', String(targetPage));
      params.set('pageSize', String(pageSize));
      const data = await api.get<{ items: Lead[]; total: number; totalPages: number; page: number }>('/leads?' + params.toString());
      setLeads(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setPage(data.page);
      setOffline(false);
      // Lưu bản sao để xem offline (chỉ cache khi tải toàn bộ không lọc, trang 1)
      if (!q && !status && !source && !fromDate && !toDate && targetPage === 1) cacheLeads(data.items);
    } catch {
      // Offline: đọc từ cache + gộp các Lead tạo offline chưa đồng bộ
      const [cached, outbox] = await Promise.all([getCachedLeads(), getOutboxLeads()]);
      const merged = applyFilters([...outbox, ...cached]);
      setLeads(merged);
      setTotal(merged.length);
      setTotalPages(1);
      setPage(1);
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }

  // Lọc phía client khi offline (server không truy vấn được)
  function applyFilters(list: any[]): Lead[] {
    return list.filter((l) => {
      if (q && !(`${l.full_name || ''} ${l.phone || ''}`.toLowerCase().includes(q.toLowerCase()))) return false;
      if (status && l.status_detail !== status) return false;
      if (source && l.source !== source) return false;
      return true;
    });
  }

  useEffect(() => {
    // Danh mục ít thay đổi: tải online thì cache lại, offline thì đọc từ cache để dropdown vẫn chọn được.
    api.get<string[]>('/leads/meta/sources')
      .then((d) => { setSources(d); cacheMeta('lead-sources', d); })
      .catch(() => { getCachedMeta('lead-sources').then(setSources); });
    api.get<any[]>('/meta/car-models')
      .then((d) => { setCars(d); cacheMeta('car-models', d); })
      .catch(() => { getCachedMeta('car-models').then(setCars); });
  }, []);

  useEffect(() => { load(1); }, [status, source, fromDate, toDate]);

  function search() { load(1); }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">Quản lý Lead</h1>
          {offline && <span className="badge bg-amber-100 text-amber-700">Đang xem dữ liệu offline</span>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)} className="btn-secondary">Nhập từ Excel</button>
          <button onClick={() => setShowCreate(true)} className="btn-primary">+ Tạo Lead</button>
        </div>
      </div>

      <div className="card mb-4 flex flex-wrap items-end gap-2">
        <input className="input flex-1 min-w-[180px]" placeholder="Tìm theo tên, SĐT hoặc mã khách hàng..."
          value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          {[...PROCESSING_STATUSES, 'Thành công', 'Lead thất bại'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className="input w-auto" value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">Tất cả nguồn</option>
          {sources.map((s) => <option key={s}>{s}</option>)}
        </select>
        <div>
          <label className="label">Từ ngày</label>
          <input type="date" className="input w-auto" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Đến ngày</label>
          <input type="date" className="input w-auto" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <button onClick={search} className="btn-secondary">Lọc</button>
      </div>

      {loading ? <Spinner /> : leads.length === 0 ? <Empty text="Chưa có Lead nào" /> : (
        <>
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="p-3">Mã KH</th>
                  <th className="p-3">Khách hàng</th>
                  <th className="p-3">SĐT</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Xe</th>
                  <th className="p-3">Nguồn</th>
                  <th className="p-3">Loại yêu cầu</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3">Lead Status</th>
                  {user?.role !== 'Sales' && <th className="p-3">Sales</th>}
                  <th className="p-3">Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 text-xs text-gray-500">{l.customer_code || '-'}</td>
                    <td className="p-3">
                      <Link to={`/leads/${l.id}`} className="font-medium text-brand-700 hover:underline">{l.full_name}</Link>
                      {!!(l as any)._pendingSync && <span className="ml-1 badge bg-blue-100 text-blue-700">chờ đồng bộ</span>}
                    </td>
                    <td className="p-3">{l.phone}</td>
                    <td className="p-3">
                      {l.email ? <span className="text-gray-600">{l.email}</span> : <span className="badge bg-amber-100 text-amber-700">Thiếu email</span>}
                    </td>
                    <td className="p-3">{l.car_name || '-'}</td>
                    <td className="p-3 text-gray-500">{l.source}</td>
                    <td className="p-3 text-gray-500">{(l as any).request_type ? <span className="badge bg-indigo-50 text-indigo-700">{(l as any).request_type}</span> : '-'}</td>
                    <td className="p-3"><span className={`badge ${statusColor(l.status_detail)}`}>{l.status_detail}</span></td>
                    <td className="p-3"><span className={`badge ${LEAD_STATUS_COLOR[l.lead_status || 'new']}`}>{LEAD_STATUS_LABEL[l.lead_status || 'new']}</span></td>
                    {user?.role !== 'Sales' && <td className="p-3 text-gray-500">{l.sales_name}</td>}
                    <td className="p-3 text-xs text-gray-400">{formatDate(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          {!offline && totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
              <span>Trang {page}/{totalPages} · Tổng {total} Lead</span>
              <div className="flex gap-1">
                <button disabled={page <= 1} onClick={() => load(page - 1)} className="btn-secondary px-3 py-1 disabled:opacity-40">← Trước</button>
                <button disabled={page >= totalPages} onClick={() => load(page + 1)} className="btn-secondary px-3 py-1 disabled:opacity-40">Sau →</button>
              </div>
            </div>
          )}
        </>
      )}

      {showCreate && <CreateLeadModal sources={sources} cars={cars} onClose={() => setShowCreate(false)} onCreated={() => load(1)} />}
      {showImport && <ImportExcelModal onClose={() => setShowImport(false)} onImported={() => load(1)} />}
    </div>
  );
}

function CreateLeadModal({ sources, cars, onClose, onCreated }: any) {
  const [form, setForm] = useState({
    full_name: '', phone: '', email: '', car_model_id: '', source: 'Sale tự nhập',
    address: '', budget: '', payment_method: '', interest_level: '', note: '',
  });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setErr('');
    if (!form.full_name || !form.phone) return setErr('Vui lòng nhập Họ tên và Số điện thoại');
    if (!form.email.trim()) return setErr('Vui lòng nhập địa chỉ email');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setErr('Email không hợp lệ');
    if (!form.source) return setErr('Vui lòng chọn Nguồn Lead');
    setSaving(true);
    const id = uuid();
    try {
      if (navigator.onLine) {
        await api.post<any>('/leads', { id, ...form });
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
      <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
        <Field label="Họ tên *"><input className="input" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} /></Field>
        <Field label="Số điện thoại *"><input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label="Email *"><input type="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="khach@email.com" /></Field>
        <Field label="Dòng xe quan tâm">
          <select className="input" value={form.car_model_id} onChange={(e) => set('car_model_id', e.target.value)}>
            <option value="">-- Chọn xe --</option>
            {cars.map((c: any) => <option key={c.id} value={c.id}>{c.brand} {c.name}</option>)}
          </select>
        </Field>
        <Field label="Nguồn Lead *">
          <select className="input" value={form.source} onChange={(e) => set('source', e.target.value)}>
            {sources.map((s: string) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Khu vực / Địa chỉ"><input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="VD: Quận 1, TP.HCM" /></Field>
        <Field label="Ngân sách dự kiến"><input className="input" value={form.budget} onChange={(e) => set('budget', e.target.value)} placeholder="VD: 600 - 800 triệu" /></Field>
        <Field label="Hình thức thanh toán">
          <select className="input" value={form.payment_method} onChange={(e) => set('payment_method', e.target.value)}>
            <option value="">-- Chưa xác định --</option>
            <option value="Trả thẳng">Trả thẳng</option>
            <option value="Trả góp">Trả góp</option>
          </select>
        </Field>
        <Field label="Mức độ quan tâm">
          <select className="input" value={form.interest_level} onChange={(e) => set('interest_level', e.target.value)}>
            <option value="">-- Chưa xác định --</option>
            <option value="Nóng">Nóng</option>
            <option value="Ấm">Ấm</option>
            <option value="Lạnh">Lạnh</option>
          </select>
        </Field>
      </div>
      <Field label="Ghi chú / Nhu cầu"><textarea className="input" rows={2} value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Nhu cầu, thời điểm mua dự kiến..." /></Field>
      {err && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{err}</div>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-secondary">Hủy</button>
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Đang lưu...' : 'Lưu'}</button>
      </div>
    </Modal>
  );
}

function ImportExcelModal({ onClose, onImported }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState('');

  async function downloadTemplate() {
    setDownloading(true);
    setErr('');
    try {
      await api.download('/leads/import/template', 'mau-nhap-lead.xlsx');
    } catch (e: any) {
      setErr(e.message || 'Không tải được file mẫu');
    } finally {
      setDownloading(false);
    }
  }

  async function doImport() {
    if (!file) return setErr('Vui lòng chọn file Excel (.xlsx)');
    setErr('');
    setUploading(true);
    setResult(null);
    try {
      const res = await api.upload<any>('/leads/import', file);
      setResult(res);
      if (res.created_count > 0) onImported();
    } catch (e: any) {
      setErr(e.message || 'Nhập file thất bại');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Nhập Lead từ Excel">
      <div className="mb-3 rounded bg-brand-50 p-3 text-sm text-brand-700">
        Tải file mẫu, điền thông tin khách hàng theo đúng cột, rồi chọn file để nhập lên hệ thống.
        Các dòng lỗi sẽ được báo rõ, dòng hợp lệ vẫn được tạo bình thường.
      </div>
      <button onClick={downloadTemplate} disabled={downloading} className="btn-secondary mb-4 w-full">
        {downloading ? 'Đang tải...' : '⬇ Tải file mẫu (.xlsx)'}
      </button>

      <Field label="Chọn file đã điền (.xlsx)">
        <input type="file" accept=".xlsx" className="input" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </Field>

      {err && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{err}</div>}

      {result && (
        <div className="mb-3 rounded border p-3 text-sm">
          <div className="mb-1 font-medium">
            Đã tạo <span className="text-green-700">{result.created_count}</span> Lead
            {result.error_count > 0 && <> · <span className="text-red-600">{result.error_count} dòng lỗi</span></>}
            {' '}(tổng {result.total_rows} dòng dữ liệu)
          </div>
          {result.errors?.length > 0 && (
            <div className="mt-2 max-h-32 overflow-auto rounded bg-red-50 p-2 text-xs text-red-700">
              {result.errors.map((e: any) => <div key={e.row}>Dòng {e.row}: {e.error}</div>)}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-secondary">Đóng</button>
        <button onClick={doImport} disabled={uploading || !file} className="btn-primary">{uploading ? 'Đang nhập...' : 'Nhập file'}</button>
      </div>
    </Modal>
  );
}
