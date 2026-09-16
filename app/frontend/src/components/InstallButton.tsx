import React, { useEffect, useState } from 'react';

/**
 * Nút "Cài đặt ứng dụng" (PWA). Khi trình duyệt hỗ trợ cài đặt, bắt sự kiện
 * beforeinstallprompt để hiện hộp thoại cài đặt -> tạo shortcut ra desktop / màn hình chính.
 * - Chrome/Edge (Android + desktop): dùng prompt tự động.
 * - iOS Safari: không có API, hiện hướng dẫn "Thêm vào MH chính".
 */
export default function InstallButton() {
  const [deferred, setDeferred] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    // Đã cài (chạy ở chế độ standalone) thì ẩn nút
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    if (standalone) setInstalled(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e); // lưu lại để bấm nút mới bung
    };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  // PWA chỉ cài được trên HTTPS hoặc localhost. isSecureContext = true khi đủ điều kiện.
  const secure = window.isSecureContext;

  async function handleClick() {
    // Xin quyền thông báo tiện thể (cho chuông nhắc việc)
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    if (deferred) {
      deferred.prompt();
      const choice = await deferred.userChoice.catch(() => null);
      if (choice?.outcome === 'accepted') setInstalled(true);
      setDeferred(null);
    } else if (!secure) {
      // Đang chạy HTTP trần -> trình duyệt chặn cài PWA
      alert(
        'Không cài được ứng dụng vì trang đang chạy qua HTTP (không bảo mật).\n\n' +
        'PWA chỉ cài được khi truy cập qua HTTPS hoặc http://localhost.\n' +
        'Cách khắc phục: cấu hình HTTPS cho server (ví dụ tên miền + Let\'s Encrypt), rồi mở lại bằng https://'
      );
    } else if (isIos) {
      setShowIosHelp(true);
    } else {
      alert('Trình duyệt chưa sẵn sàng cài đặt. Hãy dùng Chrome/Edge, tải lại trang, hoặc mở menu trình duyệt (⋮) > "Cài đặt ứng dụng".');
    }
  }

  if (installed) return null;

  return (
    <>
      <button
        onClick={handleClick}
        className="badge bg-brand-600 text-white hover:bg-brand-700"
        title="Cài đặt ứng dụng để dùng offline, tạo shortcut ngoài màn hình"
      >
        ⬇ Cài đặt ứng dụng
      </button>

      {showIosHelp && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setShowIosHelp(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 text-base font-semibold">Cài đặt trên iPhone/iPad</h3>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-600">
              <li>Mở trang này bằng trình duyệt <b>Safari</b>.</li>
              <li>Bấm nút <b>Chia sẻ</b> (biểu tượng ô vuông có mũi tên lên).</li>
              <li>Chọn <b>Thêm vào MH chính</b> (Add to Home Screen).</li>
              <li>Bấm <b>Thêm</b> — biểu tượng ứng dụng sẽ xuất hiện ngoài màn hình.</li>
            </ol>
            <button onClick={() => setShowIosHelp(false)} className="btn-primary mt-4 w-full">Đã hiểu</button>
          </div>
        </div>
      )}
    </>
  );
}
