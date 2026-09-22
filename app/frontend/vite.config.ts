import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // injectManifest: tự viết service worker (src/sw.ts) để thêm handler Web Push + notificationclick,
      // vẫn giữ precache/offline nhờ workbox precacheAndRoute inject vào SW.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      // Tự đăng ký service worker trong main.tsx (virtual:pwa-register) thay vì script mặc định
      // chỉ chạy khi window 'load' — giúp đăng ký sớm hơn và re-check khi app mở lại từ Home Screen (iOS).
      injectRegister: null,
      devOptions: {
        enabled: true, // Bật service worker ngay ở chế độ dev (npm run dev) để test offline
        type: 'module',
      },
      manifest: {
        name: 'TNT CAR - Sales App',
        short_name: 'TNT CAR',
        description: 'Ứng dụng quản lý Lead và bán xe TNT CAR',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
