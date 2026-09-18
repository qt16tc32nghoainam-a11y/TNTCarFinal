/**
 * Định nghĩa schema SQLite đầy đủ theo Data Dictionary của SRS TNT CAR.
 * 14 bảng: users, showrooms, leads, interactions, reminders, lead_status_history,
 * test_drive_bookings, slots, contracts, payments, kpi_snapshots, car_models,
 * lost_reasons, sync_queue.
 */
export const SCHEMA_SQL = `
-- Người dùng nội bộ (FR-04)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Admin','Manager','Sales')),
  showroom_id TEXT,
  manager_id TEXT,
  status TEXT NOT NULL DEFAULT 'Hoạt động' CHECK (status IN ('Hoạt động','Tạm khóa')),
  onboarded INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (showroom_id) REFERENCES showrooms(id),
  FOREIGN KEY (manager_id) REFERENCES users(id)
);

-- Showroom
CREATE TABLE IF NOT EXISTS showrooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT
);

-- Danh mục xe (read-only, cache từ kho xe ngoài) (FR-07)
CREATE TABLE IF NOT EXISTS car_models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  price REAL NOT NULL,
  fuel_type TEXT,
  segment TEXT,
  year INTEGER,
  transmission TEXT,
  color TEXT,
  image_url TEXT,
  promotion TEXT,
  status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available','In-transit','OutOfStock')),
  last_synced_at TEXT
);

-- Thư viện ảnh của xe (nhiều ảnh mỗi xe: ngoại thất, nội thất, bánh, máy, cốp...) (FR-07)
CREATE TABLE IF NOT EXISTS car_images (
  id TEXT PRIMARY KEY,
  car_model_id TEXT NOT NULL,
  url TEXT NOT NULL,
  caption TEXT,              -- nhãn ảnh: Ngoại thất, Nội thất, Bánh xe, Khoang máy, Cốp xe...
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (car_model_id) REFERENCES car_models(id)
);

-- Tồn kho theo showroom
CREATE TABLE IF NOT EXISTS car_inventory (
  id TEXT PRIMARY KEY,
  car_model_id TEXT NOT NULL,
  showroom_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (car_model_id) REFERENCES car_models(id),
  FOREIGN KEY (showroom_id) REFERENCES showrooms(id)
);

-- Lý do Lost (FR-01)
CREATE TABLE IF NOT EXISTS lost_reasons (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  requires_note INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

-- Lead (FR-01)
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  server_id INTEGER,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  car_model_id TEXT,
  source TEXT NOT NULL,
  status_detail TEXT NOT NULL DEFAULT 'Đang tìm hiểu',
  lost_reason_id TEXT,
  lost_reason_note TEXT,
  flag_duplicate_phone INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  request_type TEXT,
  assigned_sales_id TEXT,
  created_by TEXT,
  sync_status TEXT NOT NULL DEFAULT 'SYNCED',
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (car_model_id) REFERENCES car_models(id),
  FOREIGN KEY (lost_reason_id) REFERENCES lost_reasons(id),
  FOREIGN KEY (assigned_sales_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Nhật ký chăm sóc (FR-02) - không sửa/xóa sau khi lưu (BR-05)
CREATE TABLE IF NOT EXISTS interactions (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  type TEXT NOT NULL,
  note TEXT,
  status_before TEXT,
  status_after TEXT,
  created_by TEXT,
  sync_status TEXT NOT NULL DEFAULT 'SYNCED',
  created_at TEXT NOT NULL,
  FOREIGN KEY (lead_id) REFERENCES leads(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Lịch hẹn / nhắc việc (FR-02)
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  remind_at TEXT NOT NULL,
  purpose TEXT NOT NULL,
  location TEXT,
  notify_before_minutes INTEGER NOT NULL DEFAULT 30,
  notified INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  sync_status TEXT NOT NULL DEFAULT 'SYNCED',
  created_at TEXT NOT NULL,
  FOREIGN KEY (lead_id) REFERENCES leads(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Lịch sử thay đổi trạng thái Lead (BR-03, audit trail)
CREATE TABLE IF NOT EXISTS lead_status_history (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  status_before TEXT NOT NULL,
  status_after TEXT NOT NULL,
  reason TEXT,
  changed_by TEXT,
  changed_at TEXT NOT NULL,
  FOREIGN KEY (lead_id) REFERENCES leads(id),
  FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- Cấu hình khung giờ lái thử (FR-03, US-03.8)
CREATE TABLE IF NOT EXISTS slots (
  id TEXT PRIMARY KEY,
  showroom_id TEXT NOT NULL,
  car_model_id TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_available INTEGER NOT NULL DEFAULT 1,
  is_holiday INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (showroom_id) REFERENCES showrooms(id),
  FOREIGN KEY (car_model_id) REFERENCES car_models(id)
);

-- Lịch lái thử (FR-03)
CREATE TABLE IF NOT EXISTS test_drive_bookings (
  id TEXT PRIMARY KEY,
  booking_code TEXT NOT NULL UNIQUE,
  car_model_id TEXT NOT NULL,
  showroom_id TEXT NOT NULL,
  slot_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  lead_id TEXT,
  status TEXT NOT NULL DEFAULT 'Chờ xác nhận',
  result_note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (car_model_id) REFERENCES car_models(id),
  FOREIGN KEY (showroom_id) REFERENCES showrooms(id),
  FOREIGN KEY (slot_id) REFERENCES slots(id),
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

-- Hợp đồng bán xe (FR-11)
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  contract_code TEXT NOT NULL UNIQUE,
  lead_id TEXT NOT NULL,
  car_model_id TEXT NOT NULL,
  value REAL NOT NULL,
  signed_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Đã cọc',  -- Hiệu lực/Đã cọc/Đã thanh toán đủ/Đã giao xe/Hoàn tất/Đã hủy cọc (validate ở API)
  note TEXT,
  payment_method TEXT,          -- Trả thẳng / Trả góp / Đặt cọc
  bank_name TEXT,               -- ngân hàng (nếu trả góp)
  expected_delivery TEXT,       -- ngày giao dự kiến
  delivered_at TEXT,            -- ngày giao thực tế
  delivered_by TEXT,            -- người giao
  vin TEXT,                     -- số khung VIN
  plate_number TEXT,            -- biển số xe giao
  delivery_note TEXT,           -- ghi chú bàn giao
  created_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (lead_id) REFERENCES leads(id),
  FOREIGN KEY (car_model_id) REFERENCES car_models(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Thanh toán / đặt cọc (FR-11)
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('Trả thẳng','Trả góp','Đặt cọc')),
  amount REAL NOT NULL,
  deposit_amount REAL,
  paid_at TEXT NOT NULL,
  is_cancelled INTEGER NOT NULL DEFAULT 0,
  cancel_reason TEXT,
  cancelled_by TEXT,
  cancelled_at TEXT,
  FOREIGN KEY (contract_id) REFERENCES contracts(id),
  FOREIGN KEY (cancelled_by) REFERENCES users(id)
);

-- Ảnh chụp KPI theo kỳ (FR-05, BR-25)
CREATE TABLE IF NOT EXISTS kpi_snapshots (
  id TEXT PRIMARY KEY,
  period_type TEXT NOT NULL CHECK (period_type IN ('Tháng','Quý','Năm')),
  period_label TEXT NOT NULL,
  scope TEXT NOT NULL,
  scope_ref_id TEXT,
  data_json TEXT NOT NULL,
  locked_by TEXT,
  locked_at TEXT NOT NULL
);

-- Nội dung website (FR-08)
CREATE TABLE IF NOT EXISTS website_contents (
  id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  title TEXT,
  body TEXT,
  image_url TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

-- Cấu hình lãi suất trả góp (FR-07.2)
CREATE TABLE IF NOT EXISTS loan_rates (
  id TEXT PRIMARY KEY,
  bank_name TEXT NOT NULL,
  promo_rate REAL NOT NULL,
  standard_rate REAL NOT NULL,
  note TEXT
);

-- Thông báo trong ứng dụng (nhắc việc, nhắc lái thử) (FR-02, FR-10)
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,           -- reminder | test_drive | lead_assigned
  title TEXT NOT NULL,
  body TEXT,
  ref_type TEXT,                -- reminder | booking | lead
  ref_id TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Đánh dấu các mốc nhắc lái thử đã gửi (tránh gửi trùng 24h/2h)
CREATE TABLE IF NOT EXISTS test_drive_reminders_sent (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  milestone TEXT NOT NULL,      -- '24h' | '2h'
  sent_at TEXT NOT NULL,
  FOREIGN KEY (booking_id) REFERENCES test_drive_bookings(id)
);

-- Nhật ký đồng bộ (FR-06, NFR-10)
CREATE TABLE IF NOT EXISTS sync_log (
  id TEXT PRIMARY KEY,
  device_id TEXT,
  synced_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  error_message TEXT,
  sync_timestamp TEXT NOT NULL
);

-- Index tăng tốc truy vấn
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_sales_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_interactions_lead ON interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_reminders_lead ON reminders(lead_id);
CREATE INDEX IF NOT EXISTS idx_bookings_slot ON test_drive_bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_contracts_lead ON contracts(lead_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_car_images_car ON car_images(car_model_id, sort_order);
`;
