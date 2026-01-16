import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getAll, getOne, run } from '../database.js';

const router = Router();

// List all products for the organization
router.get('/', (req, res) => {
    try {
        const orgId = req.user?.org_id || 'org-demo';
        const products = getAll(`
            SELECT p.*, sp.name as sla_policy_name 
            FROM products p 
            LEFT JOIN sla_policies sp ON p.sla_policy_id = sp.id
            WHERE p.org_id = '${orgId}' AND p.active = 1
            ORDER BY p.name
        `);
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single product
router.get('/:id', (req, res) => {
    try {
        const orgId = req.user?.org_id || 'org-demo';
        const product = getOne(`
            SELECT p.*, sp.name as sla_policy_name 
            FROM products p 
            LEFT JOIN sla_policies sp ON p.sla_policy_id = sp.id
            WHERE p.id = '${req.params.id}' AND p.org_id = '${orgId}'
        `);
        if (!product) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create product
router.post('/', (req, res) => {
    try {
        const orgId = req.user?.org_id || 'org-demo';
        const { name, description, sla_policy_id } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }

        const id = `prod-${uuidv4().slice(0, 8)}`;
        run(`
            INSERT INTO products (id, org_id, name, description, sla_policy_id, active)
            VALUES ('${id}', '${orgId}', '${name}', '${description || ''}', ${sla_policy_id ? `'${sla_policy_id}'` : 'NULL'}, 1)
        `);

        const product = getOne(`SELECT * FROM products WHERE id = '${id}'`);
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update product
router.put('/:id', (req, res) => {
    try {
        const orgId = req.user?.org_id || 'org-demo';
        const { name, description, sla_policy_id, active } = req.body;

        const existing = getOne(`SELECT * FROM products WHERE id = '${req.params.id}' AND org_id = '${orgId}'`);
        if (!existing) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }

        run(`
            UPDATE products 
            SET name = '${name || existing.name}',
                description = '${description !== undefined ? description : existing.description || ''}',
                sla_policy_id = ${sla_policy_id ? `'${sla_policy_id}'` : 'NULL'},
                active = ${active !== undefined ? active : existing.active}
            WHERE id = '${req.params.id}'
        `);

        const product = getOne(`SELECT * FROM products WHERE id = '${req.params.id}'`);
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete product (soft delete)
router.delete('/:id', (req, res) => {
    try {
        const orgId = req.user?.org_id || 'org-demo';
        const existing = getOne(`SELECT * FROM products WHERE id = '${req.params.id}' AND org_id = '${orgId}'`);
        if (!existing) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }

        run(`UPDATE products SET active = 0 WHERE id = '${req.params.id}'`);
        res.json({ message: 'Produto removido com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
