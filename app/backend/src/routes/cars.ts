import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { all, get, run, transaction, persist, nextCustomerCode } from '../db/database';
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

/**
 * GET /api/cars/slots/:showroomId — khung giờ lái thử còn trống (giờ hẹn ở tương lai, không ngày nghỉ).
 * Trả về TẤT CẢ khung giờ còn trống của showroom (kèm tên xe áp dụng, nếu có), không ẩn khung giờ
 * cấu hình cho xe khác — để Sale luôn thấy đủ những gì Admin đã tạo và tự chọn đúng, tránh dropdown
 * trống oan do lệch car_model_id giữa Lead và Slot (Admin chọn nhầm xe, Lead đổi xe quan tâm sau...).
 * car_model_id truyền vào (nếu có) chỉ dùng để ưu tiên sắp xếp slot đúng xe lên đầu danh sách.
 */
router.get('/slots/available/:showroomId', authenticate, (req, res) => {
  const minTime = new Date().toISOString(); // chỉ ẩn khung giờ đã qua; khung giờ tương lai đều đặt được (bỏ ngưỡng 2h)
  const carModelId = typeof req.query.car_model_id === 'string' ? req.query.car_model_id : '';
  const slots = all<any>(
    `SELECT sl.*, cm.brand AS car_brand, cm.name AS car_name
     FROM slots sl
     LEFT JOIN car_models cm ON cm.id = sl.car_model_id
     WHERE sl.showroom_id = ? AND sl.is_available = 1 AND sl.is_holiday = 0 AND sl.start_time >= ?
     ORDER BY sl.start_time ASC`,
    [req.params.showroomId, minTime]
  );
  if (carModelId) {
    // Ưu tiên hiển thị slot đúng xe của Lead lên đầu, nhưng vẫn giữ các slot khác xe/mọi xe phía sau.
    slots.sort((a, b) => {
      const aMatch = !a.car_model_id || a.car_model_id === carModelId ? 0 : 1;
      const bMatch = !b.car_model_id || b.car_model_id === carModelId ? 0 : 1;
      return aMatch - bMatch;
    });
  }
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

  // Không cho đặt vào khung giờ đã qua (bỏ ngưỡng 2 giờ để dùng được khung giờ vừa cấu hình).
  if (new Date(slot.start_time).getTime() < Date.now()) {
    return res.status(400).json({ error: 'Khung giờ đã qua, vui lòng chọn khung giờ khác' });
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
  const customerCode = nextCustomerCode();
  transaction(() => {
    // Tự tạo Lead cho Sales hiện tại
    run(
      `INSERT INTO leads (id,customer_code,full_name,phone,email,car_model_id,source,status_detail,lead_status,assigned_sales_id,created_by,sync_status,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [leadId, customerCode, customer_name, customer_phone, customer_email || null, car_model_id, 'Showroom/Sự kiện', 'Có nhu cầu ngay', 'assigned', req.user!.id, req.user!.id, 'SYNCED', nowIso(), nowIso()]
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
      salesName: req.user?.full_name,
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

/** PATCH /api/cars/test-drives/:id/reschedule — đổi khung giờ (chỉ chặn khung giờ đã qua). */
router.patch('/test-drives/:id/reschedule', authenticate, (req, res) => {
  const { new_slot_id } = req.body || {};
  if (!new_slot_id) return res.status(400).json({ error: 'Thiếu khung giờ mới' });
  const booking = get<any>('SELECT b.*, s.start_time FROM test_drive_bookings b JOIN slots s ON s.id = b.slot_id WHERE b.id = ?', [req.params.id]);
  if (!booking) return res.status(404).json({ error: 'Không tìm thấy lịch' });
  if (booking.status !== 'Đã xác nhận') {
    return res.status(400).json({ error: 'Chỉ đổi được lịch đang hoạt động' });
  }
  const newSlot = get<any>('SELECT * FROM slots WHERE id = ?', [new_slot_id]);
  if (!newSlot || !newSlot.is_available) return res.status(409).json({ error: 'Khung giờ mới không còn trống' });
  if (newSlot.is_holiday) return res.status(400).json({ error: 'Khung giờ mới là ngày nghỉ' });
  if (newSlot.car_model_id && newSlot.car_model_id !== booking.car_model_id) {
    return res.status(400).json({ error: 'Khung giờ mới được cấu hình cho một xe khác' });
  }
  // Không cho đổi sang khung giờ đã qua (bỏ ngưỡng 2 giờ).
  if (new Date(newSlot.start_time).getTime() < Date.now()) {
    return res.status(400).json({ error: 'Khung giờ mới đã qua, vui lòng chọn khung giờ khác' });
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
      salesName: req.user?.full_name,
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
 * POST /api/cars/slots/:slotId/book-lead — Đặt lịch lái thử cho một Lead CÓ SẴN vào khung giờ này.
 * Dùng ở trang Cấu hình khung giờ: chọn khung giờ trống -> chọn Lead -> tạo booking (không tạo Lead mới).
 * Thông tin khách lấy từ Lead; xe lấy từ Lead (hoặc body car_model_id nếu Lead chưa có xe).
 */
router.post('/slots/:slotId/book-lead', authenticate, (req, res) => {
  const { lead_id, car_model_id: bodyCar, customer_email: bodyEmail } = req.body || {};
  if (!lead_id) return res.status(400).json({ error: 'Vui lòng chọn Lead' });

  const lead = get<any>('SELECT * FROM leads WHERE id = ? AND is_archived = 0', [lead_id]);
  if (!lead) return res.status(404).json({ error: 'Không tìm thấy Lead' });

  const slot = get<any>('SELECT * FROM slots WHERE id = ?', [req.params.slotId]);
  if (!slot) return res.status(404).json({ error: 'Không tìm thấy khung giờ' });
  if (!slot.is_available) return res.status(409).json({ error: 'Khung giờ đã có người đặt' });
  if (slot.is_holiday) return res.status(400).json({ error: 'Khung giờ này là ngày nghỉ' });
  if (new Date(slot.start_time).getTime() < Date.now()) {
    return res.status(400).json({ error: 'Khung giờ đã qua, vui lòng chọn khung giờ khác' });
  }

  // Xe: ưu tiên xe của khung giờ (nếu slot cấu hình cho 1 xe), rồi xe của Lead, rồi body.
  const carModelId = slot.car_model_id || lead.car_model_id || bodyCar || null;
  if (!carModelId) return res.status(400).json({ error: 'Lead chưa có xe quan tâm — vui lòng chọn xe cho lịch lái thử' });
  if (slot.car_model_id && slot.car_model_id !== carModelId) {
    return res.status(400).json({ error: 'Khung giờ này được cấu hình cho một xe khác' });
  }
  if (!get('SELECT id FROM car_models WHERE id = ?', [carModelId])) {
    return res.status(400).json({ error: 'Xe không hợp lệ' });
  }

  const customerEmail = bodyEmail || lead.email || null;

  // BR-TD-01: tối đa 3 lịch active của cùng SĐT
  const activeCount = get<any>(
    `SELECT COUNT(*) c FROM test_drive_bookings WHERE customer_phone = ? AND status IN ('Chờ xác nhận','Đã xác nhận')`,
    [lead.phone]
  );
  if ((activeCount?.c || 0) >= 3) return res.status(409).json({ error: 'Khách đã có tối đa 3 lịch lái thử đang hoạt động' });

  const bookingId = uuid();
  const code = 'TD' + Date.now().toString().slice(-8);
  transaction(() => {
    run(
      `INSERT INTO test_drive_bookings (id,booking_code,car_model_id,showroom_id,slot_id,customer_name,customer_phone,customer_email,lead_id,status,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [bookingId, code, carModelId, slot.showroom_id, slot.id, lead.full_name, lead.phone, customerEmail, lead.id, 'Đã xác nhận', nowIso()]
    );
    run('UPDATE slots SET is_available = 0 WHERE id = ?', [slot.id]);
    // Đánh dấu Lead đang có nhu cầu (không ép nếu đã Won/Lost)
    if (!['Thành công', 'Lead thất bại'].includes(lead.status_detail)) {
      run("UPDATE leads SET status_detail = 'Có nhu cầu ngay', updated_at = ? WHERE id = ?", [nowIso(), lead.id]);
    }
  });
  persist();

  // Gửi email xác nhận cho khách nếu có email
  if (customerEmail) {
    const car = get<any>('SELECT brand, name FROM car_models WHERE id = ?', [carModelId]);
    const sr = get<any>('SELECT name FROM showrooms WHERE id = ?', [slot.showroom_id]);
    const mail = testDriveEmail({
      customerName: lead.full_name,
      carName: car ? `${car.brand} ${car.name}` : 'xe',
      showroomName: sr?.name || '',
      startTime: slot.start_time,
      bookingCode: code,
      salesName: req.user?.full_name,
    });
    sendMail(customerEmail, mail.subject, mail.html).catch(() => {});
  }

  res.status(201).json({ id: bookingId, booking_code: code, lead_id: lead.id });
});

/** GET /api/cars/leads/search — tìm Lead để gán vào khung giờ (theo tên/SĐT). */
router.get('/leads/search', authenticate, (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const like = `%${q}%`;
  const rows = all(
    `SELECT l.id, l.full_name, l.phone, l.email, l.car_model_id,
            c.brand AS car_brand, c.name AS car_name, l.status_detail
     FROM leads l
     LEFT JOIN car_models c ON c.id = l.car_model_id
     WHERE l.is_archived = 0 AND (? = '' OR l.full_name LIKE ? OR l.phone LIKE ?)
     ORDER BY l.updated_at DESC
     LIMIT 20`,
    [q, like, like]
  );
  res.json(rows);
});

/**
 * POST /api/cars/test-drives/quick — Sale tự chọn giờ hẹn (không cần Admin cấu hình sẵn slot).
 * Tự tạo 1 khung giờ mới (60 phút) tại showroom cho đúng giờ Sale chọn, rồi đặt lịch cho Lead đó luôn.
 * Vẫn đi qua bảng slots để đảm bảo chống trùng giờ (BR-TD-01/02) như các luồng đặt lịch khác.
 */
router.post('/test-drives/quick', authenticate, (req, res) => {
  const { lead_id, showroom_id, start_time, car_model_id: bodyCar, customer_email: bodyEmail } = req.body || {};
  if (!lead_id || !showroom_id || !start_time) return res.status(400).json({ error: 'Thiếu Lead, Showroom hoặc thời gian hẹn' });

  const lead = get<any>('SELECT * FROM leads WHERE id = ? AND is_archived = 0', [lead_id]);
  if (!lead) return res.status(404).json({ error: 'Không tìm thấy Lead' });
  if (!get('SELECT id FROM showrooms WHERE id = ?', [showroom_id])) return res.status(400).json({ error: 'Showroom không hợp lệ' });

  const startMs = new Date(start_time).getTime();
  if (!Number.isFinite(startMs)) return res.status(400).json({ error: 'Thời gian hẹn không hợp lệ' });
  if (startMs < Date.now()) return res.status(400).json({ error: 'Thời gian hẹn đã qua, vui lòng chọn thời gian khác' });
  // Chuẩn hóa về đúng 1 định dạng ISO để lưu DB và so sánh overlap (tránh lệch định dạng chuỗi client gửi lên).
  const startIso = new Date(startMs).toISOString();
  const endIso = new Date(startMs + 60 * 60000).toISOString(); // khung giờ 60 phút

  const carModelId = bodyCar || lead.car_model_id || null;
  if (!carModelId) return res.status(400).json({ error: 'Lead chưa có xe quan tâm — vui lòng chọn xe cho lịch lái thử' });
  if (!get('SELECT id FROM car_models WHERE id = ?', [carModelId])) return res.status(400).json({ error: 'Xe không hợp lệ' });

  // Chống trùng giờ tại showroom (giống logic tạo slot của Admin)
  const overlap = get<any>(
    `SELECT id FROM slots WHERE showroom_id = ?
       AND (car_model_id IS NULL OR car_model_id = ?)
       AND start_time < ? AND end_time > ?`,
    [showroom_id, carModelId, endIso, startIso]
  );
  if (overlap) return res.status(409).json({ error: 'Đã có lịch khác trùng giờ này tại showroom. Vui lòng chọn giờ khác.' });

  const customerEmail = bodyEmail || lead.email || null;
  const activeCount = get<any>(
    `SELECT COUNT(*) c FROM test_drive_bookings WHERE customer_phone = ? AND status IN ('Chờ xác nhận','Đã xác nhận')`,
    [lead.phone]
  );
  if ((activeCount?.c || 0) >= 3) return res.status(409).json({ error: 'Khách đã có tối đa 3 lịch lái thử đang hoạt động' });

  const slotId = uuid();
  const bookingId = uuid();
  const code = 'TD' + Date.now().toString().slice(-8);
  transaction(() => {
    run(
      `INSERT INTO slots (id,showroom_id,car_model_id,start_time,end_time,is_available,is_holiday) VALUES (?,?,?,?,?,?,?)`,
      [slotId, showroom_id, carModelId, startIso, endIso, 0, 0] // is_available=0: đặt luôn, không lộ ra danh sách "còn trống"
    );
    run(
      `INSERT INTO test_drive_bookings (id,booking_code,car_model_id,showroom_id,slot_id,customer_name,customer_phone,customer_email,lead_id,status,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [bookingId, code, carModelId, showroom_id, slotId, lead.full_name, lead.phone, customerEmail, lead.id, 'Đã xác nhận', nowIso()]
    );
    if (!['Thành công', 'Lead thất bại'].includes(lead.status_detail)) {
      run("UPDATE leads SET status_detail = 'Có nhu cầu ngay', updated_at = ? WHERE id = ?", [nowIso(), lead.id]);
    }
  });
  persist();

  if (customerEmail) {
    const car = get<any>('SELECT brand, name FROM car_models WHERE id = ?', [carModelId]);
    const sr = get<any>('SELECT name FROM showrooms WHERE id = ?', [showroom_id]);
    const mail = testDriveEmail({
      customerName: lead.full_name,
      carName: car ? `${car.brand} ${car.name}` : 'xe',
      showroomName: sr?.name || '',
      startTime: startIso,
      bookingCode: code,
      salesName: req.user?.full_name,
    });
    sendMail(customerEmail, mail.subject, mail.html).catch(() => {});
  }

  res.status(201).json({ id: bookingId, booking_code: code, lead_id: lead.id, slot_id: slotId });
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
            b.id AS booking_id, b.booking_code, b.customer_name, b.customer_phone, b.status AS booking_status, b.lead_id,
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
