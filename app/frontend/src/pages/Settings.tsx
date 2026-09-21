import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Field, Spinner } from '../components/ui';
import { Mail, CheckCircle2, AlertCircle, Send } from 'lucide-react';

type SmtpState = {
  configured: boolean;
  source: 'db' | 'env' | 'none';
  host: string;
  port: number;
  secure: boolean;
  user: string;
  from: string;
  hasPassword: boolean;
};

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<SmtpState | null>(null);

  const [host, setHost] = useState('');
  const [port, setPort] = useState('587');
  const [secure, setSecure] = useState(false);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [from, setFrom] = useState('');

  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Gửi thử
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const s = await api.get<SmtpState>('/settings/smtp');
      setStatus(s);
      setHost(s.host || '');
      setPort(String(s.port || 587));
      setSecure(!!s.secure);
      setUser(s.user || '');
      setFrom(s.from || '');
      setPass(''); // không bao giờ hiển thị mật khẩu; để trống = giữ nguyên
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const r = await api.put<{ ok: boolean; configured: boolean }>('/settings/smtp', {
        host, port: parseInt(port, 10) || 587, secure, user, pass, from,
      });
      setMsg({ type: 'ok', text: r.configured ? 'Đã lưu. SMTP đang hoạt động, email sẽ gửi thật.' : 'Đã lưu, nhưng chưa đủ thông tin để gửi thật (cần Host, User, Password).' });
      await load();
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || 'Lưu thất bại' });
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    setTestMsg(null);
    try {
      await api.post('/settings/smtp/test', {
        to: testTo, host, port: parseInt(port, 10) || 587, secure, user, pass, from,
      });
      setTestMsg({ type: 'ok', text: `Đã gửi email thử tới ${testTo}. Kiểm tra hộp thư (kể cả spam).` });
    } catch (e: any) {
      setTestMsg({ type: 'err', text: e.message || 'Gửi thử thất bại' });
    } finally {
      setTesting(false);
    }
  }

  if (loading) return <Spinner />;

  const configured = status?.configured;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700"><Mail size={20} /></div>
        <div>
          <h1 className="text-xl font-bold">Cài đặt Email (SMTP)</h1>
          <p className="text-sm text-gray-500">Cấu hình máy chủ gửi mail để hệ thống gửi email xác nhận lái thử cho khách.</p>
        </div>
      </div>

      {/* Thẻ trạng thái để dễ nhận diện */}
      <div className={`mb-4 flex items-center gap-3 rounded-xl border p-4 ${configured ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
        {configured
          ? <CheckCircle2 className="text-green-600" size={22} />
          : <AlertCircle className="text-amber-600" size={22} />}
        <div className="text-sm">
          <div className={`font-semibold ${configured ? 'text-green-700' : 'text-amber-700'}`}>
            {configured ? 'SMTP đang hoạt động — email gửi thật' : 'Chưa cấu hình SMTP — email chỉ được ghi log'}
          </div>
          <div className="text-gray-600">
            Nguồn cấu hình: {status?.source === 'db' ? 'Lưu trong hệ thống (UI)' : status?.source === 'env' ? 'Biến môi trường (.env)' : 'Chưa có'}
          </div>
        </div>
      </div>

      <div className="card space-y-1">
        <Field label="SMTP Host (vd: smtp.gmail.com)">
          <input className="input" value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.gmail.com" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Port">
            <input className="input" value={port} onChange={(e) => setPort(e.target.value)} placeholder="587" />
          </Field>
          <Field label="Bảo mật (SSL)">
            <label className="flex h-[42px] items-center gap-2 rounded-lg border px-3 text-sm">
              <input type="checkbox" checked={secure} onChange={(e) => setSecure(e.target.checked)} />
              <span>Dùng SSL (bật cho port 465)</span>
            </label>
          </Field>
        </div>
        <Field label="Tài khoản (User / Email đăng nhập)">
          <input className="input" value={user} onChange={(e) => setUser(e.target.value)} placeholder="you@gmail.com" autoComplete="off" />
        </Field>
        <Field label={status?.hasPassword ? 'Mật khẩu (để trống nếu giữ mật khẩu cũ)' : 'Mật khẩu / App Password'}>
          <input type="password" className="input" value={pass} onChange={(e) => setPass(e.target.value)} placeholder={status?.hasPassword ? '•••••••• (đã lưu)' : 'Nhập mật khẩu ứng dụng'} autoComplete="new-password" />
        </Field>
        <Field label="Tên/Địa chỉ người gửi (From)">
          <input className="input" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="TNT CAR <no-reply@tntcar.vn>" />
        </Field>

        {msg && (
          <div className={`rounded-lg p-2.5 text-sm ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{msg.text}</div>
        )}

        <div className="flex justify-end pt-2">
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Đang lưu...' : 'Lưu cấu hình'}</button>
        </div>
      </div>

      {/* Gửi thử */}
      <div className="card mt-4">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><Send size={16} /> Gửi email thử</h2>
        <p className="mb-3 text-sm text-gray-500">Nhập một email để kiểm tra cấu hình. Dùng thông tin bạn vừa nhập ở trên (không cần lưu trước).</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input className="input flex-1" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="email-nhan-thu@gmail.com" />
          <button onClick={sendTest} disabled={testing || !testTo} className="btn-secondary whitespace-nowrap">{testing ? 'Đang gửi...' : 'Gửi thử'}</button>
        </div>
        {testMsg && (
          <div className={`mt-3 rounded-lg p-2.5 text-sm ${testMsg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{testMsg.text}</div>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        <div className="mb-1 font-semibold">Gợi ý cấu hình Gmail</div>
        <ul className="list-disc space-y-1 pl-5 text-blue-700">
          <li>Host: <b>smtp.gmail.com</b>, Port: <b>587</b>, SSL: tắt (hoặc Port <b>465</b>, SSL: bật)</li>
          <li>User: địa chỉ Gmail của bạn</li>
          <li>Mật khẩu: dùng <b>App Password</b> (Mật khẩu ứng dụng), không dùng mật khẩu đăng nhập thường</li>
        </ul>
      </div>
    </div>
  );
}
