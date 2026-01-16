import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getAll, getOne, run } from '../database.js';

const router = Router();

// Simple CSV parser (no external dependency)
function parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return { headers: [], rows: [] };

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));
        if (values.length === headers.length) {
            const row = {};
            headers.forEach((h, idx) => {
                row[h] = values[idx];
            });
            rows.push(row);
        }
    }

    return { headers, rows };
}

// POST /api/import/clients - Bulk import clients from CSV
router.post('/clients', (req, res) => {
    try {
        const orgId = req.user?.org_id || 'org-demo';
        const { csv } = req.body;

        if (!csv) {
            return res.status(400).json({ error: 'CSV data is required' });
        }

        const { headers, rows } = parseCSV(csv);

        // Validate required columns
        if (!headers.includes('name') && !headers.includes('nome')) {
            return res.status(400).json({
                error: 'CSV deve conter coluna "name" ou "nome"',
                expected_columns: ['name', 'email', 'phone', 'is_vip', 'notes']
            });
        }

        const results = {
            total: rows.length,
            success: 0,
            errors: []
        };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const name = row.name || row.nome;

            if (!name || name.trim() === '') {
                results.errors.push({ row: i + 2, error: 'Nome vazio' });
                continue;
            }

            try {
                const id = `client-${uuidv4().slice(0, 8)}`;
                const isVip = row.is_vip === '1' || row.is_vip === 'true' || row.vip === '1' ? 1 : 0;

                run(`
                    INSERT INTO clients (id, org_id, name, is_vip, contact_email, contact_phone, notes)
                    VALUES (
                        '${id}',
                        '${orgId}',
                        '${name.trim().replace(/'/g, "''")}',
                        ${isVip},
                        ${row.email ? `'${row.email}'` : 'NULL'},
                        ${row.phone || row.telefone ? `'${row.phone || row.telefone}'` : 'NULL'},
                        ${row.notes || row.notas ? `'${(row.notes || row.notas).replace(/'/g, "''")}'` : 'NULL'}
                    )
                `);
                results.success++;
            } catch (err) {
                results.errors.push({ row: i + 2, error: err.message });
            }
        }

        res.json(results);
    } catch (error) {
        console.error('Error importing clients:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/import/products - Bulk import products from CSV
router.post('/products', (req, res) => {
    try {
        const orgId = req.user?.org_id || 'org-demo';
        const { csv } = req.body;

        if (!csv) {
            return res.status(400).json({ error: 'CSV data is required' });
        }

        const { headers, rows } = parseCSV(csv);

        if (!headers.includes('name') && !headers.includes('nome')) {
            return res.status(400).json({
                error: 'CSV deve conter coluna "name" ou "nome"',
                expected_columns: ['name', 'description']
            });
        }

        const results = {
            total: rows.length,
            success: 0,
            errors: []
        };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const name = row.name || row.nome;

            if (!name || name.trim() === '') {
                results.errors.push({ row: i + 2, error: 'Nome vazio' });
                continue;
            }

            try {
                const id = `prod-${uuidv4().slice(0, 8)}`;

                run(`
                    INSERT INTO products (id, org_id, name, description, active)
                    VALUES (
                        '${id}',
                        '${orgId}',
                        '${name.trim().replace(/'/g, "''")}',
                        ${row.description || row.descricao ? `'${(row.description || row.descricao).replace(/'/g, "''")}'` : 'NULL'},
                        1
                    )
                `);
                results.success++;
            } catch (err) {
                results.errors.push({ row: i + 2, error: err.message });
            }
        }

        res.json(results);
    } catch (error) {
        console.error('Error importing products:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/import/template/:type - Download CSV template
router.get('/template/:type', (req, res) => {
    const { type } = req.params;

    let csv = '';
    if (type === 'clients') {
        csv = 'name,email,phone,is_vip,notes\n';
        csv += 'Empresa ABC,contato@abc.com,11999998888,0,Cliente desde 2020\n';
        csv += 'Empresa VIP,vip@empresa.com,11999997777,1,Cliente prioritário\n';
    } else if (type === 'products') {
        csv = 'name,description\n';
        csv += 'Produto A,Descrição do produto A\n';
        csv += 'Produto B,Descrição do produto B\n';
    } else {
        return res.status(404).json({ error: 'Template não encontrado' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_template.csv`);
    res.send(csv);
});

export default router;
