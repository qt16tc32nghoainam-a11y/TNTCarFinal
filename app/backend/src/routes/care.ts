import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { all, get, run, transaction, persist } from '../db/database';
import { authenticate } from '../middleware/auth';
import { getVisibleSalesIds } from '../utils/scope';
import { LEAD_PROCESSING_STATUSES } from '../types';

const router = Router();
router.use(authenticate);
const nowIso = () => new Date().toISOString();

const ACTIVITY_TYPES = ['Gọi điện', 'Nhắn tin/Zalo', 'Gặp trực tiếp', 'Lịch hẹn', 'Khác'];

/** POST /api/care/interactions — ghi hoạt động chăm sóc (US-02.1, BR-05, BR-06). */
router.post('/interactions', (req, res) => {
  const { id, lead_id, type, note, new_status } = req.body || {};
  if (!lead_id || !type) return res.status(400).json({ error: 'Thiếu Lead hoặc Loại hoạt động' });
  if (!ACTIVITY_TYPES.includes(type)) return res.status(400).json({ error: 'Loại hoạt động không hợp lệ' });
  // Ghi chú KHÔNG bắt buộc (BR-06)

  const lead = get<any>('SELECT * FROM leads WHERE id = ?', [lead_id]);
  if (!lead) return res.status(404).json({ error: 'Không tìm thấy Lead' });

  const statusBefore = lead.status_detail;
  let statusAfter: string | null = null;
  if (new_status && LEAD_PROCESSING_STATUSES.includes(new_status) && new_status !== statusBefore) {
    statusAfter = new_status;
  }

  transaction(() => {
    run(
      `INSERT INTO interactions (id,lead_id,type,note,status_before,status_after,created_by,sync_status,created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [id || uuid(), lead_id, type, note || null, statusAfter ? statusBefore : null, statusAfter, req.user!.id, 'SYNCED', nowIso()]
    );
    if (statusAfter) {
      run('UPDATE leads SET status_detail = ?, updated_at = ? WHERE id = ?', [statusAfter, nowIso(), lead_id]);
      run('INSERT INTO lead_status_history (id,lead_id,status_before,status_after,changed_by,changed_at) VALUES (?,?,?,?,?,?)',
        [uuid(), lead_id, statusBefore, statusAfter, req.user!.id, nowIso()]);
    }
  });
  res.status(201).json({ ok: true });
});

/** POST /api/care/reminders — tạo lịch hẹn (US-02.2, BR-07). */
router.post('/reminders', (req, res) => {
  const { id, lead_id, remind_at, purpose, location, notify_before_minutes } = req.body || {};
  if (!lead_id || !remind_at || !purpose) return res.status(400).json({ error: 'Thiếu thông tin lịch hẹn' });
  if (new Date(remind_at).getTime() <= Date.now()) {
    return res.status(400).json({ error: 'Thời gian nhắc việc phải ở tương lai' });
  }
  // Yêu cầu onboarding trước khi tạo lịch hẹn (BR-08/BR-19)
  const u = get<any>('SELECT onboarded FROM users WHERE id = ?', [req.user!.id]);
  if (!u?.onboarded) return res.status(428).json({ error: 'Cần hoàn tất cài đặt PWA và cấp quyền thông báo trước' });

  run(
    `INSERT INTO reminders (id,lead_id,remind_at,purpose,location,notify_before_minutes,created_by,sync_status,created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [id || uuid(), lead_id, remind_at, purpose, location || null, notify_before_minutes || 30, req.user!.id, 'SYNCED', nowIso()]
  );
  persist();
  res.status(201).json({ ok: true });
});

/** GET /api/care/reminders/upcoming — lịch hẹn sắp tới của tôi. */
router.get('/reminders/upcoming', (req, res) => {
  const rows = all(
    `SELECT r.*, l.full_name AS lead_name, l.phone AS lead_phone
     FROM reminders r JOIN leads l ON l.id = r.lead_id
     WHERE r.created_by = ? AND r.remind_at >= ?
     ORDER BY r.remind_at ASC`,
    [req.user!.id, nowIso()]
  );
  res.json(rows);
});

/** GET /api/care/history/:salesId — Admin/Manager xem lịch sử chăm sóc theo Sales (US-02.4, read-only). */
router.get('/history/:salesId', (req, res) => {
  const visible = getVisibleSalesIds(req.user!);
  if (visible && !visible.includes(req.params.salesId)) {
    return res.status(403).json({ error: 'Không có quyền xem Sales này' });
  }
  const rows = all(
    `SELECT i.*, l.full_name AS lead_name FROM interactions i
     JOIN leads l ON l.id = i.lead_id
     WHERE i.created_by = ? ORDER BY i.created_at DESC`,
    [req.params.salesId]
  );
  res.json(rows);
});

export default router;
