/**
 * Sync manager (FR-06): đẩy các bản ghi PENDING trong outbox lên server khi có mạng.
 * Tự chạy khi online trở lại và định kỳ.
 */
import { api } from './api';
import { db } from './db';

let syncing = false;

export function isOnline() {
  return navigator.onLine;
}

export async function runSync(): Promise<{ synced: number; failed: number }> {
  if (syncing || !navigator.onLine) return { synced: 0, failed: 0 };
  syncing = true;
  try {
    const pending = await db.outbox.where('status').anyOf('PENDING', 'FAILED').toArray();
    if (pending.length === 0) return { synced: 0, failed: 0 };

    const items = pending.map((p) => ({
      entity_type: p.entity_type,
      entity_id: p.id,
      payload: p.payload,
      updated_at: p.updated_at,
    }));

    const result = await api.post<{ synced: number; failed: number; results: any[] }>('/sync', {
      device_id: getDeviceId(),
      items,
    });

    for (const r of result.results) {
      if (r.status === 'SYNCED') {
        await db.outbox.delete(r.entity_id);
      } else {
        const item = pending.find((p) => p.id === r.entity_id);
        if (item) {
          await db.outbox.update(r.entity_id, {
            status: item.attempts + 1 >= 5 ? 'FAILED' : 'PENDING',
            attempts: item.attempts + 1,
          });
        }
      }
    }
    return { synced: result.synced, failed: result.failed };
  } catch {
    return { synced: 0, failed: 0 };
  } finally {
    syncing = false;
  }
}

function getDeviceId(): string {
  let id = localStorage.getItem('tnt_device_id');
  if (!id) {
    id = 'dev-' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('tnt_device_id', id);
  }
  return id;
}

/** Khởi động auto-sync: khi online + mỗi 30s. */
export function startAutoSync(onChange?: () => void) {
  const tick = async () => {
    const r = await runSync();
    if (r.synced > 0 && onChange) onChange();
  };
  window.addEventListener('online', tick);
  setInterval(tick, 30000);
  tick();
}
