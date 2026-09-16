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

class TntDexie extends Dexie {
  outbox!: Table<OutboxItem, string>;
  leadCache!: Table<CachedLead, string>;

  constructor() {
    super('tntcar');
    this.version(1).stores({
      outbox: 'id, entity_type, status, created_at',
      leadCache: 'id, updated_at',
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
