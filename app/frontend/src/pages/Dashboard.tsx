import React, { useEffect, useState } from 'react';
import { api, getToken } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Spinner } from '../components/ui';
import { formatVnd } from '../lib/format';

export default function Dashboard() {
  const { user } = useAuth();
  const [kpi, setKpi] = useState<any>(null);
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLost, setShowLost] = useState(false);
  const [lostLeads, setLostLeads] = useState<any[] | null>(null);

  async function openLost() {
    setShowLost(true);
    if (lostLeads === null) {
      try { setLostLeads(await api.get<any[]>('/dashboard/lost-leads')); }
      catch { setLostLeads([]); }
    }
  }

  useEffect(() => {
    Promise.all([
      api.get<any>('/dashboard/kpi'),
      api.get<any>('/dashboard/ranking').catch(() => ({ salesRanking: [] })),
    ]).then(([k, r]) => { setKpi(k); setRanking(r.salesRanking || []); }).finally(() => setLoading(false));
  }, []);

  async function lockPeriod() {
    const label = prompt('Nhập nhãn kỳ cần khóa (VD: 2026-09):');
    if (!label) return;
    await api.post('/dashboard/lock', { period_type: 'Tháng', period_label: label, data: kpi });
    alert('Đã khóa số liệu kỳ ' + label);
  }

  async function exportCsv() {
    const res = await fetch('/api/dashboard/export', { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) return alert('Xuất báo cáo thất bại');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bao-cao-kpi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading || !kpi) return <Spinner />;

  const cards = [
    { label: 'Tổng Lead', value: kpi.totalLeads, color: 'text-blue-600' },
    { label: 'Won', value: kpi.won, color: 'text-green-600' },
    { label: 'Lost', value: kpi.lost, color: 'text-red-600' },
    { label: 'Tỷ lệ chốt', value: kpi.winRate + '%', color: 'text-brand-700' },
    { label: 'Doanh thu', value: formatVnd(kpi.revenue), color: 'text-emerald-600' },
    { label: 'Hợp đồng', value: kpi.contracts, color: 'text-indigo-600' },
    { label: 'Tỷ lệ hủy cọc', value: kpi.cancelRate + '%', color: 'text-amber-600' },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Dashboard KPI</h1>
          <div className="text-sm text-gray-500">Phạm vi: {kpi.scope === 'Admin' ? 'Toàn hệ thống' : kpi.scope === 'Manager' ? 'Nhóm của bạn' : 'Của bạn'}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="btn-secondary">Xuất báo cáo (CSV)</button>
          {user?.role === 'Admin' && <button onClick={lockPeriod} className="btn-secondary">Khóa số liệu kỳ</button>}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {cards.map((c) => {
          const clickable = c.label === 'Lost';
          return (
            <div
              key={c.label}
              onClick={clickable ? openLost : undefined}
              className={`card text-center ${clickable ? 'cursor-pointer ring-1 ring-transparent hover:ring-red-300' : ''}`}
              title={clickable ? 'Bấm để xem chi tiết Lead thất bại' : ''}
            >
              <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
              <div className="text-xs text-gray-500">{c.label}{clickable && Number(c.value) > 0 && ' 🔍'}</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold">Lead theo nguồn</h2>
          {kpi.bySource.map((s: any) => (
            <div key={s.source} className="mb-1 flex items-center gap-2 text-sm">
              <span className="w-32 text-gray-600">{s.source}</span>
              <div className="h-3 flex-1 rounded bg-gray-100">
                <div className="h-3 rounded bg-brand-600" style={{ width: `${(s.c / kpi.totalLeads) * 100}%` }} />
              </div>
              <span className="w-6 text-right">{s.c}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">Top lý do Lost</h2>
          {kpi.topLostReasons.length === 0 ? <div className="text-sm text-gray-400">Chưa có</div> :
            kpi.topLostReasons.map((r: any) => (
              <div key={r.label} className="flex justify-between border-b py-1 text-sm last:border-0"><span>{r.label}</span><span className="font-medium">{r.c}</span></div>
            ))}
        </div>
      </div>

      {ranking.length > 0 && (
        <div className="card mt-4">
          <h2 className="mb-3 font-semibold">Bảng xếp hạng Sales</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-gray-500"><tr><th className="p-2">#</th><th className="p-2">Sales</th><th className="p-2">Showroom</th><th className="p-2 text-right">Won</th><th className="p-2 text-right">Lost</th><th className="p-2 text-right">Doanh thu</th></tr></thead>
            <tbody>
              {ranking.map((s, i) => (
                <tr key={s.id} className="border-t"><td className="p-2">{i + 1}</td><td className="p-2 font-medium">{s.full_name}</td><td className="p-2 text-gray-500">{s.showroom_name}</td><td className="p-2 text-right text-green-600">{s.won}</td><td className="p-2 text-right text-red-600">{s.lost || 0}</td><td className="p-2 text-right">{formatVnd(s.revenue)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowLost(false)}>
          <div className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Chi tiết Lead thất bại ({lostLeads?.length ?? '...'})</h3>
              <button onClick={() => setShowLost(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            {lostLeads === null ? <Spinner /> : lostLeads.length === 0 ? (
              <div className="p-6 text-center text-gray-400">Chưa có Lead thất bại</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr><th className="p-2">Khách hàng</th><th className="p-2">Xe</th><th className="p-2">Sales</th><th className="p-2">Lý do thất bại</th><th className="p-2">Ngày</th></tr>
                </thead>
                <tbody>
                  {lostLeads.map((l) => (
                    <tr key={l.id} className="border-t align-top">
                      <td className="p-2"><div className="font-medium">{l.full_name}</div><div className="text-xs text-gray-400">{l.phone}</div></td>
                      <td className="p-2 text-gray-600">{l.car_brand ? `${l.car_brand} ${l.car_name}` : '-'}</td>
                      <td className="p-2 text-gray-600">{l.sales_name || '-'}</td>
                      <td className="p-2">
                        <span className="text-gray-800">{l.lost_reason || 'Không ghi'}</span>
                        {l.lost_reason_note && <div className="text-xs text-gray-500">{l.lost_reason_note}</div>}
                      </td>
                      <td className="p-2 text-xs text-gray-400">{new Date(l.updated_at).toLocaleDateString('vi-VN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
