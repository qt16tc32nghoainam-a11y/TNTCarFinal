import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download } from 'lucide-react';

/**
 * Nút "Cài đặt ứng dụng" (PWA) — tạo shortcut ra desktop / màn hình chính.
 * - Android / Chrome / Edge desktop: bắt sự kiện beforeinstallprompt -> bấm nút bung
 *   hộp thoại cài đặt của trình duyệt, người dùng bấm "Cài đặt" là xong (tự tạo shortcut).
 * - iOS Safari: iOS không có API cài tự động -> hiện hướng dẫn "Thêm vào MH chính".
 * - Chưa sẵn sàng (vd mới mở trang / HTTP): hiện hướng dẫn qua menu trình duyệt.
 */
type HelpKind = null | 'ios' | 'android' | 'desktop' | 'edge' | 'safari-mac' | 'firefox' | 'http';

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
  // Nhận diện trình duyệt để hiện đúng hướng dẫn
  const isEdge = /\bEdg\//i.test(ua);
  const isChrome = /\bChrome\//i.test(ua) && !isEdge && !/OPR\//i.test(ua);
  const isSafari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua);
  const isFirefox = /firefox|fxios/i.test(ua);

  const [waiting, setWaiting] = useState(false);

  /** Bung hộp thoại xác nhận cài đặt của trình duyệt (Chrome/Edge). Trả về true nếu đã bung được. */
  async function tryPrompt(promptEvent: any): Promise<boolean> {
    if (!promptEvent) return false;
    promptEvent.prompt();
    const choice = await promptEvent.userChoice.catch(() => null);
    if (choice?.outcome === 'accepted') setInstalled(true);
    setDeferred(null);
    return true;
  }

  async function handleClick() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    // Đã có sự kiện -> bung hộp thoại xác nhận cài ngay
    if (deferred) { await tryPrompt(deferred); return; }

    // Chrome/Edge nhưng sự kiện chưa "chín": chờ tối đa 3 giây cho beforeinstallprompt đến rồi bung
    if (secure && (isChrome || isEdge || isAndroid)) {
      setWaiting(true);
      const e = await new Promise<any>((resolve) => {
        let done = false;
        const onP = (ev: Event) => { if (done) return; done = true; ev.preventDefault(); resolve(ev); };
        window.addEventListener('beforeinstallprompt', onP, { once: true });
        setTimeout(() => { if (!done) { done = true; window.removeEventListener('beforeinstallprompt', onP); resolve(null); } }, 3000);
      });
      setWaiting(false);
      if (e) { await tryPrompt(e); return; }
      // Vẫn không có -> hướng dẫn tay theo trình duyệt
      if (isAndroid) return setHelp('android');
      if (isEdge) return setHelp('edge');
      return setHelp('desktop');
    }

    // Các trường hợp không dùng được prompt tự động
    if (!secure) return setHelp('http');
    if (isIos) return setHelp('ios');
    if (isFirefox) return setHelp('firefox');
    if (isSafari) return setHelp('safari-mac');
    return setHelp('desktop');
  }

  const label = isIos ? 'Thêm vào màn hình' : 'Cài đặt ứng dụng';

  if (installed && !toast) return null;

  return (
    <>
      {!installed && (
        <button
          onClick={handleClick}
          disabled={waiting}
          className="flex items-center gap-1 rounded-full bg-brand-600 px-2.5 py-1 text-xs text-white hover:bg-brand-700 disabled:opacity-60"
          title="Cài đặt ứng dụng để dùng offline, tạo shortcut ngoài màn hình"
        >
          <Download size={13} /> <span className="hidden sm:inline">{waiting ? 'Đang chuẩn bị...' : label}</span><span className="sm:hidden">{waiting ? '...' : 'Cài'}</span>
        </button>
      )}

      {toast && createPortal(
        <div className="fixed bottom-4 left-1/2 z-[80] -translate-x-1/2 rounded-lg bg-green-600 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>,
        document.body
      )}

      {help && createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" onClick={() => setHelp(null)}>
          <div className="max-h-[85vh] w-full max-w-sm overflow-auto rounded-2xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            {help === 'android' && (
              <>
                <h3 className="mb-2 text-base font-semibold">📱 Cài trên Android (Chrome)</h3>
                <ol className="list-decimal space-y-1.5 pl-5 text-sm text-gray-600">
                  <li>Mở trang bằng <b>Chrome</b>.</li>
                  <li>Bấm menu <b>⋮</b> (góc trên bên phải).</li>
                  <li>Chọn <b>Cài đặt ứng dụng</b> hoặc <b>Thêm vào Màn hình chính</b>.</li>
                  <li>Bấm <b>Cài đặt</b> → biểu tượng TNT CAR hiện ngoài màn hình chính.</li>
                </ol>
                <p className="mt-3 rounded bg-amber-50 p-2 text-xs text-amber-700">Mẹo: nếu vừa mở trang, chờ 3-5 giây rồi bấm lại nút "Cài đặt ứng dụng" — hộp thoại cài thường tự bung.</p>
              </>
            )}
            {help === 'ios' && (
              <>
                <h3 className="mb-2 text-base font-semibold">🍎 Cài trên iPhone/iPad (Safari)</h3>
                <ol className="list-decimal space-y-1.5 pl-5 text-sm text-gray-600">
                  <li>Mở trang bằng <b>Safari</b> (không dùng Chrome trên iPhone).</li>
                  <li>Bấm nút <b>Chia sẻ</b> ⬆️ (ô vuông có mũi tên hướng lên, ở thanh dưới).</li>
                  <li>Kéo xuống chọn <b>Thêm vào MH chính</b> (Add to Home Screen).</li>
                  <li>Bấm <b>Thêm</b> (góc trên phải) → biểu tượng hiện ngoài màn hình.</li>
                </ol>
                <p className="mt-3 rounded bg-amber-50 p-2 text-xs text-amber-700">iOS chỉ cài được qua Safari. Chrome/Firefox trên iPhone không có tính năng này.</p>
              </>
            )}
            {help === 'desktop' && (
              <>
                <h3 className="mb-2 text-base font-semibold">💻 Cài trên máy tính (Chrome)</h3>
                <ol className="list-decimal space-y-1.5 pl-5 text-sm text-gray-600">
                  <li>Nhìn <b>cuối thanh địa chỉ</b>, bấm biểu tượng cài đặt <b>⊕</b> (màn hình có mũi tên xuống).</li>
                  <li>Hoặc mở menu <b>⋮</b> (góc trên phải) → <b>Truyền, lưu và chia sẻ</b> → <b>Cài ứng dụng...</b></li>
                  <li>Bấm <b>Cài đặt</b> trong hộp thoại → shortcut TNT CAR tạo ra desktop + menu Start.</li>
                </ol>
                <p className="mt-3 rounded bg-amber-50 p-2 text-xs text-amber-700">Không thấy biểu tượng ⊕? Chờ vài giây rồi bấm lại nút này. Nếu vẫn không có, app có thể đã được cài rồi.</p>
              </>
            )}
            {help === 'edge' && (
              <>
                <h3 className="mb-2 text-base font-semibold">💻 Cài trên máy tính (Microsoft Edge)</h3>
                <ol className="list-decimal space-y-1.5 pl-5 text-sm text-gray-600">
                  <li>Bấm menu <b>⋯</b> (góc trên bên phải).</li>
                  <li>Chọn <b>Ứng dụng</b> (Apps) → <b>Cài đặt trang này dưới dạng ứng dụng</b>.</li>
                  <li>Hoặc bấm biểu tượng cài đặt ở <b>cuối thanh địa chỉ</b>.</li>
                  <li>Bấm <b>Cài đặt</b> → shortcut tạo ra desktop + taskbar.</li>
                </ol>
              </>
            )}
            {help === 'safari-mac' && (
              <>
                <h3 className="mb-2 text-base font-semibold">🍎 Cài trên máy Mac (Safari)</h3>
                <ol className="list-decimal space-y-1.5 pl-5 text-sm text-gray-600">
                  <li>Cần <b>Safari 17+ (macOS Sonoma trở lên)</b>.</li>
                  <li>Trên thanh menu bấm <b>File</b> → <b>Add to Dock…</b> (Thêm vào Dock).</li>
                  <li>Hoặc bấm nút <b>Chia sẻ</b> ⬆️ trên thanh công cụ → <b>Add to Dock</b>.</li>
                  <li>Bấm <b>Add</b> → app TNT CAR xuất hiện ở Dock.</li>
                </ol>
                <p className="mt-3 rounded bg-amber-50 p-2 text-xs text-amber-700">Safari cũ hơn không hỗ trợ cài. Muốn chắc chắn, dùng <b>Chrome</b> hoặc <b>Edge</b> trên máy Mac.</p>
              </>
            )}
            {help === 'firefox' && (
              <>
                <h3 className="mb-2 text-base font-semibold">🦊 Firefox chưa hỗ trợ cài PWA</h3>
                <p className="text-sm text-gray-600">Firefox trên máy tính không có tính năng cài ứng dụng web.</p>
                <p className="mt-2 text-sm text-gray-600">Để cài TNT CAR, hãy mở trang bằng <b>Chrome</b> hoặc <b>Microsoft Edge</b> rồi bấm lại nút này.</p>
                <p className="mt-2 text-sm text-gray-600">Trên điện thoại Android, Firefox có thể "Thêm vào màn hình chính" qua menu ⋮.</p>
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
        </div>,
        document.body
      )}
    </>
  );
}
