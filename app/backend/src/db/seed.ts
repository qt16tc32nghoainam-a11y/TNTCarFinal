/**
 * Seed dữ liệu mẫu đầy đủ để test toàn bộ FR.
 * Chạy sau migrate. Mật khẩu mặc định cho mọi tài khoản: "123456".
 */
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { initDb, run, persist, all } from './database';

const now = () => new Date().toISOString();
function daysFromNow(d: number): string {
  const t = new Date();
  t.setDate(t.getDate() + d);
  return t.toISOString();
}
function hoursFromNow(h: number): string {
  const t = new Date();
  t.setHours(t.getHours() + h);
  return t.toISOString();
}

async function seed() {
  await initDb();
  const pass = bcrypt.hashSync('123456', 8);

  // ---------- Showrooms ----------
  const shrThuDuc = uuid();
  const shrQ1 = uuid();
  const shrHanoi = uuid();
  const showrooms = [
    [shrThuDuc, 'TNT CAR Thủ Đức', 'Số 1 Võ Văn Ngân, TP Thủ Đức, TP.HCM'],
    [shrQ1, 'TNT CAR Quận 1', '123 Nguyễn Huệ, Quận 1, TP.HCM'],
    [shrHanoi, 'TNT CAR Hà Nội', '88 Phạm Hùng, Nam Từ Liêm, Hà Nội'],
  ];
  for (const s of showrooms) run('INSERT INTO showrooms (id,name,address) VALUES (?,?,?)', s);

  // ---------- Users: 1 Admin, 2 Manager, 5 Sales ----------
  const admin = uuid();
  const mgr1 = uuid();
  const mgr2 = uuid();
  const sale1 = uuid();
  const sale2 = uuid();
  const sale3 = uuid();
  const sale4 = uuid();
  const sale5 = uuid();

  const users: any[] = [
    [admin, 'Nguyễn Quản Trị', 'admin@tntcar.vn', '0900000001', pass, 'Admin', null, null, 1],
    [mgr1, 'Trần Quản Lý HCM', 'manager.hcm@tntcar.vn', '0900000002', pass, 'Manager', shrThuDuc, null, 1],
    [mgr2, 'Lê Quản Lý HN', 'manager.hn@tntcar.vn', '0900000003', pass, 'Manager', shrHanoi, null, 1],
    [sale1, 'Phạm Văn Sơn', 'son.sales@tntcar.vn', '0911111111', pass, 'Sales', shrThuDuc, mgr1, 1],
    [sale2, 'Võ Thị Hoa', 'hoa.sales@tntcar.vn', '0911111112', pass, 'Sales', shrThuDuc, mgr1, 1],
    [sale3, 'Đặng Minh Tuấn', 'tuan.sales@tntcar.vn', '0911111113', pass, 'Sales', shrQ1, mgr1, 0],
    [sale4, 'Bùi Thu Trang', 'trang.sales@tntcar.vn', '0911111114', pass, 'Sales', shrHanoi, mgr2, 1],
    [sale5, 'Hoàng Văn Nghỉ', 'nghi.sales@tntcar.vn', '0911111115', pass, 'Sales', shrHanoi, mgr2, 1],
  ];
  for (const u of users) {
    run(
      `INSERT INTO users (id,full_name,email,phone,password_hash,role,showroom_id,manager_id,onboarded,status,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [...u, 'Hoạt động', now()]
    );
  }
  // Sale5 bị tạm khóa để test BR-09
  run("UPDATE users SET status='Tạm khóa' WHERE id=?", [sale5]);

  // ---------- Car models ----------
  const cars: any[] = [
    // id, name, brand, price, fuel, segment, year, transmission, color, image, promotion, status
    [uuid(), 'Vios G', 'Toyota', 545000000, 'Xăng', 'Sedan hạng B', 2025, 'Số tự động', 'Trắng', 'https://commons.wikimedia.org/wiki/Special:FilePath/Toyota%20Vios%20(XP40)%20in%20Taiwan%202023.jpg?width=800', 'Giảm 20 triệu + BHVC', 'Available'],
    [uuid(), 'Corolla Cross HEV', 'Toyota', 905000000, 'Hybrid', 'SUV đô thị', 2025, 'Số tự động', 'Đen', 'https://commons.wikimedia.org/wiki/Special:FilePath/Toyota%20Corolla%20Cross%201.8%20HEV%202022.jpg?width=800', 'Tặng phụ kiện 30 triệu', 'Available'],
    [uuid(), 'CR-V L', 'Honda', 1259000000, 'Xăng', 'SUV hạng C', 2025, 'Số tự động', 'Xám', 'https://commons.wikimedia.org/wiki/Special:FilePath/2024%20Honda%20CR-V%202.0%20eHEV%20RS%20Crystal%20Black%20Pearl%20in%20Indonesia%2001.jpg?width=800', '', 'Available'],
    [uuid(), 'City RS', 'Honda', 599000000, 'Xăng', 'Sedan hạng B', 2025, 'Số tự động', 'Đỏ', 'https://commons.wikimedia.org/wiki/Special:FilePath/2024%20Honda%20City%201.5%20S%20in%20Taffeta%20White,%20rear%20right,%2006-14-2024.jpg?width=800', 'Hỗ trợ 50% trước bạ', 'In-transit'],
    [uuid(), 'VF 8 Plus', 'VinFast', 899000000, 'Điện', 'SUV hạng D', 2025, 'Số tự động', 'Xanh', 'https://commons.wikimedia.org/wiki/Special:FilePath/Vinfast%20VF8%20at%20Hillsdale%204%20(cropped).jpg?width=800', 'Miễn phí sạc 1 năm', 'Available'],
    [uuid(), 'VF 5 Plus', 'VinFast', 496000000, 'Điện', 'SUV hạng A', 2025, 'Số tự động', 'Vàng', 'https://commons.wikimedia.org/wiki/Special:FilePath/NewOne-En%20Vang%20taxi%20VinFast%20VF%205%2004.jpg?width=800', '', 'Available'],
    [uuid(), 'Accent AT', 'Hyundai', 569000000, 'Xăng', 'Sedan hạng B', 2025, 'Số tự động', 'Bạc', 'https://commons.wikimedia.org/wiki/Special:FilePath/Hyundai%20Accent%20Design%202024%20(53443284447).jpg?width=800', 'Giảm 15 triệu', 'Available'],
    [uuid(), 'Santa Fe', 'Hyundai', 1069000000, 'Dầu', 'SUV hạng D', 2025, 'Số tự động', 'Trắng', 'https://commons.wikimedia.org/wiki/Special:FilePath/2024%20Hyundai%20Santa%20Fe%202.5%20GLS%202WD%20in%20Abyss%20Black%20Pearl,%20front%20right.jpg?width=800', '', 'OutOfStock'],
    [uuid(), 'Xpander AT', 'Mitsubishi', 658000000, 'Xăng', 'MPV', 2025, 'Số tự động', 'Nâu', 'https://commons.wikimedia.org/wiki/Special:FilePath/2022%20Mitsubishi%20Xpander%201.5%20GLS%20in%20Blade%20Silver%20Metallic,%2006-23-2024.jpg?width=800', 'Tặng camera 360', 'Available'],
    [uuid(), 'Ranger Wildtrak', 'Ford', 999000000, 'Dầu', 'Bán tải', 2025, 'Số tự động', 'Cam', 'https://commons.wikimedia.org/wiki/Special:FilePath/2023%20Ford%20Ranger%20Wildtrak%20EcoBlue%204x4%20Auto.jpg?width=800', '', 'In-transit'],
  ];
  for (const c of cars) {
    run(
      `INSERT INTO car_models (id,name,brand,price,fuel_type,segment,year,transmission,color,image_url,promotion,status,last_synced_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [...c, now()]
    );
  }
  const carIds = cars.map((c) => c[0]);

  // ---------- Thư viện ảnh xe (>= 7 ảnh / xe) ----------
  // Ảnh 1: ngoại thất chính (đúng mẫu, = image_url của xe).
  // 6 ảnh còn lại: ảnh minh họa theo bộ phận (dùng chung), Admin có thể thay ảnh thật sau.
  const partImages: [string, string][] = [
    ['Ngoại thất phía sau', 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=800&q=70'],
    ['Nội thất - khoang lái', 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=70'],
    ['Vô lăng & bảng đồng hồ', 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&q=70'],
    ['Bánh xe & mâm', 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=70'],
    ['Khoang máy', 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=70'],
    ['Cốp xe', 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=800&q=70'],
  ];
  for (const c of cars) {
    const cid = c[0];
    const mainImg = c[9]; // image_url
    let order = 0;
    if (mainImg) {
      run('INSERT INTO car_images (id,car_model_id,url,caption,sort_order) VALUES (?,?,?,?,?)',
        [uuid(), cid, mainImg, 'Ngoại thất', order++]);
    }
    for (const [caption, url] of partImages) {
      run('INSERT INTO car_images (id,car_model_id,url,caption,sort_order) VALUES (?,?,?,?,?)',
        [uuid(), cid, url, caption, order++]);
    }
  }

  // Tồn kho theo showroom
  for (const cid of carIds) {
    for (const sid of [shrThuDuc, shrQ1, shrHanoi]) {
      run('INSERT INTO car_inventory (id,car_model_id,showroom_id,quantity) VALUES (?,?,?,?)', [
        uuid(), cid, sid, Math.floor(Math.random() * 6),
      ]);
    }
  }

  // ---------- Lost reasons ----------
  const lrGiaCao = uuid();
  const lrDoiThu = uuid();
  const lrNganHang = uuid();
  const lrKhac = uuid();
  const lostReasons = [
    [lrGiaCao, 'Giá cao', 0, 1],
    [lrDoiThu, 'Chọn đối thủ', 0, 1],
    [lrNganHang, 'Vướng ngân hàng', 0, 1],
    [lrKhac, 'Khác', 1, 1],
  ];
  for (const l of lostReasons) run('INSERT INTO lost_reasons (id,label,requires_note,active) VALUES (?,?,?,?)', l);

  // ---------- Loan rates (tham khảo) ----------
  const loanRates = [
    ['Techcombank', 8.0, 10.5],
    ['Agribank', 8.5, 10.5],
    ['HDBank', 8.5, 11.0],
    ['Sacombank', 9.0, 11.0],
    ['Vietcombank', 8.0, 10.5],
  ];
  for (const [bank, promo, std] of loanRates) {
    run('INSERT INTO loan_rates (id,bank_name,promo_rate,standard_rate,note) VALUES (?,?,?,?,?)', [
      uuid(), bank, promo, std, 'Số tham khảo, cần xác nhận biểu lãi suất chính thức',
    ]);
  }

  // ---------- Leads (đa dạng trạng thái, nguồn, Sales) ----------
  const statuses = ['Đang tìm hiểu', 'Không liên lạc được', 'Tương tác chưa thành công', 'Có nhu cầu ngay', 'Không có nhu cầu'];
  const sources = ['Sale tự nhập', 'Facebook Ads', 'Website', 'Hotline', 'Giới thiệu', 'TikTok Ads', 'Zalo', 'Showroom/Sự kiện'];
  const names = ['Nguyễn Văn An','Trần Thị Bình','Lê Hoàng Cường','Phạm Thị Dung','Vũ Đức Em','Đỗ Thị Phương','Ngô Văn Giang','Hồ Thị Hạnh','Đinh Văn Ích','Lý Thị Kim','Mai Văn Long','Chu Thị Mai','Tô Văn Nam','Dương Thị Oanh','Phan Văn Phúc'];
  const salesList = [sale1, sale2, sale3, sale4];

  const leadIds: string[] = [];
  const wonLeadIds: string[] = [];
  for (let i = 0; i < 30; i++) {
    const id = uuid();
    leadIds.push(id);
    const sales = salesList[i % salesList.length];
    let status = statuses[i % statuses.length];
    // 6 lead Won, 3 lead Lost
    let lostReasonId: string | null = null;
    let lostNote: string | null = null;
    if (i < 6) { status = 'Thành công'; wonLeadIds.push(id); }
    else if (i < 9) {
      status = 'Lead thất bại';
      const lr = [lrGiaCao, lrDoiThu, lrKhac][i % 3];
      lostReasonId = lr;
      if (lr === lrKhac) lostNote = 'Khách hàng dời sang năm sau';
    }
    const createdAt = daysFromNow(-(30 - i));
    run(
      `INSERT INTO leads (id,full_name,phone,car_model_id,source,status_detail,lost_reason_id,lost_reason_note,
        flag_duplicate_phone,is_archived,assigned_sales_id,created_by,sync_status,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id, names[i % names.length], '0987' + String(100000 + i),
        carIds[i % carIds.length], sources[i % sources.length], status,
        lostReasonId, lostNote, 0, 0, sales, sales, 'SYNCED', createdAt, createdAt,
      ]
    );
  }
  // Một cặp Lead trùng SĐT của cùng sale1 để test gộp (US-01.7, BR-01)
  const dupPhone = '0987222333';
  const dupA = uuid();
  const dupB = uuid();
  for (const [id, name] of [[dupA, 'Khách Trùng A'], [dupB, 'Khách Trùng B']]) {
    run(
      `INSERT INTO leads (id,full_name,phone,car_model_id,source,status_detail,flag_duplicate_phone,assigned_sales_id,created_by,sync_status,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, name, dupPhone, carIds[0], 'Facebook Ads', 'Đang tìm hiểu', 1, sale1, sale1, 'SYNCED', now(), now()]
    );
  }
  leadIds.push(dupA, dupB);

  // ---------- Interactions (nhật ký chăm sóc) ----------
  const actTypes = ['Gọi điện', 'Nhắn tin/Zalo', 'Gặp trực tiếp', 'Lịch hẹn', 'Khác'];
  const notes = ['Khách quan tâm bản cao cấp', 'Đã gửi báo giá qua Zalo', 'Hẹn ghé showroom cuối tuần', 'Khách đang so sánh với đối thủ', ''];
  for (let i = 0; i < 60; i++) {
    const lead = leadIds[i % leadIds.length];
    run(
      `INSERT INTO interactions (id,lead_id,type,note,created_by,sync_status,created_at)
       VALUES (?,?,?,?,?,?,?)`,
      [uuid(), lead, actTypes[i % actTypes.length], notes[i % notes.length], salesList[i % salesList.length], 'SYNCED', daysFromNow(-(20 - (i % 20)))]
    );
  }

  // ---------- Reminders (lịch hẹn tương lai) ----------
  const purposes = ['Lái thử', 'Tư vấn lại', 'Khác'];
  for (let i = 0; i < 8; i++) {
    run(
      `INSERT INTO reminders (id,lead_id,remind_at,purpose,location,notify_before_minutes,created_by,sync_status,created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [uuid(), leadIds[i], hoursFromNow((i + 1) * 6), purposes[i % 3], 'Showroom Thủ Đức', 30, salesList[i % salesList.length], 'SYNCED', now()]
    );
  }

  // ---------- Slots lái thử (khung giờ hôm nay + vài ngày tới) ----------
  // Tạo slot từ hôm qua (d=-1) đến +3 ngày, mỗi ngày vài khung giờ. Lưu theo chỉ số ngày để đặt booking đa dạng.
  const slotsByDay: Record<number, string[]> = {};
  for (let d = -1; d <= 3; d++) {
    slotsByDay[d] = [];
    for (const hour of [9, 11, 14, 16]) {
      const start = new Date();
      start.setDate(start.getDate() + d);
      start.setHours(hour, 0, 0, 0);
      const end = new Date(start);
      end.setHours(hour + 1);
      const sid = uuid();
      slotsByDay[d].push(sid);
      run(
        `INSERT INTO slots (id,showroom_id,car_model_id,start_time,end_time,is_available,is_holiday) VALUES (?,?,?,?,?,?,?)`,
        [sid, shrThuDuc, carIds[0], start.toISOString(), end.toISOString(), 1, 0]
      );
    }
  }
  const slotIds = Object.values(slotsByDay).flat();

  // ---------- Test drive bookings (đa dạng ngày + trạng thái để test xem theo ngày) ----------
  let tdSeq = 0;
  const mkBooking = (dayOffset: number, slotIdx: number, car: number, name: string, phone: string, leadIdx: number, status: string) => {
    const sid = slotsByDay[dayOffset]?.[slotIdx];
    if (!sid) return;
    run(
      `INSERT INTO test_drive_bookings (id,booking_code,car_model_id,showroom_id,slot_id,customer_name,customer_phone,lead_id,status,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [uuid(), 'TD' + (Date.now().toString().slice(-5)) + (tdSeq++), car >= 0 ? carIds[car] : carIds[0], shrThuDuc, sid, name, phone, leadIdx >= 0 ? leadIds[leadIdx] : null, status, now()]
    );
    run('UPDATE slots SET is_available=0 WHERE id=?', [sid]);
  };
  // Hôm qua: đã hoàn thành + vắng mặt
  mkBooking(-1, 0, 0, 'Nguyễn Văn An', '0987100000', 0, 'Hoàn thành');
  mkBooking(-1, 1, 1, 'Trần Thị Bình', '0987100001', 1, 'Vắng mặt');
  // Hôm nay: đã xác nhận + chờ xác nhận
  mkBooking(0, 0, 0, 'Lê Văn Cường', '0987100002', 2, 'Đã xác nhận');
  mkBooking(0, 1, 2, 'Phạm Thị Dung', '0987100003', 3, 'Chờ xác nhận');
  // Ngày mai: đã xác nhận + chờ xác nhận
  mkBooking(1, 0, 3, 'Hoàng Văn Em', '0987100004', 4, 'Đã xác nhận');
  mkBooking(1, 1, 4, 'Vũ Thị Phương', '0987100005', 5, 'Chờ xác nhận');
  // +2 ngày: chờ xác nhận
  mkBooking(2, 0, 5, 'Đặng Văn Giang', '0987100006', 6, 'Chờ xác nhận');

  // ---------- Contracts + Payments (cho lead Won), đa dạng trạng thái vòng đời ----------
  // Kịch bản cho từng hợp đồng: [trạng thái, hình thức, đã thu %, có giao xe?]
  const scenarios: { status: string; method: string; paidPct: number; bank?: string; delivered?: boolean; note?: string }[] = [
    { status: 'Đã cọc', method: 'Đặt cọc', paidPct: 0.2 },                                   // mới cọc 20%
    { status: 'Đã cọc', method: 'Trả góp', paidPct: 0.3, bank: 'Techcombank' },              // cọc 30%, chờ giải ngân
    { status: 'Đã thanh toán đủ', method: 'Trả thẳng', paidPct: 1 },                          // trả đủ, chờ giao
    { status: 'Đã giao xe', method: 'Trả thẳng', paidPct: 1, delivered: true },               // đã giao xe
    { status: 'Hoàn tất', method: 'Trả góp', paidPct: 1, bank: 'Vietcombank', delivered: true }, // hoàn tất
    { status: 'Đã hủy cọc', method: 'Đặt cọc', paidPct: 0.2, note: 'cancel' },                // hủy cọc
  ];
  for (let i = 0; i < wonLeadIds.length; i++) {
    const cid = uuid();
    const val = cars[i % cars.length][3];
    const signed = daysFromNow(-(i * 5 + 2));
    const sc = scenarios[i % scenarios.length];
    const paid = Math.round(val * sc.paidPct);
    const deposit = sc.method === 'Trả thẳng' ? null : Math.round(val * 0.2);

    const delivered = sc.delivered;
    run(
      `INSERT INTO contracts (id,contract_code,lead_id,car_model_id,value,signed_date,status,note,payment_method,bank_name,expected_delivery,delivered_at,delivered_by,vin,plate_number,delivery_note,created_by,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [cid, 'HD' + (1000 + i), wonLeadIds[i], carIds[i % carIds.length], val, signed,
       sc.note === 'cancel' ? 'Đã hủy cọc' : sc.status, 'Hợp đồng mẫu',
       sc.method, sc.bank || null,
       daysFromNow(i + 3),
       delivered ? daysFromNow(-(i)) : null,
       delivered ? salesList[i % salesList.length] : null,
       delivered ? `RLXFAKE${1000 + i}VIN` : null,
       delivered ? `51K-${100 + i}.${10 + i}` : null,
       delivered ? 'Giao đủ giấy tờ, phụ kiện chính hãng' : null,
       salesList[i % salesList.length], signed]
    );
    // Thanh toán: nếu trả đủ thì có thể tách 2 đợt (cọc + tất toán) cho thực tế
    if (sc.paidPct >= 1 && sc.method !== 'Trả thẳng') {
      run(`INSERT INTO payments (id,contract_id,method,amount,deposit_amount,paid_at,is_cancelled) VALUES (?,?,?,?,?,?,?)`,
        [uuid(), cid, 'Đặt cọc', deposit || 0, deposit, signed, 0]);
      run(`INSERT INTO payments (id,contract_id,method,amount,deposit_amount,paid_at,is_cancelled) VALUES (?,?,?,?,?,?,?)`,
        [uuid(), cid, sc.method, val - (deposit || 0), null, daysFromNow(-(i) - 1), 0]);
    } else {
      run(`INSERT INTO payments (id,contract_id,method,amount,deposit_amount,paid_at,is_cancelled) VALUES (?,?,?,?,?,?,?)`,
        [uuid(), cid, sc.method, paid, deposit, signed, sc.note === 'cancel' ? 1 : 0]);
    }
    if (sc.note === 'cancel') {
      run("UPDATE payments SET is_cancelled=1, cancel_reason='Khách đổi ý', cancelled_at=? WHERE contract_id=?", [now(), cid]);
    }
  }

  // ---------- Website contents ----------
  run(`INSERT INTO website_contents (id,content_type,title,body,image_url,active,updated_at) VALUES (?,?,?,?,?,?,?)`,
    [uuid(), 'banner', 'Ưu đãi tháng 9', 'Chọn xe trong mơ, nhận ưu đãi đến 50 triệu và hỗ trợ trả góp đến 80%', '', 1, now()]);
  run(`INSERT INTO website_contents (id,content_type,title,body,image_url,active,updated_at) VALUES (?,?,?,?,?,?,?)`,
    [uuid(), 'contact', 'Thông tin liên hệ', 'Hotline: 1900 1234 - Email: info@tntcar.vn', '', 1, now()]);
  run(`INSERT INTO website_contents (id,content_type,title,body,image_url,active,updated_at) VALUES (?,?,?,?,?,?,?)`,
    [uuid(), 'brand', 'Về TNT CAR', 'TNT CAR là hệ thống đại lý ô tô chính hãng với nhiều dòng xe đa dạng từ sedan, SUV đến xe điện. Chúng tôi cam kết tư vấn tận tâm, lái thử miễn phí và hỗ trợ trả góp linh hoạt cho khách hàng trên toàn quốc.', '', 1, now()]);
  // Các mục ưu đãi hiển thị ở dải ưu đãi trang chủ (Admin có thể sửa/thêm/xóa)
  run(`INSERT INTO website_contents (id,content_type,title,body,image_url,active,updated_at) VALUES (?,?,?,?,?,?,?)`,
    [uuid(), 'promo', 'Lái thử miễn phí', 'Tận nơi theo yêu cầu', '🚗', 1, now()]);
  run(`INSERT INTO website_contents (id,content_type,title,body,image_url,active,updated_at) VALUES (?,?,?,?,?,?,?)`,
    [uuid(), 'promo', 'Hỗ trợ trả góp', 'Vay đến 80% giá trị xe', '💰', 1, now()]);
  run(`INSERT INTO website_contents (id,content_type,title,body,image_url,active,updated_at) VALUES (?,?,?,?,?,?,?)`,
    [uuid(), 'promo', 'Bảo hành chính hãng', 'Cứu hộ 24/7', '🛠️', 1, now()]);
  run(`INSERT INTO website_contents (id,content_type,title,body,image_url,active,updated_at) VALUES (?,?,?,?,?,?,?)`,
    [uuid(), 'promo', 'Thu cũ đổi mới', 'Định giá xe cũ giá cao', '🔄', 1, now()]);

  persist();

  const counts = {
    users: all('SELECT COUNT(*) c FROM users')[0],
    showrooms: all('SELECT COUNT(*) c FROM showrooms')[0],
    car_models: all('SELECT COUNT(*) c FROM car_models')[0],
    leads: all('SELECT COUNT(*) c FROM leads')[0],
    interactions: all('SELECT COUNT(*) c FROM interactions')[0],
    reminders: all('SELECT COUNT(*) c FROM reminders')[0],
    contracts: all('SELECT COUNT(*) c FROM contracts')[0],
    slots: all('SELECT COUNT(*) c FROM slots')[0],
  };
  console.log('Seed hoàn tất. Thống kê:', JSON.stringify(counts));
  console.log('\nTài khoản đăng nhập (mật khẩu: 123456):');
  console.log('  Admin:    admin@tntcar.vn');
  console.log('  Manager:  manager.hcm@tntcar.vn / manager.hn@tntcar.vn');
  console.log('  Sales:    son.sales@tntcar.vn / hoa.sales@tntcar.vn / trang.sales@tntcar.vn');
  process.exit(0);
}

seed().catch((e) => {
  console.error('Seed lỗi:', e);
  process.exit(1);
});
