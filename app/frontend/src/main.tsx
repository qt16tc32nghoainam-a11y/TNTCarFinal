import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './lib/auth';
import './index.css';

/**
 * Đăng ký service worker ngay khi app khởi động (không chờ window 'load'), và chủ động
 * re-check mỗi khi app quay lại foreground. iOS Safari (đặc biệt ở chế độ standalone/Home Screen)
 * đôi khi không giữ service worker ở trạng thái active liên tục nếu hệ điều hành tạm dừng/giải
 * phóng tiến trình Safari để tiết kiệm RAM — re-register khi resume giúp giảm khả năng app
 * không mở được lúc offline vì thiếu service worker phục vụ cache.
 */
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      const updateSW = registerSW({ immediate: true });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') updateSW().catch(() => {});
      });
    })
    .catch(() => { /* môi trường không hỗ trợ (vd SSR/test) - bỏ qua an toàn */ });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
