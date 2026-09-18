import React from 'react';
import {
  Car, Wallet, Wrench, ArrowLeftRight, ShieldCheck, Gift, Clock, Star,
  Truck, BadgePercent, Headphones, MapPin, type LucideIcon,
} from 'lucide-react';

/**
 * Danh sách icon cho mục "Ưu đãi" trên website.
 * Lưu trong DB dưới dạng "icon:<key>" (vd "icon:car"). Vẫn tương thích emoji/URL cũ.
 */
export const PROMO_ICONS: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: 'car', label: 'Xe', Icon: Car },
  { key: 'wallet', label: 'Trả góp / Tiền', Icon: Wallet },
  { key: 'wrench', label: 'Bảo hành / Sửa chữa', Icon: Wrench },
  { key: 'exchange', label: 'Thu cũ đổi mới', Icon: ArrowLeftRight },
  { key: 'shield', label: 'Bảo vệ / An tâm', Icon: ShieldCheck },
  { key: 'gift', label: 'Quà tặng / Ưu đãi', Icon: Gift },
  { key: 'clock', label: 'Nhanh chóng / 24-7', Icon: Clock },
  { key: 'star', label: 'Nổi bật', Icon: Star },
  { key: 'truck', label: 'Giao tận nơi', Icon: Truck },
  { key: 'percent', label: 'Giảm giá', Icon: BadgePercent },
  { key: 'support', label: 'Hỗ trợ / CSKH', Icon: Headphones },
  { key: 'location', label: 'Showroom', Icon: MapPin },
];

const MAP: Record<string, LucideIcon> = Object.fromEntries(PROMO_ICONS.map((i) => [i.key, i.Icon]));

/** Lấy component icon theo key (sau tiền tố "icon:"). */
export function getPromoIcon(key: string): LucideIcon | null {
  return MAP[key] || null;
}

/**
 * Render biểu tượng ưu đãi từ giá trị image_url lưu trong DB:
 * - "icon:car"        -> icon lucide
 * - "https://..."     -> ảnh
 * - "🚗" (emoji/khác) -> hiển thị nguyên văn
 */
export function PromoVisual({ value, size = 26, className = '' }: { value?: string; size?: number; className?: string }) {
  if (value && value.startsWith('icon:')) {
    const Icon = getPromoIcon(value.slice(5));
    if (Icon) return <Icon size={size} className={className} />;
  }
  if (value && /^https?:\/\//.test(value)) {
    return <img src={value} alt="" className={`rounded object-cover ${className}`} style={{ width: size + 20, height: size + 20 }} />;
  }
  return <span style={{ fontSize: size }}>{value || '⭐'}</span>;
}
