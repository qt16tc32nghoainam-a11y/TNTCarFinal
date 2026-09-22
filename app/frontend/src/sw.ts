/// <reference lib="webworker" />
/**
 * Service Worker tuỳ biến (injectManifest).
 * - Giữ nguyên khả năng offline: precache toàn bộ asset + điều hướng SPA fallback về index.html.
 * - Thêm Web Push: nhận push từ server -> hiển thị thông báo lên thiết bị (kể cả khi app đóng).
 * - notificationclick: mở app tới đúng trang liên quan (vd /leads/:id).
 */
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

self.skipWaiting();
clientsClaim();

// Precache tất cả asset build (self.__WB_MANIFEST được vite-plugin-pwa inject vào lúc build).
precacheAndRoute(self.__WB_MANIFEST || []);
// Dọn cache phiên bản cũ khi service worker cập nhật (giống hành vi bản generateSW trước đây).
cleanupOutdatedCaches();

// Điều hướng SPA: mọi route (không phải /api) trả về index.html từ cache -> mở app được khi offline.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), {
  denylist: [/^\/api\//],
}));

// Nhận Web Push -> hiển thị thông báo.
self.addEventListener('push', (event: PushEvent) => {
  let data: { title?: string; body?: string; url?: string; tag?: string } = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'TNT CAR', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'TNT CAR';
  const options: NotificationOptions = {
    body: data.body || '',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    tag: data.tag,
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Bấm vào thông báo -> mở/đưa app lên foreground tại đúng trang liên quan.
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Nếu app đang mở -> focus và điều hướng tới trang liên quan.
      for (const client of clients) {
        if ('focus' in client) {
          (client as WindowClient).focus();
          (client as WindowClient).navigate(targetUrl).catch(() => {});
          return;
        }
      }
      // Nếu app chưa mở -> mở cửa sổ mới tới trang liên quan.
      return self.clients.openWindow(targetUrl);
    })
  );
});
