/**
 * Lớp DB wrapper trên sql.js (SQLite biên dịch WebAssembly, thuần JS).
 * Cung cấp API tối giản giống better-sqlite3: prepare().get/all/run, exec, persist.
 * DB được nạp từ file khi khởi động và ghi lại ra file sau mỗi thao tác ghi.
 */
import initSqlJs, { Database as SqlJsDatabase, SqlValue } from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/tntcar.db');

let db: SqlJsDatabase | null = null;
let dirty = false;

export type Row = Record<string, SqlValue>;

/** Khởi tạo DB: nạp từ file nếu có, hoặc tạo mới trong bộ nhớ. */
export async function initDb(): Promise<void> {
  // locateFile giúp sql.js tìm đúng file wasm khi chạy production (từ dist/)
  const SQL = await initSqlJs({
    locateFile: (file: string) => {
      const candidates = [
        path.join(process.cwd(), 'node_modules/sql.js/dist', file),
        require.resolve('sql.js/dist/' + file),
      ];
      for (const c of candidates) {
        try { if (fs.existsSync(c)) return c; } catch { /* ignore */ }
      }
      return file;
    },
  });
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(new Uint8Array(buf));
  } else {
    db = new SQL.Database();
  }
  db.run('PRAGMA foreign_keys = ON;');

  // Migration nhẹ cho DB đã tồn tại: thêm cột còn thiếu (không phá dữ liệu).
  runLightMigrations();

  // Ghi định kỳ nếu có thay đổi (an toàn dữ liệu)
  setInterval(() => {
    if (dirty) persist();
  }, 2000);
}

/** Thêm cột mới cho các bảng đã tồn tại (an toàn với DB cũ trên server). */
function runLightMigrations(): void {
  if (!db) return;

  // Tạo bảng cấu hình hệ thống (SMTP...) nếu DB cũ chưa có — an toàn, không xóa dữ liệu.
  try {
    db.run(`CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT,
      updated_by TEXT
    )`);
    dirty = true;
  } catch (e) {
    console.error('[migration] Không tạo được app_settings:', e);
  }

  const addMissingColumns = (table: string, columns: [string, string][]) => {
    let exists = false;
    try {
      const r = db!.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`);
      exists = r.length > 0 && r[0].values.length > 0;
    } catch { /* ignore */ }
    if (!exists) return;

    const current = new Set<string>();
    try {
      const r = db!.exec(`PRAGMA table_info(${table})`);
      if (r.length) for (const row of r[0].values) current.add(String(row[1]));
    } catch { /* ignore */ }

    for (const [column, type] of columns) {
      if (current.has(column)) continue;
      try {
        db!.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
        dirty = true;
        console.log(`[migration] Đã thêm ${table}.${column}`);
      } catch (e) {
        console.error(`[migration] Không thêm được ${table}.${column}:`, e);
      }
    }
  };

  addMissingColumns('contracts', [
    ['payment_method', 'TEXT'], ['bank_name', 'TEXT'], ['expected_delivery', 'TEXT'],
    ['delivered_at', 'TEXT'], ['delivered_by', 'TEXT'], ['vin', 'TEXT'],
    ['plate_number', 'TEXT'], ['delivery_note', 'TEXT'],
  ]);
  // Không xóa DB cũ: tự bổ sung field email, thông tin lead mở rộng và liên kết lịch hẹn-lái thử.
  addMissingColumns('leads', [
    ['email', 'TEXT'],
    ['address', 'TEXT'],
    ['budget', 'TEXT'],
    ['payment_method', 'TEXT'],
    ['interest_level', 'TEXT'],
    ['source_detail', 'TEXT'],
    ['note', 'TEXT'],
    ['customer_code', 'TEXT'],
    ['lead_status', "TEXT NOT NULL DEFAULT 'new'"],
  ]);

  backfillLeadCodesAndStatus();
  addMissingColumns('test_drive_bookings', [['customer_email', 'TEXT']]);
  addMissingColumns('reminders', [['booking_id', 'TEXT']]);

  // Sau khi bỏ bước xác nhận/từ chối, chuyển lịch cũ đang chờ sang Đã xác nhận để không bị kẹt UI.
  try {
    db.run("UPDATE test_drive_bookings SET status='Đã xác nhận' WHERE status='Chờ xác nhận'");
    dirty = true;
  } catch { /* bảng chưa tồn tại ở DB mới, schema sẽ tạo sau */ }
}

/** Sinh mã khách hàng tiếp theo dạng KH000001, KH000002... (dùng khi tạo Lead mới ở mọi route). */
export function nextCustomerCode(): string {
  const maxRow = get<{ n: number }>(
    "SELECT MAX(CAST(SUBSTR(customer_code, 3) AS INTEGER)) AS n FROM leads WHERE customer_code LIKE 'KH%'"
  );
  const seq = (maxRow?.n || 0) + 1;
  return 'KH' + String(seq).padStart(6, '0');
}

/**
 * Sinh mã khách hàng (customer_code) cho các Lead chưa có, và đồng bộ lead_status theo status_detail
 * hiện tại. An toàn để gọi nhiều lần (migration khi khởi động, và sau khi seed dữ liệu mẫu).
 */
export function backfillLeadCodesAndStatus(): void {
  if (!db) return;
  try {
    const rows = all<{ id: string; status_detail: string; is_archived: number; assigned_sales_id: string | null }>(
      "SELECT id, status_detail, is_archived, assigned_sales_id FROM leads WHERE customer_code IS NULL OR customer_code = '' ORDER BY created_at ASC"
    );
    if (rows.length) {
      const maxRow = get<{ n: number }>(
        "SELECT MAX(CAST(SUBSTR(customer_code, 3) AS INTEGER)) AS n FROM leads WHERE customer_code LIKE 'KH%'"
      );
      let seq = (maxRow?.n || 0) + 1;
      for (const r of rows) {
        const code = 'KH' + String(seq).padStart(6, '0');
        run('UPDATE leads SET customer_code = ? WHERE id = ?', [code, r.id]);
        seq++;
      }
      dirty = true;
      console.log(`[migration] Đã sinh mã khách hàng cho ${rows.length} Lead.`);
    }
    // Đồng bộ lead_status theo status_detail cho toàn bộ Lead (an toàn, có thể chạy nhiều lần).
    run("UPDATE leads SET lead_status = 'deleted' WHERE is_archived = 1 AND lead_status != 'deleted'");
    run("UPDATE leads SET lead_status = 'won' WHERE is_archived = 0 AND status_detail = 'Thành công' AND lead_status != 'won'");
    run("UPDATE leads SET lead_status = 'lost' WHERE is_archived = 0 AND status_detail = 'Lead thất bại' AND lead_status != 'lost'");
    run("UPDATE leads SET lead_status = 'assigned' WHERE is_archived = 0 AND status_detail NOT IN ('Thành công','Lead thất bại') AND assigned_sales_id IS NOT NULL AND lead_status = 'new'");
    dirty = true;
  } catch (e) {
    console.error('[migration] Lỗi sinh customer_code/lead_status:', e);
  }
}

/** Tạo 2 Sales phụ trách Lead website (An, Thành) nếu chưa có. Chạy khi khởi động, không xóa dữ liệu. */
export function ensureWebSales(): void {
  if (!db) return;
  // Chỉ chạy khi bảng users tồn tại
  let hasUsers = false;
  try {
    const r = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
    hasUsers = r.length > 0 && r[0].values.length > 0;
  } catch { /* ignore */ }
  if (!hasUsers) return;

  const hash = bcrypt.hashSync('123456', 8);
  let showroom: string | null = null;
  try {
    const r = db.exec('SELECT id FROM showrooms LIMIT 1');
    if (r.length && r[0].values.length) showroom = String(r[0].values[0][0]);
  } catch { /* ignore */ }

  // Đổi tên user Sale website thứ 2: Nguyễn Đại Thành (thanhnd) -> Võ Đại Thành (thanhvd).
  // Giữ nguyên dữ liệu/Lead đã gán, chỉ cập nhật email + tên nếu email mới chưa bị dùng.
  try {
    const hasOld = db.exec("SELECT id FROM users WHERE email='thanhnd@tntcar.vn'");
    const hasNew = db.exec("SELECT id FROM users WHERE email='thanhvd@tntcar.vn'");
    const oldExists = hasOld.length > 0 && hasOld[0].values.length > 0;
    const newExists = hasNew.length > 0 && hasNew[0].values.length > 0;
    if (oldExists && !newExists) {
      db.run("UPDATE users SET email='thanhvd@tntcar.vn', full_name='Võ Đại Thành' WHERE email='thanhnd@tntcar.vn'");
      dirty = true;
      console.log('[migration] Đã đổi Sale website: thanhnd -> thanhvd (Võ Đại Thành)');
    }
  } catch { /* ignore */ }

  const wanted = [
    { full_name: 'Nguyễn Thiện An', email: 'annt@tntcar.vn', phone: '0911111116' },
    { full_name: 'Võ Đại Thành', email: 'thanhvd@tntcar.vn', phone: '0911111117' },
  ];
  for (const w of wanted) {
    let exists = false;
    try {
      const r = db.exec(`SELECT id FROM users WHERE email='${w.email}'`);
      exists = r.length > 0 && r[0].values.length > 0;
    } catch { /* ignore */ }
    if (exists) continue;
    try {
      db.run(
        `INSERT INTO users (id,full_name,email,phone,password_hash,role,showroom_id,manager_id,status,onboarded,created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [uuid(), w.full_name, w.email, w.phone, hash, 'Sales', showroom, null, 'Hoạt động', 1, new Date().toISOString()]
      );
      dirty = true;
    } catch { /* ignore */ }
  }
}

function ensure(): SqlJsDatabase {
  if (!db) throw new Error('DB chưa được khởi tạo. Gọi initDb() trước.');
  return db;
}

/** Đọc 1 giá trị cấu hình (app_settings). Trả về undefined nếu chưa có. */
export function getSetting(key: string): string | undefined {
  try {
    const row = get<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [key]);
    return row?.value ?? undefined;
  } catch {
    return undefined;
  }
}

/** Đọc toàn bộ cấu hình theo tiền tố key (vd 'smtp.'). Trả về object không kèm tiền tố. */
export function getSettingsByPrefix(prefix: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const rows = all<{ key: string; value: string }>(
      "SELECT key, value FROM app_settings WHERE key LIKE ?",
      [prefix + '%']
    );
    for (const r of rows) out[r.key.slice(prefix.length)] = r.value ?? '';
  } catch { /* bảng chưa tồn tại */ }
  return out;
}

/** Ghi (upsert) 1 giá trị cấu hình. */
export function setSetting(key: string, value: string, updatedBy?: string): void {
  run(
    `INSERT INTO app_settings (key, value, updated_at, updated_by) VALUES (?,?,?,?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
    [key, value, new Date().toISOString(), updatedBy || null]
  );
  persist();
}

/** Ghi DB ra file. */
export function persist(): void {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  dirty = false;
}

/** Chạy nhiều câu lệnh SQL (DDL). */
export function exec(sql: string): void {
  ensure().run(sql);
  dirty = true;
  persist();
}

function bind(params?: unknown[] | Record<string, unknown>): SqlValue[] | Record<string, SqlValue> {
  if (!params) return [];
  return params as any;
}

/** Trả về 1 dòng đầu tiên (hoặc undefined). */
export function get<T = Row>(sql: string, params?: unknown[]): T | undefined {
  const stmt = ensure().prepare(sql);
  try {
    stmt.bind(bind(params) as any);
    if (stmt.step()) {
      return stmt.getAsObject() as unknown as T;
    }
    return undefined;
  } finally {
    stmt.free();
  }
}

/** Trả về tất cả các dòng. */
export function all<T = Row>(sql: string, params?: unknown[]): T[] {
  const stmt = ensure().prepare(sql);
  const rows: T[] = [];
  try {
    stmt.bind(bind(params) as any);
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as unknown as T);
    }
    return rows;
  } finally {
    stmt.free();
  }
}

/** Thực thi câu lệnh ghi (INSERT/UPDATE/DELETE). */
export function run(sql: string, params?: unknown[]): { changes: number } {
  const database = ensure();
  const stmt = database.prepare(sql);
  try {
    stmt.bind(bind(params) as any);
    stmt.step();
  } finally {
    stmt.free();
  }
  dirty = true;
  const changes = database.getRowsModified();
  return { changes };
}

/** Chạy một hàm trong transaction. */
export function transaction<T>(fn: () => T): T {
  const database = ensure();
  database.run('BEGIN');
  try {
    const result = fn();
    database.run('COMMIT');
    dirty = true;
    persist();
    return result;
  } catch (e) {
    database.run('ROLLBACK');
    throw e;
  }
}

export function getDb(): SqlJsDatabase {
  return ensure();
}
