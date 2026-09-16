import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { pendingCount } from '../lib/db';
import { startAutoSync, runSync } from '../lib/sync';
import { api } from '../lib/api';
import InstallButton from './InstallButton';

const navByRole: Record<string, { to: string; label: string; icon: string }[]> = {
  Sales: [
    { to: '/leads', label: 'Quản lý Lead', icon: '👥' },
    { to: '/reminders', label: 'Lịch hẹn', icon: '🔔' },
    { to: '/cars', label: 'Tra cứu xe', icon: '🚗' },
    { to: '/test-drives', label: 'Lịch lái thử', icon: '🗓️' },
    { to: '/contracts', label: 'Hợp đồng', icon: '📄' },
    { to: '/dashboard', label: 'KPI của tôi', icon: '📊' },
  ],
  Manager: [
    { to: '/dashboard', label: 'Dashboard KPI', icon: '📊' },
    { to: '/leads', label: 'Lead của nhóm', icon: '👥' },
    { to: '/contracts', label: 'Hợp đồng', icon: '📄' },
  ],
  Admin: [
    { to: '/dashboard', label: 'Dashboard KPI', icon: '📊' },
    { to: '/leads', label: 'Quản lý Lead', icon: '👥' },
    { to: '/users', label: 'Người dùng', icon: '👤' },
    { to: '/cars', label: 'Tra cứu xe', icon: '🚗' },
    { to: '/test-drives', label: 'Lịch lái thử', icon: '🗓️' },
    { to: '/slots', label: 'Cấu hình slot', icon: '⚙️' },
    { to: '/contracts', label: 'Hợp đồng', icon: '📄' },
    { to: '/content', label: 'Nội dung Web', icon: '🌐' },
  ],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);
  const [notis, setNotis] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [showNoti, setShowNoti] = useState(false);

  async function loadNotis() {
    try {
      const d = await api.get<any>('/notifications');
      setNotis(d.items || []);
      setUnread(d.unread || 0);
      // Nếu trình duyệt cho phép, đẩy thông báo hệ thống cho các mục chưa đọc mới
      if ('Notification' in window && Notification.permission === 'granted') {
        const unseen = (d.items || []).filter((n: any) => !n.is_read).slice(0, 1);
        unseen.forEach((n: any) => {
          const key = 'noti_shown_' + n.id;
          if (!sessionStorage.getItem(key)) {
            new Notification(n.title, { body: n.body || '' });
            sessionStorage.setItem(key, '1');
          }
        });
      }
    } catch { /* offline */ }
  }

  useEffect(() => {
    const upd = () => setOnline(navigator.onLine);
    window.addEventListener('online', upd);
    window.addEventListener('offline', upd);
    startAutoSync(() => pendingCount().then(setPending));
    const t = setInterval(() => pendingCount().then(setPending), 3000);
    loadNotis();
    const nt = setInterval(loadNotis, 20000);
    return () => { window.removeEventListener('online', upd); window.removeEventListener('offline', upd); clearInterval(t); clearInterval(nt); };
  }, []);

  async function markAllRead() {
    await api.post('/notifications/read-all');
    loadNotis();
  }

  const items = navByRole[user?.role || 'Sales'] || [];

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 flex-col bg-brand-800 text-white md:flex">
        <div className="border-b border-white/10 p-4 text-xl font-bold">TNT CAR</div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map((it) => (
            <Link key={it.to} to={it.to}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${loc.pathname.startsWith(it.to) ? 'bg-white/20 font-medium' : 'hover:bg-white/10'}`}>
              <span>{it.icon}</span>{it.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3 text-xs">
          <div className="font-medium">{user?.full_name}</div>
          <div className="text-white/60">{user?.role}</div>
          <button onClick={() => { logout(); nav('/login'); }} className="mt-2 w-full rounded bg-white/10 py-1.5 hover:bg-white/20">Đăng xuất</button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-white px-4 py-2">
          <div className="flex items-center gap-2 md:hidden font-bold text-brand-800">TNT CAR</div>
          <div className="flex items-center gap-3 text-xs">
            <span className={`badge ${online ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {online ? '● Online' : '● Offline'}
            </span>
            {pending > 0 && (
              <button onClick={() => runSync()} className="badge bg-amber-100 text-amber-700" title="Bấm để đồng bộ ngay">
                ⏳ {pending} chờ đồng bộ
              </button>
            )}
            <InstallButton />
            {/* Chuông thông báo */}
            <div className="relative">
              <button onClick={() => { setShowNoti(!showNoti); }} className="relative rounded-full px-2 py-1 hover:bg-gray-100" title="Thông báo">
                🔔
                {unread > 0 && <span className="absolute -right-0 -top-0 rounded-full bg-red-600 px-1 text-[10px] text-white">{unread}</span>}
              </button>
              {showNoti && (
                <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border bg-white shadow-lg">
                  <div className="flex items-center justify-between border-b px-3 py-2">
                    <span className="text-sm font-semibold">Thông báo</span>
                    {unread > 0 && <button onClick={markAllRead} className="text-xs text-brand-700 hover:underline">Đánh dấu đã đọc</button>}
                  </div>
                  <div className="max-h-80 overflow-auto">
                    {notis.length === 0 ? <div className="p-4 text-center text-xs text-gray-400">Chưa có thông báo</div> :
                      notis.map((n) => (
                        <div key={n.id} className={`border-b px-3 py-2 text-sm ${n.is_read ? 'opacity-60' : 'bg-brand-50'}`}>
                          <div className="font-medium">{n.title}</div>
                          <div className="text-xs text-gray-600">{n.body}</div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-b bg-white px-2 py-1 md:hidden">
          {items.map((it) => (
            <Link key={it.to} to={it.to}
              className={`whitespace-nowrap rounded px-2 py-1 text-xs ${loc.pathname.startsWith(it.to) ? 'bg-brand-100 text-brand-700' : 'text-gray-600'}`}>
              {it.icon} {it.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 p-4">{children}</main>
      </div>
    </div>
  );
}
