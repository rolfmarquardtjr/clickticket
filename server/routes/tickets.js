import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getOne, getAll, run } from '../database.js';
import { validateTransition, getAvailableActions, STATUS } from '../statusMachine.js';
import { calculateDeadline, enrichTicketWithSLA } from '../slaEngine.js';
import { getCategoryById, CATEGORIES, ORIGIN_CHANNELS, validateOriginChannel } from '../categories.js';
import { verifyToken } from '../auth.js';
import { sendEmailReply } from '../services/emailSender.js';

const router = Router();

function getAreaColumns(areaId, orgId) {
    return getAll(`
        SELECT status_key, is_closed
        FROM kanban_columns
        WHERE area_id = '${areaId}'
          AND (org_id = '${orgId}' OR org_id = 'org-demo' OR org_id IS NULL)
        ORDER BY sort_order ASC
    `);
}

// GET /api/tickets - List all tickets with filters
router.get('/', (req, res) => {
    try {
        const { status, category, client_id, area_id, org_id } = req.query;

        // Get org_id from auth header if available
        let orgFilter = '';
        const authHeader = req.headers.authorization;
        if (authHeader) {
            try {
                const token = authHeader.substring(7);
                const decoded = verifyToken(token);
                if (decoded) {
                    orgFilter = ` AND t.org_id = '${decoded.orgId}'`;
                }
            } catch (e) { /* ignore auth errors for backward compatibility */ }
        }

        let query = `
      SELECT t.*, c.name as client_name, c.is_vip as client_is_vip, a.name as area_name,
             uc.name as created_by_name, ua.name as assigned_to_name
      FROM tickets t
      LEFT JOIN clients c ON t.client_id = c.id
      LEFT JOIN areas a ON t.area_id = a.id
      LEFT JOIN users uc ON t.created_by = uc.id
      LEFT JOIN users ua ON t.assigned_to = ua.id
      WHERE 1=1 ${orgFilter}
    `;

        if (status) {
            query += ` AND t.status = '${status}'`;
        }
        if (category) {
            query += ` AND t.category = '${category}'`;
        }
        if (client_id) {
            query += ` AND t.client_id = '${client_id}'`;
        }
        if (area_id) {
            query += ` AND t.area_id = '${area_id}'`;
        }

        query += ' ORDER BY t.created_at DESC';

        const tickets = getAll(query);

        // Enrich each ticket with SLA status
        const enrichedTickets = tickets.map(ticket => {
            const enriched = enrichTicketWithSLA(ticket);
            enriched.available_actions = getAvailableActions(ticket.status);
            return enriched;
        });

        // Sort by SLA priority: quebrado > risco > ok
        const slaPriority = { quebrado: 0, risco: 1, ok: 2 };
        enrichedTickets.sort((a, b) => {
            return (slaPriority[a.sla_status] || 2) - (slaPriority[b.sla_status] || 2);
        });

        res.json(enrichedTickets);
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({ error: 'Erro ao buscar tickets' });
    }
});

// GET /api/tickets/categories/list - Get all categories
router.get('/categories/list', (req, res) => {
    res.json(CATEGORIES);
});

// GET /api/tickets/origin-channels - Get origin channels
router.get('/origin-channels', (req, res) => {
    res.json(ORIGIN_CHANNELS);
});

// GET /api/tickets/:id - Get single ticket
router.get('/:id', (req, res) => {
    try {
        const ticket = getOne(`
      SELECT t.*, c.name as client_name, a.name as area_name,
             uc.name as created_by_name, ua.name as assigned_to_name
      FROM tickets t
      LEFT JOIN clients c ON t.client_id = c.id
      LEFT JOIN areas a ON t.area_id = a.id
      LEFT JOIN users uc ON t.created_by = uc.id
      LEFT JOIN users ua ON t.assigned_to = ua.id
      WHERE t.id = '${req.params.id}'
    `);

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket não encontrado' });
        }

        const enriched = enrichTicketWithSLA(ticket);
        enriched.available_actions = getAvailableActions(ticket.status);

        // Get category info for checklist
        const categoryInfo = getCategoryById(ticket.category);
        if (categoryInfo) {
            enriched.category_name = categoryInfo.name;
            enriched.checklist = categoryInfo.checklist;
        }

        // Get origin channel info
        const originChannel = ORIGIN_CHANNELS.find(ch => ch.id === ticket.origin_channel);
        if (originChannel) {
            enriched.origin_channel_name = originChannel.name;
        }

        // Get status history with user info
        enriched.history = getAll(`
      SELECT sh.*, u.name as changed_by_name
      FROM status_history sh
      LEFT JOIN users u ON sh.changed_by = u.id
      WHERE sh.ticket_id = '${req.params.id}'
      ORDER BY sh.changed_at DESC
    `);

        // Include attachments in history
        if (enriched.history && enriched.history.length > 0) {
            // Strategy: Fetch all attachments for ticket preventing SQL syntax errors with IN clause
            const allAttachments = getAll(`SELECT * FROM attachments WHERE ticket_id = '${req.params.id}'`);


            enriched.history.forEach(h => {
                // Hybrid approach: Direct link OR Time-based heuristic
                h.attachments = allAttachments.filter(a => {
                    // 1. Direct match
                    if (a.status_history_id == h.id) return true;
                    // 2. Fallback: Time proximity (if not linked)
                    if (!a.status_history_id) {
                        const timeDiff = Math.abs(new Date(a.uploaded_at) - new Date(h.changed_at));
                        return timeDiff <= 60000; // 1 minute window
                    }
                    return false;
                });
            });
        }

        res.json(enriched);
    } catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({ error: 'Erro ao buscar ticket' });
    }
});

// POST /api/tickets - Create new ticket (with origin validation)
router.post('/', (req, res) => {
    try {
        const {
            client_id, category, subcategory, description, impact, area_id,
            origin_channel, origin_contact, origin_reference, custom_data
        } = req.body;

        // Get user info from auth header
        let userId = null;
        let orgId = null;
        const authHeader = req.headers.authorization;
        if (authHeader) {
            try {
                const token = authHeader.substring(7);
                const decoded = verifyToken(token);
                if (decoded) {
                    userId = decoded.userId;
                    orgId = decoded.orgId;
                }
            } catch (e) { /* ignore */ }
        }

        // Validate required fields (poka-yoke)
        const errors = [];

        // Origin validation (NEW)
        if (!origin_channel) errors.push('Canal de origem é obrigatório');
        if (origin_channel) {
            const channelValidation = validateOriginChannel(origin_channel);
            if (!channelValidation.valid) {
                errors.push(channelValidation.error);
            }
        }

        if (!client_id) errors.push('Cliente é obrigatório');
        if (!category) errors.push('Categoria é obrigatória');
        if (!subcategory) errors.push('Subcategoria é obrigatória');
        if (!impact) errors.push('Impacto é obrigatório');
        if (!area_id) errors.push('Área responsável é obrigatória');

        if (impact && !['baixo', 'medio', 'alto'].includes(impact)) {
            errors.push('Impacto deve ser: baixo, medio ou alto');
        }

        // Validate category-subcategory combination per org
        if (category && subcategory) {
            if (orgId) {
                const categoryRow = getOne(`
                    SELECT id FROM categories
                    WHERE id = '${category}' AND org_id = '${orgId}' AND active = 1
                `);
                if (!categoryRow) {
                    errors.push('Categoria inválida para esta organização');
                } else {
                    const subRow = getOne(`
                        SELECT id FROM subcategories
                        WHERE id = '${subcategory}' AND category_id = '${category}' AND active = 1
                    `);
                    if (!subRow) {
                        errors.push('Subcategoria inválida para esta categoria');
                    }
                }
            } else {
                const categoryInfo = getCategoryById(category);
                if (!categoryInfo) {
                    errors.push('Categoria inválida');
                } else if (!categoryInfo.subcategories?.some(s => s.id === subcategory)) {
                    errors.push('Subcategoria inválida para esta categoria');
                }
            }
        }

        // Validate client exists
        if (client_id) {
            const client = getOne(`SELECT id FROM clients WHERE id = '${client_id}'`);
            if (!client) {
                errors.push('Cliente não encontrado');
            }
        }

        // Validate area exists
        if (area_id) {
            const area = getOne(`SELECT id FROM areas WHERE id = '${area_id}'`);
            if (!area) {
                errors.push('Área responsável não encontrada');
            }
        }

        // Validate Custom Fields for Category
        if (orgId && category) {
            const catId = getCategoryById(category)?.id;
            if (catId) {
                const requiredFields = getAll(`
                    SELECT * FROM custom_fields 
                    WHERE org_id = '${orgId}' 
                    AND entity_type = 'category' 
                    AND entity_id = '${catId}'
                    AND active = 1 
                    AND required = 1
                `);

                for (const field of requiredFields) {
                    if (!custom_data || !custom_data[field.id] || custom_data[field.id].toString().trim() === '') {
                        errors.push(`O campo '${field.label}' é obrigatório`);
                    }
                }
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        // Calculate SLA deadline
        const now = new Date().toISOString();
        const slaDeadline = calculateDeadline(impact, now).toISOString();

        const id = uuidv4();

        run(`
      INSERT INTO tickets (
        id, org_id, client_id, category, subcategory, description, impact, area_id, 
        status, sla_deadline, origin_channel, origin_contact, origin_reference,
        created_by, created_at, updated_at, custom_data
      )
      VALUES (
        '${id}', ${orgId ? `'${orgId}'` : 'NULL'}, '${client_id}', '${category}', '${subcategory}', 
        '${description || ''}', '${impact}', '${area_id}', '${STATUS.NOVO}', '${slaDeadline}',
        '${origin_channel}', '${origin_contact || ''}', '${origin_reference || ''}',
        ${userId ? `'${userId}'` : 'NULL'}, '${now}', '${now}',
        ${custom_data ? `'${JSON.stringify(custom_data)}'` : 'NULL'}
      )
    `);

        // Record initial status in history
        run(`
      INSERT INTO status_history (ticket_id, from_status, to_status, changed_by, changed_at)
      VALUES ('${id}', NULL, '${STATUS.NOVO}', ${userId ? `'${userId}'` : 'NULL'}, '${now}')
    `);

        // Return created ticket
        const created = getOne(`
      SELECT t.*, c.name as client_name, a.name as area_name
      FROM tickets t
      LEFT JOIN clients c ON t.client_id = c.id
      LEFT JOIN areas a ON t.area_id = a.id
      WHERE t.id = '${id}'
    `);

        res.status(201).json(enrichTicketWithSLA(created));
    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({ error: 'Erro ao criar ticket' });
    }
});

// PATCH /api/tickets/:id/status - Change ticket status (with notes for audit)
router.patch('/:id/status', (req, res) => {
    try {
        const { status: newStatus, notes } = req.body;
        const ticketId = req.params.id;

        // Get user info from auth header
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

        // Get current ticket
        const ticket = getOne(`SELECT * FROM tickets WHERE id = '${ticketId}'`);

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket não encontrado' });
        }

        const orgId = ticket.org_id || 'org-demo';
        const areaColumns = getAreaColumns(ticket.area_id, orgId);
        const isClosedCurrent = areaColumns.some(col => col.status_key === ticket.status && col.is_closed);
        if (isClosedCurrent) {
            return res.status(400).json({ error: 'Ticket encerrado não pode mudar de status' });
        }
        if (areaColumns.length > 0 && !areaColumns.some(col => col.status_key === newStatus)) {
            return res.status(400).json({ error: 'Status inválido para esta área' });
        }

        // Validate transition (poka-yoke)
        const validation = validateTransition(ticket.status, newStatus);

        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        // TODAS as transições precisam de anotação obrigatória
        if (!notes || notes.trim().length < 10) {
            return res.status(400).json({
                error: `Anotação obrigatória para mudança de status (mínimo 10 caracteres)`
            });
        }

        const now = new Date().toISOString();

        // Track first response
        let firstResponseUpdate = '';
        if (newStatus === STATUS.EM_ANALISE && !ticket.first_response_at) {
            firstResponseUpdate = `, first_response_at = '${now}'`;
        }

        // Build update query based on new status
        if (newStatus === STATUS.RESOLVIDO) {
            run(`UPDATE tickets SET status = '${newStatus}', updated_at = '${now}', resolved_at = '${now}'${firstResponseUpdate} WHERE id = '${ticketId}'`);
        } else if (newStatus === STATUS.ENCERRADO) {
            run(`UPDATE tickets SET status = '${newStatus}', updated_at = '${now}', closed_at = '${now}'${firstResponseUpdate} WHERE id = '${ticketId}'`);
        } else {
            run(`UPDATE tickets SET status = '${newStatus}', updated_at = '${now}'${firstResponseUpdate} WHERE id = '${ticketId}'`);
        }

        // Record status change in history with notes
        const escapedNotes = notes ? notes.replace(/'/g, "''") : null;
        run(`
      INSERT INTO status_history (ticket_id, from_status, to_status, changed_by, changed_at, notes)
      VALUES ('${ticketId}', '${ticket.status}', '${newStatus}', ${userId ? `'${userId}'` : 'NULL'}, '${now}', ${escapedNotes ? `'${escapedNotes}'` : 'NULL'})
    `);

        // Link attachments if provided
        const { attachmentIds } = req.body;



        if (attachmentIds && Array.isArray(attachmentIds) && attachmentIds.length > 0) {
            // Get the ID of the inserted history record
            const historyRecord = getOne(`SELECT id FROM status_history WHERE ticket_id = '${ticketId}' ORDER BY id DESC LIMIT 1`);

            if (historyRecord) {
                const idsList = attachmentIds.map(id => `'${id}'`).join(',');
                const updateQ = `UPDATE attachments SET status_history_id = ${historyRecord.id} WHERE id IN (${idsList})`;
                run(updateQ);
            }
        }

        // Return updated ticket
        const updated = getOne(`
      SELECT t.*, c.name as client_name, a.name as area_name
      FROM tickets t
      LEFT JOIN clients c ON t.client_id = c.id
      LEFT JOIN areas a ON t.area_id = a.id
      WHERE t.id = '${ticketId}'
    `);

        const enriched = enrichTicketWithSLA(updated);
        enriched.available_actions = getAvailableActions(newStatus);

        // Include updated history
        enriched.history = getAll(`
      SELECT sh.*, u.name as changed_by_name
      FROM status_history sh
      LEFT JOIN users u ON sh.changed_by = u.id
      WHERE sh.ticket_id = '${ticketId}'
      ORDER BY sh.changed_at DESC
    `);

        // Include attachments in history
        if (enriched.history && enriched.history.length > 0) {
            // Strategy: Fetch all attachments for ticket preventing SQL syntax errors
            const allAttachments = getAll(`SELECT * FROM attachments WHERE ticket_id = '${ticketId}'`);


            enriched.history.forEach(h => {
                // Hybrid approach: Direct link OR Time-based heuristic
                h.attachments = allAttachments.filter(a => {
                    // 1. Direct match
                    if (a.status_history_id == h.id) return true;
                    // 2. Fallback: Time proximity (if not linked)
                    if (!a.status_history_id) {
                        const timeDiff = Math.abs(new Date(a.uploaded_at) - new Date(h.changed_at));
                        return timeDiff <= 60000; // 1 minute window
                    }
                    return false;
                });
            });
        }

        res.json(enriched);
    } catch (error) {
        console.error('Error updating ticket status:', error);
        res.status(500).json({ error: 'Erro ao atualizar status do ticket' });
    }
});

// PATCH /api/tickets/:id/assign - Assign ticket to user
router.patch('/:id/assign', (req, res) => {
    try {
        const { assigned_to } = req.body;
        const ticketId = req.params.id;

        const ticket = getOne(`SELECT * FROM tickets WHERE id = '${ticketId}'`);
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket não encontrado' });
        }

        if (assigned_to) {
            const user = getOne(`SELECT id FROM users WHERE id = '${assigned_to}'`);
            if (!user) {
                return res.status(400).json({ error: 'Usuário não encontrado' });
            }
        }

        const now = new Date().toISOString();
        run(`UPDATE tickets SET assigned_to = ${assigned_to ? `'${assigned_to}'` : 'NULL'}, updated_at = '${now}' WHERE id = '${ticketId}'`);

        const updated = getOne(`
      SELECT t.*, c.name as client_name, a.name as area_name, u.name as assigned_to_name
      FROM tickets t
      LEFT JOIN clients c ON t.client_id = c.id
      LEFT JOIN areas a ON t.area_id = a.id
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.id = '${ticketId}'
    `);

        res.json(enrichTicketWithSLA(updated));
    } catch (error) {
        console.error('Error assigning ticket:', error);
        res.status(500).json({ error: 'Erro ao atribuir ticket' });
    }
});

// PATCH /api/tickets/:id/transfer - Transfer ticket to another area
router.patch('/:id/transfer', (req, res) => {
    try {
        const { area_id, notes, attachment_ids, custom_data } = req.body;
        const ticketId = req.params.id;

        // Get user info from auth header
        let userId = null;
        const authHeader = req.headers.authorization;
        if (authHeader) {
            try {
                const token = authHeader.substring(7);
                const decoded = verifyToken(token);
                if (decoded) {
                    userId = decoded.userId;
                    // We need orgId for custom fields validation
                    // But we can get it from the ticket or assume it's the same
                }
            } catch (e) { /* ignore */ }
        }

        const ticket = getOne(`SELECT * FROM tickets WHERE id = '${ticketId}'`);
        if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });

        const area = getOne(`SELECT * FROM areas WHERE id = '${area_id}'`);
        if (!area) return res.status(404).json({ error: 'Área não encontrada' });

        // Validate Custom Fields for Destination Area
        if (ticket.org_id) {
            const requiredFields = getAll(`
                SELECT * FROM custom_fields 
                WHERE org_id = '${ticket.org_id}' 
                AND entity_type = 'area' 
                AND entity_id = '${area_id}'
                AND active = 1 
                AND required = 1
            `);

            const errors = [];
            for (const field of requiredFields) {
                if (!custom_data || !custom_data[field.id] || custom_data[field.id].toString().trim() === '') {
                    errors.push(`O campo '${field.label}' é obrigatório para transferir para esta área`);
                }
            }

            if (errors.length > 0) {
                return res.status(400).json({ errors });
            }
        }

        // Merge Custom Data
        let updatedCustomData = ticket.custom_data ? JSON.parse(ticket.custom_data) : {};
        if (custom_data) {
            updatedCustomData = { ...updatedCustomData, ...custom_data };
        }

        const now = new Date().toISOString();
        const escapedNotes = notes ? notes.replace(/'/g, "''") : null;
        const historyNotes = `Transferido para área: ${area.name}` + (escapedNotes ? ` - Motivo: ${escapedNotes}` : '');
        const customDataJson = JSON.stringify(updatedCustomData).replace(/'/g, "''");

        // Update area, reset status to NOVO, CLEAR assignment, and Update Custom Data
        run(`UPDATE tickets SET area_id = '${area_id}', status = '${STATUS.NOVO}', assigned_to = NULL, updated_at = '${now}', custom_data = '${customDataJson}' WHERE id = '${ticketId}'`);

        // Record in history (auto-increment ID)
        run(`
      INSERT INTO status_history (ticket_id, from_status, to_status, changed_by, changed_at, notes)
      VALUES ('${ticketId}', '${ticket.status}', '${STATUS.NOVO}', ${userId ? `'${userId}'` : 'NULL'}, '${now}', '${historyNotes}')
    `);

        const historyRecord = getOne(`
      SELECT id FROM status_history
      WHERE ticket_id = '${ticketId}'
      ORDER BY id DESC
      LIMIT 1
    `);

        // Link attachments to this history record
        if (historyRecord && attachment_ids && attachment_ids.length > 0) {
            for (const attId of attachment_ids) {
                run(`UPDATE attachments SET status_history_id = ${historyRecord.id} WHERE id = '${attId}'`);
            }
        }

        // Return updated ticket
        const updated = getOne(`
      SELECT t.*, c.name as client_name, a.name as area_name,
             uc.name as created_by_name, ua.name as assigned_to_name
      FROM tickets t
      LEFT JOIN clients c ON t.client_id = c.id
      LEFT JOIN areas a ON t.area_id = a.id
      LEFT JOIN users uc ON t.created_by = uc.id
      LEFT JOIN users ua ON t.assigned_to = ua.id
      WHERE t.id = '${ticketId}'
    `);

        const enriched = enrichTicketWithSLA(updated);
        enriched.available_actions = getAvailableActions(updated.status);
        enriched.history = getAll(`
      SELECT sh.*, u.name as changed_by_name
      FROM status_history sh
      LEFT JOIN users u ON sh.changed_by = u.id
      WHERE sh.ticket_id = '${ticketId}'
      ORDER BY sh.changed_at DESC
    `);

        res.json(enriched);
    } catch (error) {
        console.error('Error transferring ticket:', error);
        res.status(500).json({ error: 'Erro ao transferir ticket' });
    }
});

// POST /api/tickets/:id/email-reply - Send email reply and log as public comment
router.post('/:id/email-reply', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Não autenticado' });
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);
        if (!decoded) {
            return res.status(401).json({ error: 'Não autenticado' });
        }

        const ticketId = req.params.id;
        const { content, subject } = req.body;

        if (!content || content.trim().length < 3) {
            return res.status(400).json({ error: 'A resposta deve ter pelo menos 3 caracteres' });
        }

        const ticket = getOne(`SELECT * FROM tickets WHERE id = '${ticketId}'`);
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket não encontrado' });
        }

        if (ticket.org_id && ticket.org_id !== decoded.orgId) {
            return res.status(403).json({ error: 'Sem permissão para este ticket' });
        }

        if (ticket.origin_channel !== 'email' || !ticket.email_mailbox_id) {
            return res.status(400).json({ error: 'Este ticket não permite resposta por e-mail' });
        }

        const mailbox = getOne(`
            SELECT * FROM email_mailboxes
            WHERE id = '${ticket.email_mailbox_id}' AND org_id = '${decoded.orgId}'
        `);
        if (!mailbox) {
            return res.status(404).json({ error: 'Caixa de e-mail não encontrada' });
        }

        const toEmail = ticket.email_reply_to || ticket.email_from || ticket.origin_contact;
        if (!toEmail) {
            return res.status(400).json({ error: 'E-mail do cliente não encontrado' });
        }

        const baseSubject = (subject || ticket.email_subject || `Ticket ${ticketId}`).trim();
        const finalSubject = baseSubject.toLowerCase().startsWith('re:') ? baseSubject : `Re: ${baseSubject}`;
        const text = content.trim();
        const html = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br/>');

        const referenceParts = [];
        if (ticket.email_references) referenceParts.push(ticket.email_references);
        if (ticket.email_message_id) referenceParts.push(ticket.email_message_id);
        const references = referenceParts.join(' ').trim();

        let info;
        try {
            info = await sendEmailReply({
                mailbox,
                to: toEmail,
                subject: finalSubject,
                text,
                html,
                inReplyTo: ticket.email_message_id || ticket.origin_reference,
                references,
                replyTo: ticket.email_reply_to,
                fromName: mailbox.smtp_from_name || mailbox.name,
                fromEmail: mailbox.smtp_from_email || mailbox.smtp_username || mailbox.username
            });
        } catch (err) {
            run(`
                INSERT INTO email_send_logs (ticket_id, mailbox_id, to_email, subject, status, error)
                VALUES ('${ticketId}', '${mailbox.id}', '${toEmail.replace(/'/g, "''")}', '${finalSubject.replace(/'/g, "''")}', 'error', '${String(err.message || err).replace(/'/g, "''")}')
            `);
            return res.status(400).json({ error: err.message || 'Falha ao enviar e-mail' });
        }

        run(`
            INSERT INTO email_send_logs (ticket_id, mailbox_id, to_email, subject, status, error)
            VALUES ('${ticketId}', '${mailbox.id}', '${toEmail.replace(/'/g, "''")}', '${finalSubject.replace(/'/g, "''")}', 'sent', NULL)
        `);

        const commentId = uuidv4();
        const now = new Date().toISOString();
        const escapedContent = text.replace(/'/g, "''");
        run(`
            INSERT INTO ticket_comments (id, ticket_id, user_id, comment_type, content, created_at)
            VALUES ('${commentId}', '${ticketId}', '${decoded.userId}', 'public', '${escapedContent}', '${now}')
        `);

        if (!ticket.first_response_at) {
            run(`UPDATE tickets SET first_response_at = '${now}', updated_at = '${now}' WHERE id = '${ticketId}'`);
        } else {
            run(`UPDATE tickets SET updated_at = '${now}' WHERE id = '${ticketId}'`);
        }

        const comment = getOne(`
            SELECT c.*, u.name as user_name, u.role as user_role
            FROM ticket_comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.id = '${commentId}'
        `);

        res.status(201).json({ comment, messageId: info?.messageId });
    } catch (error) {
        console.error('Error sending email reply:', error);
        res.status(500).json({ error: 'Erro ao enviar e-mail' });
    }
});

// DELETE /api/tickets/:id - Delete ticket (admin only)
router.delete('/:id', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Não autenticado' });
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);
        if (!decoded || decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Apenas administradores podem excluir tickets' });
        }

        const ticketId = req.params.id;
        const ticket = getOne(`SELECT id FROM tickets WHERE id = '${ticketId}'`);
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket não encontrado' });
        }

        run(`DELETE FROM attachments WHERE ticket_id = '${ticketId}'`);
        run(`DELETE FROM ticket_comments WHERE ticket_id = '${ticketId}'`);
        run(`DELETE FROM status_history WHERE ticket_id = '${ticketId}'`);
        run(`DELETE FROM tickets WHERE id = '${ticketId}'`);

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting ticket:', error);
        res.status(500).json({ error: 'Erro ao excluir ticket' });
    }
});

export default router;
