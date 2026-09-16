#!/bin/sh
# Khởi động container:
# - Nếu DB chưa tồn tại (lần đầu / chưa seed): chạy migrate + seed.
# - Nếu DB đã có (volume đã lưu): giữ nguyên dữ liệu, chỉ chạy server.
set -e

DB_FILE="${DB_PATH:-/data/tntcar.db}"

if [ -f "$DB_FILE" ]; then
  echo "[entrypoint] Đã có DB tại $DB_FILE — giữ nguyên dữ liệu, bỏ qua migrate/seed."
else
  echo "[entrypoint] Chưa có DB — chạy migrate + seed lần đầu."
  node dist/db/migrate.js
  node dist/db/seed.js
fi

exec node dist/index.js
