import React from 'react';
import { Link } from 'react-router-dom';
import { formatVnd } from '../../lib/format';

/** Thẻ xe dùng chung cho trang chủ và danh mục. */
export default function CarCard({ car, onCompare, comparing }: { car: any; onCompare?: (c: any) => void; comparing?: boolean }) {
  return (
    <div className="group overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md">
      <Link to={`/site/cars/${car.id}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
          {car.image_url ? (
            <img src={car.image_url} alt={`${car.brand} ${car.name}`} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-5xl text-gray-300">🚗</div>
          )}
          {car.status === 'In-transit' && <span className="absolute left-2 top-2 rounded bg-amber-500 px-2 py-0.5 text-xs text-white">Sắp về</span>}
          {car.promotion && <span className="absolute right-2 top-2 rounded bg-red-600 px-2 py-0.5 text-xs text-white">Ưu đãi</span>}
        </div>
      </Link>
      <div className="p-4">
        <Link to={`/site/cars/${car.id}`}>
          <div className="font-semibold text-gray-900">{car.brand} {car.name}</div>
        </Link>
        <div className="text-xs text-gray-500">{[car.segment, car.fuel_type, car.transmission].filter(Boolean).join(' · ')}</div>
        <div className="mt-2 text-lg font-bold text-brand-700">{formatVnd(car.price)}</div>
        {car.promotion && <div className="text-xs text-red-600">{car.promotion}</div>}
        <div className="mt-3 flex gap-2">
          <Link to={`/site/cars/${car.id}`} className="flex-1 rounded-lg bg-brand-600 px-3 py-1.5 text-center text-xs font-medium text-white hover:bg-brand-700">Xem chi tiết</Link>
          {onCompare && (
            <button onClick={() => onCompare(car)} className={`rounded-lg px-3 py-1.5 text-xs ${comparing ? 'bg-brand-700 text-white' : 'bg-gray-100 text-gray-700'}`}>So sánh</button>
          )}
        </div>
      </div>
    </div>
  );
}
