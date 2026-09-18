import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicApi } from '../../lib/api';
import { formatVnd } from '../../lib/format';
import CarCard from './CarCard';
import QuickLeadForm from './QuickLeadForm';

export default function PublicHome() {
  const [contents, setContents] = useState<any[]>([]);
  const [cars, setCars] = useState<any[]>([]);
  useEffect(() => {
    publicApi.get<any[]>('/public/contents').then(setContents).catch(() => {});
    publicApi.get<any[]>('/public/cars').then(setCars).catch(() => {});
  }, []);
  const banner = contents.find((c) => c.content_type === 'banner');
  const brand = contents.find((c) => c.content_type === 'brand');
  const promos = contents.filter((c) => c.content_type === 'promo');
  const minPrice = cars.length ? Math.min(...cars.map((c) => c.price)) : 0;

  // Ưu đãi: lấy từ nội dung Admin nhập; nếu chưa có thì dùng mặc định
  const defaultPromos = [
    { image_url: '🚗', title: 'Lái thử miễn phí', body: 'Tận nơi theo yêu cầu' },
    { image_url: '💰', title: 'Hỗ trợ trả góp', body: 'Vay đến 80% giá trị xe' },
    { image_url: '🛠️', title: 'Bảo hành chính hãng', body: 'Cứu hộ 24/7' },
    { image_url: '🔄', title: 'Thu cũ đổi mới', body: 'Định giá xe cũ giá cao' },
  ];
  const promoItems = promos.length ? promos : defaultPromos;

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-800 to-brand-600 text-white">
        {banner?.image_url && (
          <img src={banner.image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        )}
        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 md:grid-cols-2">
          <div>
            <p className="text-sm uppercase tracking-widest text-brand-200">{banner?.title || 'TNT CAR'}</p>
            <h1 className="mt-2 text-4xl font-extrabold leading-tight md:text-5xl">
              {banner?.body || 'Chọn xe trong mơ, nhận ưu đãi hôm nay'}
            </h1>
            {minPrice > 0 && (
              <p className="mt-4 text-lg text-brand-100">Giá chỉ từ <span className="text-2xl font-bold text-white">{formatVnd(minPrice)}</span></p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/site/cars" className="rounded-lg bg-white px-6 py-3 font-semibold text-brand-800 hover:bg-gray-100">Xem danh mục xe</Link>
              <Link to="/site/request" className="rounded-lg border border-white/60 px-6 py-3 font-semibold text-white hover:bg-white/10">Đăng ký lái thử</Link>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="rounded-2xl bg-white/10 p-6 backdrop-blur">
              <QuickLeadForm cars={cars} compact />
            </div>
          </div>
        </div>
      </section>

      {/* Dải ưu đãi (nội dung từ Admin) */}
      <section className="border-b bg-gray-50">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 text-center sm:grid-cols-2 lg:grid-cols-4">
          {promoItems.map((p: any, i: number) => {
            // image_url có thể là emoji (mặc định) hoặc URL ảnh (Admin nhập)
            const isUrl = typeof p.image_url === 'string' && /^https?:\/\//.test(p.image_url);
            return (
              <div key={i}>
                {isUrl ? (
                  <img src={p.image_url} alt="" className="mx-auto h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="text-2xl">{p.image_url || '⭐'}</div>
                )}
                <div className="mt-1 font-semibold text-gray-800">{p.title}</div>
                <div className="text-xs text-gray-500">{p.body}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Xe nổi bật */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold">Xe nổi bật</h2>
            <p className="text-sm text-gray-500">Những mẫu xe được quan tâm nhất tại TNT CAR</p>
          </div>
          <Link to="/site/cars" className="text-sm font-medium text-brand-700 hover:underline">Xem tất cả →</Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cars.slice(0, 6).map((c) => <CarCard key={c.id} car={c} />)}
        </div>
      </section>

      {/* Giới thiệu thương hiệu */}
      {brand && (
        <section className="bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 py-12">
            <h3 className="text-xl font-bold">{brand.title}</h3>
            <p className="mt-2 max-w-3xl text-gray-600">{brand.body}</p>
          </div>
        </section>
      )}

      {/* Form đăng ký cuối trang */}
      <section className="bg-brand-800">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 md:grid-cols-2">
          <div className="text-white">
            <h3 className="text-2xl font-bold">Nhận báo giá & lịch lái thử</h3>
            <p className="mt-2 text-brand-100">Để lại thông tin, tư vấn viên TNT CAR sẽ liên hệ lại trong thời gian sớm nhất. Hoàn toàn miễn phí.</p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <QuickLeadForm cars={cars} />
          </div>
        </div>
      </section>
    </div>
  );
}
