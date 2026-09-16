import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Spinner } from '../components/ui';
import { formatVnd } from '../lib/format';

export default function Dashboard() {
  const { user } = useAuth();
  const [kpi, setKpi] = useState<any>(null);
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        {user?.role === 'Admin' && <button onClick={lockPeriod} className="btn-secondary">Khóa số liệu kỳ</button>}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {cards.map((c) => (
          <div key={c.label} className="card text-center">
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
            <div className="text-xs text-gray-500">{c.label}</div>
          </div>
        ))}
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
            <thead className="text-left text-xs uppercase text-gray-500"><tr><th className="p-2">#</th><th className="p-2">Sales</th><th className="p-2">Showroom</th><th className="p-2 text-right">Won</th><th className="p-2 text-right">Doanh thu</th></tr></thead>
            <tbody>
              {ranking.map((s, i) => (
                <tr key={s.id} className="border-t"><td className="p-2">{i + 1}</td><td className="p-2 font-medium">{s.full_name}</td><td className="p-2 text-gray-500">{s.showroom_name}</td><td className="p-2 text-right">{s.won}</td><td className="p-2 text-right">{formatVnd(s.revenue)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
