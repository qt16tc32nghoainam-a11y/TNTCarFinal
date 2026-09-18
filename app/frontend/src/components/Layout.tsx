import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { pendingCount } from '../lib/db';
import { startAutoSync, runSync } from '../lib/sync';
import { api } from '../lib/api';
import InstallButton from './InstallButton';
import {
  Users, Bell, Car, CalendarClock, FileText, BarChart3, UserCog, Settings, Globe, LogOut, Menu,
  type LucideIcon,
} from 'lucide-react';

type NavItem = { to: string; label: string; short: string; icon: LucideIcon };

const navByRole: Record<string, NavItem[]> = {
  Sales: [
    { to: '/leads', label: 'Quản lý Lead', short: 'Lead', icon: Users },
    { to: '/reminders', label: 'Lịch hẹn', short: 'Lịch hẹn', icon: Bell },
    { to: '/cars', label: 'Tra cứu xe', short: 'Xe', icon: Car },
    { to: '/test-drives', label: 'Lịch lái thử', short: 'Lái thử', icon: CalendarClock },
    { to: '/contracts', label: 'Hợp đồng', short: 'Hợp đồng', icon: FileText },
    { to: '/dashboard', label: 'KPI của tôi', short: 'KPI', icon: BarChart3 },
  ],
  Manager: [
    { to: '/dashboard', label: 'Dashboard KPI', short: 'KPI', icon: BarChart3 },
    { to: '/leads', label: 'Lead của nhóm', short: 'Lead', icon: Users },
    { to: '/contracts', label: 'Hợp đồng', short: 'Hợp đồng', icon: FileText },
  ],
  Admin: [
    { to: '/dashboard', label: 'Dashboard KPI', short: 'KPI', icon: BarChart3 },
    { to: '/leads', label: 'Quản lý Lead', short: 'Lead', icon: Users },
    { to: '/users', label: 'Người dùng', short: 'User', icon: UserCog },
    { to: '/cars', label: 'Tra cứu xe', short: 'Xe', icon: Car },
    { to: '/test-drives', label: 'Lịch lái thử', short: 'Lái thử', icon: CalendarClock },
    { to: '/slots', label: 'Cấu hình slot', short: 'Slot', icon: Settings },
    { to: '/contracts', label: 'Hợp đồng', short: 'Hợp đồng', icon: FileText },
    { to: '/content', label: 'Nội dung Web', short: 'Nội dung', icon: Globe },
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

  // Mobile: 4 mục đầu + nút "Thêm" (mở menu đầy đủ) nếu nhiều hơn 5
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = items.slice(0, 4);
  const hasMore = items.length > 4;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar desktop */}
      <aside className="hidden w-60 flex-col bg-brand-800 text-white md:flex">
        <div className="border-b border-white/10 p-4 text-xl font-extrabold tracking-tight">TNT<span className="text-brand-300">CAR</span></div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map((it) => {
            const Icon = it.icon;
            const active = loc.pathname.startsWith(it.to);
            return (
              <Link key={it.to} to={it.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active ? 'bg-white/20 font-medium' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                <Icon size={18} strokeWidth={2} />{it.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3 text-xs">
          <div className="font-medium">{user?.full_name}</div>
          <div className="text-white/60">{user?.role}</div>
          <button onClick={() => { logout(); nav('/login'); }} className="mt-2 flex w-full items-center justify-center gap-2 rounded bg-white/10 py-1.5 hover:bg-white/20"><LogOut size={14} /> Đăng xuất</button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col pb-16 md:pb-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-white/95 px-4 py-2 backdrop-blur">
          <div className="flex items-center gap-2 font-extrabold text-brand-800 md:hidden">TNT<span className="text-brand-500">CAR</span></div>
          <div className="ml-auto flex items-center gap-2 text-xs">
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
              <button onClick={() => { setShowNoti(!showNoti); }} className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100" title="Thông báo">
                <Bell size={18} />
                {unread > 0 && <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] text-white">{unread}</span>}
              </button>
              {showNoti && (
                <div className="absolute right-0 z-50 mt-2 w-[85vw] max-w-80 rounded-xl border bg-white shadow-lg">
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

        <main className="flex-1 p-4">{children}</main>
      </div>

      {/* Bottom navigation cho mobile (giống app native) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 border-t bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {primary.map((it) => {
          const Icon = it.icon;
          const active = loc.pathname.startsWith(it.to);
          return (
            <Link key={it.to} to={it.to}
              className={`flex flex-col items-center gap-0.5 py-2 text-[10px] ${active ? 'text-brand-700' : 'text-gray-500'}`}>
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
              <span className="max-w-full truncate">{it.short}</span>
            </Link>
          );
        })}
        <button onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center gap-0.5 py-2 text-[10px] text-gray-500">
          <Menu size={20} strokeWidth={1.8} />
          <span>Thêm</span>
        </button>
      </nav>

      {/* Menu "Thêm" (mobile) - đầy đủ mục + đăng xuất */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="font-semibold">{user?.full_name}</div>
                <div className="text-xs text-gray-500">{user?.role}</div>
              </div>
              <button onClick={() => setMoreOpen(false)} className="text-gray-400">✕</button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {items.map((it) => {
                const Icon = it.icon;
                const active = loc.pathname.startsWith(it.to);
                return (
                  <Link key={it.to} to={it.to} onClick={() => setMoreOpen(false)}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center text-[11px] ${active ? 'border-brand-300 bg-brand-50 text-brand-700' : 'text-gray-600'}`}>
                    <Icon size={22} />
                    <span className="leading-tight">{it.short}</span>
                  </Link>
                );
              })}
            </div>
            <button onClick={() => { logout(); nav('/login'); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-red-50 py-2.5 text-sm font-medium text-red-600">
              <LogOut size={16} /> Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
