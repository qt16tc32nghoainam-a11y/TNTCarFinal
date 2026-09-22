import { Router } from 'express';
import { all, get, run, persist } from '../db/database';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

/**
 * GET /api/notifications — thông báo của tôi (mới nhất trước).
 * Kèm `lead_id` để frontend điều hướng thẳng tới Lead liên quan khi bấm vào thông báo,
 * bất kể ref_type là lead/reminder/booking (mọi loại đều gắn với 1 Lead cụ thể).
 */
router.get('/', (req, res) => {
  // Lấy danh sách thông báo (query đơn giản, luôn chạy được). KHÔNG gộp việc tính lead_id vào đây
  // để tránh trường hợp thiếu cột/lỗi phụ làm hỏng cả danh sách -> chuông bị trống.
  const rows = all<any>(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [req.user!.id]
  );

  // Bổ sung lead_id cho từng thông báo (best-effort). Nếu tra cứu lỗi thì bỏ qua, không phá danh sách.
  for (const n of rows) {
    try {
      if (n.ref_type === 'lead') n.lead_id = n.ref_id;
      else if (n.ref_type === 'reminder') n.lead_id = get<any>('SELECT lead_id FROM reminders WHERE id = ?', [n.ref_id])?.lead_id || null;
      else if (n.ref_type === 'booking') n.lead_id = get<any>('SELECT lead_id FROM test_drive_bookings WHERE id = ?', [n.ref_id])?.lead_id || null;
      else n.lead_id = null;
    } catch {
      n.lead_id = null;
    }
  }

  const unread = all('SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND is_read = 0', [req.user!.id])[0] as any;
  res.json({ items: rows, unread: unread?.c || 0 });
});

/** POST /api/notifications/:id/read — đánh dấu đã đọc. */
router.post('/:id/read', (req, res) => {
  run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user!.id]);
  persist();
  res.json({ ok: true });
});

/** POST /api/notifications/read-all — đánh dấu đã đọc tất cả. */
router.post('/read-all', (req, res) => {
  run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user!.id]);
  persist();
  res.json({ ok: true });
});

export default router;
