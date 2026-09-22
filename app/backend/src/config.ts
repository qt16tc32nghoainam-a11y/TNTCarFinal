import path from 'path';

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  jwtSecret: process.env.JWT_SECRET || 'tntcar-dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  dbPath: process.env.DB_PATH || path.join(__dirname, '../data/tntcar.db'),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true cho cổng 465
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'TNT CAR <no-reply@tntcar.vn>',
  },
  // Web Push (VAPID). Nên đặt VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY trong .env trên production.
  // Cặp mặc định dưới đây chỉ để dev/demo chạy được ngay; production nên thay bằng cặp riêng.
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || 'BPKGZxx0AUTZ3YcWETFC-fNKlMxJCpQvNeGxR3Nr-o3_WTr31cjOWi1EGbiqWBiAYdrIdZwT9yxTqzq-x9lK97g',
    privateKey: process.env.VAPID_PRIVATE_KEY || 'PxK5v5G7A2EdHBP657qhBG5JpPW_OkB9ZOtWgzMPM3U',
    subject: process.env.VAPID_SUBJECT || 'mailto:no-reply@tntcar.vn',
  },
};
