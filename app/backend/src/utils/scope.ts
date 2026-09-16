import { all } from '../db/database';
import { AuthUser } from '../types';

/**
 * Trả về danh sách sales_id mà người dùng được phép xem dữ liệu.
 * - Admin: null (xem tất cả)
 * - Manager: chính mình + các Sales có manager_id = mình
 * - Sales: chỉ chính mình
 */
export function getVisibleSalesIds(user: AuthUser): string[] | null {
  if (user.role === 'Admin') return null;
  if (user.role === 'Manager') {
    const rows = all<{ id: string }>('SELECT id FROM users WHERE manager_id = ?', [user.id]);
    return [user.id, ...rows.map((r) => r.id)];
  }
  return [user.id];
}

/** Tạo mệnh đề IN (?,?,...) an toàn. */
export function inClause(ids: string[]): { clause: string; params: string[] } {
  const placeholders = ids.map(() => '?').join(',');
  return { clause: `(${placeholders})`, params: ids };
}
