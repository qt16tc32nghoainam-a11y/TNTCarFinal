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

/** GET /api/dashboard/lost-leads — chi tiết Lead thất bại (lead nào, sales nào, lý do gì). */
router.get('/lost-leads', (req, res) => {
  const { from, to } = req.query as Record<string, string>;
  const dateFrom = from || '1970-01-01';
  const dateTo = to || '2999-12-31';
  const scope = getVisibleSalesIds(req.user!);
  const clause = scope ? ` AND l.assigned_sales_id IN (${scope.map(() => '?').join(',')})` : '';
  const rows = all(
    `SELECT l.id, l.full_name, l.phone, l.source, l.updated_at,
            lr.label AS lost_reason, l.lost_reason_note,
            u.full_name AS sales_name,
            c.brand AS car_brand, c.name AS car_name
     FROM leads l
     LEFT JOIN lost_reasons lr ON lr.id = l.lost_reason_id
     LEFT JOIN users u ON u.id = l.assigned_sales_id
     LEFT JOIN car_models c ON c.id = l.car_model_id
     WHERE l.status_detail = 'Lead thất bại' AND l.created_at BETWEEN ? AND ? ${clause}
     ORDER BY l.updated_at DESC`,
    [dateFrom, dateTo, ...(scope || [])]
  );
  res.json(rows);
});

/** GET /api/dashboard/leads?filter=all|won — danh sách lead theo scope (drill-down ô Tổng Lead / Won). */
router.get('/leads', (req, res) => {
  const { filter } = req.query as Record<string, string>;
  const scope = getVisibleSalesIds(req.user!);
  const clause = scope ? ` AND l.assigned_sales_id IN (${scope.map(() => '?').join(',')})` : '';
  let statusClause = '';
  if (filter === 'won') statusClause = " AND l.status_detail = 'Thành công'";
  const rows = all(
    `SELECT l.id, l.full_name, l.phone, l.source, l.status_detail, l.updated_at,
            u.full_name AS sales_name, c.brand AS car_brand, c.name AS car_name
     FROM leads l
     LEFT JOIN users u ON u.id = l.assigned_sales_id
     LEFT JOIN car_models c ON c.id = l.car_model_id
     WHERE 1=1 ${statusClause} ${clause}
     ORDER BY l.updated_at DESC`,
    scope || []
  );
  res.json(rows);
});

/** GET /api/dashboard/contracts?filter=active|cancelled — danh sách hợp đồng theo scope (drill-down Doanh thu / Hợp đồng / Hủy cọc). */
router.get('/contracts', (req, res) => {
  const { filter } = req.query as Record<string, string>;
  const scope = getVisibleSalesIds(req.user!);
  const clause = scope ? ` AND ct.created_by IN (${scope.map(() => '?').join(',')})` : '';
  let statusClause = '';
  if (filter === 'active') statusClause = " AND ct.status != 'Đã hủy cọc'";
  else if (filter === 'cancelled') statusClause = " AND ct.status = 'Đã hủy cọc'";
  const rows = all(
    `SELECT ct.id, ct.contract_code, ct.value, ct.status, ct.signed_date, ct.payment_method,
            l.full_name AS customer_name, l.phone AS customer_phone,
            c.brand AS car_brand, c.name AS car_name, u.full_name AS sales_name
     FROM contracts ct
     JOIN leads l ON l.id = ct.lead_id
     JOIN car_models c ON c.id = ct.car_model_id
     LEFT JOIN users u ON u.id = ct.created_by
     WHERE 1=1 ${statusClause} ${clause}
     ORDER BY ct.created_at DESC`,
    scope || []
  );
  res.json(rows);
});

/** GET /api/dashboard/ranking — bảng xếp hạng Sales/Showroom (US-05.1). */
router.get('/ranking', (req, res) => {
  const scope = getVisibleSalesIds(req.user!);
  const clause = scope ? ` AND u.id IN (${scope.map(() => '?').join(',')})` : '';
  const salesRanking = all(
    `SELECT u.id, u.full_name, s.name AS showroom_name,
       COUNT(CASE WHEN l.status_detail='Thành công' THEN 1 END) AS won,
       COUNT(CASE WHEN l.status_detail='Lead thất bại' THEN 1 END) AS lost,
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

/** GET /api/dashboard/export — xuất báo cáo CSV (US-05.2), phân quyền theo scope. */
router.get('/export', (req, res) => {
  const scope = getVisibleSalesIds(req.user!);
  const clause = scope ? ` AND u.id IN (${scope.map(() => '?').join(',')})` : '';
  const ranking = all<any>(
    `SELECT u.full_name, s.name AS showroom_name,
       COUNT(CASE WHEN l.status_detail='Thành công' THEN 1 END) AS won,
       COUNT(CASE WHEN l.status_detail='Lead thất bại' THEN 1 END) AS lost,
       COUNT(l.id) AS total_leads,
       COALESCE((SELECT SUM(value) FROM contracts ct WHERE ct.created_by=u.id AND ct.status='Hiệu lực'),0) AS revenue
     FROM users u
     LEFT JOIN leads l ON l.assigned_sales_id = u.id
     LEFT JOIN showrooms s ON s.id = u.showroom_id
     WHERE u.role='Sales' ${clause}
     GROUP BY u.id ORDER BY won DESC`,
    scope || []
  );

  // Tạo CSV (có BOM để Excel đọc đúng tiếng Việt)
  const header = ['Nhân viên', 'Showroom', 'Tổng Lead', 'Won', 'Lost', 'Doanh thu (đ)'];
  const escape = (v: any) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [header.join(',')];
  for (const r of ranking) {
    lines.push([r.full_name, r.showroom_name || '', r.total_leads, r.won, r.lost, r.revenue].map(escape).join(','));
  }
  const csv = '\uFEFF' + lines.join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="bao-cao-kpi-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});

export default router;
