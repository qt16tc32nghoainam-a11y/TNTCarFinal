import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import PublicHome from './PublicHome';
import PublicCars from './PublicCars';
import PublicCarDetail from './PublicCarDetail';
import PublicRequest from './PublicRequest';

export default function PublicSite() {
  const loc = useLocation();
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/site" className="text-xl font-bold text-brand-800">TNT CAR</Link>
          <nav className="flex gap-4 text-sm">
            <Link to="/site" className={loc.pathname === '/site' ? 'font-medium text-brand-700' : 'text-gray-600'}>Trang chủ</Link>
            <Link to="/site/cars" className={loc.pathname.startsWith('/site/cars') ? 'font-medium text-brand-700' : 'text-gray-600'}>Danh mục xe</Link>
            <Link to="/site/request" className={loc.pathname === '/site/request' ? 'font-medium text-brand-700' : 'text-gray-600'}>Đăng ký / Tư vấn</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Routes>
          <Route path="/" element={<PublicHome />} />
          <Route path="/cars" element={<PublicCars />} />
          <Route path="/cars/:id" element={<PublicCarDetail />} />
          <Route path="/request" element={<PublicRequest />} />
        </Routes>
      </main>
      <footer className="border-t py-6 text-center text-sm text-gray-400">TNT CAR © 2026 · Hotline: 1900 1234</footer>
    </div>
  );
}
