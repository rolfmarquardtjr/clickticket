import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getAll, getOne, run } from '../database.js';
import { verifyToken, ROLES } from '../auth.js';

const router = Router();

function getAuthContext(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return { orgId: 'org-demo', role: null };
  try {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    return {
      orgId: decoded?.orgId || 'org-demo',
      role: decoded?.role || null
    };
  } catch (e) {
    return { orgId: 'org-demo', role: null };
  }
}

function requireAdmin(req, res) {
  const { role } = getAuthContext(req);
  if (role !== ROLES.ADMIN) {
    res.status(403).json({ error: 'Apenas administradores podem alterar colunas do Kanban' });
    return false;
  }
  return true;
}

// GET /api/areas/:areaId/kanban-columns - List columns for an area
router.get('/areas/:areaId/kanban-columns', (req, res) => {
  try {
    const { areaId } = req.params;
    const { orgId } = getAuthContext(req);

    const columns = getAll(`
      SELECT *
      FROM kanban_columns
      WHERE area_id = '${areaId}'
        AND (org_id = '${orgId}' OR org_id = 'org-demo' OR org_id IS NULL)
      ORDER BY sort_order ASC, created_at ASC
    `);

    res.json(columns);
  } catch (error) {
    console.error('Error fetching kanban columns:', error);
    res.status(500).json({ error: 'Erro ao buscar colunas do Kanban' });
  }
});

// POST /api/areas/:areaId/kanban-columns - Create column (admin only)
router.post('/areas/:areaId/kanban-columns', (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { areaId } = req.params;
    const { orgId } = getAuthContext(req);
    const { status_key, label, color, is_closed } = req.body;

    if (!label || label.trim().length < 2) {
      return res.status(400).json({ error: 'Nome da coluna é obrigatório (mínimo 2 caracteres)' });
    }
    if (!status_key || status_key.trim().length < 2) {
      return res.status(400).json({ error: 'Chave do status é obrigatória (mínimo 2 caracteres)' });
    }

    const cleanStatusKey = status_key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const existing = getOne(`
      SELECT id FROM kanban_columns
      WHERE area_id = '${areaId}'
        AND (org_id = '${orgId}' OR org_id = 'org-demo' OR org_id IS NULL)
        AND status_key = '${cleanStatusKey}'
    `);
    if (existing) {
      return res.status(400).json({ error: 'Já existe uma coluna com esse status nesta área' });
    }

    const maxOrder = getOne(`
      SELECT MAX(sort_order) as max
      FROM kanban_columns
      WHERE area_id = '${areaId}' AND (org_id = '${orgId}' OR org_id = 'org-demo' OR org_id IS NULL)
    `);
    const sortOrder = (maxOrder?.max || 0) + 1;

    const id = `kc-${uuidv4().slice(0, 8)}`;
    run(`
      INSERT INTO kanban_columns (id, org_id, area_id, status_key, label, color, sort_order, is_closed, is_system)
      VALUES (
        '${id}', '${orgId}', '${areaId}', '${cleanStatusKey}', '${label.trim().replace(/'/g, "''")}',
        ${color ? `'${color.replace(/'/g, "''")}'` : 'NULL'},
        ${sortOrder}, ${is_closed ? 1 : 0}, 0
      )
    `);

    const created = getOne(`SELECT * FROM kanban_columns WHERE id = '${id}'`);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating kanban column:', error);
    res.status(500).json({ error: 'Erro ao criar coluna do Kanban' });
  }
});

// PUT /api/kanban-columns/:id - Update column (admin only)
router.put('/kanban-columns/:id', (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { id } = req.params;
    const { label, color, sort_order, is_closed } = req.body;

    const existing = getOne(`SELECT * FROM kanban_columns WHERE id = '${id}'`);
    if (!existing) {
      return res.status(404).json({ error: 'Coluna não encontrada' });
    }
    if (existing.status_key === 'novo') {
      return res.status(400).json({ error: 'A coluna "novo" não pode ser alterada' });
    }

    const updates = [];
    if (label) updates.push(`label = '${label.trim().replace(/'/g, "''")}'`);
    if (color !== undefined) updates.push(`color = ${color ? `'${color.replace(/'/g, "''")}'` : 'NULL'}`);
    if (sort_order !== undefined) updates.push(`sort_order = ${sort_order}`);
    if (is_closed !== undefined && !existing.is_system) updates.push(`is_closed = ${is_closed ? 1 : 0}`);

    if (updates.length > 0) {
      run(`UPDATE kanban_columns SET ${updates.join(', ')} WHERE id = '${id}'`);
    }

    const updated = getOne(`SELECT * FROM kanban_columns WHERE id = '${id}'`);
    res.json(updated);
  } catch (error) {
    console.error('Error updating kanban column:', error);
    res.status(500).json({ error: 'Erro ao atualizar coluna do Kanban' });
  }
});

// DELETE /api/kanban-columns/:id - Delete column (admin only)
router.delete('/kanban-columns/:id', (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { id } = req.params;
    const column = getOne(`SELECT * FROM kanban_columns WHERE id = '${id}'`);
    if (!column) {
      return res.status(404).json({ error: 'Coluna não encontrada' });
    }
    if (column.is_system || column.status_key === 'novo') {
      return res.status(400).json({ error: 'Colunas do sistema não podem ser removidas' });
    }

    const ticketCount = getOne(`
      SELECT COUNT(*) as count FROM tickets
      WHERE status = '${column.status_key}' AND area_id = '${column.area_id}'
    `);
    if (ticketCount?.count > 0) {
      return res.status(400).json({ error: 'Não é possível excluir: existem tickets nessa coluna' });
    }

    run(`DELETE FROM kanban_columns WHERE id = '${id}'`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting kanban column:', error);
    res.status(500).json({ error: 'Erro ao excluir coluna do Kanban' });
  }
});

// PUT /api/areas/:areaId/kanban-columns/reorder - Reorder columns (admin only)
router.put('/areas/:areaId/kanban-columns/reorder', (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { areaId } = req.params;
    const { columns } = req.body;

    if (!Array.isArray(columns)) {
      return res.status(400).json({ error: 'Lista de colunas inválida' });
    }

    const requestedOrder = new Map();
    columns.forEach(col => {
      if (col?.id && col?.sort_order !== undefined) {
        requestedOrder.set(col.id, col.sort_order);
      }
    });

    const existing = getAll(`
      SELECT * FROM kanban_columns
      WHERE area_id = '${areaId}'
      ORDER BY sort_order ASC, created_at ASC
    `);

    const sorted = [...existing].sort((a, b) => {
      if (a.status_key === 'novo') return -1;
      if (b.status_key === 'novo') return 1;
      const aOrder = requestedOrder.get(a.id) ?? a.sort_order ?? 0;
      const bOrder = requestedOrder.get(b.id) ?? b.sort_order ?? 0;
      return aOrder - bOrder;
    });

    sorted.forEach((col, idx) => {
      const newOrder = idx + 1;
      run(`UPDATE kanban_columns SET sort_order = ${newOrder} WHERE id = '${col.id}' AND area_id = '${areaId}'`);
    });

    const updated = getAll(`
      SELECT * FROM kanban_columns
      WHERE area_id = '${areaId}'
      ORDER BY sort_order ASC, created_at ASC
    `);
    res.json(updated);
  } catch (error) {
    console.error('Error reordering kanban columns:', error);
    res.status(500).json({ error: 'Erro ao reordenar colunas do Kanban' });
  }
});

export default router;
