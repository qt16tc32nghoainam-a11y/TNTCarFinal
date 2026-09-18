import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import PublicHome from './PublicHome';
import PublicCars from './PublicCars';
import PublicCarDetail from './PublicCarDetail';
import PublicRequest from './PublicRequest';

const HOTLINE = '1900 1234';

export default function PublicSite() {
  const loc = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const link = (to: string, label: string, exact = false) => {
    const active = exact ? loc.pathname === to : loc.pathname.startsWith(to);
    return (
      <Link to={to} onClick={() => setMenuOpen(false)}
        className={active ? 'font-semibold text-brand-700' : 'text-gray-700 hover:text-brand-700'}>
        {label}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Thanh liên hệ trên cùng */}
      <div className="bg-brand-800 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-1.5 text-xs">
          <span>Đại lý ô tô chính hãng · Lái thử miễn phí tận nơi</span>
          <a href={`tel:${HOTLINE.replace(/\s/g, '')}`} className="font-medium">☎ Hotline: {HOTLINE}</a>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/site" className="text-2xl font-extrabold tracking-tight text-brand-800">TNT<span className="text-brand-500">CAR</span></Link>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            {link('/site', 'Trang chủ', true)}
            {link('/site/cars', 'Danh mục xe')}
            {link('/site/request', 'Đăng ký lái thử')}
            <a href={`tel:${HOTLINE.replace(/\s/g, '')}`} className="rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">Gọi ngay</a>
          </nav>
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">☰</button>
        </div>
        {menuOpen && (
          <nav className="flex flex-col gap-3 border-t px-4 py-3 text-sm md:hidden">
            {link('/site', 'Trang chủ', true)}
            {link('/site/cars', 'Danh mục xe')}
            {link('/site/request', 'Đăng ký lái thử')}
            <a href={`tel:${HOTLINE.replace(/\s/g, '')}`} className="rounded-full bg-brand-600 px-4 py-2 text-center font-medium text-white">Gọi ngay {HOTLINE}</a>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<PublicHome />} />
          <Route path="/cars" element={<PublicCars />} />
          <Route path="/cars/:id" element={<PublicCarDetail />} />
          <Route path="/request" element={<PublicRequest />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="mt-12 bg-gray-900 text-gray-300">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div>
            <div className="text-xl font-extrabold text-white">TNT<span className="text-brand-400">CAR</span></div>
            <p className="mt-2 text-sm text-gray-400">Hệ thống đại lý ô tô chính hãng. Tư vấn, lái thử và hỗ trợ trả góp toàn quốc.</p>
          </div>
          <div className="text-sm">
            <div className="mb-2 font-semibold text-white">Liên hệ</div>
            <div>Hotline: {HOTLINE}</div>
            <div>Email: cskh@tntcar.vn</div>
            <div>Showroom: TP.HCM · Hà Nội</div>
          </div>
          <div className="text-sm">
            <div className="mb-2 font-semibold text-white">Liên kết</div>
            <Link to="/site/cars" className="block hover:text-white">Danh mục xe</Link>
            <Link to="/site/request" className="block hover:text-white">Đăng ký lái thử</Link>
            <Link to="/login" className="block hover:text-white">Đăng nhập nội bộ</Link>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-gray-500">TNT CAR © 2026 · Website thông tin sản phẩm và tiếp nhận yêu cầu khách hàng.</div>
      </footer>

      {/* Nút gọi nổi (mobile) */}
      <a href={`tel:${HOTLINE.replace(/\s/g, '')}`} className="fixed bottom-5 right-5 z-40 rounded-full bg-brand-600 px-5 py-3 text-white shadow-lg md:hidden">☎ Gọi</a>
    </div>
  );
}
