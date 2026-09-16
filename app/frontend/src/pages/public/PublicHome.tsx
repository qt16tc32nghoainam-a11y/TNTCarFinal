import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicApi } from '../../lib/api';
import { formatVnd } from '../../lib/format';

export default function PublicHome() {
  const [contents, setContents] = useState<any[]>([]);
  const [cars, setCars] = useState<any[]>([]);
  useEffect(() => {
    publicApi.get<any[]>('/public/contents').then(setContents).catch(() => {});
    publicApi.get<any[]>('/public/cars').then((c) => setCars(c.slice(0, 6))).catch(() => {});
  }, []);
  const banner = contents.find((c) => c.content_type === 'banner');
  const brand = contents.find((c) => c.content_type === 'brand');

  return (
    <div>
      {banner && (
        <div className="mb-8 rounded-2xl bg-brand-800 p-10 text-center text-white">
          <h1 className="text-3xl font-bold">{banner.title}</h1>
          <p className="mt-2 text-white/80">{banner.body}</p>
          <Link to="/site/cars" className="mt-4 inline-block rounded-lg bg-white px-6 py-2 font-medium text-brand-800">Xem xe ngay</Link>
        </div>
      )}

      <h2 className="mb-4 text-xl font-bold">Xe nổi bật</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cars.map((c) => (
          <Link to={`/site/cars/${c.id}`} key={c.id} className="card hover:shadow-md">
            <div className="font-semibold">{c.brand} {c.name}</div>
            <div className="text-sm text-gray-500">{c.segment}</div>
            <div className="mt-2 text-lg font-bold text-brand-700">{formatVnd(c.price)}</div>
            {c.promotion && <div className="text-xs text-red-600">{c.promotion}</div>}
          </Link>
        ))}
      </div>

      {brand && (
        <div className="mt-10 rounded-xl bg-gray-50 p-6">
          <h3 className="font-bold">{brand.title}</h3>
          <p className="mt-1 text-sm text-gray-600">{brand.body}</p>
        </div>
      )}
    </div>
  );
}
