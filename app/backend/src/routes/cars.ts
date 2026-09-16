import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { all, get, run, transaction, persist } from '../db/database';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
const nowIso = () => new Date().toISOString();

/** GET /api/cars — tìm kiếm & lọc xe (FR-03/FR-07). Public-friendly nhưng đặt sau auth ở router chính. */
router.get('/', (req, res) => {
  const { q, brand, fuel, segment, minPrice, maxPrice, showroom } = req.query as Record<string, string>;
  const conds: string[] = ["status IN ('Available','In-transit')"]; // BR-INV-01
  const params: any[] = [];
  if (q) { conds.push('(name LIKE ? OR brand LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  if (brand) { conds.push('brand = ?'); params.push(brand); }
  if (fuel) { conds.push('fuel_type = ?'); params.push(fuel); }
  if (segment) { conds.push('segment = ?'); params.push(segment); }
  if (minPrice) { conds.push('price >= ?'); params.push(Number(minPrice)); }
  if (maxPrice) { conds.push('price <= ?'); params.push(Number(maxPrice)); }
  const cars = all(`SELECT * FROM car_models WHERE ${conds.join(' AND ')} ORDER BY price ASC`, params);
  res.json(cars);
});

/** GET /api/cars/:id — chi tiết xe + tồn kho theo showroom (FR-03 US-03.2). */
router.get('/:id', (req, res) => {
  const car = get<any>('SELECT * FROM car_models WHERE id = ?', [req.params.id]);
  if (!car) return res.status(404).json({ error: 'Không tìm thấy xe' });
  const inventory = all(
    `SELECT ci.quantity, s.id AS showroom_id, s.name AS showroom_name, s.address
     FROM car_inventory ci JOIN showrooms s ON s.id = ci.showroom_id
     WHERE ci.car_model_id = ?`,
    [req.params.id]
  );
  res.json({ ...car, inventory });
});

// ------------- Lái thử -------------

/** GET /api/cars/slots/:showroomId — khung giờ lái thử còn trống (cách hiện tại >=2h, không ngày nghỉ). */
router.get('/slots/available/:showroomId', authenticate, (req, res) => {
  const minTime = new Date(Date.now() + 2 * 3600 * 1000).toISOString(); // BR-TD-02
  const slots = all(
    `SELECT * FROM slots WHERE showroom_id = ? AND is_available = 1 AND is_holiday = 0 AND start_time >= ? ORDER BY start_time ASC`,
    [req.params.showroomId, minTime]
  );
  res.json(slots);
});

/** POST /api/cars/test-drives — đặt lịch lái thử (US-03.4). */
router.post('/test-drives', authenticate, (req, res) => {
  const { car_model_id, showroom_id, slot_id, customer_name, customer_phone } = req.body || {};
  if (!car_model_id || !showroom_id || !slot_id || !customer_name || !customer_phone) {
    return res.status(400).json({ error: 'Thiếu thông tin đặt lịch' });
  }
  const slot = get<any>('SELECT * FROM slots WHERE id = ?', [slot_id]);
  if (!slot || !slot.is_available) return res.status(409).json({ error: 'Khung giờ vừa bị giữ, vui lòng chọn lại' });

  // BR-TD-01: tối đa 3 lịch active của cùng SĐT
  const activeCount = get<any>(
    `SELECT COUNT(*) c FROM test_drive_bookings WHERE customer_phone = ? AND status IN ('Chờ xác nhận','Đã xác nhận')`,
    [customer_phone]
  );
  if ((activeCount?.c || 0) >= 3) return res.status(409).json({ error: 'Khách đã có tối đa 3 lịch lái thử đang hoạt động' });

  const bookingId = uuid();
  const code = 'TD' + Date.now().toString().slice(-8);
  const leadId = uuid();
  transaction(() => {
    // Tự tạo Lead cho Sales hiện tại
    run(
      `INSERT INTO leads (id,full_name,phone,car_model_id,source,status_detail,assigned_sales_id,created_by,sync_status,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [leadId, customer_name, customer_phone, car_model_id, 'Showroom/Sự kiện', 'Có nhu cầu ngay', req.user!.id, req.user!.id, 'SYNCED', nowIso(), nowIso()]
    );
    run(
      `INSERT INTO test_drive_bookings (id,booking_code,car_model_id,showroom_id,slot_id,customer_name,customer_phone,lead_id,status,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [bookingId, code, car_model_id, showroom_id, slot_id, customer_name, customer_phone, leadId, 'Chờ xác nhận', nowIso()]
    );
    run('UPDATE slots SET is_available = 0 WHERE id = ?', [slot_id]);
  });
  res.status(201).json({ id: bookingId, booking_code: code, lead_id: leadId });
});

/** GET /api/cars/test-drives/list — danh sách booking. */
router.get('/test-drives/list', authenticate, (_req, res) => {
  const rows = all(
    `SELECT b.*, c.name AS car_name, s.name AS showroom_name, sl.start_time, sl.end_time
     FROM test_drive_bookings b
     JOIN car_models c ON c.id = b.car_model_id
     JOIN showrooms s ON s.id = b.showroom_id
     JOIN slots sl ON sl.id = b.slot_id
     ORDER BY sl.start_time DESC`
  );
  res.json(rows);
});

/** PATCH /api/cars/test-drives/:id/status — xác nhận/từ chối/hoàn thành (US-03.5, US-03.7). */
router.patch('/test-drives/:id/status', authenticate, (req, res) => {
  const { status, note } = req.body || {};
  const valid = ['Đã xác nhận', 'Từ chối', 'Hoàn thành', 'Vắng mặt', 'Hủy'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
  const booking = get<any>('SELECT * FROM test_drive_bookings WHERE id = ?', [req.params.id]);
  if (!booking) return res.status(404).json({ error: 'Không tìm thấy lịch' });

  transaction(() => {
    run('UPDATE test_drive_bookings SET status = ?, result_note = ? WHERE id = ?', [status, note || booking.result_note, req.params.id]);
    // Từ chối/Hủy thì giải phóng khung giờ
    if (status === 'Từ chối' || status === 'Hủy') {
      run('UPDATE slots SET is_available = 1 WHERE id = ?', [booking.slot_id]);
    }
  });
  res.json({ ok: true });
});

/** POST /api/cars/slots — Admin cấu hình khung giờ (US-03.8). */
router.post('/slots', authenticate, requireRole('Admin'), (req, res) => {
  const { showroom_id, car_model_id, start_time, end_time, is_holiday } = req.body || {};
  if (!showroom_id || !start_time || !end_time) return res.status(400).json({ error: 'Thiếu thông tin khung giờ' });
  const id = uuid();
  run(
    `INSERT INTO slots (id,showroom_id,car_model_id,start_time,end_time,is_available,is_holiday) VALUES (?,?,?,?,?,?,?)`,
    [id, showroom_id, car_model_id || null, start_time, end_time, 1, is_holiday ? 1 : 0]
  );
  persist();
  res.status(201).json({ id });
});

export default router;
