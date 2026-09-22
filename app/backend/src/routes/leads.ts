import { Router } from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import { v4 as uuid } from 'uuid';
import { all, get, run, transaction, persist, nextCustomerCode } from '../db/database';
import { authenticate, requireRole } from '../middleware/auth';
import { pushToUser } from '../push';
import { getVisibleSalesIds } from '../utils/scope';
import { LEAD_PROCESSING_STATUSES, LEAD_SOURCES } from '../types';

const router = Router();
router.use(authenticate);

// Giới hạn 5MB, chỉ nhận .xlsx, lưu tạm trong RAM (không viết ra đĩa).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const okExt = /\.xlsx$/i.test(file.originalname);
    const okMime = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (okExt || okMime) return cb(null, true);
    cb(new Error('Chỉ hỗ trợ file .xlsx'));
  },
});

const IMPORT_HEADERS = ['Họ tên', 'Số điện thoại', 'Email', 'Xe quan tâm', 'Nguồn Lead', 'Khu vực / Địa chỉ', 'Ngân sách dự kiến', 'Hình thức thanh toán', 'Mức độ quan tâm', 'Ghi chú'];

const nowIso = () => new Date().toISOString();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Suy ra lead_status (new/assigned/won/lost/deleted) từ trạng thái xử lý hiện tại. */
function deriveLeadStatus(statusDetail: string, isArchived: boolean, assignedSalesId: string | null): string {
  if (isArchived) return 'deleted';
  if (statusDetail === 'Thành công') return 'won';
  if (statusDetail === 'Lead thất bại') return 'lost';
  return assignedSalesId ? 'assigned' : 'new';
}

/**
 * GET /api/leads — danh sách Lead (lọc theo trạng thái/nguồn/đồng bộ, tìm kiếm, ngày tạo), có phân trang.
 * Query: page (mặc định 1), pageSize (mặc định 20), from_date/to_date (yyyy-mm-dd, theo created_at).
 * Trả về { items, total, page, pageSize, totalPages } để frontend lật trang.
 */
router.get('/', (req, res) => {
  const { status, source, sync, q, includeArchived, from_date, to_date, lead_status } = req.query as Record<string, string>;
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 20));
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
  if (lead_status) { conds.push('l.lead_status = ?'); params.push(lead_status); }
  if (source) { conds.push('l.source = ?'); params.push(source); }
  if (sync) { conds.push('l.sync_status = ?'); params.push(sync); }
  if (q) { conds.push('(l.full_name LIKE ? OR l.phone LIKE ? OR l.customer_code LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (from_date) { conds.push('l.created_at >= ?'); params.push(from_date + 'T00:00:00.000Z'); }
  if (to_date) { conds.push('l.created_at <= ?'); params.push(to_date + 'T23:59:59.999Z'); }

  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const totalRow = get<{ c: number }>(`SELECT COUNT(*) c FROM leads l ${where}`, params);
  const total = totalRow?.c || 0;
  const rows = all(
    `SELECT l.*, c.name AS car_name, c.brand AS car_brand, u.full_name AS sales_name
     FROM leads l
     LEFT JOIN car_models c ON c.id = l.car_model_id
     LEFT JOIN users u ON u.id = l.assigned_sales_id
     ${where}
     ORDER BY l.updated_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );
  res.json({ items: rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
});

/** GET /api/leads/sources — danh sách nguồn Lead cố định. */
router.get('/meta/sources', (_req, res) => res.json(LEAD_SOURCES));

/** GET /api/leads/import/template — tải file Excel mẫu để nhập Lead hàng loạt. */
router.get('/import/template', async (_req, res) => {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Lead');
  sheet.addRow(IMPORT_HEADERS);
  sheet.getRow(1).font = { bold: true };
  sheet.columns = [
    { width: 22 }, { width: 16 }, { width: 26 }, { width: 22 }, { width: 16 },
    { width: 24 }, { width: 20 }, { width: 18 }, { width: 16 }, { width: 30 },
  ];
  // 1 dòng ví dụ để người dùng biết cách điền
  sheet.addRow(['Nguyễn Văn A', '0912345678', 'nguyenvana@email.com', 'Toyota Vios G', 'Sale tự nhập', 'Quận 1, TP.HCM', '600 - 800 triệu', 'Trả góp', 'Nóng', 'Khách quan tâm bản cao cấp']);
  sheet.getRow(2).font = { italic: true, color: { argb: 'FF999999' } };

  const buf = await wb.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="mau-nhap-lead.xlsx"');
  res.send(Buffer.from(buf));
});

/**
 * POST /api/leads/import — nhập Lead hàng loạt từ file Excel (.xlsx) theo mẫu ở trên.
 * Không kiểm tra trùng SĐT/email/tên. Mỗi dòng lỗi được báo rõ, các dòng hợp lệ vẫn được tạo.
 */
router.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Vui lòng chọn file Excel (.xlsx)' });

  let wb: ExcelJS.Workbook;
  try {
    wb = new ExcelJS.Workbook();
    // Ép kiểu tại 1 điểm biên: xung đột generic Buffer<T> giữa @types/node và type định nghĩa của exceljs,
    // dữ liệu thực tế vẫn là Buffer hợp lệ từ multer (memoryStorage).
    await wb.xlsx.load(req.file.buffer as any);
  } catch {
    return res.status(400).json({ error: 'File không đúng định dạng Excel (.xlsx)' });
  }
  const sheet = wb.worksheets[0];
  if (!sheet) return res.status(400).json({ error: 'File không có dữ liệu' });

  const created: { row: number; customer_code: string; full_name: string }[] = [];
  const errors: { row: number; error: string }[] = [];
  let rowIndex = 0;

  sheet.eachRow((row, rowNumber) => {
    rowIndex = rowNumber;
    if (rowNumber === 1) return; // bỏ dòng tiêu đề

    const cell = (i: number) => {
      const v = row.getCell(i).value;
      if (v === null || v === undefined) return '';
      if (typeof v === 'object' && 'text' in (v as any)) return String((v as any).text).trim(); // rich text
      if (typeof v === 'object' && 'result' in (v as any)) return String((v as any).result).trim(); // formula
      return String(v).trim();
    };

    const full_name = cell(1);
    const phone = cell(2);
    const email = cell(3);
    const carName = cell(4);
    const source = cell(5) || 'Sale tự nhập';
    const address = cell(6);
    const budget = cell(7);
    const payment_method = cell(8);
    const interest_level = cell(9);
    const note = cell(10);

    if (!full_name && !phone && !email) return; // dòng trống, bỏ qua âm thầm

    if (!full_name) { errors.push({ row: rowNumber, error: 'Thiếu Họ tên' }); return; }
    if (!phone) { errors.push({ row: rowNumber, error: 'Thiếu Số điện thoại' }); return; }
    if (!email) { errors.push({ row: rowNumber, error: 'Thiếu Email' }); return; }
    if (!EMAIL_RE.test(email)) { errors.push({ row: rowNumber, error: `Email không hợp lệ: ${email}` }); return; }
    if (!LEAD_SOURCES.includes(source)) { errors.push({ row: rowNumber, error: `Nguồn Lead không hợp lệ: ${source}` }); return; }

    // Tìm xe theo tên gần đúng (không bắt buộc khớp tuyệt đối, không lỗi nếu không tìm thấy)
    let carModelId: string | null = null;
    if (carName) {
      const car = get<any>('SELECT id FROM car_models WHERE (brand || " " || name) LIKE ? OR name LIKE ?', [`%${carName}%`, `%${carName}%`]);
      carModelId = car?.id || null;
    }

    const newId = uuid();
    const customerCode = nextCustomerCode();
    try {
      run(
        `INSERT INTO leads (id,customer_code,full_name,phone,email,car_model_id,source,status_detail,lead_status,
           address,budget,payment_method,interest_level,note,
           assigned_sales_id,created_by,sync_status,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          newId, customerCode, full_name, phone, email, carModelId, source, 'Đang tìm hiểu', 'assigned',
          address || null, budget || null, payment_method || null, interest_level || null, note || null,
          req.user!.id, req.user!.id, 'SYNCED', nowIso(), nowIso(),
        ]
      );
      created.push({ row: rowNumber, customer_code: customerCode, full_name });
    } catch (e: any) {
      errors.push({ row: rowNumber, error: e?.message || 'Lỗi không xác định' });
    }
  });

  if (created.length) persist();
  res.json({
    ok: true,
    total_rows: Math.max(0, rowIndex - 1),
    created_count: created.length,
    error_count: errors.length,
    created,
    errors,
  });
});

/** GET /api/leads/:id — chi tiết Lead kèm lịch sử chăm sóc + lịch hẹn + lịch sử trạng thái. */
router.get('/:id', (req, res) => {
  const lead = get<any>(
    `SELECT l.*, c.name AS car_name, c.brand AS car_brand, u.full_name AS sales_name
     FROM leads l
     LEFT JOIN car_models c ON c.id = l.car_model_id
     LEFT JOIN users u ON u.id = l.assigned_sales_id
     WHERE l.id = ?`,
    [req.params.id]
  );
  if (!lead) return res.status(404).json({ error: 'Không tìm thấy Lead' });
  const interactions = all('SELECT * FROM interactions WHERE lead_id = ? ORDER BY created_at DESC', [req.params.id]);
  const reminders = all('SELECT * FROM reminders WHERE lead_id = ? ORDER BY remind_at ASC', [req.params.id]);
  const history = all('SELECT * FROM lead_status_history WHERE lead_id = ? ORDER BY changed_at DESC', [req.params.id]);
  res.json({ ...lead, interactions, reminders, history });
});

/** POST /api/leads — tạo Lead mới (FR-01, US-01.1). Không kiểm tra trùng SĐT/email/tên (chỉ id là duy nhất). */
router.post('/', (req, res) => {
  const {
    id, full_name, phone, email, car_model_id, source,
    address, budget, payment_method, interest_level, source_detail, note,
  } = req.body || {};
  if (!full_name || !phone) return res.status(400).json({ error: 'Thiếu Họ tên hoặc Số điện thoại' });
  if (!email || !String(email).trim()) return res.status(400).json({ error: 'Vui lòng nhập địa chỉ email' });
  if (!EMAIL_RE.test(String(email).trim())) return res.status(400).json({ error: 'Email không hợp lệ' });
  if (!source) return res.status(400).json({ error: 'Thiếu Nguồn Lead' });
  if (!LEAD_SOURCES.includes(source)) return res.status(400).json({ error: 'Nguồn Lead không hợp lệ' });

  const newId = id || uuid();
  const customerCode = nextCustomerCode();
  const leadStatus = deriveLeadStatus('Đang tìm hiểu', false, req.user!.id);
  run(
    `INSERT INTO leads (id,customer_code,full_name,phone,email,car_model_id,source,status_detail,lead_status,
       address,budget,payment_method,interest_level,source_detail,note,
       assigned_sales_id,created_by,sync_status,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      newId, customerCode, full_name, phone, email || null, car_model_id || null, source, 'Đang tìm hiểu', leadStatus,
      address || null, budget || null, payment_method || null, interest_level || null, source_detail || null, note || null,
      req.user!.id, req.user!.id, 'SYNCED', nowIso(), nowIso(),
    ]
  );
  persist();
  res.status(201).json({ id: newId, customer_code: customerCode });
});

/** PATCH /api/leads/:id — cập nhật thông tin hồ sơ Lead (không đổi trạng thái/kết quả). */
router.patch('/:id', (req, res) => {
  const lead = get<any>('SELECT * FROM leads WHERE id = ?', [req.params.id]);
  if (!lead) return res.status(404).json({ error: 'Không tìm thấy Lead' });

  const {
    full_name, phone, email, car_model_id, source,
    address, budget, payment_method, interest_level, source_detail, note,
  } = req.body || {};

  if (source !== undefined && source !== null && source !== '' && !LEAD_SOURCES.includes(source)) {
    return res.status(400).json({ error: 'Nguồn Lead không hợp lệ' });
  }
  if (full_name !== undefined && !String(full_name).trim()) return res.status(400).json({ error: 'Họ tên không được để trống' });
  if (phone !== undefined && !String(phone).trim()) return res.status(400).json({ error: 'Số điện thoại không được để trống' });

  // Bắt buộc email khi sửa thông tin Lead trên web (dù Lead cũ đã có email hay chưa).
  const finalEmail = email !== undefined ? String(email).trim() : String(lead.email || '').trim();
  if (!finalEmail) return res.status(400).json({ error: 'Vui lòng nhập địa chỉ email' });
  if (!EMAIL_RE.test(finalEmail)) return res.status(400).json({ error: 'Email không hợp lệ' });

  // Helper: giữ giá trị cũ nếu field không được gửi lên (undefined).
  const keep = (val: any, old: any) => (val === undefined ? old : (val === '' ? null : val));

  run(
    `UPDATE leads SET
       full_name = ?, phone = ?, email = ?, car_model_id = ?, source = ?,
       address = ?, budget = ?, payment_method = ?, interest_level = ?, source_detail = ?, note = ?,
       updated_at = ?
     WHERE id = ?`,
    [
      full_name ?? lead.full_name,
      phone ?? lead.phone,
      finalEmail,
      car_model_id === undefined ? lead.car_model_id : (car_model_id || null),
      source ?? lead.source,
      keep(address, lead.address),
      keep(budget, lead.budget),
      keep(payment_method, lead.payment_method),
      keep(interest_level, lead.interest_level),
      keep(source_detail, lead.source_detail),
      keep(note, lead.note),
      nowIso(),
      req.params.id,
    ]
  );
  persist();
  res.json({ ok: true });
});

/** PATCH /api/leads/:id/status — cập nhật trạng thái xử lý (US-01.3). */
router.patch('/:id/status', (req, res) => {
  const { status } = req.body || {};
  if (!LEAD_PROCESSING_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Chỉ được đặt một trong 5 trạng thái xử lý tại đây' });
  }
  const lead = get<any>('SELECT * FROM leads WHERE id = ?', [req.params.id]);
  if (!lead) return res.status(404).json({ error: 'Không tìm thấy Lead' });

  const newLeadStatus = deriveLeadStatus(status, !!lead.is_archived, lead.assigned_sales_id);
  transaction(() => {
    run('INSERT INTO lead_status_history (id,lead_id,status_before,status_after,changed_by,changed_at) VALUES (?,?,?,?,?,?)',
      [uuid(), lead.id, lead.status_detail, status, req.user!.id, nowIso()]);
    run('UPDATE leads SET status_detail = ?, lead_status = ?, updated_at = ? WHERE id = ?', [status, newLeadStatus, nowIso(), lead.id]);
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

  const newLeadStatus = result === 'Thành công' ? 'won' : result === 'Lead thất bại' ? 'lost' : deriveLeadStatus(result, !!lead.is_archived, lead.assigned_sales_id);
  transaction(() => {
    run('INSERT INTO lead_status_history (id,lead_id,status_before,status_after,reason,changed_by,changed_at) VALUES (?,?,?,?,?,?,?)',
      [uuid(), lead.id, lead.status_detail, result, change_reason || null, req.user!.id, nowIso()]);
    run('UPDATE leads SET status_detail = ?, lead_status = ?, lost_reason_id = ?, lost_reason_note = ?, updated_at = ? WHERE id = ?',
      [result, newLeadStatus, result === 'Lead thất bại' ? lost_reason_id : null, result === 'Lead thất bại' ? (lost_reason_note || null) : null, nowIso(), lead.id]);
  });
  res.json({ ok: true });
});

/** DELETE /api/leads/:id — xóa mềm (lưu trữ) (US-01.4, BR-04). */
router.delete('/:id', (req, res) => {
  const lead = get<any>('SELECT id FROM leads WHERE id = ?', [req.params.id]);
  if (!lead) return res.status(404).json({ error: 'Không tìm thấy Lead' });
  run("UPDATE leads SET is_archived = 1, lead_status = 'deleted', updated_at = ? WHERE id = ?", [nowIso(), req.params.id]);
  persist();
  res.json({ ok: true });
});

/** POST /api/leads/:id/assign — Admin gán/chuyển Lead (US-01.5). */
router.post('/:id/assign', requireRole('Admin'), (req, res) => {
  const { sales_id } = req.body || {};
  const sale = get<any>('SELECT id FROM users WHERE id = ? AND role = ?', [sales_id, 'Sales']);
  if (!sale) return res.status(400).json({ error: 'Sales không hợp lệ' });
  const lead = get<any>('SELECT id, full_name, status_detail, is_archived FROM leads WHERE id = ?', [req.params.id]);
  if (!lead) return res.status(404).json({ error: 'Không tìm thấy Lead' });
  const newLeadStatus = deriveLeadStatus(lead.status_detail, !!lead.is_archived, sales_id);
  run('UPDATE leads SET assigned_sales_id = ?, lead_status = ?, updated_at = ? WHERE id = ?', [sales_id, newLeadStatus, nowIso(), req.params.id]);
  // Thông báo cho Sales được gán (US-01.5)
  run(
    `INSERT INTO notifications (id,user_id,type,title,body,ref_type,ref_id,is_read,created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    [uuid(), sales_id, 'lead_assigned', 'Bạn được gán một Lead mới', `Lead: ${lead.full_name}`, 'lead', lead.id, 0, nowIso()]
  );
  persist();
  pushToUser(sales_id, { title: 'Bạn được gán một Lead mới', body: `Lead: ${lead.full_name}`, url: `/leads/${lead.id}`, tag: lead.id }).catch(() => {});
  res.json({ ok: true });
});

export default router;
