import React, { useEffect, useState } from 'react';

/**
 * Nút "Cài đặt ứng dụng" (PWA) — tạo shortcut ra desktop / màn hình chính.
 * - Android / Chrome / Edge desktop: bắt sự kiện beforeinstallprompt -> bấm nút bung
 *   hộp thoại cài đặt của trình duyệt, người dùng bấm "Cài đặt" là xong (tự tạo shortcut).
 * - iOS Safari: iOS không có API cài tự động -> hiện hướng dẫn "Thêm vào MH chính".
 * - Chưa sẵn sàng (vd mới mở trang / HTTP): hiện hướng dẫn qua menu trình duyệt.
 */
type HelpKind = null | 'ios' | 'android' | 'desktop' | 'http';

export default function InstallButton() {
  const [deferred, setDeferred] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState<HelpKind>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    if (standalone) setInstalled(true);

    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e); };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setToast('Đã cài ứng dụng. Mở biểu tượng TNT CAR ngoài màn hình để dùng.');
      setTimeout(() => setToast(''), 5000);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const secure = window.isSecureContext;

  async function handleClick() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    if (deferred) {
      // Android + Chrome/Edge desktop: bung hộp thoại cài -> bấm "Cài đặt" là tự tạo shortcut.
      deferred.prompt();
      const choice = await deferred.userChoice.catch(() => null);
      if (choice?.outcome === 'accepted') setInstalled(true);
      setDeferred(null);
      return;
    }
    if (!secure) return setHelp('http');
    if (isIos) return setHelp('ios');
    if (isAndroid) return setHelp('android');
    return setHelp('desktop');
  }

  const label = isIos ? '⬇ Thêm vào màn hình' : '⬇ Cài đặt ứng dụng';

  if (installed && !toast) return null;

  return (
    <>
      {!installed && (
        <button
          onClick={handleClick}
          className="badge bg-brand-600 text-white hover:bg-brand-700"
          title="Cài đặt ứng dụng để dùng offline, tạo shortcut ngoài màn hình"
        >
          {label}
        </button>
      )}

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-green-600 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      {help && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setHelp(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            {help === 'android' && (
              <>
                <h3 className="mb-2 text-base font-semibold">Cài đặt trên Android</h3>
                <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-600">
                  <li>Mở trang này bằng trình duyệt <b>Chrome</b>.</li>
                  <li>Bấm menu <b>⋮</b> ở góc trên bên phải.</li>
                  <li>Chọn <b>Cài đặt ứng dụng</b> (hoặc <b>Thêm vào Màn hình chính</b>).</li>
                  <li>Bấm <b>Cài đặt</b> — biểu tượng TNT CAR xuất hiện ngoài màn hình chính.</li>
                </ol>
                <p className="mt-3 text-xs text-gray-400">Mẹo: nếu vừa mở trang, chờ vài giây rồi bấm lại nút "Cài đặt ứng dụng" — hộp thoại cài thường tự bung.</p>
              </>
            )}
            {help === 'ios' && (
              <>
                <h3 className="mb-2 text-base font-semibold">Cài đặt trên iPhone/iPad</h3>
                <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-600">
                  <li>Mở trang này bằng trình duyệt <b>Safari</b>.</li>
                  <li>Bấm nút <b>Chia sẻ</b> (ô vuông có mũi tên lên).</li>
                  <li>Chọn <b>Thêm vào MH chính</b> (Add to Home Screen).</li>
                  <li>Bấm <b>Thêm</b> — biểu tượng ứng dụng xuất hiện ngoài màn hình.</li>
                </ol>
              </>
            )}
            {help === 'desktop' && (
              <>
                <h3 className="mb-2 text-base font-semibold">Cài đặt trên máy tính</h3>
                <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-600">
                  <li>Dùng trình duyệt <b>Chrome</b> hoặc <b>Edge</b>.</li>
                  <li>Bấm biểu tượng cài đặt <b>⊕</b> ở cuối thanh địa chỉ.</li>
                  <li>Hoặc mở menu <b>⋮</b> &gt; <b>Cài đặt ứng dụng</b>.</li>
                  <li>Bấm <b>Cài đặt</b> — shortcut tạo ra desktop.</li>
                </ol>
                <p className="mt-3 text-xs text-gray-400">Nếu vừa mở trang, chờ vài giây rồi bấm lại nút — hộp thoại cài sẽ tự hiện.</p>
              </>
            )}
            {help === 'http' && (
              <>
                <h3 className="mb-2 text-base font-semibold">Cần HTTPS để cài</h3>
                <p className="text-sm text-gray-600">
                  Trang đang chạy qua HTTP (không bảo mật) nên trình duyệt chặn cài ứng dụng và tính năng offline.
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  Hãy mở lại bằng <b>https://tntcar.duckdns.org</b> sau khi đã bật HTTPS, rồi bấm nút này lần nữa.
                </p>
              </>
            )}
            <button onClick={() => setHelp(null)} className="btn-primary mt-4 w-full">Đã hiểu</button>
          </div>
        </div>
      )}
    </>
  );
}
