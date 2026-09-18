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
  const [showContract, setShowContract] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
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
            <div className="text-sm text-gray-500">{lead.phone} · {lead.source}</div>
            {lead.car_name && <div className="text-sm text-gray-500">Quan tâm: {lead.car_brand} {lead.car_name}</div>}
          </div>
          <span className={`badge ${statusColor(lead.status_detail)}`}>{lead.status_detail}</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => setShowActivity(true)} className="btn-primary text-xs">Ghi hoạt động</button>
          <button onClick={() => setShowReminder(true)} className="btn-secondary text-xs">Tạo lịch hẹn</button>
          <button onClick={() => setShowResult(true)} className="btn-secondary text-xs">{isResult ? 'Sửa kết quả' : 'Chốt Won/Lost'}</button>
          {lead.status_detail === 'Thành công' && <button onClick={() => setShowContract(true)} className="btn-secondary text-xs">Tạo hợp đồng</button>}
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
      {showReminder && <ReminderModal leadId={lead.id} onClose={() => setShowReminder(false)} onDone={() => { setShowReminder(false); load(); }} />}
      {showResult && <ResultModal lead={lead} onClose={() => setShowResult(false)} onDone={() => { setShowResult(false); load(); }} />}
      {showContract && <ContractModal lead={lead} onClose={() => setShowContract(false)} onDone={() => { setShowContract(false); load(); }} />}
      {showAssign && <AssignModal leadId={lead.id} onClose={() => setShowAssign(false)} onDone={() => { setShowAssign(false); load(); }} />}
    </div>
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

function ReminderModal({ leadId, onClose, onDone }: any) {
  const [remind_at, setRemindAt] = useState('');
  const [purpose, setPurpose] = useState('Lái thử');
  const [location, setLocation] = useState('');
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
      api.get<any[]>(`/cars/slots/available/${showroomId}`).then(setSlots).catch(() => setSlots([]));
    } else {
      setSlots([]); setSlotId('');
    }
  }, [showroomId, isTestDrive]);

  async function save() {
    setErr('');
    if (!remind_at) return setErr('Vui lòng chọn thời gian hẹn');
    if (new Date(remind_at).getTime() <= Date.now()) return setErr('Thời gian nhắc việc phải ở tương lai');
    // Khi lái thử: bắt buộc chọn showroom + khung giờ để tạo lịch lái thử
    if (isTestDrive && (!showroomId || !slotId)) return setErr('Với lịch lái thử, vui lòng chọn Showroom và Khung giờ');
    try {
      const id = uuid();
      const payload: any = { id, lead_id: leadId, remind_at: new Date(remind_at).toISOString(), purpose, location };
      if (isTestDrive) { payload.showroom_id = showroomId; payload.slot_id = slotId; }
      if (navigator.onLine) {
        await api.post('/care/reminders', payload);
      } else {
        // Offline: lịch lái thử cần slot nên chỉ lưu reminder; booking tạo khi online
        await enqueue({ id, entity_type: 'reminder', payload: { lead_id: leadId, remind_at: payload.remind_at, purpose, location, created_at: new Date().toISOString() }, updated_at: new Date().toISOString() });
        alert('Đã lưu lịch hẹn cục bộ (offline), sẽ đồng bộ khi có mạng.');
      }
      onDone();
    } catch (e: any) { setErr(e.message); }
  }

  return (
    <Modal open onClose={onClose} title="Tạo lịch hẹn">
      <Field label="Mục đích"><select className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)}><option>Lái thử</option><option>Tư vấn lại</option><option>Khác</option></select></Field>
      <Field label="Thời gian hẹn *"><input type="datetime-local" className="input" value={remind_at} onChange={(e) => setRemindAt(e.target.value)} /></Field>

      {isTestDrive && (
        <>
          <div className="mb-2 rounded bg-brand-50 p-2 text-xs text-brand-700">Lịch lái thử sẽ hiện ở mục "Lịch lái thử" sau khi lưu.</div>
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

function ContractModal({ lead, onClose, onDone }: any) {
  const [value, setValue] = useState('');
  const [method, setMethod] = useState('Đặt cọc');
  const [deposit, setDeposit] = useState('');
  const [err, setErr] = useState('');
  async function save() {
    setErr('');
    try {
      const c = await api.post<any>('/contracts', { lead_id: lead.id, car_model_id: lead.car_model_id, value: Number(value) });
      await api.post(`/contracts/${c.id}/payments`, {
        method, amount: method === 'Trả thẳng' ? Number(value) : Number(deposit || value),
        deposit_amount: method === 'Trả thẳng' ? undefined : Number(deposit),
      });
      onDone();
    } catch (e: any) { setErr(e.message); }
  }
  return (
    <Modal open onClose={onClose} title="Tạo hợp đồng bán xe">
      <Field label="Giá trị hợp đồng (đ) *"><input type="number" className="input" value={value} onChange={(e) => setValue(e.target.value)} /></Field>
      <Field label="Phương thức thanh toán"><select className="input" value={method} onChange={(e) => setMethod(e.target.value)}><option>Đặt cọc</option><option>Trả góp</option><option>Trả thẳng</option></select></Field>
      {method !== 'Trả thẳng' && <Field label="Số tiền cọc (đ) *"><input type="number" className="input" value={deposit} onChange={(e) => setDeposit(e.target.value)} /></Field>}
      {err && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{err}</div>}
      <div className="flex justify-end gap-2"><button onClick={onClose} className="btn-secondary">Hủy</button><button onClick={save} className="btn-primary">Tạo</button></div>
    </Modal>
  );
}

function AssignModal({ leadId, onClose, onDone }: any) {
  const [sales, setSales] = useState<any[]>([]);
  const [salesId, setSalesId] = useState('');
  useEffect(() => { api.get<any[]>('/users/sales').then(setSales); }, []);
  async function save() { await api.post(`/leads/${leadId}/assign`, { sales_id: salesId }); onDone(); }
  return (
    <Modal open onClose={onClose} title="Gán / chuyển Lead cho Sales">
      <Field label="Sales"><select className="input" value={salesId} onChange={(e) => setSalesId(e.target.value)}><option value="">-- Chọn --</option>{sales.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select></Field>
      <div className="flex justify-end gap-2"><button onClick={onClose} className="btn-secondary">Hủy</button><button onClick={save} className="btn-primary">Gán</button></div>
    </Modal>
  );
}
