import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getOne, getAll, run } from '../database.js';

const router = Router();

// GET /api/clients - List all clients
router.get('/', (req, res) => {
    try {
        const { search, vip } = req.query;
        const orgId = req.user?.org_id || 'org-demo';

        let query = `
            SELECT c.*, sp.name as sla_policy_name 
            FROM clients c
            LEFT JOIN sla_policies sp ON c.sla_policy_id = sp.id
            WHERE c.org_id = '${orgId}'
        `;

        if (search) {
            query += ` AND c.name LIKE '%${search}%'`;
        }

        if (vip === 'true') {
            query += ' AND c.is_vip = 1';
        }

        query += ' ORDER BY c.is_vip DESC, c.name ASC';

        const clients = getAll(query);
        res.json(clients);
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ error: 'Erro ao buscar clientes' });
    }
});

// GET /api/clients/:id - Get single client
router.get('/:id', (req, res) => {
    try {
        const client = getOne(`
            SELECT c.*, sp.name as sla_policy_name 
            FROM clients c
            LEFT JOIN sla_policies sp ON c.sla_policy_id = sp.id
            WHERE c.id = '${req.params.id}'
        `);

        if (!client) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        // Get ticket stats for this client
        const stats = getOne(`
      SELECT 
        COUNT(*) as total_tickets,
        SUM(CASE WHEN status = 'encerrado' THEN 1 ELSE 0 END) as closed_tickets,
        SUM(CASE WHEN status != 'encerrado' THEN 1 ELSE 0 END) as open_tickets
      FROM tickets
      WHERE client_id = '${req.params.id}'
    `);

        res.json({ ...client, ...(stats || {}) });
    } catch (error) {
        console.error('Error fetching client:', error);
        res.status(500).json({ error: 'Erro ao buscar cliente' });
    }
});

// POST /api/clients - Create new client
router.post('/', (req, res) => {
    try {
        const { name, is_vip, sla_policy_id, contact_email, contact_phone, notes } = req.body;
        const orgId = req.user?.org_id || 'org-demo';

        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Nome do cliente é obrigatório' });
        }

        const id = `client-${uuidv4().slice(0, 8)}`;

        run(`
            INSERT INTO clients (id, org_id, name, is_vip, sla_policy_id, contact_email, contact_phone, notes)
            VALUES (
                '${id}', 
                '${orgId}', 
                '${name.trim()}', 
                ${is_vip ? 1 : 0}, 
                ${sla_policy_id ? `'${sla_policy_id}'` : 'NULL'},
                ${contact_email ? `'${contact_email}'` : 'NULL'},
                ${contact_phone ? `'${contact_phone}'` : 'NULL'},
                ${notes ? `'${notes}'` : 'NULL'}
            )
        `);

        const created = getOne(`SELECT * FROM clients WHERE id = '${id}'`);
        res.status(201).json(created);
    } catch (error) {
        console.error('Error creating client:', error);
        res.status(500).json({ error: 'Erro ao criar cliente' });
    }
});

// PUT /api/clients/:id - Update client
router.put('/:id', (req, res) => {
    try {
        const { name, is_vip, sla_policy_id, contact_email, contact_phone, notes } = req.body;
        const orgId = req.user?.org_id || 'org-demo';

        const existing = getOne(`SELECT * FROM clients WHERE id = '${req.params.id}' AND org_id = '${orgId}'`);
        if (!existing) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        run(`
            UPDATE clients SET
                name = '${name || existing.name}',
                is_vip = ${is_vip !== undefined ? (is_vip ? 1 : 0) : existing.is_vip || 0},
                sla_policy_id = ${sla_policy_id ? `'${sla_policy_id}'` : (sla_policy_id === null ? 'NULL' : (existing.sla_policy_id ? `'${existing.sla_policy_id}'` : 'NULL'))},
                contact_email = ${contact_email !== undefined ? (contact_email ? `'${contact_email}'` : 'NULL') : (existing.contact_email ? `'${existing.contact_email}'` : 'NULL')},
                contact_phone = ${contact_phone !== undefined ? (contact_phone ? `'${contact_phone}'` : 'NULL') : (existing.contact_phone ? `'${existing.contact_phone}'` : 'NULL')},
                notes = ${notes !== undefined ? (notes ? `'${notes}'` : 'NULL') : (existing.notes ? `'${existing.notes}'` : 'NULL')}
            WHERE id = '${req.params.id}'
        `);

        const updated = getOne(`SELECT * FROM clients WHERE id = '${req.params.id}'`);
        res.json(updated);
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ error: 'Erro ao atualizar cliente' });
    }
});

// DELETE /api/clients/:id - Delete client
router.delete('/:id', (req, res) => {
    try {
        const orgId = req.user?.org_id || 'org-demo';

        const existing = getOne(`SELECT * FROM clients WHERE id = '${req.params.id}' AND org_id = '${orgId}'`);
        if (!existing) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }

        // Check if client has tickets
        const ticketCount = getOne(`SELECT COUNT(*) as count FROM tickets WHERE client_id = '${req.params.id}'`);
        if (ticketCount && ticketCount.count > 0) {
            return res.status(400).json({
                error: `Não é possível excluir: cliente possui ${ticketCount.count} ticket(s) associado(s)`
            });
        }

        run(`DELETE FROM clients WHERE id = '${req.params.id}'`);
        res.json({ message: 'Cliente excluído com sucesso' });
    } catch (error) {
        console.error('Error deleting client:', error);
        res.status(500).json({ error: 'Erro ao excluir cliente' });
    }
});

export default router;


