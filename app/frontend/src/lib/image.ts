/**
 * Đọc file ảnh, resize về tối đa maxW px và nén JPEG -> trả về data URL (base64).
 * Dùng cho upload ảnh xe: giảm dung lượng trước khi lưu vào DB.
 */
export function fileToCompressedDataUrl(file: File, maxW = 1000, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Vui lòng chọn tệp ảnh'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không đọc được tệp'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Ảnh không hợp lệ'));
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Trình duyệt không hỗ trợ xử lý ảnh'));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
