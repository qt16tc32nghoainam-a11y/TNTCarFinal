/**
 * Gửi email qua SMTP (nodemailer).
 * - Nếu đã cấu hình SMTP (SMTP_HOST + SMTP_USER + SMTP_PASS trong .env) -> gửi thật.
 * - Nếu chưa cấu hình -> chỉ ghi log ra console (không crash), tiện dev/test.
 */
import nodemailer, { Transporter } from 'nodemailer';
import { config } from './config';

let transporter: Transporter | null = null;
let ready = false;

function initTransporter() {
  const s = config.smtp;
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
    ready = false;
    console.log('[mailer] Chưa cấu hình SMTP -> email chỉ ghi log. Điền SMTP_* trong .env để gửi thật.');
  }
}
initTransporter();

/** Gửi email. Trả về true nếu gửi (hoặc log) thành công. */
export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  if (!to) return false;
  if (!ready || !transporter) {
    console.log(`[EMAIL - LOG] Tới: ${to} | Chủ đề: ${subject}`);
    return true;
  }
  try {
    await transporter.sendMail({ from: config.smtp.from, to, subject, html });
    console.log(`[mailer] Đã gửi email tới ${to}: ${subject}`);
    return true;
  } catch (e) {
    console.error('[mailer] Lỗi gửi email:', e);
    return false;
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
