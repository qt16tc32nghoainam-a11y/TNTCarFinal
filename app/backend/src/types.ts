export type Role = 'Admin' | 'Manager' | 'Sales';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  full_name: string;
  showroom_id: string | null;
  manager_id: string | null;
}

// Mở rộng Request của Express để chứa user đã xác thực
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const LEAD_PROCESSING_STATUSES = [
  'Đang tìm hiểu',
  'Không liên lạc được',
  'Tương tác chưa thành công',
  'Có nhu cầu ngay',
  'Không có nhu cầu',
];

export const LEAD_RESULT_STATUSES = ['Thành công', 'Lead thất bại'];

export const LEAD_SOURCES = [
  'Sale tự nhập', 'Facebook Ads', 'Website', 'CSKH nhập', 'TikTok Ads',
  'Zalo', 'Google Ads', 'Hotline', 'Giới thiệu', 'Showroom/Sự kiện',
  'Import hệ thống cũ', 'Khác',
];
