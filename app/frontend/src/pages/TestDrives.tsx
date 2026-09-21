import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Spinner, Empty } from '../components/ui';
import { formatDate, statusColor } from '../lib/format';

const TD_STATUSES = ['Đã xác nhận', 'Hoàn thành', 'Vắng mặt', 'Hủy'];

// So sánh 2 mốc thời gian theo NGÀY (bỏ giờ), trả về số ngày lệch (0 = cùng ngày)
function dayDiff(iso: string, base: Date): number {
  const d = new Date(iso);
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const b = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}
function dayLabel(offset: number, date: Date): string {
  const base = offset === 0 ? 'Hôm nay' : offset === -1 ? 'Hôm qua' : offset === 1 ? 'Ngày mai' : '';
  const dmy = date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  return base ? `${base} · ${dmy}` : dmy;
}

export default function TestDrives() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dayOffset, setDayOffset] = useState(0);       // 0 = hôm nay
  const [statusFilter, setStatusFilter] = useState('');
  const [viewAll, setViewAll] = useState(false);       // xem tất cả (không lọc theo ngày)

  async function load() {
    setLoading(true);
    try { setRows(await api.get<any[]>('/cars/test-drives/list')); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const [reschedule, setReschedule] = useState<any>(null);

  async function update(id: string, status: string) {
    let note: string | undefined;
    if (status === 'Hủy' && !confirm('Xác nhận hủy lịch lái thử này?')) return;
    if (status === 'Hoàn thành' || status === 'Vắng mặt') note = prompt('Ghi chú kết quả (tùy chọn):') || '';
    try {
      await api.patch(`/cars/test-drives/${id}/status`, { status, note });
      load();
    } catch (e: any) {
      alert(e.message); // vd: "Chỉ được hủy trước giờ hẹn tối thiểu 4 giờ..."
    }
  }

  const tdStatusColor = (s: string) => ({
    'Chờ xác nhận': 'bg-amber-100 text-amber-700', 'Đã xác nhận': 'bg-blue-100 text-blue-700',
    'Hoàn thành': 'bg-green-100 text-green-700', 'Từ chối': 'bg-red-100 text-red-700',
    'Vắng mặt': 'bg-gray-100 text-gray-500', 'Hủy': 'bg-gray-100 text-gray-400',
  }[s] || 'bg-gray-100');

  if (loading) return <Spinner />;

  const base = new Date();
  const selectedDate = new Date(base);
  selectedDate.setDate(base.getDate() + dayOffset);

  // Lọc theo trạng thái + (nếu không xem tất cả) theo ngày đang chọn
  let filtered = rows.filter((r) => !statusFilter || r.status === statusFilter);
  if (!viewAll) filtered = filtered.filter((r) => dayDiff(r.start_time, base) === dayOffset);

  // Nhóm theo ngày khi xem tất cả
  const groups: { offset: number; date: Date; items: any[] }[] = [];
  if (viewAll) {
    const map = new Map<number, any[]>();
    for (const r of filtered) {
      const off = dayDiff(r.start_time, base);
      if (!map.has(off)) map.set(off, []);
      map.get(off)!.push(r);
    }
    Array.from(map.keys()).sort((a, b) => b - a).forEach((off) => {
      const dt = new Date(base); dt.setDate(base.getDate() + off);
      groups.push({ offset: off, date: dt, items: map.get(off)! });
    });
  }

  const countForDay = (off: number) => rows.filter((r) => dayDiff(r.start_time, base) === off && (!statusFilter || r.status === statusFilter)).length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Lịch lái thử</h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* Lọc trạng thái */}
          <select className="input w-auto text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            {TD_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          {/* Chuyển chế độ xem */}
          <button onClick={() => setViewAll(!viewAll)} className={`badge ${viewAll ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
            {viewAll ? 'Đang xem: Tất cả ngày' : 'Xem tất cả ngày'}
          </button>
        </div>
      </div>

      {/* Điều hướng ngày (ẩn khi xem tất cả) */}
      {!viewAll && (
        <div className="mb-4 flex items-center justify-between rounded-xl border bg-white p-3">
          <button onClick={() => setDayOffset(dayOffset - 1)} className="btn-secondary text-sm">◀ Hôm trước</button>
          <div className="text-center">
            <div className="font-semibold">{dayLabel(dayOffset, selectedDate)}</div>
            <div className="text-xs text-gray-500">{countForDay(dayOffset)} lịch{dayOffset !== 0 && <button onClick={() => setDayOffset(0)} className="ml-2 text-brand-700 hover:underline">Về hôm nay</button>}</div>
          </div>
          <button onClick={() => setDayOffset(dayOffset + 1)} className="btn-secondary text-sm">Hôm sau ▶</button>
        </div>
      )}

      {filtered.length === 0 ? (
        <Empty text={viewAll ? 'Không có lịch lái thử phù hợp' : `Không có lịch lái thử ${dayLabel(dayOffset, selectedDate).toLowerCase()}`} />
      ) : viewAll ? (
        // Xem tất cả: nhóm theo ngày
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.offset}>
              <div className="mb-2 text-sm font-semibold text-brand-700">{dayLabel(g.offset, g.date)} ({g.items.length})</div>
              <BookingTable rows={g.items} update={update} tdStatusColor={tdStatusColor} onReschedule={setReschedule} />
            </div>
          ))}
        </div>
      ) : (
        <BookingTable rows={filtered} update={update} tdStatusColor={tdStatusColor} onReschedule={setReschedule} />
      )}

      {reschedule && <RescheduleModal booking={reschedule} onClose={() => setReschedule(null)} onDone={() => { setReschedule(null); load(); }} />}
    </div>
  );
}

function BookingTable({ rows, update, tdStatusColor, onReschedule }: { rows: any[]; update: (id: string, s: string) => void; tdStatusColor: (s: string) => string; onReschedule: (r: any) => void }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
          <tr><th className="p-3">Mã</th><th className="p-3">Khách</th><th className="p-3">Xe</th><th className="p-3">Showroom</th><th className="p-3">Thời gian</th><th className="p-3">Trạng thái</th><th className="p-3">Thao tác</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-mono text-xs">{r.booking_code}</td>
                  <td className="p-3">{r.customer_name}<div className="text-xs text-gray-400">{r.customer_phone}</div></td>
                  <td className="p-3">{r.car_name}</td>
                  <td className="p-3 text-gray-500">{r.showroom_name}</td>
                  <td className="p-3 text-xs">{formatDate(r.start_time)}</td>
                  <td className="p-3"><span className={`badge ${tdStatusColor(r.status)}`}>{r.status}</span></td>
                  <td className="p-3">
                    {r.status === 'Đã xác nhận' && (
                      <div className="flex flex-wrap gap-1">
                        <button onClick={() => update(r.id, 'Hoàn thành')} className="badge bg-green-100 text-green-700">Hoàn thành</button>
                        <button onClick={() => update(r.id, 'Vắng mặt')} className="badge bg-gray-100 text-gray-600">Vắng mặt</button>
                        <button onClick={() => onReschedule(r)} className="badge bg-blue-100 text-blue-700">Đổi lịch</button>
                        <button onClick={() => update(r.id, 'Hủy')} className="badge bg-red-100 text-red-700">Hủy</button>
                      </div>
                    )}
                  </td>
                </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RescheduleModal({ booking, onClose, onDone }: { booking: any; onClose: () => void; onDone: () => void }) {
  const [showrooms, setShowrooms] = useState<any[]>([]);
  const [showroomId, setShowroomId] = useState(booking.showroom_id || '');
  const [slots, setSlots] = useState<any[]>([]);
  const [slotId, setSlotId] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get<any[]>('/meta/showrooms').then(setShowrooms).catch(() => {}); }, []);
  useEffect(() => {
    if (showroomId) api.get<any[]>(`/cars/slots/available/${showroomId}`).then(setSlots).catch(() => setSlots([]));
    else setSlots([]);
    setSlotId('');
  }, [showroomId]);

  async function save() {
    setErr('');
    if (!slotId) return setErr('Vui lòng chọn khung giờ mới');
    setSaving(true);
    try {
      await api.patch(`/cars/test-drives/${booking.id}/reschedule`, { new_slot_id: slotId });
      onDone();
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Đổi lịch lái thử</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
        </div>
        <div className="mb-3 rounded bg-gray-50 p-2 text-sm">
          {booking.customer_name} · {booking.car_name}
          <div className="text-xs text-gray-500">Hiện tại: {formatDate(booking.start_time)}</div>
        </div>
        <div className="mb-3">
          <label className="label">Showroom</label>
          <select className="input" value={showroomId} onChange={(e) => setShowroomId(e.target.value)}>
            <option value="">-- Chọn showroom --</option>
            {showrooms.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="mb-3">
          <label className="label">Khung giờ mới (còn trống, cách hiện tại ≥2h)</label>
          <select className="input" value={slotId} onChange={(e) => setSlotId(e.target.value)}>
            <option value="">-- Chọn khung giờ --</option>
            {slots.map((s) => <option key={s.id} value={s.id}>{formatDate(s.start_time)}</option>)}
          </select>
          {showroomId && slots.length === 0 && <div className="mt-1 text-xs text-amber-600">Không còn khung giờ trống, thử showroom khác.</div>}
        </div>
        {err && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{err}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Hủy</button>
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Đang lưu...' : 'Đổi lịch'}</button>
        </div>
      </div>
    </div>
  );
}
