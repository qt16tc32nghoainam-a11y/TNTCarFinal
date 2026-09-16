export function formatVnd(n: number): string {
  if (n == null) return '';
  return n.toLocaleString('vi-VN') + ' đ';
}

export function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    'Đang tìm hiểu': 'bg-blue-100 text-blue-700',
    'Không liên lạc được': 'bg-gray-100 text-gray-600',
    'Tương tác chưa thành công': 'bg-amber-100 text-amber-700',
    'Có nhu cầu ngay': 'bg-emerald-100 text-emerald-700',
    'Không có nhu cầu': 'bg-gray-100 text-gray-500',
    'Thành công': 'bg-green-100 text-green-700',
    'Lead thất bại': 'bg-red-100 text-red-700',
    'Lưu trữ': 'bg-gray-100 text-gray-400',
  };
  return map[status] || 'bg-gray-100 text-gray-600';
}
