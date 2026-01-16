import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getOne, getAll, run } from '../database.js';
import { verifyToken } from '../auth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Allowed file types
const ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// GET /api/attachments/:ticketId - Get all attachments for a ticket
router.get('/debug-check', (req, res) => {
    try {
        const atts = getAll("SELECT id, uploaded_at, status_history_id, comment_id, original_name FROM attachments ORDER BY uploaded_at DESC LIMIT 5");
        const hist = getAll("SELECT id, ticket_id, changed_at, notes FROM status_history ORDER BY changed_at DESC LIMIT 5");
        res.json({
            last_attachments: atts,
            last_history: hist,
            diagnostic: 'Checking linkage...'
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/:ticketId', (req, res) => {
    try {
        const { ticketId } = req.params;

        const attachments = getAll(`
            SELECT a.*, u.name as uploaded_by_name
            FROM attachments a
            LEFT JOIN users u ON a.uploaded_by = u.id
            WHERE a.ticket_id = '${ticketId}'
            ORDER BY a.uploaded_at DESC
        `);

        res.json(attachments);
    } catch (error) {
        console.error('Error fetching attachments:', error);
        res.status(500).json({ error: 'Erro ao buscar anexos' });
    }
});

// POST /api/attachments/:ticketId - Upload attachment
router.post('/:ticketId', (req, res) => {
    try {
        const { ticketId } = req.params;

        // Check ticket exists
        const ticket = getOne(`SELECT id FROM tickets WHERE id = '${ticketId}'`);
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket não encontrado' });
        }

        // Get user from auth
        let userId = null;
        const authHeader = req.headers.authorization;
        if (authHeader) {
            try {
                const token = authHeader.substring(7);
                const decoded = verifyToken(token);
                if (decoded) {
                    userId = decoded.userId;
                }
            } catch (e) { /* ignore */ }
        }

        // Parse multipart form data (base64 encoded for simplicity)
        const { filename, data, mimeType } = req.body;

        if (!filename || !data || !mimeType) {
            return res.status(400).json({ error: 'Arquivo inválido' });
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(mimeType)) {
            return res.status(400).json({
                error: 'Tipo de arquivo não permitido. Use: imagens, PDF, Word ou Excel'
            });
        }

        // Decode base64
        const buffer = Buffer.from(data, 'base64');

        // Validate size
        if (buffer.length > MAX_FILE_SIZE) {
            return res.status(400).json({ error: 'Arquivo muito grande. Máximo: 10MB' });
        }

        // Generate unique filename
        const id = uuidv4();
        const ext = path.extname(filename) || '.bin';
        const storedFilename = `${id}${ext}`;
        const filePath = path.join(uploadsDir, storedFilename);

        // Save file
        fs.writeFileSync(filePath, buffer);

        // Save to database
        const now = new Date().toISOString();
        run(`
            INSERT INTO attachments (id, ticket_id, filename, original_name, mime_type, size, uploaded_by, uploaded_at)
            VALUES ('${id}', '${ticketId}', '${storedFilename}', '${filename.replace(/'/g, "''")}', '${mimeType}', ${buffer.length}, ${userId ? `'${userId}'` : 'NULL'}, '${now}')
        `);

        const attachment = getOne(`
            SELECT a.*, u.name as uploaded_by_name
            FROM attachments a
            LEFT JOIN users u ON a.uploaded_by = u.id
            WHERE a.id = '${id}'
        `);

        res.status(201).json(attachment);
    } catch (error) {
        console.error('Error uploading attachment:', error);
        res.status(500).json({ error: 'Erro ao fazer upload do anexo' });
    }
});

// GET /api/attachments/file/:id - Download/view attachment
router.get('/file/:id', (req, res) => {
    try {
        const { id } = req.params;

        const attachment = getOne(`SELECT * FROM attachments WHERE id = '${id}'`);
        if (!attachment) {
            return res.status(404).json({ error: 'Anexo não encontrado' });
        }

        const filePath = path.join(uploadsDir, attachment.filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Arquivo não encontrado' });
        }

        res.setHeader('Content-Type', attachment.mime_type);
        // Normalize filename to be safe for headers (ASCII only approximation for legacy, plus RFC 5987 for modern browsers)
        const safeName = attachment.original_name.replace(/[^\x20-\x7E]/g, '_');
        const encodedName = encodeURIComponent(attachment.original_name);
        res.setHeader('Content-Disposition', `inline; filename="${safeName}"; filename*=UTF-8''${encodedName}`);
        res.sendFile(filePath);
    } catch (error) {
        console.error('Error downloading attachment:', error);
        res.status(500).json({ error: 'Erro ao baixar anexo' });
    }
});

// DELETE /api/attachments/:id - Delete attachment
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;

        const attachment = getOne(`SELECT * FROM attachments WHERE id = '${id}'`);
        if (!attachment) {
            return res.status(404).json({ error: 'Anexo não encontrado' });
        }

        // Delete file
        const filePath = path.join(uploadsDir, attachment.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Delete from database
        run(`DELETE FROM attachments WHERE id = '${id}'`);

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting attachment:', error);
        res.status(500).json({ error: 'Erro ao excluir anexo' });
    }
});

export default router;
