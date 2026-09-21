import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { enqueue, cacheLead, getCachedLead } from '../lib/db';
import { v4 as uuid } from '../lib/uuid';
import { useAuth } from '../lib/auth';
import { Lead, PROCESSING_STATUSES, ACTIVITY_TYPES } from '../lib/types';
import { Modal, Spinner, Field } from '../components/ui';
import { formatDate, statusColor, formatVnd } from '../lib/format';

export default function LeadDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [showActivity, setShowActivity] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showEditInfo, setShowEditInfo] = useState(false);
  const [offline, setOffline] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<Lead>(`/leads/${id}`);
      setLead(data);
      setOffline(false);
      cacheLead(data); // lưu để xem offline
    } catch {
      // Offline: đọc từ cache
      const cached = await getCachedLead(id!);
      if (cached) { setLead(cached); setOffline(true); }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [id]);

  async function setStatus(status: string) {
    await api.patch(`/leads/${id}/status`, { status });
    load();
  }

  async function archive() {
    if (!confirm('Chuyển Lead này sang Lưu trữ?')) return;
    await api.del(`/leads/${id}`);
    nav('/leads');
  }

  if (loading || !lead) return <Spinner />;
  const isResult = ['Thành công', 'Lead thất bại'].includes(lead.status_detail);

  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={() => nav('/leads')} className="mb-3 text-sm text-brand-700">← Quay lại danh sách</button>

      <div className="card mb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{lead.full_name}</h1>
              {offline && <span className="badge bg-amber-100 text-amber-700">offline</span>}
            </div>
            <div className="text-sm text-gray-500">{lead.phone}{lead.email ? ` · ${lead.email}` : ''} · {lead.source}{lead.request_type ? ` · ${lead.request_type}` : ''}</div>
            {lead.car_name && <div className="text-sm text-gray-500">Quan tâm: {lead.car_brand} {lead.car_name}</div>}
            <div className="mt-1 text-sm">
              Sales phụ trách: {lead.sales_name
                ? <span className="font-medium text-brand-700">{lead.sales_name}</span>
                : <span className="text-gray-400">Chưa gán</span>}
            </div>
          </div>
          <span className={`badge ${statusColor(lead.status_detail)}`}>{lead.status_detail}</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => setShowActivity(true)} className="btn-primary text-xs">Ghi hoạt động</button>
          <button onClick={() => setShowReminder(true)} className="btn-secondary text-xs">Tạo lịch hẹn</button>
          <button onClick={() => setShowEditInfo(true)} className="btn-secondary text-xs">Sửa thông tin</button>
          <button onClick={() => setShowResult(true)} className="btn-secondary text-xs">{isResult ? 'Sửa kết quả' : 'Chốt Won/Lost'}</button>

          {user?.role === 'Admin' && <button onClick={() => setShowAssign(true)} className="btn-secondary text-xs">Gán Sales</button>}
          <button onClick={archive} className="btn-danger text-xs">Lưu trữ</button>
        </div>

        {!isResult && (
          <div className="mt-3">
            <div className="mb-1 text-xs text-gray-500">Đổi nhanh trạng thái xử lý:</div>
            <div className="flex flex-wrap gap-1">
              {PROCESSING_STATUSES.map((s) => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`badge ${lead.status_detail === s ? 'bg-brand-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{s}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Thông tin chi tiết khách hàng */}
      <div className="card mb-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Thông tin khách hàng</h2>
          <button onClick={() => setShowEditInfo(true)} className="text-xs text-brand-700 hover:underline">Sửa</button>
        </div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <InfoRow label="Họ tên" value={lead.full_name} />
          <InfoRow label="Số điện thoại" value={lead.phone} />
          <InfoRow label="Email" value={lead.email} />
          <InfoRow label="Xe quan tâm" value={lead.car_name ? `${lead.car_brand || ''} ${lead.car_name}`.trim() : ''} />
          <InfoRow label="Nguồn" value={lead.source} />
          <InfoRow label="Nguồn chi tiết" value={lead.source_detail} />
          <InfoRow label="Khu vực / Địa chỉ" value={lead.address} />
          <InfoRow label="Ngân sách dự kiến" value={lead.budget} />
          <InfoRow label="Hình thức thanh toán" value={lead.payment_method} />
          <InfoRow label="Mức độ quan tâm" value={lead.interest_level} badge={interestBadge(lead.interest_level)} />
          <div className="sm:col-span-2"><InfoRow label="Ghi chú / Nhu cầu" value={lead.note} /></div>
        </div>
      </div>

      {/* Timeline chăm sóc */}
      <div className="card mb-4">
        <h2 className="mb-3 font-semibold">Lịch sử chăm sóc</h2>
        {(!lead.interactions || lead.interactions.length === 0) ? (
          <div className="text-sm text-gray-400">Chưa có hoạt động nào</div>
        ) : (
          <div className="space-y-3">
            {lead.interactions.map((it) => (
              <div key={it.id} className="border-l-2 border-brand-200 pl-3">
                <div className="flex items-center gap-2">
                  <span className="badge bg-brand-50 text-brand-700">{it.type}</span>
                  <span className="text-xs text-gray-400">{formatDate(it.created_at)}</span>
                </div>
                {it.note && <div className="text-sm text-gray-700">{it.note}</div>}
                {it.status_after && <div className="text-xs text-gray-400">Đổi trạng thái: {it.status_before} → {it.status_after}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lịch hẹn */}
      {lead.reminders && lead.reminders.length > 0 && (
        <div className="card mb-4">
          <h2 className="mb-3 font-semibold">Lịch hẹn</h2>
          {lead.reminders.map((r) => (
            <div key={r.id} className="flex justify-between border-b py-2 text-sm last:border-0">
              <span>{r.purpose} — {r.location}</span>
              <span className="text-gray-500">{formatDate(r.remind_at)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Lịch sử trạng thái */}
      {lead.history && lead.history.length > 0 && (
        <div className="card">
          <h2 className="mb-3 font-semibold">Lịch sử thay đổi trạng thái</h2>
          {lead.history.map((h) => (
            <div key={h.id} className="border-b py-2 text-xs last:border-0">
              <span className="text-gray-700">{h.status_before} → {h.status_after}</span>
              {h.reason && <span className="text-gray-500"> · Lý do: {h.reason}</span>}
              <span className="float-right text-gray-400">{formatDate(h.changed_at)}</span>
            </div>
          ))}
        </div>
      )}

      {showActivity && <ActivityModal leadId={lead.id} onClose={() => setShowActivity(false)} onDone={() => { setShowActivity(false); load(); }} />}
      {showReminder && <ReminderModal leadId={lead.id} carModelId={lead.car_model_id} leadEmail={lead.email} onClose={() => setShowReminder(false)} onDone={() => { setShowReminder(false); load(); }} />}
      {showResult && <ResultModal lead={lead} onClose={() => setShowResult(false)} onDone={() => { setShowResult(false); load(); }} />}
      {showAssign && <AssignModal leadId={lead.id} currentSalesId={lead.assigned_sales_id} onClose={() => setShowAssign(false)} onDone={() => { setShowAssign(false); load(); }} />}
      {showEditInfo && <EditInfoModal lead={lead} onClose={() => setShowEditInfo(false)} onDone={() => { setShowEditInfo(false); load(); }} />}
    </div>
  );
}

function InfoRow({ label, value, badge }: { label: string; value?: string | null; badge?: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-gray-100 py-1.5">
      <span className="text-gray-500">{label}</span>
      {value
        ? (badge ? <span className={`badge ${badge}`}>{value}</span> : <span className="text-right font-medium text-gray-800">{value}</span>)
        : <span className="text-gray-300">—</span>}
    </div>
  );
}

function interestBadge(level?: string | null): string {
  if (level === 'Nóng') return 'bg-red-100 text-red-700';
  if (level === 'Ấm') return 'bg-amber-100 text-amber-700';
  if (level === 'Lạnh') return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-600';
}

const PAYMENT_METHODS = ['Trả thẳng', 'Trả góp'];
const INTEREST_LEVELS = ['Nóng', 'Ấm', 'Lạnh'];
const SOURCE_DETAILS = ['Facebook', 'Zalo', 'Giới thiệu', 'Hotline', 'Website', 'Khác'];

function EditInfoModal({ lead, onClose, onDone }: any) {
  const [form, setForm] = useState({
    full_name: lead.full_name || '',
    phone: lead.phone || '',
    email: lead.email || '',
    car_model_id: lead.car_model_id || '',
    address: lead.address || '',
    budget: lead.budget || '',
    payment_method: lead.payment_method || '',
    interest_level: lead.interest_level || '',
    source_detail: lead.source_detail || '',
    note: lead.note || '',
  });
  const [cars, setCars] = useState<any[]>([]);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get<any[]>('/meta/car-models').then(setCars).catch(() => {}); }, []);

  async function save() {
    setErr('');
    if (!form.full_name.trim()) return setErr('Vui lòng nhập họ tên');
    if (!form.phone.trim()) return setErr('Vui lòng nhập số điện thoại');
    setSaving(true);
    try {
      await api.patch(`/leads/${lead.id}`, {
        full_name: form.full_name,
        phone: form.phone,
        email: form.email,
        car_model_id: form.car_model_id || null,
        address: form.address,
        budget: form.budget,
        payment_method: form.payment_method,
        interest_level: form.interest_level,
        source_detail: form.source_detail,
        note: form.note,
      });
      onDone();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  const set = (k: string, v: string) => setForm({ ...form, [k]: v });

  return (
    <Modal open onClose={onClose} title="Sửa thông tin khách hàng">
      <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
        <Field label="Họ tên *"><input className="input" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} /></Field>
        <Field label="Số điện thoại *"><input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label="Email"><input className="input" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="khach@email.com" /></Field>
        <Field label="Xe quan tâm">
          <select className="input" value={form.car_model_id} onChange={(e) => set('car_model_id', e.target.value)}>
            <option value="">-- Chưa xác định --</option>
            {cars.map((c) => <option key={c.id} value={c.id}>{c.brand} {c.name}</option>)}
          </select>
        </Field>
        <Field label="Khu vực / Địa chỉ"><input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="VD: Quận 1, TP.HCM" /></Field>
        <Field label="Ngân sách dự kiến"><input className="input" value={form.budget} onChange={(e) => set('budget', e.target.value)} placeholder="VD: 600 - 800 triệu" /></Field>
        <Field label="Hình thức thanh toán">
          <select className="input" value={form.payment_method} onChange={(e) => set('payment_method', e.target.value)}>
            <option value="">-- Chưa xác định --</option>
            {PAYMENT_METHODS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Mức độ quan tâm">
          <select className="input" value={form.interest_level} onChange={(e) => set('interest_level', e.target.value)}>
            <option value="">-- Chưa xác định --</option>
            {INTEREST_LEVELS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Nguồn chi tiết">
          <select className="input" value={form.source_detail} onChange={(e) => set('source_detail', e.target.value)}>
            <option value="">-- Chưa xác định --</option>
            {SOURCE_DETAILS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Ghi chú / Nhu cầu"><textarea className="input" rows={3} value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Nhu cầu, thời điểm mua dự kiến, ghi chú khác..." /></Field>
      {err && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{err}</div>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-secondary">Hủy</button>
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Đang lưu...' : 'Lưu'}</button>
      </div>
    </Modal>
  );
}

function ActivityModal({ leadId, onClose, onDone }: any) {
  const [type, setType] = useState('Gọi điện');
  const [note, setNote] = useState('');
  const [newStatus, setNewStatus] = useState('');
  async function save() {
    const id = uuid();
    if (navigator.onLine) {
      await api.post('/care/interactions', { id, lead_id: leadId, type, note, new_status: newStatus || undefined });
    } else {
      // Offline: lưu vào outbox, đồng bộ khi có mạng (BR-11)
      await enqueue({ id, entity_type: 'interaction', payload: { lead_id: leadId, type, note, created_at: new Date().toISOString() }, updated_at: new Date().toISOString() });
      alert('Đã lưu hoạt động cục bộ (offline), sẽ đồng bộ khi có mạng.');
    }
    onDone();
  }
  return (
    <Modal open onClose={onClose} title="Ghi hoạt động chăm sóc">
      <Field label="Loại hoạt động *">
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>{ACTIVITY_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
      </Field>
      <Field label="Ghi chú (không bắt buộc)"><textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <Field label="Đổi trạng thái (tùy chọn)">
        <select className="input" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
          <option value="">-- Không đổi --</option>
          {PROCESSING_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </Field>
      <div className="flex justify-end gap-2"><button onClick={onClose} className="btn-secondary">Hủy</button><button onClick={save} className="btn-primary">Lưu</button></div>
    </Modal>
  );
}

function ReminderModal({ leadId, carModelId, leadEmail, onClose, onDone }: any) {
  const [remind_at, setRemindAt] = useState('');
  const [purpose, setPurpose] = useState('Lái thử');
  const [location, setLocation] = useState('');
  const [customerEmail, setCustomerEmail] = useState(leadEmail || '');
  const [err, setErr] = useState('');
  // Dành riêng cho mục đích "Lái thử": chọn showroom + khung giờ để tạo lịch lái thử thật
  const [showrooms, setShowrooms] = useState<any[]>([]);
  const [showroomId, setShowroomId] = useState('');
  const [slots, setSlots] = useState<any[]>([]);
  const [slotId, setSlotId] = useState('');

  const isTestDrive = purpose === 'Lái thử';

  useEffect(() => {
    if (isTestDrive && showrooms.length === 0) {
      api.get<any[]>('/meta/showrooms').then(setShowrooms).catch(() => {});
    }
  }, [isTestDrive]);

  useEffect(() => {
    if (isTestDrive && showroomId) {
      const carQuery = carModelId ? `?car_model_id=${encodeURIComponent(carModelId)}` : '';
      api.get<any[]>(`/cars/slots/available/${showroomId}${carQuery}`).then(setSlots).catch(() => setSlots([]));
    } else {
      setSlots([]); setSlotId('');
    }
  }, [showroomId, isTestDrive]);

  async function save() {
    setErr('');
    // Khi lái thử, thời gian lấy trực tiếp từ slot (không nhập 2 giờ khác nhau).
    const selectedSlot = slots.find((s) => s.id === slotId);
    const effectiveTime = isTestDrive ? selectedSlot?.start_time : remind_at;
    if (!effectiveTime) return setErr(isTestDrive ? 'Vui lòng chọn Showroom và Khung giờ' : 'Vui lòng chọn thời gian hẹn');
    if (new Date(effectiveTime).getTime() <= Date.now()) return setErr('Thời gian nhắc việc phải ở tương lai');
    if (isTestDrive && (!showroomId || !slotId)) return setErr('Với lịch lái thử, vui lòng chọn Showroom và Khung giờ');
    if (isTestDrive && !customerEmail) return setErr('Vui lòng nhập email khách để gửi xác nhận lịch lái thử');
    if (isTestDrive && !navigator.onLine) return setErr('Cần có mạng để khóa khung giờ lái thử. Vui lòng kết nối mạng rồi thử lại.');
    try {
      const id = uuid();
      const payload: any = { id, lead_id: leadId, remind_at: new Date(effectiveTime).toISOString(), purpose, location };
      if (isTestDrive) { payload.showroom_id = showroomId; payload.slot_id = slotId; payload.customer_email = customerEmail; }
      if (navigator.onLine) {
        await api.post('/care/reminders', payload);
      } else {
        await enqueue({ id, entity_type: 'reminder', payload: { lead_id: leadId, remind_at: payload.remind_at, purpose, location, created_at: new Date().toISOString() }, updated_at: new Date().toISOString() });
        alert('Đã lưu lịch hẹn cục bộ (offline), sẽ đồng bộ khi có mạng.');
      }
      onDone();
    } catch (e: any) { setErr(e.message); }
  }

  return (
    <Modal open onClose={onClose} title="Tạo lịch hẹn">
      <Field label="Mục đích"><select className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)}><option>Lái thử</option><option>Tư vấn lại</option><option>Khác</option></select></Field>
      {!isTestDrive && <Field label="Thời gian hẹn *"><input type="datetime-local" className="input" value={remind_at} onChange={(e) => setRemindAt(e.target.value)} /></Field>}

      {isTestDrive && (
        <>
          <div className="mb-2 rounded bg-brand-50 p-2 text-xs text-brand-700">Lịch lái thử sẽ hiện ở mục "Lịch lái thử" sau khi lưu.</div>
          <Field label="Email khách nhận xác nhận *">
            <input type="email" className="input" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="khachhang@email.com" />
          </Field>
          <Field label="Showroom *">
            <select className="input" value={showroomId} onChange={(e) => setShowroomId(e.target.value)}>
              <option value="">-- Chọn showroom --</option>
              {showrooms.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Khung giờ lái thử *">
            <select className="input" value={slotId} onChange={(e) => setSlotId(e.target.value)}>
              <option value="">-- Chọn khung giờ --</option>
              {slots.map((s) => <option key={s.id} value={s.id}>{formatDate(s.start_time)}</option>)}
            </select>
            {showroomId && slots.length === 0 && <div className="mt-1 text-xs text-amber-600">Không còn khung giờ trống (cách hiện tại &ge;2h), thử showroom khác.</div>}
          </Field>
        </>
      )}

      <Field label="Địa điểm / ghi chú"><input className="input" value={location} onChange={(e) => setLocation(e.target.value)} /></Field>
      {err && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{err}</div>}
      <div className="flex justify-end gap-2"><button onClick={onClose} className="btn-secondary">Hủy</button><button onClick={save} className="btn-primary">Lưu</button></div>
    </Modal>
  );
}

function ResultModal({ lead, onClose, onDone }: any) {
  const isResult = ['Thành công', 'Lead thất bại'].includes(lead.status_detail);
  const [result, setResult] = useState('Thành công');
  const [lostReasons, setLostReasons] = useState<any[]>([]);
  const [lostId, setLostId] = useState('');
  const [lostNote, setLostNote] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { api.get<any[]>('/meta/lost-reasons').then(setLostReasons); }, []);

  async function save() {
    setErr('');
    try {
      await api.patch(`/leads/${lead.id}/result`, {
        result,
        lost_reason_id: result === 'Lead thất bại' ? lostId : undefined,
        lost_reason_note: lostNote || undefined,
        change_reason: isResult ? changeReason : undefined,
      });
      onDone();
    } catch (e: any) { setErr(e.message); }
  }
  const needNote = lostReasons.find((r) => r.id === lostId)?.requires_note;
  return (
    <Modal open onClose={onClose} title={isResult ? 'Sửa kết quả giao dịch' : 'Chốt kết quả giao dịch'}>
      <Field label="Kết quả">
        <select className="input" value={result} onChange={(e) => setResult(e.target.value)}>
          <option>Thành công</option><option>Lead thất bại</option>
          {isResult && PROCESSING_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </Field>
      {result === 'Lead thất bại' && (
        <>
          <Field label="Lý do Lost *">
            <select className="input" value={lostId} onChange={(e) => setLostId(e.target.value)}>
              <option value="">-- Chọn lý do --</option>
              {lostReasons.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </Field>
          {needNote && <Field label="Nội dung cụ thể *"><input className="input" value={lostNote} onChange={(e) => setLostNote(e.target.value)} /></Field>}
        </>
      )}
      {isResult && <Field label="Lý do thay đổi *"><input className="input" value={changeReason} onChange={(e) => setChangeReason(e.target.value)} /></Field>}
      {err && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{err}</div>}
      <div className="flex justify-end gap-2"><button onClick={onClose} className="btn-secondary">Hủy</button><button onClick={save} className="btn-primary">Lưu</button></div>
    </Modal>
  );
}

function AssignModal({ leadId, currentSalesId, onClose, onDone }: any) {
  const [sales, setSales] = useState<any[]>([]);
  const [salesId, setSalesId] = useState(currentSalesId || '');
  useEffect(() => { api.get<any[]>('/users/sales').then(setSales); }, []);
  async function save() { await api.post(`/leads/${leadId}/assign`, { sales_id: salesId }); onDone(); }
  return (
    <Modal open onClose={onClose} title="Gán / chuyển Lead cho Sales">
      <Field label="Sales đang phụ trách (chọn để đổi)"><select className="input" value={salesId} onChange={(e) => setSalesId(e.target.value)}><option value="">-- Chọn --</option>{sales.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select></Field>
      <div className="flex justify-end gap-2"><button onClick={onClose} className="btn-secondary">Hủy</button><button onClick={save} className="btn-primary">Gán</button></div>
    </Modal>
  );
}
