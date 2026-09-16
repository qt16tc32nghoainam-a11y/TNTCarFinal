import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { all, get, run, transaction, persist } from '../db/database';
import { authenticate, requireRole } from '../middleware/auth';
import { getVisibleSalesIds } from '../utils/scope';
import { LEAD_PROCESSING_STATUSES, LEAD_SOURCES } from '../types';

const router = Router();
router.use(authenticate);

const nowIso = () => new Date().toISOString();

/** GET /api/leads — danh sách Lead (lọc theo trạng thái/nguồn/đồng bộ, tìm kiếm). */
router.get('/', (req, res) => {
  const { status, source, sync, q, includeArchived } = req.query as Record<string, string>;
  const conds: string[] = [];
  const params: any[] = [];

  // Phân quyền: Sales chỉ thấy Lead của mình; Manager thấy nhóm; Admin thấy tất cả
  const visible = getVisibleSalesIds(req.user!);
  if (visible) {
    conds.push(`(l.assigned_sales_id IN (${visible.map(() => '?').join(',')}) OR l.created_by IN (${visible.map(() => '?').join(',')}))`);
    params.push(...visible, ...visible);
  }
  if (!includeArchived) conds.push('l.is_archived = 0');
  if (status) { conds.push('l.status_detail = ?'); params.push(status); }
  if (source) { conds.push('l.source = ?'); params.push(source); }
  if (sync) { conds.push('l.sync_status = ?'); params.push(sync); }
  if (q) { conds.push('(l.full_name LIKE ? OR l.phone LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }

  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const rows = all(
    `SELECT l.*, c.name AS car_name, c.brand AS car_brand, u.full_name AS sales_name
     FROM leads l
     LEFT JOIN car_models c ON c.id = l.car_model_id
     LEFT JOIN users u ON u.id = l.assigned_sales_id
     ${where}
     ORDER BY l.updated_at DESC`,
    params
  );
  res.json(rows);
});

/** GET /api/leads/sources — danh sách nguồn Lead cố định. */
router.get('/meta/sources', (_req, res) => res.json(LEAD_SOURCES));

/** GET /api/leads/duplicates — các nhóm Lead trùng SĐT trong phạm vi 1 Sales (US-01.7). */
router.get('/duplicates', (req, res) => {
  const visible = getVisibleSalesIds(req.user!);
  const salesFilter = visible ? `AND assigned_sales_id IN (${visible.map(() => '?').join(',')})` : '';
  const params = visible ? visible : [];
  const groups = all<any>(
    `SELECT phone, assigned_sales_id, COUNT(*) AS cnt
     FROM leads WHERE is_archived = 0 ${salesFilter}
     GROUP BY phone, assigned_sales_id HAVING cnt > 1`,
    params
  );
  const result = groups.map((g) => ({
    phone: g.phone,
    assigned_sales_id: g.assigned_sales_id,
    leads: all(`SELECT id, full_name, phone, status_detail, created_at FROM leads WHERE phone = ? AND assigned_sales_id = ? AND is_archived = 0`, [g.phone, g.assigned_sales_id]),
  }));
  res.json(result);
});

/** GET /api/leads/:id — chi tiết Lead kèm lịch sử chăm sóc + lịch hẹn + lịch sử trạng thái. */
router.get('/:id', (req, res) => {
  const lead = get<any>('SELECT * FROM leads WHERE id = ?', [req.params.id]);
  if (!lead) return res.status(404).json({ error: 'Không tìm thấy Lead' });
  const interactions = all('SELECT * FROM interactions WHERE lead_id = ? ORDER BY created_at DESC', [req.params.id]);
  const reminders = all('SELECT * FROM reminders WHERE lead_id = ? ORDER BY remind_at ASC', [req.params.id]);
  const history = all('SELECT * FROM lead_status_history WHERE lead_id = ? ORDER BY changed_at DESC', [req.params.id]);
  res.json({ ...lead, interactions, reminders, history });
});

/** POST /api/leads — tạo Lead mới (FR-01, US-01.1). */
router.post('/', (req, res) => {
  const { id, full_name, phone, car_model_id, source } = req.body || {};
  if (!full_name || !phone) return res.status(400).json({ error: 'Thiếu Họ tên hoặc Số điện thoại' });
  if (!source) return res.status(400).json({ error: 'Thiếu Nguồn Lead' });
  if (!LEAD_SOURCES.includes(source)) return res.status(400).json({ error: 'Nguồn Lead không hợp lệ' });

  // Kiểm tra trùng SĐT trong phạm vi cùng Sales (BR-01)
  const dup = get<any>('SELECT id FROM leads WHERE phone = ? AND assigned_sales_id = ? AND is_archived = 0', [phone, req.user!.id]);
  const flagDup = dup ? 1 : 0;

  const newId = id || uuid();
  run(
    `INSERT INTO leads (id,full_name,phone,car_model_id,source,status_detail,flag_duplicate_phone,assigned_sales_id,created_by,sync_status,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [newId, full_name, phone, car_model_id || null, source, 'Đang tìm hiểu', flagDup, req.user!.id, req.user!.id, 'SYNCED', nowIso(), nowIso()]
  );
  persist();
  res.status(201).json({ id: newId, duplicate_warning: !!dup, duplicate_of: dup?.id || null });
});

/** PATCH /api/leads/:id/status — cập nhật trạng thái xử lý (US-01.3). */
router.patch('/:id/status', (req, res) => {
  const { status } = req.body || {};
  if (!LEAD_PROCESSING_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Chỉ được đặt một trong 5 trạng thái xử lý tại đây' });
  }
  const lead = get<any>('SELECT * FROM leads WHERE id = ?', [req.params.id]);
  if (!lead) return res.status(404).json({ error: 'Không tìm thấy Lead' });

  transaction(() => {
    run('INSERT INTO lead_status_history (id,lead_id,status_before,status_after,changed_by,changed_at) VALUES (?,?,?,?,?,?)',
      [uuid(), lead.id, lead.status_detail, status, req.user!.id, nowIso()]);
    run('UPDATE leads SET status_detail = ?, updated_at = ? WHERE id = ?', [status, nowIso(), lead.id]);
  });
  res.json({ ok: true });
});

/** PATCH /api/leads/:id/result — chốt hoặc sửa Won/Lost (US-01.6, BR-02, BR-03). */
router.patch('/:id/result', (req, res) => {
  const { result, lost_reason_id, lost_reason_note, change_reason } = req.body || {};
  if (!['Thành công', 'Lead thất bại'].includes(result) && !LEAD_PROCESSING_STATUSES.includes(result)) {
    return res.status(400).json({ error: 'Kết quả không hợp lệ' });
  }
  const lead = get<any>('SELECT * FROM leads WHERE id = ?', [req.params.id]);
  if (!lead) return res.status(404).json({ error: 'Không tìm thấy Lead' });

  // Nếu chốt Lost: bắt buộc lý do (BR-02)
  if (result === 'Lead thất bại') {
    if (!lost_reason_id) return res.status(400).json({ error: 'Chốt Lost bắt buộc chọn lý do' });
    const lr = get<any>('SELECT * FROM lost_reasons WHERE id = ?', [lost_reason_id]);
    if (lr?.requires_note && !lost_reason_note) {
      return res.status(400).json({ error: 'Lý do "Khác" bắt buộc nhập nội dung cụ thể' });
    }
  }
  // Nếu Lead đã ở Won/Lost và đang sửa lại: bắt buộc lý do thay đổi (BR-03)
  const isEditingResult = ['Thành công', 'Lead thất bại'].includes(lead.status_detail);
  if (isEditingResult && !change_reason) {
    return res.status(400).json({ error: 'Sửa lại kết quả bắt buộc nhập lý do thay đổi' });
  }

  transaction(() => {
    run('INSERT INTO lead_status_history (id,lead_id,status_before,status_after,reason,changed_by,changed_at) VALUES (?,?,?,?,?,?,?)',
      [uuid(), lead.id, lead.status_detail, result, change_reason || null, req.user!.id, nowIso()]);
    run('UPDATE leads SET status_detail = ?, lost_reason_id = ?, lost_reason_note = ?, updated_at = ? WHERE id = ?',
      [result, result === 'Lead thất bại' ? lost_reason_id : null, result === 'Lead thất bại' ? (lost_reason_note || null) : null, nowIso(), lead.id]);
  });
  res.json({ ok: true });
});

/** DELETE /api/leads/:id — xóa mềm (lưu trữ) (US-01.4, BR-04). */
router.delete('/:id', (req, res) => {
  const lead = get<any>('SELECT id FROM leads WHERE id = ?', [req.params.id]);
  if (!lead) return res.status(404).json({ error: 'Không tìm thấy Lead' });
  run('UPDATE leads SET is_archived = 1, updated_at = ? WHERE id = ?', [nowIso(), req.params.id]);
  persist();
  res.json({ ok: true });
});

/** POST /api/leads/merge — gộp Lead trùng (US-01.7). */
router.post('/merge', (req, res) => {
  const { keep_id, merge_ids } = req.body || {};
  if (!keep_id || !Array.isArray(merge_ids) || merge_ids.length === 0) {
    return res.status(400).json({ error: 'Thiếu Lead giữ lại hoặc danh sách Lead cần gộp' });
  }
  const keep = get<any>('SELECT * FROM leads WHERE id = ?', [keep_id]);
  if (!keep) return res.status(404).json({ error: 'Không tìm thấy Lead giữ lại' });

  transaction(() => {
    for (const mid of merge_ids) {
      if (mid === keep_id) continue;
      // Chuyển lịch sử chăm sóc, lịch hẹn sang Lead giữ lại
      run('UPDATE interactions SET lead_id = ? WHERE lead_id = ?', [keep_id, mid]);
      run('UPDATE reminders SET lead_id = ? WHERE lead_id = ?', [keep_id, mid]);
      // Lưu trữ Lead bị gộp
      run('UPDATE leads SET is_archived = 1, updated_at = ? WHERE id = ?', [nowIso(), mid]);
      run('INSERT INTO lead_status_history (id,lead_id,status_before,status_after,reason,changed_by,changed_at) VALUES (?,?,?,?,?,?,?)',
        [uuid(), mid, keep.status_detail, 'Lưu trữ', 'Gộp vào Lead ' + keep_id, req.user!.id, nowIso()]);
    }
    run('UPDATE leads SET flag_duplicate_phone = 0, updated_at = ? WHERE id = ?', [nowIso(), keep_id]);
  });
  res.json({ ok: true });
});

/** POST /api/leads/:id/assign — Admin gán/chuyển Lead (US-01.5). */
router.post('/:id/assign', requireRole('Admin'), (req, res) => {
  const { sales_id } = req.body || {};
  const sale = get<any>('SELECT id FROM users WHERE id = ? AND role = ?', [sales_id, 'Sales']);
  if (!sale) return res.status(400).json({ error: 'Sales không hợp lệ' });
  const lead = get<any>('SELECT id, full_name FROM leads WHERE id = ?', [req.params.id]);
  if (!lead) return res.status(404).json({ error: 'Không tìm thấy Lead' });
  run('UPDATE leads SET assigned_sales_id = ?, updated_at = ? WHERE id = ?', [sales_id, nowIso(), req.params.id]);
  // Thông báo cho Sales được gán (US-01.5)
  run(
    `INSERT INTO notifications (id,user_id,type,title,body,ref_type,ref_id,is_read,created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    [uuid(), sales_id, 'lead_assigned', 'Bạn được gán một Lead mới', `Lead: ${lead.full_name}`, 'lead', lead.id, 0, nowIso()]
  );
  persist();
  res.json({ ok: true });
});

export default router;
