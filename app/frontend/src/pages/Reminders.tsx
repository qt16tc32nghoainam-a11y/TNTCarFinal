import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Reminder } from '../lib/types';
import { Spinner, Empty } from '../components/ui';
import { formatDate } from '../lib/format';

export default function Reminders() {
  const [rows, setRows] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get<Reminder[]>('/care/reminders/upcoming').then(setRows).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-bold">Lịch hẹn sắp tới</h1>
      {rows.length === 0 ? <Empty text="Chưa có lịch hẹn nào" /> : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="card flex items-center justify-between">
              <div>
                <div className="font-medium">{r.purpose} — <Link to={`/leads/${r.lead_id}`} className="text-brand-700 hover:underline">{r.lead_name}</Link></div>
                <div className="text-sm text-gray-500">{r.lead_phone} · {r.location}</div>
              </div>
              <div className="text-right text-sm">
                <div className="font-medium text-brand-700">{formatDate(r.remind_at)}</div>
                <div className="text-xs text-gray-400">Nhắc trước {r.notify_before_minutes} phút</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
