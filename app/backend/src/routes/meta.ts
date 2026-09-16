import { Router } from 'express';
import { all } from '../db/database';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

/** GET /api/meta/lost-reasons — danh mục lý do Lost. */
router.get('/lost-reasons', (_req, res) => res.json(all('SELECT * FROM lost_reasons WHERE active = 1')));

/** GET /api/meta/showrooms — danh sách showroom. */
router.get('/showrooms', (_req, res) => res.json(all('SELECT * FROM showrooms')));

/** GET /api/meta/car-models — danh mục xe (cho dropdown khi tạo Lead/hợp đồng). */
router.get('/car-models', (_req, res) => res.json(all('SELECT id,name,brand,price,status FROM car_models')));

export default router;
