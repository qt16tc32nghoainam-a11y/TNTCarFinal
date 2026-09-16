import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { all, get, run, persist } from '../db/database';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate, requireRole('Admin'));
const nowIso = () => new Date().toISOString();

/** GET /api/content — danh sách nội dung website (Admin, FR-08). */
router.get('/', (_req, res) => res.json(all('SELECT * FROM website_contents ORDER BY updated_at DESC')));

/** POST /api/content — tạo nội dung. */
router.post('/', (req, res) => {
  const { content_type, title, body, image_url } = req.body || {};
  if (!content_type) return res.status(400).json({ error: 'Thiếu loại nội dung' });
  const id = uuid();
  run('INSERT INTO website_contents (id,content_type,title,body,image_url,active,updated_at) VALUES (?,?,?,?,?,?,?)',
    [id, content_type, title || null, body || null, image_url || null, 1, nowIso()]);
  persist();
  res.status(201).json({ id });
});

/** PUT /api/content/:id — cập nhật nội dung. */
router.put('/:id', (req, res) => {
  const { title, body, image_url, active } = req.body || {};
  const c = get<any>('SELECT id FROM website_contents WHERE id = ?', [req.params.id]);
  if (!c) return res.status(404).json({ error: 'Không tìm thấy nội dung' });
  run('UPDATE website_contents SET title=?,body=?,image_url=?,active=?,updated_at=? WHERE id=?',
    [title || null, body || null, image_url || null, active ? 1 : 0, nowIso(), req.params.id]);
  persist();
  res.json({ ok: true });
});

/** DELETE /api/content/:id — xóa nội dung. */
router.delete('/:id', (req, res) => {
  run('DELETE FROM website_contents WHERE id = ?', [req.params.id]);
  persist();
  res.json({ ok: true });
});

export default router;
