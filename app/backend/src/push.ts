/**
 * Web Push (đẩy thông báo lên thiết bị dù app đã đóng) qua giao thức VAPID.
 * - Frontend đăng ký subscription -> lưu vào bảng push_subscriptions theo user.
 * - Khi có notification mới (lead assign, nhắc hẹn, nhắc lái thử) -> gửi push tới mọi thiết bị của user đó.
 * - Subscription hết hạn/không hợp lệ (410/404) sẽ tự xoá khỏi DB.
 */
import webpush from 'web-push';
import { v4 as uuid } from 'uuid';
import { all, get, run, persist } from './db/database';
import { config } from './config';

let ready = false;

export function initPush(): void {
  const { publicKey, privateKey, subject } = config.vapid;
  if (publicKey && privateKey) {
    try {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      ready = true;
      console.log('[push] Web Push đã sẵn sàng (VAPID đã cấu hình).');
    } catch (e) {
      ready = false;
      console.error('[push] Lỗi cấu hình VAPID:', e);
    }
  } else {
    ready = false;
    console.log('[push] Chưa cấu hình VAPID -> không gửi push. Đặt VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY trong .env.');
  }
}

export function getVapidPublicKey(): string {
  return config.vapid.publicKey || '';
}

/** Lưu (hoặc cập nhật) subscription của 1 thiết bị cho user. */
export function saveSubscription(userId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }): void {
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) throw new Error('Subscription không hợp lệ');
  const existing = get<any>('SELECT id FROM push_subscriptions WHERE endpoint = ?', [sub.endpoint]);
  if (existing) {
    run('UPDATE push_subscriptions SET user_id = ?, p256dh = ?, auth = ? WHERE endpoint = ?',
      [userId, sub.keys.p256dh, sub.keys.auth, sub.endpoint]);
  } else {
    run('INSERT INTO push_subscriptions (id,user_id,endpoint,p256dh,auth,created_at) VALUES (?,?,?,?,?,?)',
      [uuid(), userId, sub.endpoint, sub.keys.p256dh, sub.keys.auth, new Date().toISOString()]);
  }
  persist();
}

/** Xoá subscription theo endpoint (khi client huỷ đăng ký, hoặc server phát hiện hết hạn). */
export function removeSubscription(endpoint: string): void {
  run('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
  persist();
}

/**
 * Gửi push tới toàn bộ thiết bị của 1 user. Không throw ra ngoài (best-effort) — dùng trong luồng
 * tạo notification, không được làm hỏng nghiệp vụ chính nếu push lỗi.
 */
export async function pushToUser(userId: string, payload: { title: string; body: string; url?: string; tag?: string }): Promise<void> {
  if (!ready) return;
  const subs = all<any>('SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?', [userId]);
  if (!subs.length) return;
  const data = JSON.stringify(payload);
  let changed = false;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        data
      );
    } catch (e: any) {
      // 404/410: subscription đã hết hạn/bị huỷ -> xoá khỏi DB.
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        run('DELETE FROM push_subscriptions WHERE endpoint = ?', [s.endpoint]);
        changed = true;
      } else {
        console.error('[push] Lỗi gửi push:', e?.statusCode || e?.message);
      }
    }
  }));
  if (changed) persist();
}
