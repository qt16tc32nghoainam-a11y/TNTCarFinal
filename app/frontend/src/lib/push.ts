/**
 * Đăng ký Web Push từ phía client: xin quyền, tạo PushSubscription qua service worker,
 * gửi subscription lên server để lưu. Gọi sau khi đăng nhập + service worker sẵn sàng.
 */
import { api } from './api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/**
 * Bật thông báo đẩy cho thiết bị hiện tại. Trả về true nếu đăng ký thành công.
 * An toàn để gọi nhiều lần (idempotent) — nếu đã có subscription thì gửi lại lên server.
 */
export async function enablePush(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      return false; // trình duyệt không hỗ trợ (vd iOS Safari chưa cài PWA)
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const reg = await navigator.serviceWorker.ready;

    // Lấy VAPID public key từ server.
    const { publicKey } = await api.get<{ publicKey: string }>('/push/public-key');
    if (!publicKey) return false;

    // Dùng subscription hiện có, hoặc tạo mới.
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // cast: kiểu Uint8Array<ArrayBufferLike> của TS mới không khớp BufferSource, nhưng dữ liệu hợp lệ.
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      });
    }

    await api.post('/push/subscribe', { subscription: sub.toJSON() });
    return true;
  } catch (e) {
    console.warn('[push] Không bật được thông báo đẩy:', e);
    return false;
  }
}

/** Kiểm tra đã cấp quyền thông báo chưa (để quyết định tự đăng ký lại khi mở app). */
export function pushPermissionGranted(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}
