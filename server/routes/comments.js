import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getOne, getAll, run } from '../database.js';
import { verifyToken } from '../auth.js';

const router = Router();

// GET /api/comments/:ticketId - Get unified activity log (comments + status history + attachments)
router.get('/:ticketId', (req, res) => {
    try {
        const { ticketId } = req.params;

        // 1. Get user comments
        const comments = getAll(`
            SELECT c.id, c.ticket_id, c.user_id, c.comment_type, c.content, c.created_at,
                   u.name as user_name, u.role as user_role, 'comment' as entry_type
            FROM ticket_comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.ticket_id = '${ticketId}'
        `);

        // 2. Get status history (treated as system actions)
        const history = getAll(`
            SELECT h.id, h.ticket_id, h.notes, h.changed_at as created_at, h.from_status, h.to_status,
                   u.name as user_name, u.role as user_role, 'status_change' as entry_type,
                   'action' as comment_type
            FROM status_history h
            LEFT JOIN users u ON h.changed_by = u.id
            WHERE h.ticket_id = '${ticketId}'
        `);

        // 3. Get all attachments (with user info)
        const attachments = getAll(`
            SELECT a.*, u.name as user_name, u.role as user_role 
            FROM attachments a
            LEFT JOIN users u ON a.uploaded_by = u.id
            WHERE a.ticket_id = '${ticketId}'
        `);

        // 4. Normalize and merge
        const unified = [
            ...comments.map(c => ({
                ...c,
                display_content: c.content,
                attachments: []
            })),
            ...history.map(h => ({
                id: h.id,
                ticket_id: h.ticket_id,
                user_name: h.user_name || 'Sistema',
                user_role: h.user_role,
                comment_type: 'action', // Status change is an action
                entry_type: 'status_change',
                created_at: h.created_at,
                // Format content to show status change + notes
                display_content: `Alterou status: ${h.from_status || 'Novo'} ➝ ${h.to_status}\n${h.notes ? `Motivo: ${h.notes}` : ''}`,
                from_status: h.from_status,
                to_status: h.to_status,
                notes: h.notes,
                attachments: []
            }))
        ];

        // 5. Assign attachments to activity
        const assignedAttachmentIds = new Set();



        attachments.forEach(att => {
            // Priority 1: Direct Link via StatusHistoryID or CommentID
            let assigned = false;

            if (att.status_history_id || att.comment_id) {
                const target = unified.find(item =>
                    (item.entry_type === 'status_change' && item.id == att.status_history_id) ||
                    (item.entry_type === 'comment' && item.id == att.comment_id)
                );

                if (target) {
                    target.attachments.push(att);
                    assignedAttachmentIds.add(att.id);
                    assigned = true;
                }
            }

            // If found via ID, skip time heuristic
            if (assigned) return;

            // Priority 2: Time-based Heuristic (Fallback for old data)
            const attTime = new Date(att.uploaded_at || att.created_at).getTime();

            // Find closest activity
            let closest = null;
            let minDiff = Infinity;

            unified.forEach(item => {
                const itemTime = new Date(item.created_at).getTime();
                const diff = Math.abs(attTime - itemTime);

                // If within 60 seconds (allow for some lag between upload and log creation)
                if (diff < 60000 && diff < minDiff) {
                    minDiff = diff;
                    closest = item;
                }
            });

            if (closest) {
                closest.attachments.push(att);
                assignedAttachmentIds.add(att.id);
            }
        });

        // 6. Handle orphan attachments (not assigned to any activity)
        attachments.forEach(att => {
            if (!assignedAttachmentIds.has(att.id)) {
                unified.push({
                    id: att.id + '_log',
                    ticket_id: att.ticket_id,
                    user_name: att.user_name || 'Sistema',
                    user_role: att.user_role || 'agent',
                    comment_type: 'action',
                    entry_type: 'attachment_upload',
                    created_at: att.uploaded_at || att.created_at,
                    display_content: 'Anexou arquivo:',
                    attachments: [att]
                });
            }
        });

        // 6. Sort by date ASC
        unified.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        res.json(unified);
    } catch (error) {
        console.error('Error fetching activity log:', error);
        res.status(500).json({ error: 'Erro ao buscar histórico de atividades' });
    }
});

// POST /api/comments/:ticketId - Add a comment to a ticket
router.post('/:ticketId', (req, res) => {
    try {
        const { ticketId } = req.params;
        const { content, comment_type = 'internal' } = req.body;

        // Validate ticket exists
        const ticket = getOne(`SELECT id FROM tickets WHERE id = '${ticketId}'`);
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket não encontrado' });
        }

        // Validate content
        if (!content || content.trim().length < 3) {
            return res.status(400).json({ error: 'O comentário deve ter pelo menos 3 caracteres' });
        }

        // Validate comment type
        if (!['internal', 'public', 'action'].includes(comment_type)) {
            return res.status(400).json({ error: 'Tipo de comentário inválido' });
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

        const id = uuidv4();
        const now = new Date().toISOString();
        const escapedContent = content.replace(/'/g, "''");

        run(`
            INSERT INTO ticket_comments (id, ticket_id, user_id, comment_type, content, created_at)
            VALUES ('${id}', '${ticketId}', ${userId ? `'${userId}'` : 'NULL'}, '${comment_type}', '${escapedContent}', '${now}')
        `);

        // Also update ticket updated_at
        run(`UPDATE tickets SET updated_at = '${now}' WHERE id = '${ticketId}'`);

        const comment = getOne(`
            SELECT c.*, u.name as user_name, u.role as user_role
            FROM ticket_comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.id = '${id}'
        `);

        res.status(201).json(comment);
    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).json({ error: 'Erro ao adicionar comentário' });
    }
});

// DELETE /api/comments/:id - Delete a comment (admin only)
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;

        const comment = getOne(`SELECT * FROM ticket_comments WHERE id = '${id}'`);
        if (!comment) {
            return res.status(404).json({ error: 'Comentário não encontrado' });
        }

        run(`DELETE FROM ticket_comments WHERE id = '${id}'`);

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ error: 'Erro ao excluir comentário' });
    }
});

export default router;
