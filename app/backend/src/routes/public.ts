import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { all, get, run, persist } from '../db/database';

const router = Router();
const nowIso = () => new Date().toISOString();

/** GET /api/public/cars — danh mục xe công khai (FR-07, không cần đăng nhập). */
router.get('/cars', (req, res) => {
  const { q, brand, segment, minPrice, maxPrice } = req.query as Record<string, string>;
  const conds: string[] = ["status IN ('Available','In-transit')"];
  const params: any[] = [];
  if (q) { conds.push('(name LIKE ? OR brand LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  if (brand) { conds.push('brand = ?'); params.push(brand); }
  if (segment) { conds.push('segment = ?'); params.push(segment); }
  if (minPrice) { conds.push('price >= ?'); params.push(Number(minPrice)); }
  if (maxPrice) { conds.push('price <= ?'); params.push(Number(maxPrice)); }
  res.json(all(`SELECT * FROM car_models WHERE ${conds.join(' AND ')} ORDER BY price ASC`, params));
});

/** GET /api/public/cars/:id — chi tiết xe công khai (kèm thư viện ảnh). */
router.get('/cars/:id', (req, res) => {
  const car = get<any>("SELECT * FROM car_models WHERE id = ? AND status IN ('Available','In-transit')", [req.params.id]);
  if (!car) return res.status(404).json({ error: 'Không tìm thấy xe' });
  const images = all('SELECT id,url,caption FROM car_images WHERE car_model_id = ? ORDER BY sort_order ASC, rowid ASC', [req.params.id]);
  res.json({ ...car, images });
});

/** GET /api/public/loan-rates — bảng lãi suất tham khảo (FR-07.2). */
router.get('/loan-rates', (_req, res) => res.json(all('SELECT bank_name, promo_rate, standard_rate, note FROM loan_rates')));

/** GET /api/public/contents — nội dung website công khai (FR-08). */
router.get('/contents', (_req, res) => res.json(all('SELECT content_type,title,body,image_url FROM website_contents WHERE active = 1')));

/** POST /api/public/requests — khách gửi yêu cầu lái thử/tư vấn/CSKH (FR-09). */
router.post('/requests', (req, res) => {
  const { request_type, full_name, phone, email, car_model_id, note, address } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'Vui lòng nhập số điện thoại' }); // BR-17
  if (!full_name) return res.status(400).json({ error: 'Vui lòng nhập họ tên' });
  if (!['Đăng ký lái thử', 'Tư vấn', 'CSKH'].includes(request_type)) {
    return res.status(400).json({ error: 'Loại yêu cầu không hợp lệ' });
  }
  if (request_type === 'Đăng ký lái thử' && !email) {
    return res.status(400).json({ error: 'Đăng ký lái thử cần email để nhận xác nhận lịch' });
  }
  if (request_type === 'Đăng ký lái thử' && !car_model_id) {
    return res.status(400).json({ error: 'Vui lòng chọn xe muốn lái thử' });
  }

  // Gán ngẫu nhiên khi có Lead mới từ website (BR-18).
  // Ưu tiên chỉ gán cho 2 Sales phụ trách Lead website: An (annt) + Võ Đại Thành (thanhvd).
  // Nếu 2 user này chưa tồn tại/không hoạt động thì fallback về mọi Sales đang hoạt động.
  let salesList = all<any>(
    "SELECT id FROM users WHERE role='Sales' AND status='Hoạt động' AND email IN ('annt@tntcar.vn','thanhvd@tntcar.vn')"
  );
  if (salesList.length === 0) {
    salesList = all<any>("SELECT id FROM users WHERE role='Sales' AND status='Hoạt động'");
  }
  if (salesList.length === 0) return res.status(500).json({ error: 'Chưa có Sales để tiếp nhận' });
  const randomSale = salesList[Math.floor(Math.random() * salesList.length)].id;

  const leadId = uuid();
  run(
    `INSERT INTO leads (id,full_name,phone,email,car_model_id,source,status_detail,request_type,address,note,source_detail,assigned_sales_id,created_by,sync_status,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [leadId, full_name, phone, email || null, car_model_id || null, 'Website', 'Đang tìm hiểu', request_type, address || null, note || null, 'Website', randomSale, randomSale, 'SYNCED', nowIso(), nowIso()]
  );
  // Thông báo in-app cho Sales được gán (FR-09 / US-02.3)
  run(
    `INSERT INTO notifications (id,user_id,type,title,body,ref_type,ref_id,is_read,created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    [uuid(), randomSale, 'lead_assigned', `Lead mới từ Website (${request_type})`, `Khách: ${full_name} - ${phone}`, 'lead', leadId, 0, nowIso()]
  );
  persist();
  console.log(`[website] Lead mới (${request_type}) đã gán cho Sales ${randomSale}; email khách: ${email || 'không có'}`);
  res.status(201).json({ ok: true, lead_id: leadId, message: 'Yêu cầu đã được tiếp nhận, TNT CAR sẽ liên hệ lại sớm.' });
});

export default router;
