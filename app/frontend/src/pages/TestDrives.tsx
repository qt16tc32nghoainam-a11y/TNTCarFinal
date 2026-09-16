import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Spinner, Empty } from '../components/ui';
import { formatDate, statusColor } from '../lib/format';

export default function TestDrives() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try { setRows(await api.get<any[]>('/cars/test-drives/list')); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function update(id: string, status: string) {
    let note: string | undefined;
    if (status === 'Từ chối') { note = prompt('Lý do từ chối?') || ''; if (!note) return; }
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
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Lịch lái thử</h1>
      {rows.length === 0 ? <Empty text="Chưa có lịch lái thử" /> : (
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
                    {r.status === 'Chờ xác nhận' && (
                      <div className="flex gap-1">
                        <button onClick={() => update(r.id, 'Đã xác nhận')} className="badge bg-blue-100 text-blue-700">Xác nhận</button>
                        <button onClick={() => update(r.id, 'Từ chối')} className="badge bg-red-100 text-red-700">Từ chối</button>
                      </div>
                    )}
                    {r.status === 'Đã xác nhận' && (
                      <div className="flex flex-wrap gap-1">
                        <button onClick={() => update(r.id, 'Hoàn thành')} className="badge bg-green-100 text-green-700">Hoàn thành</button>
                        <button onClick={() => update(r.id, 'Vắng mặt')} className="badge bg-gray-100 text-gray-600">Vắng mặt</button>
                        <button onClick={() => update(r.id, 'Hủy')} className="badge bg-red-100 text-red-700">Hủy</button>
                      </div>
                    )}
                    {r.status === 'Chờ xác nhận' && null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
