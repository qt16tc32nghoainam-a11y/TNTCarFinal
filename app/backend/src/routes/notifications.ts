import { Router } from 'express';
import { all, run, persist } from '../db/database';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

/** GET /api/notifications — thông báo của tôi (mới nhất trước). */
router.get('/', (req, res) => {
  const rows = all(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [req.user!.id]
  );
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
