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

// ============================================
// CATEGORIES
// ============================================

// GET /api/categories - List all categories with subcategories
router.get('/', (req, res) => {
    try {
        const orgId = getOrgId(req);

        let query = `
            SELECT c.*, a.name as default_area_name
            FROM categories c
            LEFT JOIN areas a ON c.default_area_id = a.id
            WHERE c.active = 1
        `;
        if (orgId) query += ` AND (c.org_id = '${orgId}' OR c.org_id = 'org-demo' OR c.org_id = 'null' OR c.org_id IS NULL)`;
        query += ' ORDER BY c.sort_order, c.name';

        const categories = getAll(query);

        // Get subcategories for each category
        const result = categories.map(cat => {
            const subcategories = getAll(`
                SELECT id, name, sort_order
                FROM subcategories
                WHERE category_id = '${cat.id}' AND active = 1
                ORDER BY sort_order, name
            `);
            return { ...cat, subcategories };
        });

        res.json(result);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Erro ao buscar categorias' });
    }
});

// GET /api/categories/:id - Get single category with subcategories
router.get('/:id', (req, res) => {
    try {
        const category = getOne(`
            SELECT c.*, a.name as default_area_name
            FROM categories c
            LEFT JOIN areas a ON c.default_area_id = a.id
            WHERE c.id = '${req.params.id}'
        `);

        if (!category) {
            return res.status(404).json({ error: 'Categoria não encontrada' });
        }

        category.subcategories = getAll(`
            SELECT id, name, sort_order
            FROM subcategories
            WHERE category_id = '${category.id}' AND active = 1
            ORDER BY sort_order, name
        `);

        res.json(category);
    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({ error: 'Erro ao buscar categoria' });
    }
});

// POST /api/categories - Create new category
router.post('/', (req, res) => {
    try {
        const { name, icon, color, default_area_id } = req.body;
        const orgId = getOrgId(req);

        if (!name || name.trim().length < 2) {
            return res.status(400).json({ error: 'Nome da categoria é obrigatório (mínimo 2 caracteres)' });
        }

        // Check for duplicate name
        const existing = getOne(`SELECT id FROM categories WHERE name = '${name}' AND org_id = '${orgId}' AND active = 1`);
        if (existing) {
            return res.status(400).json({ error: 'Já existe uma categoria com este nome' });
        }

        const id = uuidv4();
        const maxOrder = getOne(`SELECT MAX(sort_order) as max FROM categories WHERE org_id = '${orgId}'`);
        const sortOrder = (maxOrder?.max || 0) + 1;

        run(`
            INSERT INTO categories (id, org_id, name, icon, color, default_area_id, sort_order)
            VALUES ('${id}', '${orgId}', '${name}', '${icon || 'Tag'}', '${color || '#6366f1'}', ${default_area_id ? `'${default_area_id}'` : 'NULL'}, ${sortOrder})
        `);

        const created = getOne(`SELECT * FROM categories WHERE id = '${id}'`);
        created.subcategories = [];

        res.status(201).json(created);
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ error: 'Erro ao criar categoria' });
    }
});

// PUT /api/categories/:id - Update category
router.put('/:id', (req, res) => {
    try {
        const { name, icon, color, default_area_id, sort_order } = req.body;
        const categoryId = req.params.id;

        const existing = getOne(`SELECT * FROM categories WHERE id = '${categoryId}'`);
        if (!existing) {
            return res.status(404).json({ error: 'Categoria não encontrada' });
        }

        run(`
            UPDATE categories SET
                name = '${name || existing.name}',
                icon = '${icon || existing.icon}',
                color = '${color || existing.color}',
                default_area_id = ${default_area_id ? `'${default_area_id}'` : 'NULL'},
                sort_order = ${sort_order !== undefined ? sort_order : existing.sort_order}
            WHERE id = '${categoryId}'
        `);

        const updated = getOne(`SELECT * FROM categories WHERE id = '${categoryId}'`);
        updated.subcategories = getAll(`
            SELECT id, name, sort_order FROM subcategories
            WHERE category_id = '${categoryId}' AND active = 1
            ORDER BY sort_order, name
        `);

        res.json(updated);
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ error: 'Erro ao atualizar categoria' });
    }
});

// DELETE /api/categories/:id - Soft delete category
router.delete('/:id', (req, res) => {
    try {
        const categoryId = req.params.id;

        const existing = getOne(`SELECT * FROM categories WHERE id = '${categoryId}'`);
        if (!existing) {
            return res.status(404).json({ error: 'Categoria não encontrada' });
        }

        // Check if category has tickets
        const ticketsCount = getOne(`SELECT COUNT(*) as count FROM tickets WHERE category = '${categoryId}'`);
        if (ticketsCount?.count > 0) {
            return res.status(400).json({
                error: `Esta categoria possui ${ticketsCount.count} ticket(s). Não é possível excluir.`
            });
        }

        // Soft delete
        run(`UPDATE categories SET active = 0 WHERE id = '${categoryId}'`);
        run(`UPDATE subcategories SET active = 0 WHERE category_id = '${categoryId}'`);

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ error: 'Erro ao excluir categoria' });
    }
});

// ============================================
// SUBCATEGORIES
// ============================================

// POST /api/categories/:id/subcategories - Add subcategory
router.post('/:id/subcategories', (req, res) => {
    try {
        const categoryId = req.params.id;
        const { name } = req.body;

        const category = getOne(`SELECT * FROM categories WHERE id = '${categoryId}'`);
        if (!category) {
            return res.status(404).json({ error: 'Categoria não encontrada' });
        }

        if (!name || name.trim().length < 2) {
            return res.status(400).json({ error: 'Nome da subcategoria é obrigatório (mínimo 2 caracteres)' });
        }

        // Check for duplicate
        const existing = getOne(`SELECT id FROM subcategories WHERE name = '${name}' AND category_id = '${categoryId}' AND active = 1`);
        if (existing) {
            return res.status(400).json({ error: 'Já existe uma subcategoria com este nome nesta categoria' });
        }

        const id = uuidv4();
        const maxOrder = getOne(`SELECT MAX(sort_order) as max FROM subcategories WHERE category_id = '${categoryId}'`);
        const sortOrder = (maxOrder?.max || 0) + 1;

        run(`
            INSERT INTO subcategories (id, category_id, name, sort_order)
            VALUES ('${id}', '${categoryId}', '${name}', ${sortOrder})
        `);

        const created = getOne(`SELECT * FROM subcategories WHERE id = '${id}'`);
        res.status(201).json(created);
    } catch (error) {
        console.error('Error creating subcategory:', error);
        res.status(500).json({ error: 'Erro ao criar subcategoria' });
    }
});

// PUT /api/categories/:categoryId/subcategories/:id - Update subcategory
router.put('/:categoryId/subcategories/:id', (req, res) => {
    try {
        const { name, sort_order } = req.body;
        const subcategoryId = req.params.id;

        const existing = getOne(`SELECT * FROM subcategories WHERE id = '${subcategoryId}'`);
        if (!existing) {
            return res.status(404).json({ error: 'Subcategoria não encontrada' });
        }

        run(`
            UPDATE subcategories SET
                name = '${name || existing.name}',
                sort_order = ${sort_order !== undefined ? sort_order : existing.sort_order}
            WHERE id = '${subcategoryId}'
        `);

        const updated = getOne(`SELECT * FROM subcategories WHERE id = '${subcategoryId}'`);
        res.json(updated);
    } catch (error) {
        console.error('Error updating subcategory:', error);
        res.status(500).json({ error: 'Erro ao atualizar subcategoria' });
    }
});

// DELETE /api/categories/:categoryId/subcategories/:id - Delete subcategory
router.delete('/:categoryId/subcategories/:id', (req, res) => {
    try {
        const subcategoryId = req.params.id;

        const existing = getOne(`SELECT * FROM subcategories WHERE id = '${subcategoryId}'`);
        if (!existing) {
            return res.status(404).json({ error: 'Subcategoria não encontrada' });
        }

        // Check if subcategory has tickets
        const ticketsCount = getOne(`SELECT COUNT(*) as count FROM tickets WHERE subcategory = '${subcategoryId}'`);
        if (ticketsCount?.count > 0) {
            return res.status(400).json({
                error: `Esta subcategoria possui ${ticketsCount.count} ticket(s). Não é possível excluir.`
            });
        }

        run(`UPDATE subcategories SET active = 0 WHERE id = '${subcategoryId}'`);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting subcategory:', error);
        res.status(500).json({ error: 'Erro ao excluir subcategoria' });
    }
});

export default router;
