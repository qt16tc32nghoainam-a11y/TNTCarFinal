import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { get, run, persist } from '../db/database';
import { authenticate } from '../middleware/auth';
import { AuthUser } from '../types';

const router = Router();

/** POST /api/auth/login — đăng nhập bằng email + mật khẩu (FR-04). */
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Thiếu email hoặc mật khẩu' });

  const user = get<any>('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
  if (user.status === 'Tạm khóa') return res.status(403).json({ error: 'Tài khoản đã bị tạm khóa' });

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });

  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    role: user.role,
    full_name: user.full_name,
    showroom_id: user.showroom_id,
    manager_id: user.manager_id,
  };
  const token = jwt.sign(authUser, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as any);
  res.json({ token, user: { ...authUser, onboarded: !!user.onboarded } });
});

/** GET /api/auth/me — thông tin người dùng hiện tại. */
router.get('/me', authenticate, (req, res) => {
  const u = get<any>('SELECT id,full_name,email,role,showroom_id,manager_id,onboarded FROM users WHERE id = ?', [req.user!.id]);
  if (!u) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
  res.json({ ...u, onboarded: !!u.onboarded });
});

/** POST /api/auth/onboard — đánh dấu đã hoàn tất onboarding PWA (FR-10). */
router.post('/onboard', authenticate, (req, res) => {
  run('UPDATE users SET onboarded = 1 WHERE id = ?', [req.user!.id]);
  persist();
  res.json({ ok: true });
});

export default router;
