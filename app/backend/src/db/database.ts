/**
 * Lớp DB wrapper trên sql.js (SQLite biên dịch WebAssembly, thuần JS).
 * Cung cấp API tối giản giống better-sqlite3: prepare().get/all/run, exec, persist.
 * DB được nạp từ file khi khởi động và ghi lại ra file sau mỗi thao tác ghi.
 */
import initSqlJs, { Database as SqlJsDatabase, SqlValue } from 'sql.js';
import fs from 'fs';
import path from 'path';

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

  // Migration nhẹ cho DB đã tồn tại: thêm cột hợp đồng còn thiếu (không phá dữ liệu).
  runLightMigrations();

  // Ghi định kỳ nếu có thay đổi (an toàn dữ liệu)
  setInterval(() => {
    if (dirty) persist();
  }, 2000);
}

/** Thêm cột mới cho các bảng đã tồn tại (an toàn với DB cũ trên server). */
function runLightMigrations(): void {
  if (!db) return;
  // Chỉ áp dụng khi bảng contracts đã tồn tại (DB cũ)
  let hasContracts = false;
  try {
    const r = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='contracts'");
    hasContracts = r.length > 0 && r[0].values.length > 0;
  } catch { /* ignore */ }
  if (!hasContracts) return;

  const existing = new Set<string>();
  try {
    const r = db.exec('PRAGMA table_info(contracts)');
    if (r.length) for (const row of r[0].values) existing.add(String(row[1])); // cột name ở index 1
  } catch { /* ignore */ }

  const newCols: [string, string][] = [
    ['payment_method', 'TEXT'], ['bank_name', 'TEXT'], ['expected_delivery', 'TEXT'],
    ['delivered_at', 'TEXT'], ['delivered_by', 'TEXT'], ['vin', 'TEXT'],
    ['plate_number', 'TEXT'], ['delivery_note', 'TEXT'],
  ];
  for (const [col, type] of newCols) {
    if (!existing.has(col)) {
      try { db.run(`ALTER TABLE contracts ADD COLUMN ${col} ${type}`); dirty = true; } catch { /* ignore */ }
    }
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
