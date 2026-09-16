import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Modal, Spinner, Field } from '../components/ui';
import { formatDate } from '../lib/format';

export default function Slots() {
  const [showrooms, setShowrooms] = useState<any[]>([]);
  const [showroomId, setShowroomId] = useState('');
  const [slots, setSlots] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get<any[]>('/meta/showrooms').then((s) => { setShowrooms(s); if (s[0]) setShowroomId(s[0].id); }); }, []);

  async function load() {
    if (!showroomId) return;
    setLoading(true);
    try { setSlots(await api.get<any[]>(`/cars/slots/available/${showroomId}`)); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [showroomId]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Cấu hình khung giờ lái thử</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ Thêm khung giờ</button>
      </div>
      <div className="card mb-4">
        <Field label="Showroom"><select className="input" value={showroomId} onChange={(e) => setShowroomId(e.target.value)}>{showrooms.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
      </div>
      {loading ? <Spinner /> : (
        <div className="card">
          <h2 className="mb-2 font-semibold">Khung giờ còn trống</h2>
          {slots.length === 0 ? <div className="text-sm text-gray-400">Chưa có khung giờ trống</div> : (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {slots.map((s) => <div key={s.id} className="rounded-lg border p-2 text-center text-sm">{formatDate(s.start_time)}</div>)}
            </div>
          )}
        </div>
      )}
      {showCreate && <CreateSlotModal showroomId={showroomId} onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

function CreateSlotModal({ showroomId, onClose, onDone }: any) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [err, setErr] = useState('');
  async function save() {
    setErr('');
    try {
      await api.post('/cars/slots', { showroom_id: showroomId, start_time: new Date(start).toISOString(), end_time: new Date(end).toISOString() });
      onDone();
    } catch (e: any) { setErr(e.message); }
  }
  return (
    <Modal open onClose={onClose} title="Thêm khung giờ">
      <Field label="Bắt đầu"><input type="datetime-local" className="input" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
      <Field label="Kết thúc"><input type="datetime-local" className="input" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
      {err && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{err}</div>}
      <div className="flex justify-end gap-2"><button onClick={onClose} className="btn-secondary">Hủy</button><button onClick={save} className="btn-primary">Thêm</button></div>
    </Modal>
  );
}
