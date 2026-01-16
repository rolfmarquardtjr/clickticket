import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getAll, getOne, run } from '../database.js';
import { calculateDeadline } from '../slaEngine.js';
import { classifyEmailWithAI } from './openrouterClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadsDir = join(__dirname, '..', 'uploads');

if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

const POLL_INTERVAL_SEC = parseInt(process.env.EMAIL_POLL_INTERVAL_SEC || '60', 10);

let timer = null;

function buildAreas(orgId) {
  return getAll(`
    SELECT id, name
    FROM areas
    WHERE (org_id = '${orgId}' OR org_id = 'org-demo' OR org_id IS NULL)
    ORDER BY name ASC
  `);
}

function buildCategories(orgId) {
  const categories = getAll(`
    SELECT id, name
    FROM categories
    WHERE active = 1 AND (org_id = '${orgId}' OR org_id = 'org-demo' OR org_id IS NULL)
    ORDER BY name ASC
  `);
  const subcategories = getAll(`
    SELECT id, category_id, name
    FROM subcategories
    WHERE active = 1
    ORDER BY name ASC
  `);
  const byCategory = subcategories.reduce((acc, sub) => {
    if (!acc[sub.category_id]) acc[sub.category_id] = [];
    acc[sub.category_id].push({ id: sub.id, name: sub.name });
    return acc;
  }, {});
  return categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    subcategories: byCategory[cat.id] || []
  }));
}

function buildProducts(orgId) {
  return getAll(`
    SELECT id, name
    FROM products
    WHERE active = 1 AND org_id = '${orgId}'
    ORDER BY name ASC
  `);
}

function normalizeText(text) {
  if (!text) return '';
  return text.replace(/\r\n/g, '\n').trim();
}

function pickAllowedCategory(categoryId, allowedCategoryIds) {
  if (!allowedCategoryIds || allowedCategoryIds.length === 0) return categoryId;
  if (allowedCategoryIds.includes(categoryId)) return categoryId;
  return allowedCategoryIds[0];
}

function pickAllowedSubcategory(categoryId, subcategoryId, categories) {
  const category = categories.find(c => c.id === categoryId);
  if (!category || !category.subcategories || category.subcategories.length === 0) return null;
  const match = category.subcategories.find(s => s.id === subcategoryId);
  return match ? subcategoryId : category.subcategories[0].id;
}

async function classifyEmail(mailbox, parsed, orgId) {
  const areas = buildAreas(orgId);
  const categories = buildCategories(orgId);
  const products = buildProducts(orgId);

  const allowedCategoryIds = mailbox.allowed_category_ids
    ? JSON.parse(mailbox.allowed_category_ids)
    : [];

  const defaults = {
    area_id: mailbox.default_area_id || (areas[0] ? areas[0].id : null),
    category_id: allowedCategoryIds[0] || (categories[0] ? categories[0].id : null),
    subcategory_id: categories[0]?.subcategories?.[0]?.id || null,
    impact: mailbox.default_impact || 'medio'
  };

  let aiResult = null;
  try {
    aiResult = await classifyEmailWithAI({
      subject: parsed.subject || '',
      body: normalizeText(parsed.text || parsed.html || ''),
      from: parsed.from?.text || '',
      areas,
      categories,
      products,
      defaults
    });
  } catch (err) {
    aiResult = null;
  }

  const impact = aiResult && ['baixo', 'medio', 'alto'].includes(aiResult.impact) ? aiResult.impact : defaults.impact;
  const areaId = (aiResult && aiResult.area_id) || defaults.area_id;
  let categoryId = pickAllowedCategory((aiResult && aiResult.category_id) || defaults.category_id, allowedCategoryIds);
  if (!categoryId && categories[0]) categoryId = categories[0].id;
  const subcategoryId = pickAllowedSubcategory(
    categoryId,
    (aiResult && aiResult.subcategory_id) || defaults.subcategory_id,
    categories
  );

  return {
    area_id: areaId,
    category_id: categoryId,
    subcategory_id: subcategoryId,
    impact,
    summary: (aiResult && aiResult.summary) || parsed.subject || 'Solicitação via e-mail',
    description: (aiResult && aiResult.description) || normalizeText(parsed.text || parsed.html || '')
  };
}

function saveAttachments(ticketId, attachments, userId = null) {
  if (!attachments || attachments.length === 0) return;
  const now = new Date().toISOString();

  attachments.forEach(att => {
    const id = uuidv4();
    const ext = att.filename ? att.filename.split('.').pop() : 'bin';
    const storedFilename = `${id}.${ext}`;
    const filePath = join(uploadsDir, storedFilename);

    writeFileSync(filePath, att.content);

    run(`
      INSERT INTO attachments (id, ticket_id, filename, original_name, mime_type, size, uploaded_by, uploaded_at)
      VALUES ('${id}', '${ticketId}', '${storedFilename}', '${(att.filename || 'arquivo').replace(/'/g, "''")}', '${att.contentType}', ${att.size || att.content.length}, ${userId ? `'${userId}'` : 'NULL'}, '${now}')
    `);
  });
}

function getOrCreateClient(fromEmail, fromName, orgId) {
  if (!fromEmail) {
    const fallback = getOne(`SELECT id FROM clients WHERE org_id = '${orgId}' ORDER BY created_at ASC LIMIT 1`);
    return fallback?.id || 'client-001';
  }

  const existing = getOne(`
    SELECT id FROM clients
    WHERE org_id = '${orgId}' AND contact_email = '${fromEmail.replace(/'/g, "''")}'
    LIMIT 1
  `);
  if (existing) return existing.id;

  const clientId = `client-${uuidv4().slice(0, 8)}`;
  const name = fromName || fromEmail.split('@')[0];
  run(`
    INSERT INTO clients (id, org_id, name, contact_email)
    VALUES ('${clientId}', '${orgId}', '${name.replace(/'/g, "''")}', '${fromEmail.replace(/'/g, "''")}')
  `);
  return clientId;
}

function createTicketFromEmail({ mailbox, parsed, classification, orgId }) {
  if (!classification.area_id || !classification.category_id || !classification.subcategory_id) {
    throw new Error('Classificação incompleta para criar ticket');
  }
  const fromEmail = parsed.from?.value?.[0]?.address || '';
  const fromName = parsed.from?.value?.[0]?.name || parsed.from?.text || '';
  const replyToEmail = parsed.replyTo?.value?.[0]?.address || fromEmail;
  const subject = parsed.subject || '';
  const referenceParts = [];
  if (Array.isArray(parsed.references)) referenceParts.push(...parsed.references);
  if (parsed.inReplyTo) referenceParts.push(parsed.inReplyTo);
  const emailReferences = Array.from(new Set(referenceParts)).join(' ').trim();
  const clientId = getOrCreateClient(fromEmail, fromName, orgId);
  const id = `ticket-${uuidv4().slice(0, 8)}`;
  const now = new Date().toISOString();
  const slaDeadline = calculateDeadline(classification.impact, now).toISOString();
  const description = (classification.description || '').replace(/'/g, "''");
  const summary = (classification.summary || '').replace(/'/g, "''");

  run(`
    INSERT INTO tickets (
      id, org_id, client_id, category, subcategory, description, impact, area_id,
      status, sla_deadline, origin_channel, origin_contact, origin_reference,
      created_by, created_at, updated_at, custom_data,
      email_mailbox_id, email_message_id, email_subject, email_from, email_reply_to, email_references
    ) VALUES (
      '${id}', '${orgId}', '${clientId}', '${classification.category_id}', '${classification.subcategory_id}',
      '${description}', '${classification.impact}', '${classification.area_id}',
      'novo', '${slaDeadline}', 'email', '${parsed.from?.text?.replace(/'/g, "''") || ''}', '${parsed.messageId || ''}',
      NULL, '${now}', '${now}', '${JSON.stringify({ summary })}',
      '${mailbox.id}', '${parsed.messageId || ''}', '${subject.replace(/'/g, "''")}',
      '${fromEmail.replace(/'/g, "''")}', '${replyToEmail.replace(/'/g, "''")}', '${emailReferences.replace(/'/g, "''")}'
    )
  `);

  run(`
    INSERT INTO status_history (ticket_id, from_status, to_status, changed_by, changed_at, notes)
    VALUES ('${id}', NULL, 'novo', NULL, '${now}', 'Criado automaticamente via e-mail')
  `);

  return id;
}

async function processMailbox(mailbox) {
  const orgId = mailbox.org_id || 'org-demo';
  let client;
  try {
    run(`UPDATE email_mailboxes SET status = 'connecting', last_error = NULL WHERE id = '${mailbox.id}'`);
    client = new ImapFlow({
      host: mailbox.host,
      port: mailbox.port,
      secure: !!mailbox.secure,
      auth: {
        user: mailbox.username,
        pass: mailbox.password
      },
      logger: {
        info: () => {},
        debug: () => {},
        trace: () => {},
        warn: () => {},
        error: (err) => console.error('IMAP error:', err)
      }
    });

    await client.connect();
    const lock = await client.getMailboxLock(mailbox.folder || 'INBOX');
    try {
      const lastUid = mailbox.last_uid || 0;
      const uidNext = client.mailbox?.uidNext || 0;
      let maxUid = lastUid;

      // First run: avoid backfilling the entire inbox
      if (lastUid === 0 && uidNext > 1) {
        maxUid = uidNext - 1;
        run(`
          UPDATE email_mailboxes
          SET last_uid = ${maxUid}, last_checked_at = '${new Date().toISOString()}', status = 'idle', last_error = NULL
          WHERE id = '${mailbox.id}'
        `);
        return;
      }

      const range = `${lastUid + 1}:*`;

      for await (const msg of client.fetch(range, { uid: true, envelope: true, source: true })) {
        if (!msg.uid) continue;
        maxUid = Math.max(maxUid, msg.uid);
        const raw = msg.source;
        const parsed = await simpleParser(raw);

        const messageId = parsed.messageId || `${mailbox.id}-${msg.uid}`;
        const existing = getOne(`
          SELECT id FROM email_ingest_logs
          WHERE mailbox_id = '${mailbox.id}' AND message_id = '${messageId.replace(/'/g, "''")}'
        `);
        if (existing) continue;

        try {
          const classification = await classifyEmail(mailbox, parsed, orgId);
          const ticketId = createTicketFromEmail({ mailbox, parsed, classification, orgId });
          saveAttachments(ticketId, parsed.attachments || []);

          run(`
            INSERT INTO email_ingest_logs (mailbox_id, message_id, from_email, subject, received_at, status, created_ticket_id)
            VALUES (
              '${mailbox.id}', '${messageId.replace(/'/g, "''")}', '${(parsed.from?.text || '').replace(/'/g, "''")}', '${(parsed.subject || '').replace(/'/g, "''")}',
              ${parsed.date ? `'${parsed.date.toISOString()}'` : 'NULL'}, 'processed', '${ticketId}'
            )
          `);
        } catch (err) {
          run(`
            INSERT INTO email_ingest_logs (mailbox_id, message_id, from_email, subject, received_at, status, error)
            VALUES (
              '${mailbox.id}', '${messageId.replace(/'/g, "''")}', '${(parsed.from?.text || '').replace(/'/g, "''")}', '${(parsed.subject || '').replace(/'/g, "''")}',
              ${parsed.date ? `'${parsed.date.toISOString()}'` : 'NULL'}, 'error', '${String(err.message).replace(/'/g, "''")}'
            )
          `);
        }
      }

      run(`
        UPDATE email_mailboxes
        SET last_uid = ${maxUid}, last_checked_at = '${new Date().toISOString()}', status = 'idle', last_error = NULL
        WHERE id = '${mailbox.id}'
      `);
    } finally {
      lock.release();
    }
  } catch (error) {
    run(`
      UPDATE email_mailboxes
      SET status = 'error', last_error = '${String(error.message).replace(/'/g, "''")}', last_checked_at = '${new Date().toISOString()}'
      WHERE id = '${mailbox.id}'
    `);
  } finally {
    if (client) {
      try {
        await client.logout();
      } catch (e) { /* ignore */ }
    }
  }
}

async function pollOnce() {
  const mailboxes = getAll(`SELECT * FROM email_mailboxes WHERE enabled = 1`);
  for (const mailbox of mailboxes) {
    await processMailbox(mailbox);
  }
}

export function startEmailIngestor() {
  if (timer) return;
  pollOnce().catch(() => {});
  timer = setInterval(() => {
    pollOnce().catch(() => {});
  }, POLL_INTERVAL_SEC * 1000);
}
