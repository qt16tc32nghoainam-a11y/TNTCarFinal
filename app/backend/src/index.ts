import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { initDb } from './db/database';

import authRoutes from './routes/auth';
import leadRoutes from './routes/leads';
import careRoutes from './routes/care';
import carRoutes from './routes/cars';
import contractRoutes from './routes/contracts';
import dashboardRoutes from './routes/dashboard';
import userRoutes from './routes/users';
import syncRoutes from './routes/sync';
import publicRoutes from './routes/public';
import contentRoutes from './routes/content';
import metaRoutes from './routes/meta';
import notificationRoutes from './routes/notifications';
import { startScheduler } from './scheduler';

async function main() {
  await initDb();
  startScheduler();

  const app = express();
  app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',') }));
  app.use(express.json({ limit: '15mb' })); // đủ chỗ cho ảnh xe upload dạng base64 (đã nén phía client)

  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'TNT CAR API', time: new Date().toISOString() }));

  app.use('/api/auth', authRoutes);
  app.use('/api/leads', leadRoutes);
  app.use('/api/care', careRoutes);
  app.use('/api/cars', carRoutes);
  app.use('/api/contracts', contractRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/sync', syncRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/content', contentRoutes);
  app.use('/api/meta', metaRoutes);
  app.use('/api/notifications', notificationRoutes);

  // Phục vụ frontend đã build (production). Đường dẫn tới thư mục frontend/dist
  const staticDir = path.join(__dirname, '../public');
  if (fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    // SPA fallback: mọi route không phải /api trả về index.html
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }

  // Error handler chung
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Lỗi:', err);
    res.status(500).json({ error: 'Lỗi máy chủ', detail: err?.message });
  });

  app.listen(config.port, () => {
    console.log(`TNT CAR chạy tại cổng ${config.port}`);
  });
}

main().catch((e) => {
  console.error('Không khởi động được server:', e);
  process.exit(1);
});
