# BẢNG ÁNH XẠ FDD ↔ SRS — Hệ thống TNT CAR

> Mục đích: đối chiếu **FDD** (`TNT CAR.drawio`, trang 4 "CAR FINAL" — bản chốt) với **SRS** (`Final_TNT Car_SRS.docx`), phát hiện các chức năng khớp / lệch / chỉ có một bên, phục vụ họp chốt scope.
>
> Người lập: BA | Ngày: 16/09/2026 | Phiên bản nháp: v0.1
>
> **Chú giải trạng thái**
> - ✅ **Khớp**: FDD và SRS mô tả cùng một chức năng, số hiệu/nội dung tương thích.
> - ⚠️ **Lệch**: cùng chức năng nhưng khác số hiệu / khác phạm vi / mâu thuẫn nội dung → cần chỉnh.
> - 🟦 **Chỉ có ở FDD**: FDD có, SRS chưa đặc tả → bổ sung SRS hoặc loại khỏi FDD.
> - 🟨 **Chỉ có ở SRS**: SRS có, FDD chưa thể hiện → bổ sung FDD hoặc xác nhận.
>
> **Quyết định đã chốt (cập nhật lượt này)**
> - DB lưu trữ local = **IndexedDB** (nền tảng PWA). → Bỏ "SQLite/Realm" ở FDD Trang 1.
> - Phân bổ Lead từ Website = **Random** (KHÔNG phải round-robin). → Sửa mọi chỗ ghi "round-robin" trong SRS về "random".

---

## 1. Ánh xạ theo Kênh (3 khối FDD)

FDD "CAR FINAL" chia 3 kênh. Bảng dưới quy các nhóm F về từng kênh và map sang FR của SRS.

| Kênh (FDD) | Nhóm F (FDD) | FR tương ứng (SRS) |
|---|---|---|
| 📱 Sales App | F1, F2, F3, F4, F5, F6, F7 | FR-01, FR-02, FR-03, FR-06, (FR-04 phần đăng nhập) |
| 🖥️ Admin Portal | F7, F8, F9, F10 | FR-04, FR-05, (FR-01 phần gán/chuyển Lead) |
| 🌐 Website Listing | F11, F12, F13, F14 | FR-07, FR-08, FR-09 |

---

## 2. Bảng ánh xạ chi tiết F (FDD) ↔ FR (SRS)

| FDD (F) | Tên chức năng (FDD) | SRS (FR / US) | Trạng thái | Ghi chú & việc cần làm |
|---|---|---|---|---|
| **F1** | Quản lý Lead (Sales) | FR-01 | ⚠️ Lệch | FDD tách quản lý Lead thành F1 (Sales) + F9 (Admin). SRS gộp tất cả vào FR-01. → Thêm cột "FDD ref" trong SRS, hoặc tách FR-01 thành phần Sales / phần Admin. |
| F1.1 | Tạo Lead | US-01.1 (FR-01) | ✅ Khớp | Rà lại mâu thuẫn cảnh báo trùng SĐT: AC US-01.1 ("không phân biệt Sales") vs BR-01 ("chỉ trùng trong cùng 1 Sales"). |
| F1.2 | Danh sách Lead | US-01.2 (FR-01) | ✅ Khớp | — |
| F1.3 | Filter Lead | US-01.2 (FR-01) | ✅ Khớp | FDD Trang 4 đánh **trùng số F1.3 hai lần** (Filter + Xem chi tiết) → đổi mục sau thành F1.4. |
| F1.3(bis) | Xem chi tiết Lead | US-01.3 (FR-01) | ⚠️ Lệch | Đổi số thành **F1.4** để hết trùng. |
| **F2** | Chăm sóc & theo dõi | FR-02 | ✅ Khớp | — |
| F2.1 | Ghi chú hoạt động | US-02.1 (FR-02) | ✅ Khớp | Chốt: ghi chú có bắt buộc nội dung không? (BR-06 đang "bỏ" nhưng Data Dict vẫn "không để trống"). |
| F2.2 | Lịch sử chăm sóc Lead | US-02.1 (FR-02) | ✅ Khớp | — |
| F2.3 | Nhắc việc / lịch hẹn | US-02.2 (FR-02) | ✅ Khớp | Push/Onboarding đang bị SRS gọi là "FR-10" (không tồn tại) → chốt tạo FR-10 hoặc gộp FR-02. |
| F2.4 | Nhận thông báo Lead từ website | US-02.3 (FR-02) | ⚠️ Lệch | Cơ chế phân bổ = **Random** (đã chốt). Sửa SRS: bỏ "round-robin/giả định". |
| F2.4(T1) | Sửa/Xóa lịch sử chăm sóc (cần Approve) | — | ⚠️ Mâu thuẫn | FDD Trang 1 cho sửa/xóa (kèm approve); SRS BR-07 mới = "không cho sửa/xóa ghi chú". → CHỐT. |
| **F3** | Chốt hợp đồng | FR-01 (US-01.6 Won/Lost) | ⚠️ Mâu thuẫn LỚN | FDD F3 = tạo hợp đồng/thanh toán/ký số/bàn giao xe. SRS coi hợp đồng/thanh toán/bàn giao là **NGOÀI phạm vi** (FR-03). → CHỐT scope (P1). |
| F3.1 | Tạo hợp đồng bán xe | — | 🟦 Chỉ FDD | Ngoài scope SRS hiện tại. Nếu giữ → cần FR mới + bảng `contracts`. |
| F3.2 | Quản lý phương thức thanh toán | — | 🟦 Chỉ FDD | Ngoài scope. Nếu giữ → FR + bảng `payments`. |
| F3.3 | Quản lý / ký số hợp đồng | — | 🟦 Chỉ FDD | Ngoài scope. Liên quan ký số (xem F5.3). |
| F3.4 | Bàn giao xe | — | 🟦 Chỉ FDD | Ngoài scope. Nếu giữ → FR + bảng `deliveries`. |
| **F4** | Tra cứu kho xe | FR-03 (FR-INV-01→05) | ⚠️ Lệch số | FDD F4 (Sales App) = FR-03. Nhưng US-03.x lại ghi nhầm "FR-04". → Sửa US-03.x về **FR-03**. |
| F4.1 | Tìm kiếm xe | FR-INV-01 | ✅ Khớp | — |
| F4.2 | Xem chi tiết xe & thông số kỹ thuật | FR-INV-03 | ✅ Khớp | FDD sai chính tả "kỉ thuật". |
| F4.3 | Kiểm tra tồn kho | FR-INV-04 | ✅ Khớp | — |
| F4.4 | So sánh xe & tính trả góp | FR-INV-05 / FR-07.2 | ⚠️ Lệch | So sánh xe trong SRS là "Could". "Tính trả góp" chưa có FR/AC. → Bổ sung đặc tả trả góp. |
| **F5** | Đăng ký lái thử | FR-03 (FR-TD-01→07) | ⚠️ Lệch | Lái thử trong SRS nằm chung FR-03. FDD tách F5 riêng. → Thống nhất. |
| F5.1 | Đăng ký lái xe thử | FR-TD-01→04 | ✅ Khớp | — |
| F5.2 | Chụp / scan OCR bằng lái | — | ⚠️ Mâu thuẫn | SRS BR-11 (OCR) đã "bỏ". FDD còn OCR. → CHỐT giữ/bỏ. |
| F5.3 | Ký biên bản lái thử | BR-10 (nháp) | ⚠️ Lệch | SRS chỉ có BR-10 dạng nháp, chưa có FR/AC. → Chốt: ký số hay ký giấy? Có lưu chứng từ không? |
| F5.4 | Quản lý lái thử & theo dõi | FR-TD-05→07, US-03.8 | ✅ Khớp | US-03.8 (cấu hình slot) thuộc Admin — xác nhận đặt ở Admin Portal. |
| **F6** | Offline & Đồng bộ | FR-06 | ✅ Khớp | FDD ghi nhầm "Office"; Trang 1 ghi "SQLite/Realm" → sửa thành **IndexedDB** (đã chốt). |
| F6.1 | Chế độ Offline | FR06.1, US-06.1 | ✅ Khớp | — |
| F6.2 | Đồng bộ khi có internet | FR06.2, US-06.2 | ✅ Khớp | — |
| F6.3 | Xử lý trùng dữ liệu (dedup) | FR06.3 | ✅ Khớp | — |
| F6.4 | Giám sát & báo cáo đồng bộ | FR06.5 | ✅ Khớp | — |
| **F7** | Đăng nhập & Quản lý mật khẩu | FR-04 (phần auth) | ⚠️ Lệch | FDD tách đăng nhập (F7) khỏi quản lý user (F10). SRS gộp cả vào FR-04. → Ánh xạ rõ. |
| F7.1 | Quản lý tài khoản & hồ sơ người dùng | FR-04 (FR4.1) | ✅ Khớp | FDD sai chính tả "hồ sợ". |
| F7.2 | Quản lý truy cập & bảo mật | FR-04 (FR4.4/4.5/4.7) | ⚠️ Lệch | SRS FR-04 quá rộng (SSO/2FA/ABAC/IP/giờ). → Đánh dấu MVP vs Phase 2. |
| **F8** | Dashboard KPI | FR-05 | ⚠️ Lệch | FDD F8 hẹp (KPI Lead + chốt HĐ). SRS FR-05 rộng (hủy cọc/doanh thu/hoa hồng) → mâu thuẫn scope. Nên thu FR-05 về đúng F8. |
| F8.1 | KPI Lead & Chốt hợp đồng | US-05.1 (FR-05) | ⚠️ Lệch | Chốt: KPI dựa trên Won/Lost của Lead, KHÔNG dùng doanh thu/cọc nếu ngoài scope. |
| F8.2 | Bảng xếp hạng Sales & Showroom | US-05.1 (FR-05) | ✅ Khớp | — |
| F8.3 | Xuất Report | US-05.2 (FR-05) | ✅ Khớp | US-05.2 ghi nhầm "FR-06" → sửa về FR-05. |
| **F9** | Quản lý Lead (Admin) | FR-01 (US-01.5) | ⚠️ Lệch | FDD tách phần Admin của Lead thành F9. SRS gộp vào FR-01/US-01.5. |
| F9.1 | Import Lead | — | 🟦 Chỉ FDD | SRS chưa có import. → Thêm US/FR (kênh Admin Portal) hoặc loại. FDD Trang 1 từng ghi "app không phù hợp import". |
| F9.2 | Gán / Chuyển Lead cho Sale | US-01.5 (FR-01) | ✅ Khớp | — |
| F9.3 | Xử lý tồn đọng Lead chưa gán | — | 🟦 Chỉ FDD | SRS chưa đặc tả hàng đợi Lead chưa gán. → Bổ sung. FDD sai chính tả "tốn động". |
| F9.4 | Thông báo / gộp Lead trùng (Duplicate) | US-01.1 (flag_duplicate_phone) | ⚠️ Mâu thuẫn | FDD có "gộp"; BR-01 nói "không gộp". SRS chỉ gắn cờ cho Admin rà soát. → CHỐT gộp hay chỉ cảnh báo. |
| **F10** | Quản lý người dùng (Admin) | FR-04 | ⚠️ Lệch | FDD tách F10 (quản lý user) khỏi F7 (auth). SRS gộp FR-04. |
| F10.1 | Tạo / Suspend user Sale | US-04.1, US-04.2 | ✅ Khớp | — |
| F10.2 | Gán Showroom | US-04.3 | ✅ Khớp | Cần bảng `showrooms` trong Data Dictionary (đang thiếu). |
| F10.3 | Phân quyền | US-04.3 (FR-04) | ⚠️ Lệch | Mô hình vai trò: FDD Trang 1 "Admin/Manager/Sale/Viewer"; SRS FR-04 "Admin/Manager/Staff/Viewer"; phần còn lại chỉ dùng Sales/Admin. → Thống nhất. |
| **F11** | Trang chủ & Thương hiệu | FR-08 | ✅ Khớp | — |
| F11.1 | Xe nổi bật & khuyến mãi | US-08.1 (FR-08) | ✅ Khớp | Trùng nội dung với F12.1 → gộp/tham chiếu. |
| F11.2 | Thông tin liên hệ & thương hiệu | US-08.2 (FR-08) | ✅ Khớp | — |
| F11.3 | Design trang chủ | US-08.1/08.3 (FR-08) | ✅ Khớp | — |
| F11.4 | Đánh giá trang | — | 🟦 Chỉ FDD | SRS không có chức năng đánh giá/review. → Làm rõ scope. |
| **F12** | Danh mục xe (Website) | FR-07 | ⚠️ Lệch | FR-07 trong SRS **để trống nội dung**. → Điền FR-07 dựa trên F12, hoặc ghi "tái sử dụng FR-INV". |
| F12.1 | Xe nổi bật & khuyến mãi | FR-08 (trùng F11.1) | ⚠️ Lệch | Trùng F11.1 → thống nhất thuộc FR-07 hay FR-08. |
| F12.2 | Danh sách xe (giá + trạng thái) | US-07.1 (FR-07) | ✅ Khớp | — |
| F12.3 | Chi tiết xe (thông số, giá, trả góp) | US-07.2 (FR-07) | ⚠️ Lệch | "Trả góp" chưa có đặc tả (như F4.4). |
| F12.4 | Tìm kiếm xe | US-07.1 (FR-07) | ✅ Khớp | FDD thiếu dấu cách "F12.4Tìm kiếm". |
| F12.5 | Bộ lọc (hãng/phân khúc/giá) | US-07.1 (FR-07) | ✅ Khớp | — |
| **F13** | Đăng ký lái thử & Tư vấn (Website) | FR-09 | ⚠️ Lệch | FR-09 bảng SRS ghi nhầm mã "FR-10". → Sửa về FR-09. "đăng ký tư vấn → đổ Lead về Quản lý Lead" khớp US-09.1. |
| **F14** | Thông tin chăm sóc khách hàng (CSKH) | FR-09 (loại CSKH) | ⚠️ Lệch | SRS FR-09 có loại yêu cầu CSKH nhưng đặc tả mỏng. → Làm rõ luồng CSKH. |

---

## 3. Chức năng chỉ có ở SRS (🟨 — FDD chưa thể hiện)

| SRS | Chức năng | Trạng thái | Việc cần làm |
|---|---|---|---|
| US-01.4 | Xóa / Lưu trữ Lead (soft-delete) | 🟨 Chỉ SRS | FDD Trang 4 không có mục xóa/lưu trữ Lead. → Bổ sung vào FDD (F1). Cần thêm trạng thái "Lưu trữ" vào enum `leads`. |
| US-03.8 | Cấu hình slot lái thử (Admin) | 🟨 Chỉ SRS | FDD F5 không có mục cấu hình slot. → Bổ sung (Admin Portal). |
| FR06.5 / NFR-10 | Ghi log & audit trail chi tiết | 🟨 Chỉ SRS | FDD Trang 1 có "Ghi Log" nhưng bản CAR FINAL (Trang 4) không có mục log. → Bổ sung vào F6/F7. |
| US-01.6 / BR-03 | Sửa lại Won/Lost + lý do + audit | 🟨 Chỉ SRS | FDD F3 hướng "chốt hợp đồng" khác hẳn "đổi trạng thái Lead". → Đồng bộ sau khi chốt scope F3. |

---

## 4. Tổng hợp điểm cần CHỐT (P1 — nghiệp vụ/kiến trúc)

| # | Vấn đề | Nguồn | Quyết định |
|---|---|---|---|
| 1 | Hợp đồng / thanh toán / bàn giao xe (F3.1–3.4) có trong MVP? | FDD F3 vs SRS FR-03 "ngoài phạm vi" | **CHƯA CHỐT** |
| 2 | Nền tảng lưu trữ local | FDD (SQLite/Realm) vs SRS (IndexedDB) | ✅ **CHỐT: IndexedDB (PWA)** |
| 3 | Phân bổ Lead từ Website | random vs round-robin | ✅ **CHỐT: Random** |
| 4 | Gộp Lead trùng (F9.4) hay chỉ cảnh báo? | FDD "gộp" vs BR-01 "không gộp" | **CHƯA CHỐT** |
| 5 | Sửa/xóa lịch sử chăm sóc? | FDD F2.4 (có, cần approve) vs BR-07 (không) | **CHƯA CHỐT** |
| 6 | OCR bằng lái + ký số biên bản lái thử? | FDD F5.2/F5.3 vs SRS BR-11 "bỏ" | **CHƯA CHỐT** |
| 7 | Ghi chú chăm sóc bắt buộc nội dung? | BR-06 "bỏ" vs Data Dict "không để trống" | **CHƯA CHỐT** |
| 8 | Cơ chế lấy dữ liệu xe (API real-time / batch + tần suất)? | BR-19 (câu hỏi) | **CHƯA CHỐT** |
| 9 | Mô hình vai trò & scope MVP của FR-04 | Admin/Manager/Sale/Viewer vs Sales/Admin | **CHƯA CHỐT** |
| 10 | Phạm vi KPI FR-05 (dùng doanh thu/cọc?) — phụ thuộc #1 | FDD F8 hẹp vs SRS FR-05 rộng | **CHƯA CHỐT** |

---

## 5. Thống kê nhanh

- Tổng mục F đối chiếu: ~60 (F1–F14 và mục con).
- ✅ Khớp: ~20 | ⚠️ Lệch/Mâu thuẫn: ~25 | 🟦 Chỉ FDD: ~8 | 🟨 Chỉ SRS: ~4
- **Mâu thuẫn LỚN cần chốt trước tiên:** #1 (scope hợp đồng/thanh toán) vì nó kéo theo FR-03, FR-05, và nhiều bảng dữ liệu.
