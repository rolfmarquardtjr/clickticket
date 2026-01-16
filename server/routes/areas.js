import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getOne, getAll, run } from '../database.js';

const router = Router();

// GET /api/areas - List all areas
router.get('/', (req, res) => {
    try {
        const orgId = req.user?.org_id || 'org-demo';
        const areas = getAll(`
            SELECT a.*, 
                (SELECT COUNT(*) FROM tickets WHERE area_id = a.id AND status NOT IN ('encerrado', 'resolvido')) as active_tickets
            FROM areas a 
            WHERE (a.org_id = '${orgId}' OR a.org_id = 'org-demo' OR a.org_id = 'null' OR a.org_id IS NULL) 
            ORDER BY a.name ASC
        `);
        res.json(areas);
    } catch (error) {
        console.error('Error fetching areas:', error);
        res.status(500).json({ error: 'Erro ao buscar áreas' });
    }
});

// GET /api/areas/:id - Get single area with stats
router.get('/:id', (req, res) => {
    try {
        const area = getOne(`SELECT * FROM areas WHERE id = '${req.params.id}'`);

        if (!area) {
            return res.status(404).json({ error: 'Área não encontrada' });
        }

        // Get ticket stats for this area
        const stats = getOne(`
      SELECT 
        COUNT(*) as total_tickets,
        SUM(CASE WHEN status = 'encerrado' THEN 1 ELSE 0 END) as closed_tickets,
        SUM(CASE WHEN status NOT IN ('encerrado', 'resolvido') THEN 1 ELSE 0 END) as active_tickets
      FROM tickets
      WHERE area_id = '${req.params.id}'
    `);

        res.json({ ...area, ...(stats || {}) });
    } catch (error) {
        console.error('Error fetching area:', error);
        res.status(500).json({ error: 'Erro ao buscar área' });
    }
});

// POST /api/areas - Create new area
router.post('/', (req, res) => {
    try {
        const { name, description } = req.body;
        const orgId = req.user?.org_id || 'org-demo';

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }

        const id = `area-${uuidv4().slice(0, 8)}`;

        run(`
            INSERT INTO areas (id, org_id, name, description)
            VALUES ('${id}', '${orgId}', '${name.trim().replace(/'/g, "''")}', ${description ? `'${description.replace(/'/g, "''")}'` : 'NULL'})
        `);

        const created = getOne(`SELECT * FROM areas WHERE id = '${id}'`);
        res.status(201).json(created);
    } catch (error) {
        console.error('Error creating area:', error);
        res.status(500).json({ error: 'Erro ao criar área' });
    }
});

// PUT /api/areas/:id - Update area
router.put('/:id', (req, res) => {
    try {
        const { name, description } = req.body;
        const orgId = req.user?.org_id || 'org-demo';

        const existing = getOne(`SELECT * FROM areas WHERE id = '${req.params.id}' AND org_id = '${orgId}'`);
        if (!existing) {
            return res.status(404).json({ error: 'Área não encontrada' });
        }

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }

        run(`
            UPDATE areas SET
                name = '${name.trim().replace(/'/g, "''")}',
                description = ${description !== undefined ? (description ? `'${description.replace(/'/g, "''")}'` : 'NULL') : (existing.description ? `'${existing.description}'` : 'NULL')}
            WHERE id = '${req.params.id}'
        `);

        const updated = getOne(`SELECT * FROM areas WHERE id = '${req.params.id}'`);
        res.json(updated);
    } catch (error) {
        console.error('Error updating area:', error);
        res.status(500).json({ error: 'Erro ao atualizar área' });
    }
});

// DELETE /api/areas/:id - Delete area
router.delete('/:id', (req, res) => {
    try {
        const orgId = req.user?.org_id || 'org-demo';

        const existing = getOne(`SELECT * FROM areas WHERE id = '${req.params.id}' AND org_id = '${orgId}'`);
        if (!existing) {
            return res.status(404).json({ error: 'Área não encontrada' });
        }

        // Check if area has tickets
        const ticketCount = getOne(`SELECT COUNT(*) as count FROM tickets WHERE area_id = '${req.params.id}'`);
        if (ticketCount && ticketCount.count > 0) {
            return res.status(400).json({
                error: `Não é possível excluir: área possui ${ticketCount.count} ticket(s) associado(s)`
            });
        }

        run(`DELETE FROM areas WHERE id = '${req.params.id}'`);
        res.json({ message: 'Área excluída com sucesso' });
    } catch (error) {
        console.error('Error deleting area:', error);
        res.status(500).json({ error: 'Erro ao excluir área' });
    }
});

export default router;

