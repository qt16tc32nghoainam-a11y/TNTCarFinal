/**
 * Gửi email qua SMTP (nodemailer).
 * Nguồn cấu hình theo thứ tự ưu tiên:
 *   1. Bảng app_settings (Admin cấu hình trong UI, key tiền tố "smtp.")
 *   2. Biến môi trường .env (SMTP_*)
 * Nếu chưa cấu hình đủ -> chỉ ghi log ra console (không crash), tiện dev/test.
 */
import nodemailer, { Transporter } from 'nodemailer';
import { config } from './config';
import { getSettingsByPrefix } from './db/database';

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

let transporter: Transporter | null = null;
let ready = false;
let current: SmtpConfig | null = null;

/** Gộp cấu hình từ DB (ưu tiên) rồi tới .env. */
export function resolveSmtpConfig(): SmtpConfig {
  const db = getSettingsByPrefix('smtp.'); // { host, port, secure, user, pass, from }
  const env = config.smtp;
  const pick = (dbVal: string | undefined, envVal: string) =>
    dbVal !== undefined && dbVal !== '' ? dbVal : envVal;

  return {
    host: pick(db.host, env.host),
    port: db.port ? parseInt(db.port, 10) || env.port : env.port,
    secure: db.secure !== undefined && db.secure !== '' ? db.secure === 'true' : env.secure,
    user: pick(db.user, env.user),
    pass: pick(db.pass, env.pass),
    from: pick(db.from, env.from),
  };
}

/** (Re)khởi tạo transporter từ cấu hình hiện tại. Gọi lúc khởi động và sau khi Admin lưu SMTP. */
export function reloadMailer(): void {
  const s = resolveSmtpConfig();
  current = s;
  if (s.host && s.user && s.pass) {
    transporter = nodemailer.createTransport({
      host: s.host,
      port: s.port,
      secure: s.secure,
      auth: { user: s.user, pass: s.pass },
    });
    ready = true;
    console.log(`[mailer] SMTP đã cấu hình (${s.host}:${s.port}). Email sẽ gửi thật.`);
  } else {
    transporter = null;
    ready = false;
    console.log('[mailer] Chưa cấu hình SMTP -> email chỉ ghi log. Cấu hình trong trang Cài đặt Email hoặc .env.');
  }
}

/** Trạng thái mailer để hiển thị trong UI (không lộ mật khẩu). */
export function mailerStatus(): { configured: boolean; host: string; port: number; secure: boolean; user: string; from: string; source: 'db' | 'env' | 'none' } {
  const db = getSettingsByPrefix('smtp.');
  const s = current || resolveSmtpConfig();
  const source: 'db' | 'env' | 'none' = db.host
    ? 'db'
    : config.smtp.host
      ? 'env'
      : 'none';
  return { configured: ready, host: s.host, port: s.port, secure: s.secure, user: s.user, from: s.from, source };
}

/** Gửi email. Trả về true nếu gửi (hoặc log) thành công. */
export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  if (!to) return false;
  if (!ready || !transporter) {
    console.log(`[EMAIL - LOG] Tới: ${to} | Chủ đề: ${subject}`);
    return true;
  }
  try {
    await transporter.sendMail({ from: (current || resolveSmtpConfig()).from, to, subject, html });
    console.log(`[mailer] Đã gửi email tới ${to}: ${subject}`);
    return true;
  } catch (e) {
    console.error('[mailer] Lỗi gửi email:', e);
    return false;
  }
}

/**
 * Gửi thử một email với cấu hình cho trước (không cần lưu vào DB).
 * Dùng cho nút "Gửi thử" trong trang Cài đặt. Trả về { ok, error }.
 */
export async function sendTestMail(cfg: SmtpConfig, to: string): Promise<{ ok: boolean; error?: string }> {
  if (!cfg.host || !cfg.user || !cfg.pass) {
    return { ok: false, error: 'Thiếu Host / User / Password SMTP' };
  }
  if (!to) return { ok: false, error: 'Thiếu email nhận thử' };
  try {
    const t = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    });
    await t.sendMail({
      from: cfg.from || cfg.user,
      to,
      subject: '[TNT CAR] Email thử cấu hình SMTP',
      html: `<div style="font-family:Arial,sans-serif">
        <h2 style="color:#1e40af">TNT CAR</h2>
        <p>Đây là email thử để kiểm tra cấu hình SMTP.</p>
        <p>Nếu bạn nhận được email này, cấu hình gửi mail đã hoạt động.</p>
        <p style="color:#999;font-size:12px">Gửi lúc: ${new Date().toLocaleString('vi-VN')}</p>
      </div>`,
    });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Lỗi không xác định khi gửi email' };
  }
}

/** Email xác nhận đặt lịch lái thử. */
export function testDriveEmail(opts: {
  customerName: string;
  carName: string;
  showroomName: string;
  startTime: string;
  bookingCode: string;
  rescheduled?: boolean;
}): { subject: string; html: string } {
  const when = new Date(opts.startTime).toLocaleString('vi-VN', { dateStyle: 'full', timeStyle: 'short' });
  const title = opts.rescheduled ? 'Cập nhật lịch lái thử' : 'Xác nhận lịch lái thử';
  const subject = `[TNT CAR] ${title} - ${opts.carName}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #eee;border-radius:12px;overflow:hidden">
      <div style="background:#1e40af;color:#fff;padding:16px 20px;font-size:18px;font-weight:bold">TNT CAR</div>
      <div style="padding:20px;color:#333">
        <p>Xin chào <b>${opts.customerName}</b>,</p>
        <p>${opts.rescheduled ? 'Lịch lái thử của bạn đã được cập nhật:' : 'Cảm ơn bạn đã đặt lịch lái thử tại TNT CAR. Thông tin lịch hẹn:'}</p>
        <table style="width:100%;border-collapse:collapse;margin:12px 0">
          <tr><td style="padding:6px 0;color:#666">Mã lịch</td><td style="padding:6px 0;font-weight:bold">${opts.bookingCode}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Xe lái thử</td><td style="padding:6px 0;font-weight:bold">${opts.carName}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Showroom</td><td style="padding:6px 0;font-weight:bold">${opts.showroomName}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Thời gian</td><td style="padding:6px 0;font-weight:bold;color:#1e40af">${when}</td></tr>
        </table>
        <p style="font-size:13px;color:#666">Vui lòng đến trước giờ hẹn 10 phút. Nếu cần đổi/hủy, xin liên hệ showroom trước ít nhất 4 giờ.</p>
        <p style="font-size:13px;color:#999">Hotline: 1900 1234 · TNT CAR</p>
      </div>
    </div>`;
  return { subject, html };
}
