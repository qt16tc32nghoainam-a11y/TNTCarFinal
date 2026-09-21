import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('admin@tntcar.vn');
  const [password, setPassword] = useState('123456');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await login(email, password);
      nav('/');
    } catch (e: any) {
      setErr(e.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  }

  const quick = (em: string) => { setEmail(em); setPassword('123456'); };

  // Đăng nhập nhanh: bấm là vào thẳng hệ thống (dùng mật khẩu mặc định 123456).
  async function quickLogin(em: string) {
    setErr('');
    setEmail(em);
    setPassword('123456');
    setLoading(true);
    try {
      await login(em, '123456');
      nav('/');
    } catch (e: any) {
      setErr(e.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-800 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold text-brand-800">TNT CAR</div>
          <div className="text-sm text-gray-500">Hệ thống quản lý bán xe</div>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">Email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Mật khẩu</label>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {err && <div className="rounded bg-red-50 p-2 text-sm text-red-600">{err}</div>}
          <button className="btn-primary w-full" disabled={loading}>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
        </form>

        {/* Đăng nhập nhanh cho 2 Sales website */}
        <div className="mt-5">
          <div className="mb-2 text-center text-xs font-medium text-gray-500">Đăng nhập nhanh</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => quickLogin('annt@tntcar.vn')}
              disabled={loading}
              className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-50"
            >
              Nguyễn Thiện An
              <span className="block text-[11px] font-normal text-gray-500">annt</span>
            </button>
            <button
              type="button"
              onClick={() => quickLogin('thanhvd@tntcar.vn')}
              disabled={loading}
              className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-50"
            >
              Võ Đại Thành
              <span className="block text-[11px] font-normal text-gray-500">thanhvd</span>
            </button>
          </div>
        </div>

        <div className="mt-5 border-t pt-4 text-xs text-gray-500">
          <div className="mb-1 font-medium">Tài khoản demo (mật khẩu: 123456):</div>
          <div className="space-y-1">
            <button onClick={() => quick('admin@tntcar.vn')} className="block text-brand-700 hover:underline">admin@tntcar.vn (Admin)</button>
            <button onClick={() => quick('manager.hcm@tntcar.vn')} className="block text-brand-700 hover:underline">manager.hcm@tntcar.vn (Manager)</button>
            <button onClick={() => quick('son.sales@tntcar.vn')} className="block text-brand-700 hover:underline">son.sales@tntcar.vn (Sales)</button>
          </div>
        </div>
      </div>
    </div>
  );
}
