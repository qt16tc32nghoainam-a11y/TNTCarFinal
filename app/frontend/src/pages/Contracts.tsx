import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Spinner, Empty } from '../components/ui';
import { formatDate, formatVnd } from '../lib/format';

export default function Contracts() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try { setRows(await api.get<any[]>('/contracts')); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function cancelDeposit(id: string) {
    const reason = prompt('Lý do hủy cọc?');
    if (!reason) return;
    await api.post(`/contracts/${id}/cancel-deposit`, { reason });
    load();
  }

  if (loading) return <Spinner />;
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Hợp đồng bán xe</h1>
      {rows.length === 0 ? <Empty text="Chưa có hợp đồng" /> : (
        <div className="space-y-3">
          {rows.map((c) => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{c.contract_code} — {c.customer_name}</div>
                  <div className="text-sm text-gray-500">{c.car_name} · Ký ngày {formatDate(c.signed_date)}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-brand-700">{formatVnd(c.value)}</div>
                  <span className={`badge ${c.status === 'Hiệu lực' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c.status}</span>
                </div>
              </div>
              {c.payments && c.payments.length > 0 && (
                <div className="mt-2 border-t pt-2 text-sm">
                  {c.payments.map((p: any) => (
                    <div key={p.id} className="flex justify-between py-1">
                      <span>{p.method} {p.is_cancelled ? '(đã hủy cọc)' : ''}</span>
                      <span>{formatVnd(p.amount)}{p.deposit_amount ? ` · cọc ${formatVnd(p.deposit_amount)}` : ''}</span>
                    </div>
                  ))}
                </div>
              )}
              {c.status === 'Hiệu lực' && <button onClick={() => cancelDeposit(c.id)} className="btn-danger mt-2 text-xs">Hủy cọc</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
