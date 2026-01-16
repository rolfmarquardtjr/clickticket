import { Router } from 'express';
import { getOne, getAll } from '../database.js';
import { enrichTicketWithSLA } from '../slaEngine.js';
import { CATEGORIES } from '../categories.js';
import { STATUS_LABELS } from '../statusMachine.js';
import { verifyToken } from '../auth.js';

const router = Router();

// Helper to get org filter
function getOrgFilter(req) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    try {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      if (decoded && decoded.orgId) {
        return ` AND org_id = '${decoded.orgId}'`;
      }
    } catch (e) {
      console.error('Error decoding token for report filter:', e);
    }
  }
  return ''; // Fallback: no filter (or could deny access, but keeping consistent with existing pattern)
}

function getOrgId(req) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    try {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      return decoded?.orgId || 'org-demo';
    } catch (e) {
      return 'org-demo';
    }
  }
  return 'org-demo';
}

function getClosedStatuses(orgId) {
  const rows = getAll(`
    SELECT DISTINCT status_key as status
    FROM kanban_columns
    WHERE (org_id = '${orgId}' OR org_id = 'org-demo' OR org_id IS NULL)
      AND is_closed = 1
  `);
  if (!rows || rows.length === 0) {
    return ['resolvido', 'encerrado'];
  }
  return rows.map(r => r.status);
}

// GET /api/reports/by-category - Tickets grouped by category
router.get('/by-category', (req, res) => {
  try {
    const orgFilter = getOrgFilter(req);
    const stats = getAll(`
      SELECT 
        category,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'encerrado' THEN 1 ELSE 0 END) as closed,
        SUM(CASE WHEN status NOT IN ('encerrado', 'resolvido') THEN 1 ELSE 0 END) as active,
        AVG(CASE 
          WHEN resolved_at IS NOT NULL 
          THEN (julianday(resolved_at) - julianday(created_at)) * 24 
          ELSE NULL 
        END) as avg_resolution_hours
      FROM tickets
      WHERE 1=1 ${orgFilter}
      GROUP BY category
      ORDER BY total DESC
    `);

    // Enrich with category names
    const enriched = stats.map(stat => {
      const cat = CATEGORIES.find(c => c.id === stat.category);
      return {
        ...stat,
        category_name: cat ? cat.name : stat.category,
        category_color: cat ? cat.color : '#666',
        avg_resolution_hours: stat.avg_resolution_hours ? Math.round(stat.avg_resolution_hours * 10) / 10 : null
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error('Error fetching category report:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório por categoria' });
  }
});

// GET /api/reports/by-status - Tickets grouped by status
router.get('/by-status', (req, res) => {
  try {
    const orgFilter = getOrgFilter(req);
    const stats = getAll(`
      SELECT 
        status,
        COUNT(*) as total
      FROM tickets
      WHERE 1=1 ${orgFilter}
      GROUP BY status
      ORDER BY 
        CASE status
          WHEN 'novo' THEN 1
          WHEN 'em_analise' THEN 2
          WHEN 'aguardando_cliente' THEN 3
          WHEN 'em_execucao' THEN 4
          WHEN 'resolvido' THEN 5
          WHEN 'encerrado' THEN 6
          ELSE 7
        END
    `);

    // Enrich with status labels
    const enriched = stats.map(stat => ({
      ...stat,
      status_label: STATUS_LABELS[stat.status] || stat.status
    }));

    res.json(enriched);
  } catch (error) {
    console.error('Error fetching status report:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório por status' });
  }
});

// GET /api/reports/sla - SLA performance report
router.get('/sla', (req, res) => {
  try {
    const orgFilter = getOrgFilter(req);
    const orgId = getOrgId(req);
    const closedStatuses = getClosedStatuses(orgId);
    const closedList = closedStatuses.map(s => `'${s}'`).join(',') || "'encerrado'";

    // Get all non-closed tickets
    const activeTickets = getAll(`
      SELECT * FROM tickets
      WHERE status NOT IN (${closedList}) ${orgFilter}
    `);

    // Calculate SLA status for each
    const slaStats = { ok: 0, risco: 0, quebrado: 0 };

    activeTickets.forEach(ticket => {
      const enriched = enrichTicketWithSLA(ticket);
      slaStats[enriched.sla_status]++;
    });

    // Get SLA performance by category
    const byCategoryRaw = getAll(`
      SELECT 
        category,
        COUNT(*) as total,
        SUM(CASE 
          WHEN resolved_at IS NOT NULL AND resolved_at <= sla_deadline THEN 1 
          ELSE 0 
        END) as within_sla,
        SUM(CASE 
          WHEN resolved_at IS NOT NULL AND resolved_at > sla_deadline THEN 1 
          ELSE 0 
        END) as broken_sla
      FROM tickets
      WHERE resolved_at IS NOT NULL ${orgFilter}
      GROUP BY category
    `);

    const byCategory = byCategoryRaw.map(stat => {
      const cat = CATEGORIES.find(c => c.id === stat.category);
      const slaRate = stat.total > 0 ? Math.round((stat.within_sla / stat.total) * 100) : 0;
      return {
        ...stat,
        category_name: cat ? cat.name : stat.category,
        sla_compliance_rate: slaRate
      };
    });

    res.json({
      current_active: slaStats,
      total_active: activeTickets.length,
      by_category: byCategory
    });
  } catch (error) {
    console.error('Error fetching SLA report:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório de SLA' });
  }
});

// GET /api/reports/backlog - Backlog and waiting for client
router.get('/backlog', (req, res) => {
  try {
    const orgFilter = getOrgFilter(req);

    const backlog = getAll(`
      SELECT 
        category,
        status,
        COUNT(*) as count
      FROM tickets
      WHERE status IN ('novo', 'em_analise', 'aguardando_cliente', 'em_execucao') ${orgFilter}
      GROUP BY category, status
      ORDER BY category, status
    `);

    // Calculate aging (tickets older than 7 days)
    const aging = getAll(`
      SELECT 
        status,
        COUNT(*) as count
      FROM tickets
      WHERE status NOT IN ('encerrado', 'resolvido')
        AND created_at < datetime('now', '-7 days') ${orgFilter}
      GROUP BY status
    `);

    // Waiting for client stats
    const waitingClient = getAll(`
      SELECT 
        t.*,
        c.name as client_name,
        (julianday('now') - julianday(updated_at)) as days_waiting
      FROM tickets t
      LEFT JOIN clients c ON t.client_id = c.id
      WHERE t.status = 'aguardando_cliente' ${orgFilter.replace('org_id', 't.org_id')}
      ORDER BY days_waiting DESC
      LIMIT 20
    `);

    res.json({
      backlog_by_category_status: backlog,
      aging_tickets: aging,
      waiting_for_client: waitingClient.map(t => ({
        ...t,
        days_waiting: Math.round(t.days_waiting * 10) / 10
      }))
    });
  } catch (error) {
    console.error('Error fetching backlog report:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório de backlog' });
  }
});

// GET /api/reports/summary - Overview dashboard
router.get('/summary', (req, res) => {
  try {
    const orgFilter = getOrgFilter(req);
    const orgId = getOrgId(req);
    const closedStatuses = getClosedStatuses(orgId);
    const closedList = closedStatuses.map(s => `'${s}'`).join(',') || "'encerrado'";

    // Total counts
    const totals = getOne(`
      SELECT 
        COUNT(*) as total_tickets,
        SUM(CASE WHEN status NOT IN (${closedList}) THEN 1 ELSE 0 END) as active_tickets,
        SUM(CASE WHEN status = 'novo' THEN 1 ELSE 0 END) as new_tickets,
        SUM(CASE WHEN status = 'aguardando_cliente' THEN 1 ELSE 0 END) as waiting_client,
        SUM(CASE WHEN status IN (${closedList}) THEN 1 ELSE 0 END) as closed_tickets
      FROM tickets
      WHERE 1=1 ${orgFilter}
    `) || { total_tickets: 0, active_tickets: 0, new_tickets: 0, waiting_client: 0, closed_tickets: 0 };

    // Tickets created today
    const today = getOne(`
      SELECT COUNT(*) as count 
      FROM tickets 
      WHERE date(created_at) = date('now') ${orgFilter}
    `) || { count: 0 };

    // Tickets closed today
    const closedToday = getOne(`
      SELECT COUNT(*) as count 
      FROM tickets 
      WHERE date(closed_at) = date('now') ${orgFilter}
    `) || { count: 0 };

    // Active tickets with SLA status
    const activeTickets = getAll(`
      SELECT * FROM tickets
      WHERE status NOT IN (${closedList}) ${orgFilter}
    `);

    const slaStats = { ok: 0, risco: 0, quebrado: 0 };
    activeTickets.forEach(ticket => {
      const enriched = enrichTicketWithSLA(ticket);
      slaStats[enriched.sla_status]++;
    });

    res.json({
      totals: {
        ...totals,
        created_today: today.count,
        closed_today: closedToday.count
      },
      sla_overview: slaStats
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Erro ao gerar resumo' });
  }
});

export default router;
