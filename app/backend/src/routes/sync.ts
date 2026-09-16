import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { get, run, transaction, persist } from '../db/database';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);
const nowIso = () => new Date().toISOString();

/**
 * POST /api/sync — nhận batch bản ghi tạo/sửa offline từ client (FR-06).
 * Body: { device_id, items: [{ entity_type, entity_id, op, payload, updated_at }] }
 * Xử lý dedup theo id + Last-Write-Wins theo updated_at (BR-13).
 */
router.post('/', (req, res) => {
  const { device_id, items } = req.body || {};
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items phải là mảng' });

  let synced = 0;
  let failed = 0;
  const results: any[] = [];

  for (const item of items) {
    try {
      const { entity_type, entity_id, payload, updated_at } = item;
      if (entity_type === 'lead') {
        upsertLead(entity_id, payload, updated_at, req.user!.id);
      } else if (entity_type === 'interaction') {
        upsertInteraction(entity_id, payload, req.user!.id);
      } else if (entity_type === 'reminder') {
        upsertReminder(entity_id, payload, req.user!.id);
      } else {
        throw new Error('entity_type không hỗ trợ: ' + entity_type);
      }
      synced++;
      results.push({ entity_id, status: 'SYNCED' });
    } catch (e: any) {
      failed++;
      results.push({ entity_id: item?.entity_id, status: 'FAILED', error: e.message });
    }
  }

  run(
    `INSERT INTO sync_log (id,device_id,synced_count,failed_count,status,sync_timestamp) VALUES (?,?,?,?,?,?)`,
    [uuid(), device_id || 'unknown', synced, failed, failed === 0 ? 'SUCCESS' : (synced > 0 ? 'PARTIAL' : 'FAILED'), nowIso()]
  );
  persist();
  res.json({ synced, failed, results });
});

function upsertLead(id: string, p: any, updatedAt: string, userId: string) {
  const existing = get<any>('SELECT updated_at FROM leads WHERE id = ?', [id]);
  if (existing) {
    // Last-Write-Wins: chỉ ghi đè nếu bản gửi lên mới hơn
    if (new Date(updatedAt).getTime() <= new Date(existing.updated_at).getTime()) return;
    run(
      `UPDATE leads SET full_name=?,phone=?,car_model_id=?,source=?,status_detail=?,updated_at=?,sync_status='SYNCED' WHERE id=?`,
      [p.full_name, p.phone, p.car_model_id || null, p.source, p.status_detail || 'Đang tìm hiểu', updatedAt, id]
    );
  } else {
    run(
      `INSERT INTO leads (id,full_name,phone,car_model_id,source,status_detail,assigned_sales_id,created_by,sync_status,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [id, p.full_name, p.phone, p.car_model_id || null, p.source, p.status_detail || 'Đang tìm hiểu', p.assigned_sales_id || userId, userId, 'SYNCED', p.created_at || updatedAt, updatedAt]
    );
  }
}

function upsertInteraction(id: string, p: any, userId: string) {
  const existing = get<any>('SELECT id FROM interactions WHERE id = ?', [id]);
  if (existing) return; // interaction bất biến, không ghi đè
  run(
    `INSERT INTO interactions (id,lead_id,type,note,created_by,sync_status,created_at) VALUES (?,?,?,?,?,?,?)`,
    [id, p.lead_id, p.type, p.note || null, userId, 'SYNCED', p.created_at || nowIso()]
  );
}

function upsertReminder(id: string, p: any, userId: string) {
  const existing = get<any>('SELECT id FROM reminders WHERE id = ?', [id]);
  if (existing) return;
  run(
    `INSERT INTO reminders (id,lead_id,remind_at,purpose,location,notify_before_minutes,created_by,sync_status,created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [id, p.lead_id, p.remind_at, p.purpose, p.location || null, p.notify_before_minutes || 30, userId, 'SYNCED', p.created_at || nowIso()]
  );
}

export default router;
