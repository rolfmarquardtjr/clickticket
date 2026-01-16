import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getOne, getAll, run } from '../database.js';
import { verifyToken } from '../auth.js';

const router = Router();

// Helper to get org_id from auth header
function getOrgId(req) {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        try {
            const token = authHeader.substring(7);
            const decoded = verifyToken(token);
            return decoded?.orgId || null;
        } catch (e) { return null; }
    }
    return null;
}

// GET /api/custom-fields - List all fields with filters
router.get('/', (req, res) => {
    try {
        const orgId = getOrgId(req);
        if (!orgId) return res.status(401).json({ error: 'Não autorizado' });

        const { entity_type, entity_id, active } = req.query;

        let query = `SELECT * FROM custom_fields WHERE (org_id = '${orgId}' OR org_id = 'org-demo' OR org_id = 'null' OR org_id IS NULL)`;

        if (entity_type) {
            query += ` AND entity_type = '${entity_type}'`;
        }
        if (entity_id) {
            query += ` AND entity_id = '${entity_id}'`;
        }
        if (active !== undefined) {
            query += ` AND active = ${active === 'true' ? 1 : 0}`;
        }

        query += ` ORDER BY created_at ASC`;

        const fields = getAll(query);

        // Parse options JSON
        const processedFields = fields.map(f => ({
            ...f,
            options: f.options ? JSON.parse(f.options) : [],
            required: !!f.required,
            active: !!f.active
        }));

        res.json(processedFields);
    } catch (error) {
        console.error('Error fetching custom fields:', error);
        res.status(500).json({ error: 'Erro ao buscar campos personalizados' });
    }
});

// POST /api/custom-fields - Create new field
router.post('/', (req, res) => {
    try {
        const orgId = getOrgId(req);
        if (!orgId) return res.status(401).json({ error: 'Não autorizado' });

        const { label, type, required, options, description, entity_type, entity_id } = req.body;

        if (!label || !type || !entity_type || !entity_id) {
            return res.status(400).json({ error: 'Campos obrigatórios faltando' });
        }

        const id = uuidv4();
        const optionsJson = options ? JSON.stringify(options) : null;
        const requiredInt = required ? 1 : 0;
        const cleanLabel = label.replace(/'/g, "''");
        const cleanDesc = description ? description.replace(/'/g, "''") : null;

        run(`
            INSERT INTO custom_fields (
                id, org_id, label, type, required, options, description, entity_type, entity_id
            ) VALUES (
                '${id}', '${orgId}', '${cleanLabel}', '${type}', ${requiredInt}, 
                ${optionsJson ? `'${optionsJson}'` : 'NULL'}, 
                ${cleanDesc ? `'${cleanDesc}'` : 'NULL'}, 
                '${entity_type}', '${entity_id}'
            )
        `);

        res.status(201).json({ message: 'Campo criado com sucesso', id });
    } catch (error) {
        console.error('Error creating custom field:', error);
        res.status(500).json({ error: 'Erro ao criar campo personalizado' });
    }
});

// PUT /api/custom-fields/:id - Update field
router.put('/:id', (req, res) => {
    try {
        const orgId = getOrgId(req);
        if (!orgId) return res.status(401).json({ error: 'Não autorizado' });

        const { id } = req.params;
        const { label, required, options, description, active } = req.body;

        const current = getOne(`SELECT * FROM custom_fields WHERE id = '${id}' AND org_id = '${orgId}'`);
        if (!current) {
            return res.status(404).json({ error: 'Campo não encontrado' });
        }

        let updates = [];
        if (label) updates.push(`label = '${label.replace(/'/g, "''")}'`);
        if (required !== undefined) updates.push(`required = ${required ? 1 : 0}`);
        if (options) updates.push(`options = '${JSON.stringify(options)}'`);
        if (description !== undefined) updates.push(`description = '${description.replace(/'/g, "''")}'`);
        if (active !== undefined) updates.push(`active = ${active ? 1 : 0}`);

        if (updates.length > 0) {
            run(`UPDATE custom_fields SET ${updates.join(', ')} WHERE id = '${id}'`);
        }

        res.json({ message: 'Campo atualizado com sucesso' });
    } catch (error) {
        console.error('Error updating custom field:', error);
        res.status(500).json({ error: 'Erro ao atualizar campo personalizado' });
    }
});

// DELETE /api/custom-fields/:id - Soft delete (disable)
router.delete('/:id', (req, res) => {
    try {
        const orgId = getOrgId(req);
        if (!orgId) return res.status(401).json({ error: 'Não autorizado' });

        const { id } = req.params;

        run(`UPDATE custom_fields SET active = 0 WHERE id = '${id}' AND org_id = '${orgId}'`);

        res.json({ message: 'Campo desativado com sucesso' });
    } catch (error) {
        console.error('Error deleting custom field:', error);
        res.status(500).json({ error: 'Erro ao remover campo personalizado' });
    }
});

export default router;
