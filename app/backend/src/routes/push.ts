/**
 * API cho Web Push:
 * - GET  /api/push/public-key   -> VAPID public key (frontend cần để đăng ký subscription)
 * - POST /api/push/subscribe    -> lưu subscription của thiết bị hiện tại
 * - POST /api/push/unsubscribe  -> huỷ subscription theo endpoint
 */
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getVapidPublicKey, saveSubscription, removeSubscription } from '../push';

const router = Router();

/** Public key không nhạy cảm, nhưng vẫn để sau auth cho nhất quán (frontend luôn đã đăng nhập khi gọi). */
router.get('/public-key', authenticate, (_req, res) => {
  res.json({ publicKey: getVapidPublicKey() });
});

router.post('/subscribe', authenticate, (req, res) => {
  try {
    saveSubscription(req.user!.id, req.body?.subscription || req.body);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Subscription không hợp lệ' });
  }
});

router.post('/unsubscribe', authenticate, (req, res) => {
  const endpoint = req.body?.endpoint;
  if (endpoint) removeSubscription(endpoint);
  res.json({ ok: true });
});

export default router;
