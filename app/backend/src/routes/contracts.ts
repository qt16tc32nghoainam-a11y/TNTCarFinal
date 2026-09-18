import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { all, get, run, transaction, persist } from '../db/database';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);
const nowIso = () => new Date().toISOString();

/** Tính tổng đã thu (không tính khoản đã hủy) của 1 hợp đồng. */
function paidTotal(contractId: string): number {
  const r = get<any>('SELECT COALESCE(SUM(amount),0) s FROM payments WHERE contract_id = ? AND is_cancelled = 0', [contractId]);
  return r?.s || 0;
}

/** Cập nhật trạng thái hợp đồng theo tiến độ thu tiền (nếu chưa giao/hủy). */
function refreshStatusByPayment(contractId: string) {
  const c = get<any>('SELECT value, status FROM contracts WHERE id = ?', [contractId]);
  if (!c) return;
  if (['Đã giao xe', 'Hoàn tất', 'Đã hủy cọc'].includes(c.status)) return; // không tự đổi các trạng thái cuối
  const paid = paidTotal(contractId);
  const next = paid >= c.value && c.value > 0 ? 'Đã thanh toán đủ' : (paid > 0 ? 'Đã cọc' : c.status);
  if (next !== c.status) run('UPDATE contracts SET status = ? WHERE id = ?', [next, contractId]);
}

/** GET /api/contracts/eligible-leads — Lead "Thành công" chưa có hợp đồng đang xử lý (để tạo HĐ). */
router.get('/eligible-leads', (_req, res) => {
  const rows = all(
    `SELECT l.id, l.full_name, l.phone, l.car_model_id, c.name AS car_name, c.brand AS car_brand, c.price AS car_price
     FROM leads l
     LEFT JOIN car_models c ON c.id = l.car_model_id
     WHERE l.status_detail = 'Thành công'
       AND NOT EXISTS (SELECT 1 FROM contracts ct WHERE ct.lead_id = l.id AND ct.status != 'Đã hủy cọc')
     ORDER BY l.updated_at DESC`
  );
  res.json(rows);
});

/** POST /api/contracts — tạo hợp đồng từ Lead Won (US-11.1, BR-20). */
router.post('/', (req, res) => {
  const { lead_id, car_model_id, value, signed_date, note, payment_method, bank_name, expected_delivery } = req.body || {};
  if (!lead_id || !car_model_id || !value) return res.status(400).json({ error: 'Thiếu thông tin hợp đồng' });

  const lead = get<any>('SELECT * FROM leads WHERE id = ?', [lead_id]);
  if (!lead) return res.status(404).json({ error: 'Không tìm thấy Lead' });
  if (lead.status_detail !== 'Thành công') {
    return res.status(400).json({ error: 'Chỉ tạo hợp đồng từ Lead ở trạng thái Thành công' });
  }
  const existing = get<any>("SELECT id FROM contracts WHERE lead_id = ? AND status NOT IN ('Đã hủy cọc')", [lead_id]);
  if (existing) return res.status(409).json({ error: 'Lead đã có hợp đồng đang xử lý' });

  const id = uuid();
  const code = 'HD' + Date.now().toString().slice(-8);
  run(
    `INSERT INTO contracts (id,contract_code,lead_id,car_model_id,value,signed_date,status,note,payment_method,bank_name,expected_delivery,created_by,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, code, lead_id, car_model_id, Number(value), signed_date || nowIso(), 'Đã cọc', note || null,
     payment_method || null, bank_name || null, expected_delivery || null, req.user!.id, nowIso()]
  );
  persist();
  res.status(201).json({ id, contract_code: code });
});

/** GET /api/contracts — danh sách hợp đồng kèm thanh toán + tiến độ thu tiền. */
router.get('/', (_req, res) => {
  const rows = all(
    `SELECT ct.*, l.full_name AS customer_name, l.phone AS customer_phone,
            c.name AS car_name, c.brand AS car_brand,
            u.full_name AS sales_name
     FROM contracts ct
     JOIN leads l ON l.id = ct.lead_id
     JOIN car_models c ON c.id = ct.car_model_id
     LEFT JOIN users u ON u.id = ct.created_by
     ORDER BY ct.created_at DESC`
  );
  const result = rows.map((r: any) => {
    const payments = all('SELECT * FROM payments WHERE contract_id = ?', [r.id]);
    const paid = payments.filter((p: any) => !p.is_cancelled).reduce((s: number, p: any) => s + p.amount, 0);
    return { ...r, payments, paid_total: paid, remaining: Math.max(0, r.value - paid) };
  });
  res.json(result);
});

/** POST /api/contracts/:id/payments — ghi nhận thanh toán/cọc (US-11.2, BR-21). */
router.post('/:id/payments', (req, res) => {
  const { method, amount, deposit_amount, paid_at } = req.body || {};
  if (!['Trả thẳng', 'Trả góp', 'Đặt cọc'].includes(method)) return res.status(400).json({ error: 'Phương thức không hợp lệ' });
  if (!amount) return res.status(400).json({ error: 'Thiếu số tiền' });
  const contract = get<any>('SELECT id, status FROM contracts WHERE id = ?', [req.params.id]);
  if (!contract) return res.status(404).json({ error: 'Không tìm thấy hợp đồng' });
  if (contract.status === 'Đã hủy cọc') return res.status(400).json({ error: 'Hợp đồng đã hủy cọc, không thể ghi thanh toán' });

  transaction(() => {
    run(
      `INSERT INTO payments (id,contract_id,method,amount,deposit_amount,paid_at,is_cancelled) VALUES (?,?,?,?,?,?,?)`,
      [uuid(), req.params.id, method, Number(amount), deposit_amount ? Number(deposit_amount) : null, paid_at || nowIso(), 0]
    );
    refreshStatusByPayment(req.params.id);
  });
  persist();
  res.status(201).json({ ok: true, paid_total: paidTotal(req.params.id) });
});

/** POST /api/contracts/:id/deliver — bàn giao xe (chỉ khi đã thanh toán đủ). */
router.post('/:id/deliver', (req, res) => {
  const { vin, plate_number, delivered_at, delivery_note } = req.body || {};
  const c = get<any>('SELECT * FROM contracts WHERE id = ?', [req.params.id]);
  if (!c) return res.status(404).json({ error: 'Không tìm thấy hợp đồng' });
  if (c.status === 'Đã hủy cọc') return res.status(400).json({ error: 'Hợp đồng đã hủy cọc' });
  if (['Đã giao xe', 'Hoàn tất'].includes(c.status)) return res.status(400).json({ error: 'Hợp đồng đã giao xe' });

  const paid = paidTotal(req.params.id);
  if (paid < c.value) {
    return res.status(400).json({ error: `Chưa thanh toán đủ (đã thu ${paid.toLocaleString('vi-VN')} / ${c.value.toLocaleString('vi-VN')}đ), không thể giao xe` });
  }
  run(
    `UPDATE contracts SET status = 'Đã giao xe', vin = ?, plate_number = ?, delivered_at = ?, delivered_by = ?, delivery_note = ? WHERE id = ?`,
    [vin || null, plate_number || null, delivered_at || nowIso(), req.user!.id, delivery_note || null, req.params.id]
  );
  persist();
  res.json({ ok: true });
});

/** POST /api/contracts/:id/complete — đánh dấu hoàn tất (sau giao xe). */
router.post('/:id/complete', (req, res) => {
  const c = get<any>('SELECT status FROM contracts WHERE id = ?', [req.params.id]);
  if (!c) return res.status(404).json({ error: 'Không tìm thấy hợp đồng' });
  if (c.status !== 'Đã giao xe') return res.status(400).json({ error: 'Chỉ hoàn tất sau khi đã giao xe' });
  run("UPDATE contracts SET status = 'Hoàn tất' WHERE id = ?", [req.params.id]);
  persist();
  res.json({ ok: true });
});

/** POST /api/contracts/:id/cancel-deposit — hủy cọc (US-11.3, BR-22, BR-23). */
router.post('/:id/cancel-deposit', (req, res) => {
  const { reason } = req.body || {};
  if (!reason) return res.status(400).json({ error: 'Hủy cọc bắt buộc nhập lý do' });
  const contract = get<any>('SELECT id, status FROM contracts WHERE id = ?', [req.params.id]);
  if (!contract) return res.status(404).json({ error: 'Không tìm thấy hợp đồng' });
  if (['Đã giao xe', 'Hoàn tất'].includes(contract.status)) return res.status(400).json({ error: 'Xe đã giao, không thể hủy cọc' });

  transaction(() => {
    run("UPDATE contracts SET status = 'Đã hủy cọc' WHERE id = ?", [req.params.id]);
    run('UPDATE payments SET is_cancelled = 1, cancel_reason = ?, cancelled_by = ?, cancelled_at = ? WHERE contract_id = ?',
      [reason, req.user!.id, nowIso(), req.params.id]);
  });
  res.json({ ok: true });
});

/** PATCH /api/contracts/:id — sửa thông tin hợp đồng (không sửa khi đã giao xe/hủy). */
router.patch('/:id', (req, res) => {
  const c = get<any>('SELECT * FROM contracts WHERE id = ?', [req.params.id]);
  if (!c) return res.status(404).json({ error: 'Không tìm thấy hợp đồng' });
  if (['Đã giao xe', 'Hoàn tất', 'Đã hủy cọc'].includes(c.status)) {
    return res.status(400).json({ error: 'Hợp đồng đã giao xe/hoàn tất/hủy cọc, không thể sửa' });
  }
  const b = req.body || {};
  const fields = ['value', 'payment_method', 'bank_name', 'signed_date', 'note', 'expected_delivery'];
  const sets: string[] = [];
  const params: any[] = [];
  for (const f of fields) {
    if (b[f] !== undefined) { sets.push(`${f} = ?`); params.push(f === 'value' ? Number(b[f]) : b[f]); }
  }
  if (sets.length === 0) return res.status(400).json({ error: 'Không có dữ liệu cập nhật' });
  params.push(req.params.id);
  transaction(() => {
    run(`UPDATE contracts SET ${sets.join(', ')} WHERE id = ?`, params);
    if (b.value !== undefined) refreshStatusByPayment(req.params.id); // đổi giá trị -> cập nhật lại tiến độ
  });
  persist();
  res.json({ ok: true });
});

/** DELETE /api/contracts/:id — xóa hợp đồng + thanh toán (không xóa khi đã giao xe). */
router.delete('/:id', (req, res) => {
  const c = get<any>('SELECT status FROM contracts WHERE id = ?', [req.params.id]);
  if (!c) return res.status(404).json({ error: 'Không tìm thấy hợp đồng' });
  if (['Đã giao xe', 'Hoàn tất'].includes(c.status)) {
    return res.status(400).json({ error: 'Hợp đồng đã giao xe/hoàn tất, không thể xóa' });
  }
  transaction(() => {
    run('DELETE FROM payments WHERE contract_id = ?', [req.params.id]);
    run('DELETE FROM contracts WHERE id = ?', [req.params.id]);
  });
  persist();
  res.json({ ok: true });
});

export default router;
