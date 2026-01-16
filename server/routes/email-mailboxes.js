import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ImapFlow } from 'imapflow';
import { getAll, getOne, run } from '../database.js';
import { verifyToken, ROLES } from '../auth.js';

const router = Router();

function getAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  try {
    const token = authHeader.substring(7);
    return verifyToken(token);
  } catch (e) {
    return null;
  }
}

function requireAdmin(req, res) {
  const user = getAuth(req);
  if (!user || user.role !== ROLES.ADMIN) {
    res.status(403).json({ error: 'Apenas administradores podem gerenciar emails' });
    return null;
  }
  return user;
}

// GET /api/email-mailboxes
router.get('/email-mailboxes', (req, res) => {
  const user = requireAdmin(req, res);
  if (!user) return;
  try {
    const mailboxes = getAll(`
      SELECT id, org_id, name, host, port, secure, username, folder,
             smtp_host, smtp_port, smtp_secure, smtp_username, smtp_from_name, smtp_from_email,
             default_area_id, allowed_category_ids, default_impact, enabled, last_checked_at, status, last_error, created_at, updated_at
      FROM email_mailboxes
      WHERE org_id = '${user.orgId}'
      ORDER BY created_at DESC
    `);
    res.json(mailboxes);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar caixas' });
  }
});

// POST /api/email-mailboxes
router.post('/email-mailboxes', (req, res) => {
  const user = requireAdmin(req, res);
  if (!user) return;
  try {
    const {
      name, host, port, secure, username, password, folder,
      smtp_host, smtp_port, smtp_secure, smtp_username, smtp_password, smtp_from_name, smtp_from_email,
      default_area_id, allowed_category_ids, default_impact, enabled
    } = req.body;

    if (!name || !host || !port || !username || !password) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    const id = `mb-${uuidv4().slice(0, 8)}`;
    run(`
      INSERT INTO email_mailboxes (
        id, org_id, name, host, port, secure, username, password, folder,
        smtp_host, smtp_port, smtp_secure, smtp_username, smtp_password, smtp_from_name, smtp_from_email,
        default_area_id, allowed_category_ids, default_impact, enabled
      ) VALUES (
        '${id}', '${user.orgId}', '${name.replace(/'/g, "''")}', '${host.replace(/'/g, "''")}',
        ${Number(port)}, ${secure ? 1 : 0}, '${username.replace(/'/g, "''")}', '${password.replace(/'/g, "''")}',
        ${folder ? `'${folder.replace(/'/g, "''")}'` : "'INBOX'"},
        ${smtp_host ? `'${smtp_host.replace(/'/g, "''")}'` : 'NULL'},
        ${smtp_port ? Number(smtp_port) : 'NULL'},
        ${smtp_secure !== undefined ? (smtp_secure ? 1 : 0) : 1},
        ${smtp_username ? `'${smtp_username.replace(/'/g, "''")}'` : 'NULL'},
        ${smtp_password ? `'${smtp_password.replace(/'/g, "''")}'` : 'NULL'},
        ${smtp_from_name ? `'${smtp_from_name.replace(/'/g, "''")}'` : 'NULL'},
        ${smtp_from_email ? `'${smtp_from_email.replace(/'/g, "''")}'` : 'NULL'},
        ${default_area_id ? `'${default_area_id}'` : 'NULL'},
        ${allowed_category_ids ? `'${JSON.stringify(allowed_category_ids)}'` : 'NULL'},
        '${default_impact || 'medio'}',
        ${enabled ? 1 : 0}
      )
    `);

    const created = getOne(`SELECT * FROM email_mailboxes WHERE id = '${id}'`);
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar caixa' });
  }
});

// PUT /api/email-mailboxes/:id
router.put('/email-mailboxes/:id', (req, res) => {
  const user = requireAdmin(req, res);
  if (!user) return;
  try {
    const { id } = req.params;
    const existing = getOne(`SELECT * FROM email_mailboxes WHERE id = '${id}' AND org_id = '${user.orgId}'`);
    if (!existing) return res.status(404).json({ error: 'Caixa não encontrada' });

    const {
      name, host, port, secure, username, password, folder,
      smtp_host, smtp_port, smtp_secure, smtp_username, smtp_password, smtp_from_name, smtp_from_email,
      default_area_id, allowed_category_ids, default_impact, enabled
    } = req.body;

    const updates = [];
    if (name !== undefined) updates.push(`name = '${name.replace(/'/g, "''")}'`);
    if (host !== undefined) updates.push(`host = '${host.replace(/'/g, "''")}'`);
    if (port !== undefined) updates.push(`port = ${Number(port)}`);
    if (secure !== undefined) updates.push(`secure = ${secure ? 1 : 0}`);
    if (username !== undefined) updates.push(`username = '${username.replace(/'/g, "''")}'`);
    if (password !== undefined && password !== '') updates.push(`password = '${password.replace(/'/g, "''")}'`);
    if (folder !== undefined) updates.push(`folder = '${folder.replace(/'/g, "''")}'`);
    if (smtp_host !== undefined) updates.push(`smtp_host = ${smtp_host ? `'${smtp_host.replace(/'/g, "''")}'` : 'NULL'}`);
    if (smtp_port !== undefined) updates.push(`smtp_port = ${smtp_port ? Number(smtp_port) : 'NULL'}`);
    if (smtp_secure !== undefined) updates.push(`smtp_secure = ${smtp_secure ? 1 : 0}`);
    if (smtp_username !== undefined) updates.push(`smtp_username = ${smtp_username ? `'${smtp_username.replace(/'/g, "''")}'` : 'NULL'}`);
    if (smtp_password !== undefined && smtp_password !== '') updates.push(`smtp_password = '${smtp_password.replace(/'/g, "''")}'`);
    if (smtp_password === '') updates.push(`smtp_password = NULL`);
    if (smtp_from_name !== undefined) updates.push(`smtp_from_name = ${smtp_from_name ? `'${smtp_from_name.replace(/'/g, "''")}'` : 'NULL'}`);
    if (smtp_from_email !== undefined) updates.push(`smtp_from_email = ${smtp_from_email ? `'${smtp_from_email.replace(/'/g, "''")}'` : 'NULL'}`);
    if (default_area_id !== undefined) updates.push(`default_area_id = ${default_area_id ? `'${default_area_id}'` : 'NULL'}`);
    if (allowed_category_ids !== undefined) updates.push(`allowed_category_ids = ${allowed_category_ids ? `'${JSON.stringify(allowed_category_ids)}'` : 'NULL'}`);
    if (default_impact !== undefined) updates.push(`default_impact = '${default_impact}'`);
    if (enabled !== undefined) updates.push(`enabled = ${enabled ? 1 : 0}`);

    updates.push(`updated_at = '${new Date().toISOString()}'`);
    if (updates.length > 0) {
      run(`UPDATE email_mailboxes SET ${updates.join(', ')} WHERE id = '${id}'`);
    }

    const updated = getOne(`SELECT * FROM email_mailboxes WHERE id = '${id}'`);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar caixa' });
  }
});

// DELETE /api/email-mailboxes/:id
router.delete('/email-mailboxes/:id', (req, res) => {
  const user = requireAdmin(req, res);
  if (!user) return;
  try {
    const { id } = req.params;
    run(`DELETE FROM email_mailboxes WHERE id = '${id}' AND org_id = '${user.orgId}'`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover caixa' });
  }
});

// POST /api/email-mailboxes/:id/test
router.post('/email-mailboxes/:id/test', async (req, res) => {
  const user = requireAdmin(req, res);
  if (!user) return;
  let client;
  try {
    const { id } = req.params;
    const mailbox = getOne(`SELECT * FROM email_mailboxes WHERE id = '${id}' AND org_id = '${user.orgId}'`);
    if (!mailbox) return res.status(404).json({ error: 'Caixa não encontrada' });

    client = new ImapFlow({
      host: mailbox.host,
      port: mailbox.port,
      secure: !!mailbox.secure,
      auth: { user: mailbox.username, pass: mailbox.password }
    });

    await client.connect();
    await client.mailboxOpen(mailbox.folder || 'INBOX');
    run(`
      UPDATE email_mailboxes
      SET status = 'idle', last_error = NULL, last_checked_at = '${new Date().toISOString()}'
      WHERE id = '${mailbox.id}'
    `);
    res.json({ success: true, message: 'Conexão OK' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  } finally {
    if (client) {
      try {
        await client.logout();
      } catch (e) { /* ignore */ }
    }
  }
});

export default router;
