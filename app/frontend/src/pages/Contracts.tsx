import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Modal, Spinner, Empty, Field } from '../components/ui';
import { formatDate, formatVnd } from '../lib/format';

const STATUS_COLOR: Record<string, string> = {
  'Đã cọc': 'bg-amber-100 text-amber-700',
  'Đã thanh toán đủ': 'bg-blue-100 text-blue-700',
  'Đã giao xe': 'bg-green-100 text-green-700',
  'Hoàn tất': 'bg-emerald-100 text-emerald-700',
  'Đã hủy cọc': 'bg-red-100 text-red-700',
  'Hiệu lực': 'bg-gray-100 text-gray-700',
};

export default function Contracts() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [payFor, setPayFor] = useState<any>(null);
  const [deliverFor, setDeliverFor] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editFor, setEditFor] = useState<any>(null);

  async function load() {
    setLoading(true);
    try { setRows(await api.get<any[]>('/contracts')); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function removeContract(id: string) {
    if (!confirm('Xóa hợp đồng này? Các thanh toán liên quan cũng bị xóa.')) return;
    try { await api.del(`/contracts/${id}`); load(); }
    catch (e: any) { alert(e.message); }
  }

  async function cancelDeposit(id: string) {
    const reason = prompt('Lý do hủy cọc?');
    if (!reason) return;
    try { await api.post(`/contracts/${id}/cancel-deposit`, { reason }); load(); }
    catch (e: any) { alert(e.message); }
  }
  async function complete(id: string) {
    if (!confirm('Đánh dấu hợp đồng Hoàn tất?')) return;
    try { await api.post(`/contracts/${id}/complete`); load(); }
    catch (e: any) { alert(e.message); }
  }

  if (loading) return <Spinner />;

  const filtered = rows.filter((c) => !statusFilter || c.status === statusFilter);
  // Thống kê nhanh
  const totalValue = rows.reduce((s, c) => s + (c.status !== 'Đã hủy cọc' ? c.value : 0), 0);
  const totalPaid = rows.reduce((s, c) => s + (c.paid_total || 0), 0);
  const delivered = rows.filter((c) => ['Đã giao xe', 'Hoàn tất'].includes(c.status)).length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Hợp đồng bán xe</h1>
        <div className="flex items-center gap-2">
          <select className="input w-auto text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            {['Đã cọc', 'Đã thanh toán đủ', 'Đã giao xe', 'Hoàn tất', 'Đã hủy cọc'].map((s) => <option key={s}>{s}</option>)}
          </select>
          <button onClick={() => setShowCreate(true)} className="btn-primary">+ Tạo hợp đồng</button>
        </div>
      </div>

      {/* Thống kê */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Tổng hợp đồng" value={String(rows.length)} />
        <StatCard label="Giá trị (hiệu lực)" value={formatVnd(totalValue)} />
        <StatCard label="Đã thu" value={formatVnd(totalPaid)} />
        <StatCard label="Đã giao xe" value={String(delivered)} />
      </div>

      {filtered.length === 0 ? <Empty text="Chưa có hợp đồng phù hợp" /> : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const paid = c.paid_total || 0;
            const remaining = c.remaining ?? Math.max(0, c.value - paid);
            const pct = c.value > 0 ? Math.min(100, Math.round((paid / c.value) * 100)) : 0;
            const canDeliver = paid >= c.value && !['Đã giao xe', 'Hoàn tất', 'Đã hủy cọc'].includes(c.status);
            return (
              <div key={c.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{c.contract_code} — {c.customer_name}</div>
                    <div className="text-sm text-gray-500">{c.customer_phone} · {c.car_brand} {c.car_name}</div>
                    <div className="text-xs text-gray-400">
                      Ký {formatDate(c.signed_date)}
                      {c.payment_method && ` · ${c.payment_method}`}
                      {c.bank_name && ` · ${c.bank_name}`}
                      {c.sales_name && ` · Sales: ${c.sales_name}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-brand-700">{formatVnd(c.value)}</div>
                    <span className={`badge ${STATUS_COLOR[c.status] || 'bg-gray-100'}`}>{c.status}</span>
                  </div>
                </div>

                {/* Tiến độ thanh toán */}
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-gray-500">
                    <span>Đã thu: <b className="text-gray-700">{formatVnd(paid)}</b></span>
                    <span>Còn lại: <b className={remaining > 0 ? 'text-amber-600' : 'text-green-600'}>{formatVnd(remaining)}</b></span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full ${pct >= 100 ? 'bg-green-500' : 'bg-brand-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {/* Danh sách thanh toán */}
                {c.payments && c.payments.length > 0 && (
                  <div className="mt-2 border-t pt-2 text-sm">
                    {c.payments.map((p: any) => (
                      <div key={p.id} className={`flex justify-between py-1 ${p.is_cancelled ? 'text-gray-400 line-through' : ''}`}>
                        <span>{p.method} · {formatDate(p.paid_at)} {p.is_cancelled ? '(đã hủy)' : ''}</span>
                        <span>{formatVnd(p.amount)}{p.deposit_amount ? ` · cọc ${formatVnd(p.deposit_amount)}` : ''}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Thông tin bàn giao */}
                {['Đã giao xe', 'Hoàn tất'].includes(c.status) && (
                  <div className="mt-2 rounded-lg bg-green-50 p-2 text-xs text-green-800">
                    🚗 Đã giao {c.delivered_at ? formatDate(c.delivered_at) : ''}
                    {c.plate_number && ` · Biển: ${c.plate_number}`}
                    {c.vin && ` · VIN: ${c.vin}`}
                    {c.delivery_note && ` · ${c.delivery_note}`}
                  </div>
                )}

                {/* Thao tác */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {!['Đã hủy cọc', 'Hoàn tất'].includes(c.status) && !['Đã giao xe'].includes(c.status) && (
                    <button onClick={() => setPayFor(c)} className="btn-secondary text-xs">+ Ghi thanh toán</button>
                  )}
                  {canDeliver && <button onClick={() => setDeliverFor(c)} className="btn-primary text-xs">🚗 Giao xe</button>}
                  {c.status === 'Đã giao xe' && <button onClick={() => complete(c.id)} className="btn-secondary text-xs">Đánh dấu Hoàn tất</button>}
                  {!['Đã giao xe', 'Hoàn tất', 'Đã hủy cọc'].includes(c.status) && (
                    <>
                      <button onClick={() => setEditFor(c)} className="btn-secondary text-xs">Sửa</button>
                      <button onClick={() => cancelDeposit(c.id)} className="btn-danger text-xs">Hủy cọc</button>
                      <button onClick={() => removeContract(c.id)} className="text-xs text-red-600 hover:underline">Xóa</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {payFor && <PaymentModal contract={payFor} onClose={() => setPayFor(null)} onDone={() => { setPayFor(null); load(); }} />}
      {deliverFor && <DeliverModal contract={deliverFor} onClose={() => setDeliverFor(null)} onDone={() => { setDeliverFor(null); load(); }} />}
      {showCreate && <CreateContractModal onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); load(); }} />}
      {editFor && <EditContractModal contract={editFor} onClose={() => setEditFor(null)} onDone={() => { setEditFor(null); load(); }} />}
    </div>
  );
}

function CreateContractModal({ onClose, onDone }: any) {
  const [leads, setLeads] = useState<any[]>([]);
  const [leadId, setLeadId] = useState('');
  const [value, setValue] = useState('');
  const [method, setMethod] = useState('Đặt cọc');
  const [bank, setBank] = useState('');
  const [signedDate, setSignedDate] = useState('');
  const [expected, setExpected] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get<any[]>('/contracts/eligible-leads').then(setLeads).catch(() => {}); }, []);
  const selectedLead = leads.find((l) => l.id === leadId);

  useEffect(() => {
    if (selectedLead?.car_price) setValue(String(selectedLead.car_price));
  }, [leadId]);

  async function save() {
    setErr('');
    if (!leadId) return setErr('Vui lòng chọn khách hàng (Lead Thành công)');
    if (!selectedLead?.car_model_id) return setErr('Lead này chưa gắn dòng xe, không thể tạo hợp đồng');
    if (!value || Number(value) <= 0) return setErr('Nhập giá trị hợp đồng hợp lệ');
    setSaving(true);
    try {
      await api.post('/contracts', {
        lead_id: leadId,
        car_model_id: selectedLead.car_model_id,
        value: Number(value),
        signed_date: signedDate ? new Date(signedDate).toISOString() : undefined,
        payment_method: method,
        bank_name: method === 'Trả góp' ? bank : undefined,
        expected_delivery: expected ? new Date(expected).toISOString() : undefined,
        note,
      });
      onDone();
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  }

  return (
    <Modal open onClose={onClose} title="Tạo hợp đồng">
      <Field label="Khách hàng (Lead đã chốt Thành công) *">
        <select className="input" value={leadId} onChange={(e) => setLeadId(e.target.value)}>
          <option value="">-- Chọn khách hàng --</option>
          {leads.map((l) => <option key={l.id} value={l.id}>{l.full_name} · {l.phone} {l.car_name ? `· ${l.car_brand} ${l.car_name}` : '(chưa có xe)'}</option>)}
        </select>
        {leads.length === 0 && <div className="mt-1 text-xs text-amber-600">Chưa có Lead nào ở trạng thái Thành công (hoặc đều đã có hợp đồng).</div>}
      </Field>
      {selectedLead && <div className="mb-3 rounded bg-gray-50 p-2 text-sm">Xe: <b>{selectedLead.car_brand} {selectedLead.car_name || '(chưa gắn xe)'}</b></div>}
      <Field label="Giá trị hợp đồng (đ) *"><input className="input" type="number" value={value} onChange={(e) => setValue(e.target.value)} /></Field>
      <Field label="Hình thức thanh toán">
        <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option>Đặt cọc</option><option>Trả góp</option><option>Trả thẳng</option>
        </select>
      </Field>
      {method === 'Trả góp' && (
        <Field label="Ngân hàng">
          <select className="input" value={bank} onChange={(e) => setBank(e.target.value)}>
            <option value="">-- Chọn --</option>
            {['Techcombank', 'Vietcombank', 'Agribank', 'Sacombank', 'HDBank'].map((b) => <option key={b}>{b}</option>)}
          </select>
        </Field>
      )}
      <Field label="Ngày ký"><input className="input" type="date" value={signedDate} onChange={(e) => setSignedDate(e.target.value)} /></Field>
      <Field label="Ngày giao dự kiến"><input className="input" type="date" value={expected} onChange={(e) => setExpected(e.target.value)} /></Field>
      <Field label="Ghi chú"><textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      {err && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{err}</div>}
      <div className="flex justify-end gap-2"><button onClick={onClose} className="btn-secondary">Hủy</button><button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Đang tạo...' : 'Tạo hợp đồng'}</button></div>
    </Modal>
  );
}

function EditContractModal({ contract, onClose, onDone }: any) {
  const [value, setValue] = useState(String(contract.value || ''));
  const [method, setMethod] = useState(contract.payment_method || 'Đặt cọc');
  const [bank, setBank] = useState(contract.bank_name || '');
  const [note, setNote] = useState(contract.note || '');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setErr('');
    if (!value || Number(value) <= 0) return setErr('Nhập giá trị hợp lệ');
    setSaving(true);
    try {
      await api.patch(`/contracts/${contract.id}`, {
        value: Number(value),
        payment_method: method,
        bank_name: method === 'Trả góp' ? bank : '',
        note,
      });
      onDone();
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  }

  return (
    <Modal open onClose={onClose} title={`Sửa hợp đồng · ${contract.contract_code}`}>
      <div className="mb-3 rounded bg-gray-50 p-2 text-sm">{contract.customer_name} · {contract.car_brand} {contract.car_name}</div>
      <Field label="Giá trị hợp đồng (đ) *"><input className="input" type="number" value={value} onChange={(e) => setValue(e.target.value)} /></Field>
      <Field label="Hình thức thanh toán">
        <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option>Đặt cọc</option><option>Trả góp</option><option>Trả thẳng</option>
        </select>
      </Field>
      {method === 'Trả góp' && (
        <Field label="Ngân hàng">
          <select className="input" value={bank} onChange={(e) => setBank(e.target.value)}>
            <option value="">-- Chọn --</option>
            {['Techcombank', 'Vietcombank', 'Agribank', 'Sacombank', 'HDBank'].map((b) => <option key={b}>{b}</option>)}
          </select>
        </Field>
      )}
      <Field label="Ghi chú"><textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      {err && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{err}</div>}
      <div className="flex justify-end gap-2"><button onClick={onClose} className="btn-secondary">Hủy</button><button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Đang lưu...' : 'Lưu'}</button></div>
    </Modal>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 font-bold text-gray-800">{value}</div>
    </div>
  );
}

function PaymentModal({ contract, onClose, onDone }: any) {
  const [method, setMethod] = useState(contract.payment_method || 'Đặt cọc');
  const [amount, setAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const remaining = contract.remaining ?? Math.max(0, contract.value - (contract.paid_total || 0));

  async function save() {
    setErr('');
    if (!amount || Number(amount) <= 0) return setErr('Nhập số tiền hợp lệ');
    setSaving(true);
    try {
      await api.post(`/contracts/${contract.id}/payments`, {
        method, amount: Number(amount),
        deposit_amount: depositAmount ? Number(depositAmount) : undefined,
      });
      onDone();
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  }

  return (
    <Modal open onClose={onClose} title={`Ghi thanh toán · ${contract.contract_code}`}>
      <div className="mb-3 rounded bg-gray-50 p-2 text-sm">
        Giá trị: <b>{formatVnd(contract.value)}</b> · Còn lại: <b className="text-amber-600">{formatVnd(remaining)}</b>
      </div>
      <Field label="Phương thức">
        <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option>Đặt cọc</option><option>Trả góp</option><option>Trả thẳng</option>
        </select>
      </Field>
      <Field label="Số tiền thu đợt này (đ) *">
        <input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button type="button" onClick={() => setAmount(String(remaining))} className="mt-1 text-xs text-brand-700 hover:underline">Điền số còn lại ({formatVnd(remaining)})</button>
      </Field>
      {(method === 'Đặt cọc' || method === 'Trả góp') && (
        <Field label="Số tiền cọc (đ)"><input className="input" type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} /></Field>
      )}
      {err && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{err}</div>}
      <div className="flex justify-end gap-2"><button onClick={onClose} className="btn-secondary">Hủy</button><button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Đang lưu...' : 'Ghi nhận'}</button></div>
    </Modal>
  );
}

function DeliverModal({ contract, onClose, onDone }: any) {
  const [vin, setVin] = useState('');
  const [plate, setPlate] = useState('');
  const [deliveredAt, setDeliveredAt] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setErr('');
    setSaving(true);
    try {
      await api.post(`/contracts/${contract.id}/deliver`, {
        vin, plate_number: plate,
        delivered_at: deliveredAt ? new Date(deliveredAt).toISOString() : undefined,
        delivery_note: note,
      });
      onDone();
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  }

  return (
    <Modal open onClose={onClose} title={`Bàn giao xe · ${contract.contract_code}`}>
      <div className="mb-3 rounded bg-green-50 p-2 text-sm text-green-800">Khách {contract.customer_name} · {contract.car_brand} {contract.car_name}</div>
      <Field label="Số khung (VIN)"><input className="input" value={vin} onChange={(e) => setVin(e.target.value)} placeholder="VD: RL4...123" /></Field>
      <Field label="Biển số xe"><input className="input" value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="VD: 51K-123.45" /></Field>
      <Field label="Ngày giao"><input className="input" type="datetime-local" value={deliveredAt} onChange={(e) => setDeliveredAt(e.target.value)} /></Field>
      <Field label="Ghi chú bàn giao"><textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tình trạng xe, phụ kiện kèm theo..." /></Field>
      {err && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{err}</div>}
      <div className="flex justify-end gap-2"><button onClick={onClose} className="btn-secondary">Hủy</button><button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Đang lưu...' : 'Xác nhận giao xe'}</button></div>
    </Modal>
  );
}
