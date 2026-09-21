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
  // Không xóa DB cũ: tự bổ sung field email và liên kết lịch hẹn-lái thử.
  addMissingColumns('leads', [['email', 'TEXT']]);
  addMissingColumns('test_drive_bookings', [['customer_email', 'TEXT']]);
  addMissingColumns('reminders', [['booking_id', 'TEXT']]);

  // Sau khi bỏ bước xác nhận/từ chối, chuyển lịch cũ đang chờ sang Đã xác nhận để không bị kẹt UI.
  try {
    db.run("UPDATE test_drive_bookings SET status='Đã xác nhận' WHERE status='Chờ xác nhận'");
    dirty = true;
  } catch { /* bảng chưa tồn tại ở DB mới, schema sẽ tạo sau */ }
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

  const wanted = [
    { full_name: 'Nguyễn Thiện An', email: 'annt@tntcar.vn', phone: '0911111116' },
    { full_name: 'Nguyễn Đại Thành', email: 'thanhnd@tntcar.vn', phone: '0911111117' },
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
