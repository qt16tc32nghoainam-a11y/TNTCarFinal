import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicApi, api } from '../../lib/api';
import { formatVnd } from '../../lib/format';
import CarCard from './CarCard';
import QuickLeadForm from './QuickLeadForm';
import { EditButton } from './InlineEdit';
import { useIsContentAdmin } from './InlineEdit';

export default function PublicHome() {
  const [contents, setContents] = useState<any[]>([]);
  const [cars, setCars] = useState<any[]>([]);
  const isAdmin = useIsContentAdmin();

  function loadContents() {
    // Admin xem cả nội dung đang ẩn (qua /content); khách chỉ xem nội dung active (/public/contents)
    const url = isAdmin ? '/content' : '/public/contents';
    const call = isAdmin ? api.get<any[]>(url) : publicApi.get<any[]>(url);
    call.then(setContents).catch(() => publicApi.get<any[]>('/public/contents').then(setContents).catch(() => {}));
  }

  useEffect(() => {
    loadContents();
    publicApi.get<any[]>('/public/cars').then(setCars).catch(() => {});
  }, [isAdmin]);
  const banner = contents.find((c) => c.content_type === 'banner');
  const brand = contents.find((c) => c.content_type === 'brand');
  // Hiển thị đúng như khách thấy: chỉ mục đang bật (active !== 0)
  const promos = contents.filter((c) => c.content_type === 'promo' && c.active !== 0);
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
            <div className="mb-1 flex items-center gap-2">
              <p className="text-sm uppercase tracking-widest text-brand-200">{banner?.title || 'TNT CAR'}</p>
              <EditButton item={banner} contentType="banner" onSaved={loadContents} label="Sửa banner"
                fields={[
                  { key: 'title', label: 'Tiêu đề nhỏ (phía trên)' },
                  { key: 'body', label: 'Tiêu đề lớn', multiline: true },
                  { key: 'image_url', label: 'Ảnh nền (URL)', isImage: true },
                ]} />
            </div>
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
        {isAdmin && (
          <div className="mx-auto flex max-w-6xl items-center justify-end px-4 pt-3">
            <EditButton contentType="promo" onSaved={loadContents} label="Thêm ưu đãi"
              fields={[
                { key: 'title', label: 'Tiêu đề ưu đãi' },
                { key: 'body', label: 'Mô tả ngắn' },
                { key: 'image_url', label: 'Biểu tượng (emoji) hoặc ảnh URL' },
              ]} />
          </div>
        )}
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 text-center sm:grid-cols-2 lg:grid-cols-4">
          {promoItems.map((p: any, i: number) => {
            const isUrl = typeof p.image_url === 'string' && /^https?:\/\//.test(p.image_url);
            return (
              <div key={p.id || i} className="relative">
                {isUrl ? (
                  <img src={p.image_url} alt="" className="mx-auto h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="text-2xl">{p.image_url || '⭐'}</div>
                )}
                <div className="mt-1 font-semibold text-gray-800">{p.title}</div>
                <div className="text-xs text-gray-500">{p.body}</div>
                {isAdmin && p.id && (
                  <div className="mt-1">
                    <EditButton item={p} contentType="promo" onSaved={loadContents}
                      fields={[
                        { key: 'title', label: 'Tiêu đề ưu đãi' },
                        { key: 'body', label: 'Mô tả ngắn' },
                        { key: 'image_url', label: 'Biểu tượng (emoji) hoặc ảnh URL' },
                      ]} />
                  </div>
                )}
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
      {(brand || isAdmin) && (
        <section className="bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 py-12">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold">{brand?.title || 'Về TNT CAR'}</h3>
              <EditButton item={brand} contentType="brand" onSaved={loadContents} label="Sửa giới thiệu"
                fields={[
                  { key: 'title', label: 'Tiêu đề' },
                  { key: 'body', label: 'Nội dung giới thiệu', multiline: true },
                ]} />
            </div>
            <p className="mt-2 max-w-3xl text-gray-600">{brand?.body}</p>
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
