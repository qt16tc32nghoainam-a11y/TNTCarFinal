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

/** PATCH /api/users/:id — cập nhật hồ sơ, email & vai trò (US-04.3). */
router.patch('/:id', requireRole('Admin'), (req, res) => {
  const { full_name, email, phone, role, showroom_id, manager_id } = req.body || {};
  const u = get<any>('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!u) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
  if (role && !['Admin', 'Manager', 'Sales'].includes(role)) return res.status(400).json({ error: 'Vai trò không hợp lệ' });

  // Không cho tự hạ vai trò của chính mình (tránh mất quyền Admin cuối cùng)
  if (req.params.id === req.user!.id && role && role !== 'Admin') {
    return res.status(400).json({ error: 'Không thể tự đổi vai trò của chính mình' });
  }
  if (phone && phone !== u.phone) {
    const dup = get<any>('SELECT id FROM users WHERE phone = ? AND id != ?', [phone, req.params.id]);
    if (dup) return res.status(409).json({ error: 'Số điện thoại đã tồn tại' });
  }
  // Cho phép Admin sửa email; kiểm tra trùng với người khác.
  if (email && email !== u.email) {
    const dup = get<any>('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.params.id]);
    if (dup) return res.status(409).json({ error: 'Email đã tồn tại' });
  }
  run(
    'UPDATE users SET full_name = ?, email = ?, phone = ?, role = ?, showroom_id = ?, manager_id = ? WHERE id = ?',
    [
      full_name ?? u.full_name,
      email ?? u.email,
      phone ?? u.phone,
      role ?? u.role,
      showroom_id !== undefined ? (showroom_id || null) : u.showroom_id,
      manager_id !== undefined ? (manager_id || null) : u.manager_id,
      req.params.id,
    ]
  );
  persist();
  res.json({ ok: true });
});

/** POST /api/users/:id/reset-password — đặt lại mật khẩu về mặc định. */
router.post('/:id/reset-password', requireRole('Admin'), (req, res) => {
  const u = get<any>('SELECT id FROM users WHERE id = ?', [req.params.id]);
  if (!u) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
  const newPass = req.body?.password || '123456';
  run('UPDATE users SET password_hash = ? WHERE id = ?', [bcrypt.hashSync(newPass, 8), req.params.id]);
  persist();
  res.json({ ok: true, password: newPass });
});

/** GET /api/users/showrooms — danh sách showroom. */
router.get('/meta/showrooms', (_req, res) => res.json(all('SELECT * FROM showrooms')));

/**
 * POST /api/users/bootstrap-web-sales — Admin tạo 2 Sales phụ trách Lead website
 * (An + Thành) vào DB đang chạy nếu chưa có. Chạy 1 lần, không xóa dữ liệu.
 */
router.post('/bootstrap-web-sales', requireRole('Admin'), (_req, res) => {
  const hash = bcrypt.hashSync('123456', 8);
  const showroom = get<any>('SELECT id FROM showrooms LIMIT 1')?.id || null;
  const wanted = [
    { full_name: 'Nguyễn Thiện An', email: 'annt@tntcar.vn', phone: '0911111116' },
    { full_name: 'Võ Đại Thành', email: 'thanhvd@tntcar.vn', phone: '0911111117' },
  ];
  let created = 0;
  for (const w of wanted) {
    const exists = get<any>('SELECT id FROM users WHERE email = ?', [w.email]);
    if (exists) continue;
    run(
      `INSERT INTO users (id,full_name,email,phone,password_hash,role,showroom_id,manager_id,status,onboarded,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [uuid(), w.full_name, w.email, w.phone, hash, 'Sales', showroom, null, 'Hoạt động', 1, nowIso()]
    );
    created++;
  }
  persist();
  res.json({ ok: true, created, message: `Đã tạo ${created} Sales website (An, Thành). Mật khẩu: 123456` });
});

export default router;
