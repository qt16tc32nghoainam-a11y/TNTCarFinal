export type Role = 'Admin' | 'Manager' | 'Sales';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  showroom_id: string | null;
  manager_id: string | null;
  onboarded?: boolean;
}

export interface Lead {
  id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  car_model_id: string | null;
  car_name?: string;
  car_brand?: string;
  source: string;
  request_type?: string | null;
  status_detail: string;
  lost_reason_id?: string | null;
  lost_reason_note?: string | null;
  flag_duplicate_phone: number;
  is_archived: number;
  assigned_sales_id: string | null;
  sales_name?: string;
  sync_status: string;
  created_at: string;
  updated_at: string;
  interactions?: Interaction[];
  reminders?: Reminder[];
  history?: StatusHistory[];
}

export interface Interaction {
  id: string;
  lead_id: string;
  type: string;
  note: string | null;
  status_before?: string | null;
  status_after?: string | null;
  created_at: string;
  sync_status?: string;
}

export interface Reminder {
  id: string;
  lead_id: string;
  remind_at: string;
  purpose: string;
  location: string | null;
  notify_before_minutes: number;
  lead_name?: string;
  lead_phone?: string;
}

export interface StatusHistory {
  id: string;
  status_before: string;
  status_after: string;
  reason: string | null;
  changed_at: string;
}

export interface Car {
  id: string;
  name: string;
  brand: string;
  price: number;
  fuel_type: string;
  segment: string;
  year: number;
  transmission: string;
  color: string;
  promotion: string;
  status: string;
  inventory?: { showroom_id: string; showroom_name: string; address: string; quantity: number }[];
}

export const PROCESSING_STATUSES = [
  'Đang tìm hiểu', 'Không liên lạc được', 'Tương tác chưa thành công', 'Có nhu cầu ngay', 'Không có nhu cầu',
];
export const ACTIVITY_TYPES = ['Gọi điện', 'Nhắn tin/Zalo', 'Gặp trực tiếp', 'Lịch hẹn', 'Khác'];
