/**
 * Cấu hình hệ thống (chỉ Admin). Hiện dùng cho SMTP email.
 * - GET  /api/settings/smtp        -> trạng thái + cấu hình hiện tại (che mật khẩu)
 * - PUT  /api/settings/smtp        -> lưu cấu hình SMTP vào DB, reload mailer
 * - POST /api/settings/smtp/test   -> gửi email thử tới địa chỉ chỉ định
 */
import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { getSettingsByPrefix, setSetting } from '../db/database';
import { reloadMailer, mailerStatus, resolveSmtpConfig, sendTestMail, SmtpConfig } from '../mailer';

const router = Router();
router.use(authenticate, requireRole('Admin'));

/** Trạng thái + cấu hình hiện tại. Không trả mật khẩu, chỉ cho biết đã đặt hay chưa. */
router.get('/smtp', (_req, res) => {
  const db = getSettingsByPrefix('smtp.');
  const status = mailerStatus();
  res.json({
    configured: status.configured,   // true nếu đủ host/user/pass -> gửi thật
    source: status.source,           // 'db' | 'env' | 'none'
    host: status.host || '',
    port: status.port,
    secure: status.secure,
    user: status.user || '',
    from: status.from || '',
    hasPassword: !!(db.pass && db.pass !== ''), // đã lưu mật khẩu trong DB?
  });
});

/** Lưu cấu hình SMTP. Nếu password để trống -> giữ nguyên mật khẩu cũ. */
router.put('/smtp', (req, res) => {
  const { host, port, secure, user, pass, from } = req.body || {};
  const userId = req.user?.id;

  setSetting('smtp.host', String(host ?? '').trim(), userId);
  setSetting('smtp.port', String(port ?? '587').trim(), userId);
  setSetting('smtp.secure', secure ? 'true' : 'false', userId);
  setSetting('smtp.user', String(user ?? '').trim(), userId);
  setSetting('smtp.from', String(from ?? '').trim(), userId);
  // Chỉ ghi đè mật khẩu khi người dùng nhập mới (tránh xoá mất khi để trống).
  if (typeof pass === 'string' && pass.length > 0) {
    setSetting('smtp.pass', pass, userId);
  }

  reloadMailer();
  const status = mailerStatus();
  res.json({ ok: true, configured: status.configured });
});

/** Gửi email thử. Dùng cấu hình đã lưu, hoặc cấu hình gửi kèm trong body (chưa lưu). */
router.post('/smtp/test', async (req, res) => {
  const { to, host, port, secure, user, pass, from } = req.body || {};
  if (!to) return res.status(400).json({ error: 'Vui lòng nhập email nhận thử' });

  // Ưu tiên cấu hình gửi kèm; nếu thiếu password thì dùng password đã lưu.
  const saved = resolveSmtpConfig();
  const cfg: SmtpConfig = {
    host: (host ?? saved.host) || '',
    port: port ? parseInt(String(port), 10) : saved.port,
    secure: typeof secure === 'boolean' ? secure : saved.secure,
    user: (user ?? saved.user) || '',
    pass: (typeof pass === 'string' && pass.length > 0) ? pass : saved.pass,
    from: (from ?? saved.from) || '',
  };

  const result = await sendTestMail(cfg, to);
  if (!result.ok) return res.status(400).json({ error: result.error || 'Gửi thử thất bại' });
  res.json({ ok: true });
});

export default router;
