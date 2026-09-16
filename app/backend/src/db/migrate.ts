/**
 * Migration: tạo mới toàn bộ bảng theo schema. Xóa file DB cũ nếu có (reset sạch).
 */
import fs from 'fs';
import path from 'path';
import { initDb, exec, persist } from './database';
import { SCHEMA_SQL } from './schema';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/tntcar.db');

async function migrate() {
  // Xóa DB cũ để tạo lại từ đầu
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('Đã xóa DB cũ:', DB_PATH);
  }
  await initDb();
  exec(SCHEMA_SQL);
  persist();
  console.log('Migration hoàn tất: đã tạo toàn bộ bảng.');
  process.exit(0);
}

migrate().catch((e) => {
  console.error('Migration lỗi:', e);
  process.exit(1);
});
