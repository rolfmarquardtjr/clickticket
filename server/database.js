import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, 'database.sqlite');

let db = null;

const DEFAULT_KANBAN_COLUMNS = [
  { status_key: 'novo', label: 'Novo', color: '#6366f1', sort_order: 1, is_closed: 0, is_system: 1 },
  { status_key: 'em_analise', label: 'Em análise', color: '#3b82f6', sort_order: 2, is_closed: 0, is_system: 1 },
  { status_key: 'aguardando_cliente', label: 'Aguardando cliente', color: '#f59e0b', sort_order: 3, is_closed: 0, is_system: 1 },
  { status_key: 'em_execucao', label: 'Em execução', color: '#8b5cf6', sort_order: 4, is_closed: 0, is_system: 1 },
  { status_key: 'resolvido', label: 'Resolvido', color: '#10b981', sort_order: 5, is_closed: 1, is_system: 1 },
  { status_key: 'encerrado', label: 'Encerrado', color: '#71717a', sort_order: 6, is_closed: 1, is_system: 1 }
];

// Initialize database
async function initDatabase() {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON;');

  // ============================================
  // Organizations (multi-tenant)
  // ============================================
  db.run(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ============================================
  // Users
  // ============================================
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'agent',
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (org_id) REFERENCES organizations(id)
    );
  `);

  // ============================================
  // Clients (now with org_id)
  // ============================================
  db.run(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      org_id TEXT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (org_id) REFERENCES organizations(id)
    );
  `);

  // ============================================
  // Areas (now with org_id)
  // ============================================
  db.run(`
    CREATE TABLE IF NOT EXISTS areas (
      id TEXT PRIMARY KEY,
      org_id TEXT,
      name TEXT NOT NULL,
      FOREIGN KEY (org_id) REFERENCES organizations(id)
    );
  `);

  // ============================================
  // Tickets (with origin fields and multi-tenant)
  // ============================================
  db.run(`
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      org_id TEXT,
      client_id TEXT NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT NOT NULL,
      description TEXT,
      impact TEXT NOT NULL CHECK(impact IN ('baixo','medio','alto')),
      area_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'novo',
      sla_deadline DATETIME NOT NULL,
      
      -- Origin fields (poka-yoke)
      origin_channel TEXT NOT NULL DEFAULT 'portal',
      origin_contact TEXT,
      origin_reference TEXT,

      -- Email threading (when created via IMAP)
      email_mailbox_id TEXT,
      email_message_id TEXT,
      email_subject TEXT,
      email_from TEXT,
      email_reply_to TEXT,
      email_references TEXT,
      
      -- Assignment
      created_by TEXT,
      assigned_to TEXT,
      
      -- Timestamps
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      first_response_at DATETIME,
      resolved_at DATETIME,
      closed_at DATETIME,
      
      FOREIGN KEY (org_id) REFERENCES organizations(id),
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (area_id) REFERENCES areas(id),
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id),
      FOREIGN KEY (email_mailbox_id) REFERENCES email_mailboxes(id)
    );
  `);

  // ============================================
  // Status History (with user tracking and notes for audit)
  // ============================================
  db.run(`
    CREATE TABLE IF NOT EXISTS status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT NOT NULL,
      changed_by TEXT,
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id),
      FOREIGN KEY (changed_by) REFERENCES users(id)
    );
  `);

  // ============================================
  // SLA Policies (configurable SLA per client tier)
  // ============================================
  db.run(`
    CREATE TABLE IF NOT EXISTS sla_policies (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      name TEXT NOT NULL,
      hours_baixo INTEGER NOT NULL DEFAULT 48,
      hours_medio INTEGER NOT NULL DEFAULT 24,
      hours_alto INTEGER NOT NULL DEFAULT 4,
      priority INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (org_id) REFERENCES organizations(id)
    );
  `);

  // ============================================
  // Products (catalog of products/services)
  // ============================================
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      sla_policy_id TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (org_id) REFERENCES organizations(id),
      FOREIGN KEY (sla_policy_id) REFERENCES sla_policies(id)
    );
  `);

  // ============================================
  // Tags (labels for clients, products, tickets)
  // ============================================
  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#6366f1',
      entity_type TEXT NOT NULL CHECK(entity_type IN ('client', 'product', 'ticket')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (org_id) REFERENCES organizations(id)
    );
  `);

  // ============================================
  // Entity Tags (many-to-many relationship)
  // ============================================
  db.run(`
    CREATE TABLE IF NOT EXISTS entity_tags (
      entity_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (entity_id, tag_id),
      FOREIGN KEY (tag_id) REFERENCES tags(id)
    );
  `);

  // ============================================
  // Categories (dynamic ticket categories)
  // ============================================
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      name TEXT NOT NULL,
      icon TEXT DEFAULT 'Tag',
      color TEXT DEFAULT '#6366f1',
      default_area_id TEXT,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (org_id) REFERENCES organizations(id),
      FOREIGN KEY (default_area_id) REFERENCES areas(id)
    );
  `);

  // ============================================
  // Subcategories (belong to categories)
  // ============================================
  db.run(`
    CREATE TABLE IF NOT EXISTS subcategories (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );
  `);

  // ============================================
  // Audit Log (track admin changes)
  // ============================================
  db.run(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      org_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      changes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (org_id) REFERENCES organizations(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // ============================================
  // Attachments (evidence for tickets - screenshots, files)
  // ============================================
  db.run(`
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      uploaded_by TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id),
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
    );
  `);

  // ============================================
  // Ticket Comments / Activity Log
  // ============================================
  db.run(`
    CREATE TABLE IF NOT EXISTS ticket_comments (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      user_id TEXT,
      comment_type TEXT NOT NULL DEFAULT 'internal' CHECK(comment_type IN ('internal', 'public', 'action')),
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // ============================================
  // Custom Fields (dynamic fields for categories/areas)
  // ============================================
  db.run(`
    CREATE TABLE IF NOT EXISTS custom_fields (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      label TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('text', 'number', 'date', 'select', 'textarea')),
      required INTEGER DEFAULT 0,
      options TEXT, -- JSON string for select options
      description TEXT,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('category', 'area')),
      entity_id TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (org_id) REFERENCES organizations(id)
    );
  `);

  // ============================================
  // Kanban Columns (customizable per area)
  // ============================================
  db.run(`
    CREATE TABLE IF NOT EXISTS kanban_columns (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      area_id TEXT NOT NULL,
      status_key TEXT NOT NULL,
      label TEXT NOT NULL,
      color TEXT,
      sort_order INTEGER DEFAULT 0,
      is_closed INTEGER DEFAULT 0,
      is_system INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (org_id) REFERENCES organizations(id),
      FOREIGN KEY (area_id) REFERENCES areas(id)
    );
  `);

  // ============================================
  // Email Mailboxes (IMAP connectors)
  // ============================================
  db.run(`
    CREATE TABLE IF NOT EXISTS email_mailboxes (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER NOT NULL,
      secure INTEGER DEFAULT 1,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      folder TEXT DEFAULT 'INBOX',
      smtp_host TEXT,
      smtp_port INTEGER,
      smtp_secure INTEGER DEFAULT 1,
      smtp_username TEXT,
      smtp_password TEXT,
      smtp_from_name TEXT,
      smtp_from_email TEXT,
      default_area_id TEXT,
      allowed_category_ids TEXT,
      default_impact TEXT DEFAULT 'medio',
      enabled INTEGER DEFAULT 1,
      last_uid INTEGER DEFAULT 0,
      last_checked_at DATETIME,
      status TEXT DEFAULT 'idle',
      last_error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (org_id) REFERENCES organizations(id),
      FOREIGN KEY (default_area_id) REFERENCES areas(id)
    );
  `);

  // ============================================
  // Email Ingest Logs (dedupe + audit)
  // ============================================
  db.run(`
    CREATE TABLE IF NOT EXISTS email_ingest_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mailbox_id TEXT NOT NULL,
      message_id TEXT,
      from_email TEXT,
      subject TEXT,
      received_at DATETIME,
      processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'processed',
      created_ticket_id TEXT,
      error TEXT,
      FOREIGN KEY (mailbox_id) REFERENCES email_mailboxes(id),
      FOREIGN KEY (created_ticket_id) REFERENCES tickets(id)
    );
  `);

  // ============================================
  // Email Send Logs (outbound replies)
  // ============================================
  db.run(`
    CREATE TABLE IF NOT EXISTS email_send_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id TEXT NOT NULL,
      mailbox_id TEXT NOT NULL,
      to_email TEXT NOT NULL,
      subject TEXT,
      status TEXT DEFAULT 'sent',
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id),
      FOREIGN KEY (mailbox_id) REFERENCES email_mailboxes(id)
    );
  `);

  // ============================================
  // Add missing columns to existing tables (migrations)
  // ============================================
  try {
    db.run('ALTER TABLE clients ADD COLUMN org_id TEXT');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE areas ADD COLUMN org_id TEXT');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE tickets ADD COLUMN org_id TEXT');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE tickets ADD COLUMN origin_channel TEXT DEFAULT "portal"');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE tickets ADD COLUMN origin_contact TEXT');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE tickets ADD COLUMN origin_reference TEXT');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE tickets ADD COLUMN email_mailbox_id TEXT');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE tickets ADD COLUMN email_message_id TEXT');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE tickets ADD COLUMN email_subject TEXT');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE tickets ADD COLUMN email_from TEXT');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE tickets ADD COLUMN email_reply_to TEXT');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE tickets ADD COLUMN email_references TEXT');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE tickets ADD COLUMN created_by TEXT');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE tickets ADD COLUMN assigned_to TEXT');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE tickets ADD COLUMN first_response_at DATETIME');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE status_history ADD COLUMN changed_by TEXT');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE status_history ADD COLUMN notes TEXT');
  } catch (e) { /* column may already exist */ }

  // New migrations for admin features
  try {
    db.run('ALTER TABLE clients ADD COLUMN is_vip INTEGER DEFAULT 0');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE clients ADD COLUMN sla_policy_id TEXT');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE clients ADD COLUMN contact_email TEXT');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE clients ADD COLUMN contact_phone TEXT');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE clients ADD COLUMN notes TEXT');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE tickets ADD COLUMN product_id TEXT');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE attachments ADD COLUMN status_history_id INTEGER');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE attachments ADD COLUMN comment_id TEXT');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE tickets ADD COLUMN custom_data TEXT');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE email_mailboxes ADD COLUMN smtp_host TEXT');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE email_mailboxes ADD COLUMN smtp_port INTEGER');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE email_mailboxes ADD COLUMN smtp_secure INTEGER DEFAULT 1');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE email_mailboxes ADD COLUMN smtp_username TEXT');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE email_mailboxes ADD COLUMN smtp_password TEXT');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE email_mailboxes ADD COLUMN smtp_from_name TEXT');
  } catch (e) { /* column may already exist */ }

  try {
    db.run('ALTER TABLE email_mailboxes ADD COLUMN smtp_from_email TEXT');
  } catch (e) { /* column may already exist */ }

  // ============================================
  // Seed demo organization if none exists
  // ============================================
  const orgsCount = db.exec('SELECT COUNT(*) as count FROM organizations')[0];
  if (!orgsCount || orgsCount.values[0][0] === 0) {
    db.run(`INSERT INTO organizations (id, name, slug) VALUES ('org-demo', 'Demo Organization', 'demo')`);
  }

  // ============================================
  // Seed default areas (linked to demo org)
  // ============================================
  const areasCount = db.exec('SELECT COUNT(*) as count FROM areas')[0];
  if (!areasCount || areasCount.values[0][0] === 0) {
    const defaultAreas = [
      ['area-suporte', 'Suporte Técnico'],
      ['area-cs', 'Customer Success'],
      ['area-dev', 'Desenvolvimento'],
      ['area-implantacao', 'Implantação'],
      ['area-financeiro', 'Financeiro'],
      ['area-operacoes', 'Operações']
    ];
    for (const [id, name] of defaultAreas) {
      db.run(`INSERT INTO areas (id, org_id, name) VALUES ('${id}', 'org-demo', '${name}')`);
    }
  }

  // ============================================
  // Seed default kanban columns per area
  // ============================================
  const areasForColumns = resultToObjects(db.exec('SELECT id, org_id FROM areas'));
  for (const area of areasForColumns) {
    const orgId = area.org_id || 'org-demo';
    const columnsCount = db.exec(`SELECT COUNT(*) as count FROM kanban_columns WHERE area_id = '${area.id}'`)[0];
    if (!columnsCount || columnsCount.values[0][0] === 0) {
      for (const col of DEFAULT_KANBAN_COLUMNS) {
        const columnId = `kc-${uuidv4().slice(0, 8)}`;
        db.run(`
          INSERT INTO kanban_columns (id, org_id, area_id, status_key, label, color, sort_order, is_closed, is_system)
          VALUES (
            '${columnId}', '${orgId}', '${area.id}', '${col.status_key}', '${col.label}', '${col.color}',
            ${col.sort_order}, ${col.is_closed}, ${col.is_system}
          )
        `);
      }
    }
  }

  // ============================================
  // Seed sample clients (linked to demo org)
  // ============================================
  const clientsCount = db.exec('SELECT COUNT(*) as count FROM clients')[0];
  if (!clientsCount || clientsCount.values[0][0] === 0) {
    const sampleClients = [
      ['client-001', 'Empresa ABC Ltda'],
      ['client-002', 'Transportadora XYZ'],
      ['client-003', 'Logística Express'],
      ['client-004', 'Frota Nacional'],
      ['client-005', 'Auto Peças Silva']
    ];
    for (const [id, name] of sampleClients) {
      db.run(`INSERT INTO clients (id, org_id, name) VALUES ('${id}', 'org-demo', '${name}')`);
    }
  }

  // ============================================
  // Seed categories from hardcoded list
  // ============================================
  const categoriesCount = db.exec('SELECT COUNT(*) as count FROM categories')[0];
  if (!categoriesCount || categoriesCount.values[0][0] === 0) {
    // Import hardcoded categories
    const { CATEGORIES } = await import('./categories.js');

    // Map area names to area IDs
    const areaMapping = {
      'area-implantacao': 'area-implantacao',
      'area-operacoes': 'area-operacoes',
      'area-cs': 'area-cs',
      'area-dev': 'area-dev',
      'area-suporte': 'area-suporte'
    };

    let catOrder = 0;
    for (const cat of CATEGORIES) {
      catOrder++;
      const areaId = areaMapping[cat.defaultArea] || null;

      db.run(`
        INSERT INTO categories (id, org_id, name, icon, color, default_area_id, sort_order)
        VALUES ('${cat.id}', 'org-demo', '${cat.name}', '${cat.icon || 'Tag'}', '${cat.color || '#6366f1'}', ${areaId ? `'${areaId}'` : 'NULL'}, ${catOrder})
      `);

      // Insert subcategories
      let subOrder = 0;
      for (const sub of cat.subcategories || []) {
        subOrder++;
        db.run(`
          INSERT INTO subcategories (id, category_id, name, sort_order)
          VALUES ('${sub.id}', '${cat.id}', '${sub.name}', ${subOrder})
        `);
      }
    }

  }

  // ============================================
  // Seed demo categories into orgs (fill missing)
  // ============================================
  const orgRows = resultToObjects(db.exec('SELECT id FROM organizations'));
  const demoCategories = resultToObjects(db.exec(
    `SELECT * FROM categories WHERE org_id = 'org-demo' AND active = 1 ORDER BY sort_order`
  ));
  for (const org of orgRows) {
    if (org.id === 'org-demo') continue;

    for (const cat of demoCategories) {
      const existing = getOne(
        `SELECT id FROM categories WHERE org_id = '${org.id}' AND name = '${cat.name.replace(/'/g, "''")}' AND active = 1`
      );
      if (existing) continue;

      const newCatId = `${cat.id}-${org.id}`;
      db.run(`
        INSERT INTO categories (id, org_id, name, icon, color, default_area_id, sort_order, active, created_at)
        VALUES ('${newCatId}', '${org.id}', '${cat.name}', '${cat.icon}', '${cat.color}', NULL, ${cat.sort_order}, ${cat.active}, '${cat.created_at}')
      `);

      const demoSubs = resultToObjects(db.exec(
        `SELECT * FROM subcategories WHERE category_id = '${cat.id}' AND active = 1 ORDER BY sort_order`
      ));
      for (const sub of demoSubs) {
        const newSubId = `${sub.id}-${org.id}`;
        db.run(`
          INSERT INTO subcategories (id, category_id, name, sort_order, active, created_at)
          VALUES ('${newSubId}', '${newCatId}', '${sub.name}', ${sub.sort_order}, ${sub.active}, '${sub.created_at}')
        `);
      }
    }
  }

  // Save database
  saveDatabase();

  return db;
}

// Save database to file
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(DB_PATH, buffer);
  }
}

// Helper to convert sql.js results to objects
function resultToObjects(result) {
  if (!result || result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

// Helper to get a single row
function getOne(query, params = []) {
  const result = db.exec(query, params);
  const objects = resultToObjects(result);
  return objects[0] || null;
}

// Helper to get all rows
function getAll(query, params = []) {
  const result = db.exec(query, params);
  return resultToObjects(result);
}

// Helper to run a query (insert/update/delete)
function run(query, params = []) {
  db.run(query, params);
  saveDatabase();
}

// Export helpers
export { initDatabase, getOne, getAll, run, saveDatabase };
export default { initDatabase, getOne, getAll, run, saveDatabase };
