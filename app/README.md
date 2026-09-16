# TNT CAR — Ứng dụng quản lý Lead & bán xe

Full-stack app xây dựng theo tài liệu SRS TNT CAR. Gồm:
- **backend/** — API: Node.js + Express + TypeScript + SQLite (qua sql.js)
- **frontend/** — PWA: React + Vite + TypeScript + Tailwind + Dexie (IndexedDB offline)

## Yêu cầu
- Node.js 18+ (đã test trên Node 26)
- npm

## Cách chạy

### 1. Backend (cổng 4000)
```bash
cd backend
npm install
cp .env.example .env
npm run reset      # tạo DB + nạp dữ liệu mẫu (chạy 1 lần)
npm run dev        # chạy API tại http://localhost:4000
```

### 2. Frontend (cổng 5173)
```bash
cd frontend
npm install
npm run dev        # chạy tại http://localhost:5173
```
Mở trình duyệt: http://localhost:5173

- App nội bộ (Sales/Manager/Admin): http://localhost:5173/
- Website công khai: http://localhost:5173/site

## Tài khoản demo (mật khẩu: `123456`)
| Vai trò | Email | Ghi chú |
|---|---|---|
| Admin | admin@tntcar.vn | Xem toàn hệ thống |
| Manager | manager.hcm@tntcar.vn | Quản lý Sales HCM |
| Manager | manager.hn@tntcar.vn | Quản lý Sales HN |
| Sales | son.sales@tntcar.vn | Có Lead, hợp đồng |
| Sales | hoa.sales@tntcar.vn | |
| Sales | tuan.sales@tntcar.vn | Chưa onboard (test FR-10) |
| Sales | nghi.sales@tntcar.vn | Tạm khóa (test BR-09) |

## Dữ liệu mẫu
- 8 người dùng (3 vai trò), 3 showroom, 10 dòng xe
- 32 Lead (6 Won, 3 Lost, 1 cặp trùng SĐT để test gộp)
- 60 hoạt động chăm sóc, 8 lịch hẹn, 12 khung giờ lái thử
- 6 hợp đồng + thanh toán (1 hủy cọc để test KPI)

## Hướng dẫn kiểm thử theo FR

| FR | Cách test |
|---|---|
| FR-01 Quản lý Lead | Đăng nhập Sales → menu "Quản lý Lead": tạo Lead, lọc, mở chi tiết, đổi trạng thái, chốt Won/Lost, bấm "Lead trùng" để gộp |
| FR-02 Chăm sóc | Mở chi tiết Lead → "Ghi hoạt động", "Tạo lịch hẹn"; menu "Lịch hẹn" xem lịch sắp tới |
| FR-03 Tra cứu xe & lái thử | Menu "Tra cứu xe": tìm/lọc/so sánh; mở chi tiết → "Đặt lịch lái thử"; menu "Lịch lái thử" xác nhận/từ chối |
| FR-04 Người dùng | Đăng nhập Admin → "Người dùng": tạo tài khoản, tạm khóa/kích hoạt |
| FR-05 Dashboard KPI | Menu "Dashboard": Admin thấy toàn bộ, Manager thấy nhóm, Sales thấy của mình; Admin có nút "Khóa số liệu kỳ" |
| FR-06 Offline & sync | Tắt mạng (DevTools → Offline), tạo Lead → lưu cục bộ; bật mạng lại → tự đồng bộ (xem badge "chờ đồng bộ" trên header) |
| FR-07 Website danh mục xe | Mở /site/cars: tìm, lọc, so sánh, xem chi tiết + máy tính trả góp |
| FR-08 Nội dung website | Admin → "Nội dung Web": thêm/sửa/xóa banner, liên hệ, thương hiệu |
| FR-09 Tiếp nhận yêu cầu | /site/request: gửi form → tự tạo Lead nguồn Website, gán Sales ngẫu nhiên |
| FR-10 Onboarding PWA | Đăng nhập tuan.sales@tntcar.vn (chưa onboard) → bị chuyển sang trang onboarding |
| FR-11 Hợp đồng | Mở Lead trạng thái "Thành công" → "Tạo hợp đồng"; menu "Hợp đồng" xem + hủy cọc |

## Lệnh hữu ích
```bash
# Backend
npm run reset      # reset DB + seed lại từ đầu
npm run build      # build TypeScript

# Frontend
npm run build      # build production (kèm PWA service worker)
```

## Ghi chú kỹ thuật
- DB lưu tại `backend/data/tntcar.db` (SQLite). Xóa file này + `npm run reset` để làm mới.
- Frontend proxy `/api` sang backend (cấu hình trong `vite.config.ts`).
- Offline: dữ liệu lưu trong IndexedDB (`outbox`), đồng bộ qua `POST /api/sync` theo nguyên tắc Last-Write-Wins.
- Lãi suất trả góp trên website là số tham khảo, cần cập nhật biểu chính thức của ngân hàng trước khi dùng thật.
