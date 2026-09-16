/**
 * IndexedDB (Dexie) cho lưu trữ offline (FR-06).
 * outbox: hàng đợi các thao tác tạo/sửa khi offline, chờ đồng bộ lên server.
 * cache: bản sao Lead để xem khi offline.
 */
import Dexie, { Table } from 'dexie';

export interface OutboxItem {
  id: string;            // = entity_id
  entity_type: 'lead' | 'interaction' | 'reminder';
  payload: any;
  updated_at: string;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  attempts: number;
  created_at: string;
}

export interface CachedLead {
  id: string;
  data: any;
  updated_at: string;
}

export interface CachedUser {
  id: string;
  data: any;
}

class TntDexie extends Dexie {
  outbox!: Table<OutboxItem, string>;
  leadCache!: Table<CachedLead, string>;
  userCache!: Table<CachedUser, string>;

  constructor() {
    super('tntcar');
    this.version(1).stores({
      outbox: 'id, entity_type, status, created_at',
      leadCache: 'id, updated_at',
    });
    // Nâng version thêm bảng cache người dùng (xem offline)
    this.version(2).stores({
      outbox: 'id, entity_type, status, created_at',
      leadCache: 'id, updated_at',
      userCache: 'id',
    });
  }
}

export const db = new TntDexie();

export async function enqueue(item: Omit<OutboxItem, 'status' | 'attempts' | 'created_at'>) {
  await db.outbox.put({ ...item, status: 'PENDING', attempts: 0, created_at: new Date().toISOString() });
}

export async function pendingCount(): Promise<number> {
  return db.outbox.where('status').anyOf('PENDING', 'FAILED').count();
}

/** Lưu danh sách Lead vào cache offline (gọi sau khi tải online thành công). */
export async function cacheLeads(list: any[]) {
  const now = new Date().toISOString();
  await db.leadCache.bulkPut(list.map((l) => ({ id: l.id, data: l, updated_at: l.updated_at || now })));
}

/** Đọc toàn bộ Lead từ cache (dùng khi offline). */
export async function getCachedLeads(): Promise<any[]> {
  const rows = await db.leadCache.toArray();
  return rows.map((r) => r.data);
}

/** Lưu 1 Lead (kèm chi tiết) vào cache. */
export async function cacheLead(lead: any) {
  await db.leadCache.put({ id: lead.id, data: lead, updated_at: lead.updated_at || new Date().toISOString() });
}

/** Đọc 1 Lead từ cache theo id. */
export async function getCachedLead(id: string): Promise<any | undefined> {
  const row = await db.leadCache.get(id);
  return row?.data;
}

/** Các Lead tạo offline đang chờ đồng bộ (để hiển thị chung với danh sách). */
export async function getOutboxLeads(): Promise<any[]> {
  const items = await db.outbox.where('entity_type').equals('lead').toArray();
  return items.map((i) => ({ id: i.id, ...i.payload, _pendingSync: true }));
}

/** Lưu danh sách người dùng vào cache offline. */
export async function cacheUsers(list: any[]) {
  await db.userCache.clear();
  await db.userCache.bulkPut(list.map((u) => ({ id: u.id, data: u })));
}

/** Đọc danh sách người dùng từ cache (dùng khi offline). */
export async function getCachedUsers(): Promise<any[]> {
  const rows = await db.userCache.toArray();
  return rows.map((r) => r.data);
}
