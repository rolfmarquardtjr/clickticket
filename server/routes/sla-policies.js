import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getAll, getOne, run } from '../database.js';

const router = Router();

// List all SLA policies for the organization
router.get('/', (req, res) => {
    try {
        const orgId = req.user?.org_id || 'org-demo';
        const policies = getAll(`
            SELECT * FROM sla_policies 
            WHERE org_id = '${orgId}'
            ORDER BY priority DESC, name
        `);
        res.json(policies);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single policy
router.get('/:id', (req, res) => {
    try {
        const orgId = req.user?.org_id || 'org-demo';
        const policy = getOne(`
            SELECT * FROM sla_policies 
            WHERE id = '${req.params.id}' AND org_id = '${orgId}'
        `);
        if (!policy) {
            return res.status(404).json({ error: 'Política não encontrada' });
        }
        res.json(policy);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create policy
router.post('/', (req, res) => {
    try {
        const orgId = req.user?.org_id || 'org-demo';
        const { name, hours_baixo, hours_medio, hours_alto, priority } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }

        const id = `sla-${uuidv4().slice(0, 8)}`;
        run(`
            INSERT INTO sla_policies (id, org_id, name, hours_baixo, hours_medio, hours_alto, priority)
            VALUES ('${id}', '${orgId}', '${name}', ${hours_baixo || 48}, ${hours_medio || 24}, ${hours_alto || 4}, ${priority || 0})
        `);

        const policy = getOne(`SELECT * FROM sla_policies WHERE id = '${id}'`);
        res.status(201).json(policy);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update policy
router.put('/:id', (req, res) => {
    try {
        const orgId = req.user?.org_id || 'org-demo';
        const { name, hours_baixo, hours_medio, hours_alto, priority } = req.body;

        const existing = getOne(`SELECT * FROM sla_policies WHERE id = '${req.params.id}' AND org_id = '${orgId}'`);
        if (!existing) {
            return res.status(404).json({ error: 'Política não encontrada' });
        }

        run(`
            UPDATE sla_policies 
            SET name = '${name || existing.name}',
                hours_baixo = ${hours_baixo !== undefined ? hours_baixo : existing.hours_baixo},
                hours_medio = ${hours_medio !== undefined ? hours_medio : existing.hours_medio},
                hours_alto = ${hours_alto !== undefined ? hours_alto : existing.hours_alto},
                priority = ${priority !== undefined ? priority : existing.priority}
            WHERE id = '${req.params.id}'
        `);

        const policy = getOne(`SELECT * FROM sla_policies WHERE id = '${req.params.id}'`);
        res.json(policy);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete policy
router.delete('/:id', (req, res) => {
    try {
        const orgId = req.user?.org_id || 'org-demo';
        const existing = getOne(`SELECT * FROM sla_policies WHERE id = '${req.params.id}' AND org_id = '${orgId}'`);
        if (!existing) {
            return res.status(404).json({ error: 'Política não encontrada' });
        }

        // Check if policy is in use
        const inUse = getOne(`
            SELECT COUNT(*) as count FROM clients WHERE sla_policy_id = '${req.params.id}'
            UNION ALL
            SELECT COUNT(*) as count FROM products WHERE sla_policy_id = '${req.params.id}'
        `);

        run(`DELETE FROM sla_policies WHERE id = '${req.params.id}'`);
        res.json({ message: 'Política removida com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
