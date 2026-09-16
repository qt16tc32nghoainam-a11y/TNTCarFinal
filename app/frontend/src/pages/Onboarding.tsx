import React, { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

/** FR-10: Onboarding PWA + cấp quyền thông báo trước khi dùng đầy đủ tính năng nhắc việc. */
export default function Onboarding() {
  const { refresh } = useAuth();
  const [permission, setPermission] = useState(Notification.permission);
  const [msg, setMsg] = useState('');

  async function askNotification() {
    try {
      const p = await Notification.requestPermission();
      setPermission(p);
      if (p !== 'granted') setMsg('Bạn sẽ không nhận được thông báo nhắc việc nếu không cấp quyền.');
    } catch {
      setMsg('Trình duyệt không hỗ trợ thông báo.');
    }
  }

  async function finish() {
    await api.post('/auth/onboard');
    await refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow">
        <h1 className="mb-2 text-xl font-bold text-brand-800">Thiết lập ứng dụng</h1>
        <p className="mb-6 text-sm text-gray-600">
          Để sử dụng đầy đủ tính năng nhắc việc, vui lòng cài đặt ứng dụng vào màn hình chính và cấp quyền thông báo.
        </p>

        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="mb-1 font-medium">1. Thêm vào màn hình chính</div>
            <p className="text-sm text-gray-500">
              Trên điện thoại: mở menu trình duyệt và chọn "Thêm vào màn hình chính" / "Add to Home Screen".
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="mb-1 font-medium">2. Cấp quyền thông báo</div>
            <p className="mb-3 text-sm text-gray-500">Trạng thái hiện tại: <b>{permission}</b></p>
            <button onClick={askNotification} className="btn-secondary">Cấp quyền thông báo</button>
          </div>

          {msg && <div className="rounded bg-amber-50 p-2 text-sm text-amber-700">{msg}</div>}

          <button onClick={finish} className="btn-primary w-full">Hoàn tất và vào ứng dụng</button>
        </div>
      </div>
    </div>
  );
}
