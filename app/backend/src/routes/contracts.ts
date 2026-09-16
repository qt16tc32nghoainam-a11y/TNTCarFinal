import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { all, get, run, transaction, persist } from '../db/database';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);
const nowIso = () => new Date().toISOString();

/** POST /api/contracts — tạo hợp đồng từ Lead Won (US-11.1, BR-20). */
router.post('/', (req, res) => {
  const { lead_id, car_model_id, value, signed_date, note } = req.body || {};
  if (!lead_id || !car_model_id || !value) return res.status(400).json({ error: 'Thiếu thông tin hợp đồng' });

  const lead = get<any>('SELECT * FROM leads WHERE id = ?', [lead_id]);
  if (!lead) return res.status(404).json({ error: 'Không tìm thấy Lead' });
  if (lead.status_detail !== 'Thành công') {
    return res.status(400).json({ error: 'Chỉ tạo hợp đồng từ Lead ở trạng thái Thành công' });
  }
  const existing = get<any>("SELECT id FROM contracts WHERE lead_id = ? AND status = 'Hiệu lực'", [lead_id]);
  if (existing) return res.status(409).json({ error: 'Lead đã có hợp đồng còn hiệu lực' });

  const id = uuid();
  const code = 'HD' + Date.now().toString().slice(-8);
  run(
    `INSERT INTO contracts (id,contract_code,lead_id,car_model_id,value,signed_date,status,note,created_by,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [id, code, lead_id, car_model_id, Number(value), signed_date || nowIso(), 'Hiệu lực', note || null, req.user!.id, nowIso()]
  );
  persist();
  res.status(201).json({ id, contract_code: code });
});

/** GET /api/contracts — danh sách hợp đồng kèm thanh toán. */
router.get('/', (_req, res) => {
  const rows = all(
    `SELECT ct.*, l.full_name AS customer_name, c.name AS car_name
     FROM contracts ct
     JOIN leads l ON l.id = ct.lead_id
     JOIN car_models c ON c.id = ct.car_model_id
     ORDER BY ct.created_at DESC`
  );
  const withPayments = rows.map((r: any) => ({
    ...r,
    payments: all('SELECT * FROM payments WHERE contract_id = ?', [r.id]),
  }));
  res.json(withPayments);
});

/** POST /api/contracts/:id/payments — ghi nhận thanh toán/cọc (US-11.2, BR-21). */
router.post('/:id/payments', (req, res) => {
  const { method, amount, deposit_amount, paid_at } = req.body || {};
  if (!['Trả thẳng', 'Trả góp', 'Đặt cọc'].includes(method)) return res.status(400).json({ error: 'Phương thức không hợp lệ' });
  if (!amount) return res.status(400).json({ error: 'Thiếu số tiền' });
  if ((method === 'Trả góp' || method === 'Đặt cọc') && !deposit_amount) {
    return res.status(400).json({ error: 'Trả góp hoặc đặt cọc bắt buộc nhập số tiền cọc' });
  }
  const contract = get<any>('SELECT id FROM contracts WHERE id = ?', [req.params.id]);
  if (!contract) return res.status(404).json({ error: 'Không tìm thấy hợp đồng' });

  run(
    `INSERT INTO payments (id,contract_id,method,amount,deposit_amount,paid_at,is_cancelled) VALUES (?,?,?,?,?,?,?)`,
    [uuid(), req.params.id, method, Number(amount), deposit_amount ? Number(deposit_amount) : null, paid_at || nowIso(), 0]
  );
  persist();
  res.status(201).json({ ok: true });
});

/** POST /api/contracts/:id/cancel-deposit — hủy cọc (US-11.3, BR-22, BR-23). */
router.post('/:id/cancel-deposit', (req, res) => {
  const { reason } = req.body || {};
  if (!reason) return res.status(400).json({ error: 'Hủy cọc bắt buộc nhập lý do' });
  const contract = get<any>('SELECT id FROM contracts WHERE id = ?', [req.params.id]);
  if (!contract) return res.status(404).json({ error: 'Không tìm thấy hợp đồng' });

  transaction(() => {
    run("UPDATE contracts SET status = 'Đã hủy cọc' WHERE id = ?", [req.params.id]);
    run('UPDATE payments SET is_cancelled = 1, cancel_reason = ?, cancelled_by = ?, cancelled_at = ? WHERE contract_id = ?',
      [reason, req.user!.id, nowIso(), req.params.id]);
  });
  res.json({ ok: true });
});

export default router;
