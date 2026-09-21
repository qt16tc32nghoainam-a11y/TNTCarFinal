import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { all, get, run, transaction, persist } from '../db/database';
import { authenticate, requireRole } from '../middleware/auth';
import { sendMail, testDriveEmail } from '../mailer';

const router = Router();
const nowIso = () => new Date().toISOString();

/** GET /api/cars — tìm kiếm & lọc xe (FR-03/FR-07). Public-friendly nhưng đặt sau auth ở router chính. */
router.get('/', (req, res) => {
  const { q, brand, fuel, segment, minPrice, maxPrice, showroom, all: showAll } = req.query as Record<string, string>;
  // Mặc định chỉ hiện xe đang bán (BR-INV-01); Admin có thể xem tất cả (kể cả hết hàng) để quản lý
  const conds: string[] = showAll === '1' ? ['1=1'] : ["status IN ('Available','In-transit')"];
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

// ------------- Thư viện ảnh xe (FR-07) -------------

/**
 * POST /api/cars/images/backfill — Admin bơm ảnh mẫu cho các xe CHƯA có ảnh.
 * Chạy 1 lần trên môi trường đã có DB cũ (bảng car_images trống) để không phải seed lại.
 * KHÔNG đụng tới các xe đã có ảnh, không xóa dữ liệu khác.
 */
router.post('/images/backfill', authenticate, requireRole('Admin'), (_req, res) => {
  const partImages: [string, string][] = [
    ['Ngoại thất phía sau', 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=800&q=70'],
    ['Nội thất - khoang lái', 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=70'],
    ['Vô lăng & bảng đồng hồ', 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&q=70'],
    ['Bánh xe & mâm', 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=70'],
    ['Khoang máy', 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=70'],
    ['Cốp xe', 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=800&q=70'],
  ];
  const cars = all<any>('SELECT id, image_url FROM car_models');
  let filled = 0;
  transaction(() => {
    for (const car of cars) {
      const existing = get<any>('SELECT COUNT(*) c FROM car_images WHERE car_model_id = ?', [car.id]);
      if ((existing?.c || 0) > 0) continue; // xe đã có ảnh -> bỏ qua
      let order = 0;
      if (car.image_url) {
        run('INSERT INTO car_images (id,car_model_id,url,caption,sort_order) VALUES (?,?,?,?,?)',
          [uuid(), car.id, car.image_url, 'Ngoại thất', order++]);
      }
      for (const [caption, url] of partImages) {
        run('INSERT INTO car_images (id,car_model_id,url,caption,sort_order) VALUES (?,?,?,?,?)',
          [uuid(), car.id, url, caption, order++]);
      }
      filled++;
    }
  });
  res.json({ ok: true, cars_filled: filled, message: `Đã bơm ảnh cho ${filled} xe chưa có ảnh.` });
});

/** GET /api/cars/:id/images — danh sách ảnh của xe (công khai). */
router.get('/:id/images', (req, res) => {
  res.json(all('SELECT * FROM car_images WHERE car_model_id = ? ORDER BY sort_order ASC, rowid ASC', [req.params.id]));
});

/** POST /api/cars/:id/images — Admin thêm ảnh (1 hoặc nhiều). Body: { images: [{url, caption}] } hoặc { url, caption }. */
router.post('/:id/images', authenticate, requireRole('Admin'), (req, res) => {
  const car = get<any>('SELECT id FROM car_models WHERE id = ?', [req.params.id]);
  if (!car) return res.status(404).json({ error: 'Không tìm thấy xe' });
  const list = Array.isArray(req.body?.images) ? req.body.images : [req.body];
  const valid = list.filter((x: any) => x && x.url);
  if (valid.length === 0) return res.status(400).json({ error: 'Thiếu ảnh' });
  const base = (get<any>('SELECT COALESCE(MAX(sort_order),0) m FROM car_images WHERE car_model_id = ?', [req.params.id])?.m) || 0;
  const created: string[] = [];
  transaction(() => {
    valid.forEach((img: any, i: number) => {
      const id = uuid();
      run('INSERT INTO car_images (id,car_model_id,url,caption,sort_order) VALUES (?,?,?,?,?)',
        [id, req.params.id, img.url, img.caption || null, base + i + 1]);
      created.push(id);
    });
  });
  res.status(201).json({ ok: true, ids: created });
});

/** DELETE /api/cars/:id/images/:imageId — Admin xóa 1 ảnh. */
router.delete('/:id/images/:imageId', authenticate, requireRole('Admin'), (req, res) => {
  run('DELETE FROM car_images WHERE id = ? AND car_model_id = ?', [req.params.imageId, req.params.id]);
  persist();
  res.json({ ok: true });
});

/** PATCH /api/cars/:id — Admin cập nhật thông tin xe (kèm ảnh) (FR-03/FR-08). */
router.patch('/:id', authenticate, requireRole('Admin'), (req, res) => {
  const car = get<any>('SELECT * FROM car_models WHERE id = ?', [req.params.id]);
  if (!car) return res.status(404).json({ error: 'Không tìm thấy xe' });
  const b = req.body || {};
  const fields = ['name', 'brand', 'price', 'fuel_type', 'segment', 'year', 'transmission', 'color', 'image_url', 'promotion', 'status'];
  const sets: string[] = [];
  const params: any[] = [];
  for (const f of fields) {
    if (b[f] !== undefined) { sets.push(`${f} = ?`); params.push(b[f]); }
  }
  if (sets.length === 0) return res.status(400).json({ error: 'Không có dữ liệu cập nhật' });
  if (b.status && !['Available', 'In-transit', 'OutOfStock'].includes(b.status)) {
    return res.status(400).json({ error: 'Trạng thái xe không hợp lệ' });
  }
  params.push(req.params.id);
  run(`UPDATE car_models SET ${sets.join(', ')} WHERE id = ?`, params);
  persist();
  res.json({ ok: true });
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
  const images = all('SELECT * FROM car_images WHERE car_model_id = ? ORDER BY sort_order ASC, rowid ASC', [req.params.id]);
  res.json({ ...car, inventory, images });
});

// ------------- Lái thử -------------

/** GET /api/cars/slots/:showroomId — khung giờ lái thử còn trống (cách hiện tại >=2h, không ngày nghỉ). */
router.get('/slots/available/:showroomId', authenticate, (req, res) => {
  const minTime = new Date(Date.now() + 2 * 3600 * 1000).toISOString(); // BR-TD-02
  const carModelId = typeof req.query.car_model_id === 'string' ? req.query.car_model_id : '';
  const carClause = carModelId ? ' AND (car_model_id IS NULL OR car_model_id = ?)' : '';
  const params: any[] = [req.params.showroomId, minTime];
  if (carModelId) params.push(carModelId);
  const slots = all(
    `SELECT * FROM slots WHERE showroom_id = ? AND is_available = 1 AND is_holiday = 0 AND start_time >= ?${carClause} ORDER BY start_time ASC`,
    params
  );
  res.json(slots);
});

/** POST /api/cars/test-drives — đặt lịch lái thử (US-03.4). */
router.post('/test-drives', authenticate, (req, res) => {
  const { car_model_id, showroom_id, slot_id, customer_name, customer_phone, customer_email } = req.body || {};
  if (!car_model_id || !showroom_id || !slot_id || !customer_name || !customer_phone) {
    return res.status(400).json({ error: 'Thiếu thông tin đặt lịch' });
  }
  const slot = get<any>('SELECT * FROM slots WHERE id = ?', [slot_id]);
  if (!slot || !slot.is_available) return res.status(409).json({ error: 'Khung giờ vừa bị giữ, vui lòng chọn lại' });
  if (slot.is_holiday) return res.status(400).json({ error: 'Khung giờ này là ngày nghỉ, không thể đặt lịch' });
  if (slot.showroom_id !== showroom_id) return res.status(400).json({ error: 'Khung giờ không thuộc showroom đã chọn' });
  if (slot.car_model_id && slot.car_model_id !== car_model_id) {
    return res.status(400).json({ error: 'Khung giờ này được cấu hình cho một xe khác' });
  }

  // BR-TD-02: khung giờ phải cách hiện tại tối thiểu 2 giờ (kiểm lại lúc đặt)
  if (new Date(slot.start_time).getTime() < Date.now() + 2 * 3600000) {
    return res.status(400).json({ error: 'Khung giờ phải cách hiện tại tối thiểu 2 giờ' });
  }

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
      `INSERT INTO leads (id,full_name,phone,email,car_model_id,source,status_detail,assigned_sales_id,created_by,sync_status,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [leadId, customer_name, customer_phone, customer_email || null, car_model_id, 'Showroom/Sự kiện', 'Có nhu cầu ngay', req.user!.id, req.user!.id, 'SYNCED', nowIso(), nowIso()]
    );
    run(
      `INSERT INTO test_drive_bookings (id,booking_code,car_model_id,showroom_id,slot_id,customer_name,customer_phone,customer_email,lead_id,status,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [bookingId, code, car_model_id, showroom_id, slot_id, customer_name, customer_phone, customer_email || null, leadId, 'Đã xác nhận', nowIso()]
    );
    run('UPDATE slots SET is_available = 0 WHERE id = ?', [slot_id]);
  });
  persist();

  // Gửi email xác nhận cho khách (nếu có email)
  if (customer_email) {
    const car = get<any>('SELECT brand, name FROM car_models WHERE id = ?', [car_model_id]);
    const sr = get<any>('SELECT name FROM showrooms WHERE id = ?', [showroom_id]);
    const mail = testDriveEmail({
      customerName: customer_name,
      carName: car ? `${car.brand} ${car.name}` : 'xe',
      showroomName: sr?.name || '',
      startTime: slot.start_time,
      bookingCode: code,
    });
    sendMail(customer_email, mail.subject, mail.html).catch(() => {});
  }

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
  // Bỏ luồng xác nhận/từ chối: lịch đặt xong là 'Đã xác nhận'. Sales chỉ cập nhật kết quả hoặc hủy.
  const valid = ['Hoàn thành', 'Vắng mặt', 'Hủy'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
  const booking = get<any>('SELECT b.*, s.start_time FROM test_drive_bookings b JOIN slots s ON s.id = b.slot_id WHERE b.id = ?', [req.params.id]);
  if (!booking) return res.status(404).json({ error: 'Không tìm thấy lịch' });

  // BR-TD-05: khách hủy phải trước giờ hẹn tối thiểu 4 giờ
  if (status === 'Hủy' && new Date(booking.start_time).getTime() < Date.now() + 4 * 3600000) {
    return res.status(400).json({ error: 'Chỉ được hủy trước giờ hẹn tối thiểu 4 giờ. Vui lòng liên hệ showroom trực tiếp.' });
  }

  transaction(() => {
    run('UPDATE test_drive_bookings SET status = ?, result_note = ? WHERE id = ?', [status, note || booking.result_note, req.params.id]);
    // Hủy thì giải phóng khung giờ cho người khác đặt
    if (status === 'Hủy') {
      run('UPDATE slots SET is_available = 1 WHERE id = ?', [booking.slot_id]);
    }
  });
  res.json({ ok: true });
});

/** PATCH /api/cars/test-drives/:id/reschedule — đổi khung giờ (BR-TD-05, trước 4h). */
router.patch('/test-drives/:id/reschedule', authenticate, (req, res) => {
  const { new_slot_id } = req.body || {};
  if (!new_slot_id) return res.status(400).json({ error: 'Thiếu khung giờ mới' });
  const booking = get<any>('SELECT b.*, s.start_time FROM test_drive_bookings b JOIN slots s ON s.id = b.slot_id WHERE b.id = ?', [req.params.id]);
  if (!booking) return res.status(404).json({ error: 'Không tìm thấy lịch' });
  if (booking.status !== 'Đã xác nhận') {
    return res.status(400).json({ error: 'Chỉ đổi được lịch đang hoạt động' });
  }
  // BR-TD-05: đổi lịch phải trước giờ hẹn tối thiểu 4 giờ
  if (new Date(booking.start_time).getTime() < Date.now() + 4 * 3600000) {
    return res.status(400).json({ error: 'Chỉ được đổi lịch trước giờ hẹn tối thiểu 4 giờ. Vui lòng liên hệ showroom.' });
  }
  const newSlot = get<any>('SELECT * FROM slots WHERE id = ?', [new_slot_id]);
  if (!newSlot || !newSlot.is_available) return res.status(409).json({ error: 'Khung giờ mới không còn trống' });
  if (newSlot.is_holiday) return res.status(400).json({ error: 'Khung giờ mới là ngày nghỉ' });
  if (newSlot.car_model_id && newSlot.car_model_id !== booking.car_model_id) {
    return res.status(400).json({ error: 'Khung giờ mới được cấu hình cho một xe khác' });
  }
  // BR-TD-02: slot mới cách hiện tại tối thiểu 2 giờ
  if (new Date(newSlot.start_time).getTime() < Date.now() + 2 * 3600000) {
    return res.status(400).json({ error: 'Khung giờ mới phải cách hiện tại tối thiểu 2 giờ' });
  }

  transaction(() => {
    run('UPDATE slots SET is_available = 1 WHERE id = ?', [booking.slot_id]); // giải phóng slot cũ
    run('UPDATE slots SET is_available = 0 WHERE id = ?', [new_slot_id]);      // khóa slot mới
    run('UPDATE test_drive_bookings SET slot_id = ?, showroom_id = ? WHERE id = ?', [new_slot_id, newSlot.showroom_id, req.params.id]);
    // Nếu booking được tạo từ Lịch hẹn Lead, đồng bộ thời gian reminder theo slot mới.
    run('UPDATE reminders SET remind_at = ?, notified = 0 WHERE booking_id = ?', [newSlot.start_time, req.params.id]);
  });
  persist();

  // Gửi email cập nhật lịch cho khách. Ưu tiên snapshot email trên booking, fallback về Lead.
  const leadEmail = booking.customer_email || (booking.lead_id ? get<any>('SELECT email FROM leads WHERE id = ?', [booking.lead_id])?.email : null);
  if (leadEmail) {
    const car = get<any>('SELECT brand, name FROM car_models WHERE id = ?', [booking.car_model_id]);
    const sr = get<any>('SELECT name FROM showrooms WHERE id = ?', [newSlot.showroom_id]);
    const mail = testDriveEmail({
      customerName: booking.customer_name,
      carName: car ? `${car.brand} ${car.name}` : 'xe',
      showroomName: sr?.name || '',
      startTime: newSlot.start_time,
      bookingCode: booking.booking_code,
      rescheduled: true,
    });
    sendMail(leadEmail, mail.subject, mail.html).catch(() => {});
  }
  res.json({ ok: true });
});

/** POST /api/cars/slots — Admin cấu hình khung giờ (US-03.8). */
router.post('/slots', authenticate, requireRole('Admin'), (req, res) => {
  const { showroom_id, car_model_id, start_time, end_time, is_holiday } = req.body || {};
  if (!showroom_id || !start_time || !end_time) return res.status(400).json({ error: 'Thiếu thông tin khung giờ' });
  const startMs = new Date(start_time).getTime();
  const endMs = new Date(end_time).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return res.status(400).json({ error: 'Thời gian kết thúc phải sau thời gian bắt đầu' });
  }
  if (startMs < Date.now()) return res.status(400).json({ error: 'Không thể tạo khung giờ trong quá khứ' });
  if (!get('SELECT id FROM showrooms WHERE id = ?', [showroom_id])) return res.status(400).json({ error: 'Showroom không hợp lệ' });
  if (car_model_id && !get('SELECT id FROM car_models WHERE id = ?', [car_model_id])) return res.status(400).json({ error: 'Xe không hợp lệ' });
  const overlap = get<any>(
    `SELECT id FROM slots WHERE showroom_id = ?
       AND (car_model_id IS NULL OR ? IS NULL OR car_model_id = ?)
       AND start_time < ? AND end_time > ?`,
    [showroom_id, car_model_id || null, car_model_id || null, end_time, start_time]
  );
  if (overlap) return res.status(409).json({ error: 'Khung giờ bị trùng với slot hiện có tại showroom này' });
  const id = uuid();
  run(
    `INSERT INTO slots (id,showroom_id,car_model_id,start_time,end_time,is_available,is_holiday) VALUES (?,?,?,?,?,?,?)`,
    [id, showroom_id, car_model_id || null, start_time, end_time, 1, is_holiday ? 1 : 0]
  );
  persist();
  res.status(201).json({ id });
});

/**
 * GET /api/cars/slots/manage — danh sách slot cho trang Cấu hình (Admin):
 * kèm thông tin đã có ai đặt chưa (tên khách, xe), còn trống hay đã đặt.
 */
router.get('/slots/manage', authenticate, requireRole('Admin'), (req, res) => {
  const { showroom_id } = req.query as Record<string, string>;
  const cond = showroom_id ? 'WHERE sl.showroom_id = ?' : '';
  const params = showroom_id ? [showroom_id] : [];
  const rows = all(
    `SELECT sl.id, sl.start_time, sl.end_time, sl.is_available, sl.is_holiday,
            sr.name AS showroom_name,
            cm.brand AS slot_car_brand, cm.name AS slot_car_name,
            b.id AS booking_id, b.booking_code, b.customer_name, b.customer_phone, b.status AS booking_status,
            bc.brand AS booked_car_brand, bc.name AS booked_car_name
     FROM slots sl
     LEFT JOIN showrooms sr ON sr.id = sl.showroom_id
     LEFT JOIN car_models cm ON cm.id = sl.car_model_id
     LEFT JOIN test_drive_bookings b ON b.slot_id = sl.id AND b.status NOT IN ('Hủy','Từ chối')
     LEFT JOIN car_models bc ON bc.id = b.car_model_id
     ${cond}
     ORDER BY sl.start_time ASC`,
    params
  );
  res.json(rows);
});

/** GET /api/cars/slots/showrooms — danh sách showroom (cho bộ lọc trang slot). */
router.get('/slots/showrooms', authenticate, (_req, res) => {
  res.json(all('SELECT id, name FROM showrooms ORDER BY name'));
});

export default router;
