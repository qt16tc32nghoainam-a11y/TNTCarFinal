import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { all, get, run, persist } from '../db/database';
import { authenticate, requireRole } from '../middleware/auth';
import { getVisibleSalesIds } from '../utils/scope';

const router = Router();
router.use(authenticate);
const nowIso = () => new Date().toISOString();

/** Xây dựng điều kiện lọc theo phạm vi Sales nhìn thấy. */
function scopeFilter(user: any, col = 'assigned_sales_id') {
  const visible = getVisibleSalesIds(user);
  if (!visible) return { clause: '', params: [] as any[] };
  return { clause: ` AND ${col} IN (${visible.map(() => '?').join(',')})`, params: visible };
}

/** GET /api/dashboard/kpi — KPI theo phân quyền vai trò (BR-24). */
router.get('/kpi', (req, res) => {
  const { from, to } = req.query as Record<string, string>;
  const dateFrom = from || '1970-01-01';
  const dateTo = to || '2999-12-31';

  const leadScope = scopeFilter(req.user!, 'assigned_sales_id');

  const totalLeads = get<any>(
    `SELECT COUNT(*) c FROM leads WHERE created_at BETWEEN ? AND ? ${leadScope.clause}`,
    [dateFrom, dateTo, ...leadScope.params]
  )?.c || 0;

  const won = get<any>(
    `SELECT COUNT(*) c FROM leads WHERE status_detail='Thành công' AND created_at BETWEEN ? AND ? ${leadScope.clause}`,
    [dateFrom, dateTo, ...leadScope.params]
  )?.c || 0;

  const lost = get<any>(
    `SELECT COUNT(*) c FROM leads WHERE status_detail='Lead thất bại' AND created_at BETWEEN ? AND ? ${leadScope.clause}`,
    [dateFrom, dateTo, ...leadScope.params]
  )?.c || 0;

  // Nguồn Lead
  const bySource = all(
    `SELECT source, COUNT(*) c FROM leads WHERE created_at BETWEEN ? AND ? ${leadScope.clause} GROUP BY source ORDER BY c DESC`,
    [dateFrom, dateTo, ...leadScope.params]
  );

  // Top lý do Lost
  const lostReasons = all(
    `SELECT lr.label, COUNT(*) c FROM leads l JOIN lost_reasons lr ON lr.id = l.lost_reason_id
     WHERE l.status_detail='Lead thất bại' AND l.created_at BETWEEN ? AND ? ${leadScope.clause.replace(/assigned_sales_id/g, 'l.assigned_sales_id')}
     GROUP BY lr.label ORDER BY c DESC`,
    [dateFrom, dateTo, ...leadScope.params]
  );

  // Doanh thu & hủy cọc (từ contracts, join lead để lọc theo scope)
  const contractScope = getVisibleSalesIds(req.user!);
  const cScopeClause = contractScope ? ` AND ct.created_by IN (${contractScope.map(() => '?').join(',')})` : '';
  const revenue = get<any>(
    `SELECT COALESCE(SUM(value),0) s, COUNT(*) c FROM contracts ct WHERE status='Hiệu lực' AND signed_date BETWEEN ? AND ? ${cScopeClause}`,
    [dateFrom, dateTo, ...(contractScope || [])]
  );
  const cancelled = get<any>(
    `SELECT COUNT(*) c FROM contracts ct WHERE status='Đã hủy cọc' AND signed_date BETWEEN ? AND ? ${cScopeClause}`,
    [dateFrom, dateTo, ...(contractScope || [])]
  )?.c || 0;
  const totalContracts = (revenue?.c || 0) + cancelled;
  const cancelRate = totalContracts > 0 ? Math.round((cancelled / totalContracts) * 1000) / 10 : 0;

  res.json({
    scope: req.user!.role,
    totalLeads,
    won,
    lost,
    winRate: (won + lost) > 0 ? Math.round((won / (won + lost)) * 1000) / 10 : 0,
    revenue: revenue?.s || 0,
    contracts: revenue?.c || 0,
    cancelledDeposits: cancelled,
    cancelRate,
    bySource,
    topLostReasons: lostReasons,
  });
});

/** GET /api/dashboard/ranking — bảng xếp hạng Sales/Showroom (US-05.1). */
router.get('/ranking', (req, res) => {
  const scope = getVisibleSalesIds(req.user!);
  const clause = scope ? ` AND u.id IN (${scope.map(() => '?').join(',')})` : '';
  const salesRanking = all(
    `SELECT u.id, u.full_name, s.name AS showroom_name,
       COUNT(CASE WHEN l.status_detail='Thành công' THEN 1 END) AS won,
       COUNT(l.id) AS total_leads,
       COALESCE((SELECT SUM(value) FROM contracts ct WHERE ct.created_by=u.id AND ct.status='Hiệu lực'),0) AS revenue
     FROM users u
     LEFT JOIN leads l ON l.assigned_sales_id = u.id
     LEFT JOIN showrooms s ON s.id = u.showroom_id
     WHERE u.role='Sales' ${clause}
     GROUP BY u.id ORDER BY won DESC, revenue DESC`,
    scope || []
  );
  res.json({ salesRanking });
});

/** POST /api/dashboard/lock — Admin khóa số liệu KPI theo kỳ (US-05.3, BR-25). */
router.post('/lock', requireRole('Admin'), (req, res) => {
  const { period_type, period_label, data } = req.body || {};
  if (!['Tháng', 'Quý', 'Năm'].includes(period_type) || !period_label) {
    return res.status(400).json({ error: 'Thiếu loại kỳ hoặc nhãn kỳ' });
  }
  run(
    `INSERT INTO kpi_snapshots (id,period_type,period_label,scope,scope_ref_id,data_json,locked_by,locked_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    [uuid(), period_type, period_label, 'Toàn hệ thống', null, JSON.stringify(data || {}), req.user!.id, nowIso()]
  );
  persist();
  res.status(201).json({ ok: true });
});

/** GET /api/dashboard/snapshots — danh sách kỳ đã khóa. */
router.get('/snapshots', requireRole('Admin', 'Manager'), (_req, res) => {
  res.json(all('SELECT id,period_type,period_label,locked_at FROM kpi_snapshots ORDER BY locked_at DESC'));
});

export default router;
