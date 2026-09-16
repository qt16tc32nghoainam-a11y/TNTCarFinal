# Hướng dẫn deploy TNT CAR lên Google Cloud Run

App được đóng gói thành **một container duy nhất**: backend Express phục vụ luôn frontend React đã build. Đã test chạy OK trong Docker local.

> Lưu ý về dữ liệu: bản này dùng SQLite ghi vào `/tmp` của Cloud Run. Dữ liệu **không bền** — mất khi container restart/scale. Phù hợp để demo. Muốn dùng thật cần chuyển sang Cloud SQL (PostgreSQL).

---

## Bước 0 — Cài công cụ (một lần)

Cài Google Cloud CLI:
```bash
# macOS (Homebrew)
brew install --cask google-cloud-sdk
```
Hoặc tải tại: https://cloud.google.com/sdk/docs/install

Đăng nhập:
```bash
gcloud auth login
```

## Bước 1 — Chọn project và bật dịch vụ

```bash
# Xem các project hiện có
gcloud projects list

# Đặt project đang dùng (thay YOUR_PROJECT_ID)
gcloud config set project YOUR_PROJECT_ID

# Bật các API cần thiết
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

> Nếu chưa có project: `gcloud projects create tntcar-demo-123 --name="TNT CAR"` rồi liên kết billing trong Console (cần bật billing để dùng credit \$300, Cloud Run có free tier).

## Bước 2 — Deploy (build luôn trên cloud, không cần Docker local)

Chạy tại thư mục `app/` (nơi có Dockerfile):
```bash
cd "app"

gcloud run deploy tntcar \
  --source . \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --set-env-vars JWT_SECRET=doi-chuoi-bi-mat-nay-di,DB_PATH=/tmp/tntcar.db
```

Giải thích:
- `--source .` : Cloud Build tự build Dockerfile trên cloud.
- `asia-southeast1` : vùng Singapore (gần VN nhất).
- `--allow-unauthenticated` : cho phép truy cập công khai (cần cho web demo).
- Lần đầu gcloud có thể hỏi tạo Artifact Registry repo — chọn `y`.

Sau vài phút, gcloud in ra **Service URL**, ví dụ:
```
https://tntcar-xxxxxxxx-as.a.run.app
```

## Bước 3 — Truy cập
- App nội bộ: `https://<service-url>/`
- Website công khai: `https://<service-url>/site`
- Tài khoản: `admin@tntcar.vn` / `123456` (xem thêm README.md)

---

## Cập nhật sau khi sửa code
Chạy lại đúng lệnh ở Bước 2, Cloud Run tạo revision mới.

## Xem log nếu lỗi
```bash
gcloud run services logs read tntcar --region asia-southeast1 --limit 50
```

## Xóa service (để không tốn credit)
```bash
gcloud run services delete tntcar --region asia-southeast1
```

---

## Nếu muốn dữ liệu bền (production) — nâng cấp sau
1. Tạo Cloud SQL PostgreSQL instance (bậc nhỏ nhất `db-f1-micro`).
2. Đổi tầng DB trong `backend/src/db` từ sql.js sang `pg`.
3. Kết nối Cloud Run ↔ Cloud SQL qua `--add-cloudsql-instances`.
Việc này cần sửa code, không nằm trong bản demo hiện tại.
