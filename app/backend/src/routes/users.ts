import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { all, get, run, persist } from '../db/database';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);
const nowIso = () => new Date().toISOString();

/** GET /api/users — danh sách người dùng (Admin). */
router.get('/', requireRole('Admin'), (_req, res) => {
  const rows = all(
    `SELECT u.id,u.full_name,u.email,u.phone,u.role,u.status,u.onboarded,
       s.name AS showroom_name, m.full_name AS manager_name
     FROM users u
     LEFT JOIN showrooms s ON s.id = u.showroom_id
     LEFT JOIN users m ON m.id = u.manager_id
     ORDER BY u.role, u.full_name`
  );
  res.json(rows);
});

/** GET /api/users/sales — danh sách Sales (để gán Lead). */
router.get('/sales', requireRole('Admin', 'Manager'), (_req, res) => {
  res.json(all("SELECT id, full_name, showroom_id FROM users WHERE role='Sales' AND status='Hoạt động'"));
});

/** GET /api/users/managers — danh sách Manager. */
router.get('/managers', requireRole('Admin'), (_req, res) => {
  res.json(all("SELECT id, full_name FROM users WHERE role='Manager'"));
});

/** POST /api/users — tạo tài khoản (US-04.1, BR-10). */
router.post('/', requireRole('Admin'), (req, res) => {
  const { full_name, email, phone, role, showroom_id, manager_id, password } = req.body || {};
  if (!full_name || !email || !phone || !role) return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
  if (!['Admin', 'Manager', 'Sales'].includes(role)) return res.status(400).json({ error: 'Vai trò không hợp lệ' });

  const dup = get<any>('SELECT id FROM users WHERE email = ? OR phone = ?', [email, phone]);
  if (dup) return res.status(409).json({ error: 'Email hoặc số điện thoại đã tồn tại' });

  const id = uuid();
  const hash = bcrypt.hashSync(password || '123456', 8);
  run(
    `INSERT INTO users (id,full_name,email,phone,password_hash,role,showroom_id,manager_id,status,onboarded,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, full_name, email, phone, hash, role, showroom_id || null, manager_id || null, 'Hoạt động', 0, nowIso()]
  );
  persist();
  res.status(201).json({ id });
});

/** PATCH /api/users/:id/status — tạm khóa / kích hoạt (US-04.2, BR-09). */
router.patch('/:id/status', requireRole('Admin'), (req, res) => {
  const { status } = req.body || {};
  if (!['Hoạt động', 'Tạm khóa'].includes(status)) return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
  run('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);
  persist();
  res.json({ ok: true });
});

/** PATCH /api/users/:id/assign — gán showroom & manager (US-04.3). */
router.patch('/:id/assign', requireRole('Admin'), (req, res) => {
  const { showroom_id, manager_id } = req.body || {};
  run('UPDATE users SET showroom_id = ?, manager_id = ? WHERE id = ?', [showroom_id || null, manager_id || null, req.params.id]);
  persist();
  res.json({ ok: true });
});

/** GET /api/users/showrooms — danh sách showroom. */
router.get('/meta/showrooms', (_req, res) => res.json(all('SELECT * FROM showrooms')));

export default router;
