import React, { useState } from 'react';

/**
 * Thư viện ảnh xe: ảnh lớn + dải thumbnail + xem phóng to (lightbox).
 * Dùng chung cho trang chi tiết nội bộ và trang công khai.
 */
export default function CarGallery({ images, alt }: { images: { id?: string; url: string; caption?: string }[]; alt?: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);

  if (!images || images.length === 0) {
    return <div className="flex aspect-[16/10] items-center justify-center rounded-xl bg-gray-100 text-6xl text-gray-300">🚗</div>;
  }
  const cur = images[Math.min(active, images.length - 1)];

  return (
    <div>
      {/* Ảnh lớn */}
      <div className="relative overflow-hidden rounded-xl bg-gray-100">
        <img
          src={cur.url}
          alt={cur.caption || alt || ''}
          className="aspect-[16/10] w-full cursor-zoom-in object-cover"
          onClick={() => setZoom(true)}
          loading="lazy"
        />
        {cur.caption && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-3 py-1.5 text-sm text-white">{cur.caption}</div>
        )}
        <div className="absolute right-2 top-2 rounded bg-black/50 px-2 py-0.5 text-xs text-white">{active + 1}/{images.length}</div>
      </div>

      {/* Thumbnail */}
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {images.map((img, i) => (
          <button
            key={img.id || i}
            onClick={() => setActive(i)}
            className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${i === active ? 'border-brand-600' : 'border-transparent'}`}
          >
            <img src={img.url} alt={img.caption || ''} className="h-full w-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>

      {/* Lightbox phóng to */}
      {zoom && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" onClick={() => setZoom(false)}>
          <img src={cur.url} alt={cur.caption || ''} className="max-h-[90vh] max-w-full rounded-lg object-contain" />
          <button className="absolute right-4 top-4 text-3xl text-white" onClick={() => setZoom(false)}>✕</button>
        </div>
      )}
    </div>
  );
}
