/**
 * Scheduler nhắc việc (FR-02 US-02.2, FR-03 US-03.7).
 * Chạy nền định kỳ, quét:
 *  - reminders có remind_at đã tới (trong khoảng notify_before_minutes) mà chưa notified -> tạo notification.
 *  - test_drive_bookings "Đã xác nhận" trước giờ hẹn 24h và 2h -> tạo notification (mỗi mốc 1 lần).
 * Tạo bản ghi vào bảng notifications; đánh dấu reminders.notified = 1.
 */
import { v4 as uuid } from 'uuid';
import { all, run, persist, get } from './db/database';
import { pushToUser } from './push';

const nowIso = () => new Date().toISOString();

function createNotification(userId: string, type: string, title: string, body: string, refType: string, refId: string) {
  run(
    `INSERT INTO notifications (id,user_id,type,title,body,ref_type,ref_id,is_read,created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [uuid(), userId, type, title, body, refType, refId, 0, nowIso()]
  );
  // Đẩy Web Push lên thiết bị (kể cả khi app đóng). Kèm lead_id để bấm vào mở đúng Lead.
  let leadId: string | null = refType === 'lead' ? refId : null;
  try {
    if (refType === 'reminder') leadId = get<any>('SELECT lead_id FROM reminders WHERE id = ?', [refId])?.lead_id || null;
    else if (refType === 'booking') leadId = get<any>('SELECT lead_id FROM test_drive_bookings WHERE id = ?', [refId])?.lead_id || null;
  } catch { /* ignore */ }
  pushToUser(userId, { title, body, url: leadId ? `/leads/${leadId}` : '/', tag: refId }).catch(() => {});
}

function checkReminders() {
  const now = Date.now();
  // Lấy các lịch hẹn chưa nhắc, đã tới mốc (remind_at - notify_before_minutes <= now < remind_at + 1h)
  const rows = all<any>(
    `SELECT r.*, l.full_name AS lead_name FROM reminders r
     JOIN leads l ON l.id = r.lead_id
     WHERE r.notified = 0`
  );
  for (const r of rows) {
    const remindAt = new Date(r.remind_at).getTime();
    const triggerAt = remindAt - (r.notify_before_minutes || 30) * 60000;
    // Đã tới lúc nhắc và chưa quá hạn 2 giờ
    if (now >= triggerAt && now <= remindAt + 2 * 3600000) {
      createNotification(
        r.created_by, 'reminder',
        `Nhắc hẹn: ${r.purpose}`,
        `Lịch hẹn với ${r.lead_name} lúc ${new Date(r.remind_at).toLocaleString('vi-VN')}${r.location ? ' tại ' + r.location : ''}`,
        'reminder', r.id
      );
      run('UPDATE reminders SET notified = 1 WHERE id = ?', [r.id]);
    }
  }
}

function checkTestDriveReminders() {
  const now = Date.now();
  const bookings = all<any>(
    `SELECT b.*, s.start_time, c.name AS car_name, l.assigned_sales_id
     FROM test_drive_bookings b
     JOIN slots s ON s.id = b.slot_id
     JOIN car_models c ON c.id = b.car_model_id
     LEFT JOIN leads l ON l.id = b.lead_id
     WHERE b.status = 'Đã xác nhận'`
  );
  for (const b of bookings) {
    const start = new Date(b.start_time).getTime();
    const hoursLeft = (start - now) / 3600000;
    for (const [milestone, lo, hi] of [['24h', 22, 24.5], ['2h', 1.5, 2.5]] as const) {
      if (hoursLeft <= hi && hoursLeft >= lo) {
        // Kiểm tra đã gửi mốc này chưa
        const sent = all<any>('SELECT id FROM test_drive_reminders_sent WHERE booking_id = ? AND milestone = ?', [b.id, milestone]);
        if (sent.length === 0 && b.assigned_sales_id) {
          createNotification(
            b.assigned_sales_id, 'test_drive',
            `Nhắc lái thử (còn ~${milestone})`,
            `Khách ${b.customer_name} lái thử ${b.car_name} lúc ${new Date(b.start_time).toLocaleString('vi-VN')} (mã ${b.booking_code})`,
            'booking', b.id
          );
          run('INSERT INTO test_drive_reminders_sent (id,booking_id,milestone,sent_at) VALUES (?,?,?,?)', [uuid(), b.id, milestone, nowIso()]);
        }
      }
    }
  }
}

let started = false;
export function startScheduler() {
  if (started) return;
  started = true;
  const tick = () => {
    try {
      checkReminders();
      checkTestDriveReminders();
      persist();
    } catch (e) {
      console.error('[scheduler] lỗi:', e);
    }
  };
  // Chạy mỗi 60 giây
  setInterval(tick, 60000);
  tick();
  console.log('[scheduler] Đã khởi động job nhắc việc (chạy mỗi 60s).');
}
