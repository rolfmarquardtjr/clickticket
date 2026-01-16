import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import database initialization
import { initDatabase } from './database.js';

// Import routes
import ticketsRouter from './routes/tickets.js';
import clientsRouter from './routes/clients.js';
import areasRouter from './routes/areas.js';
import reportsRouter from './routes/reports.js';
import authRouter from './routes/auth.js';
import productsRouter from './routes/products.js';
import slaPoliciesRouter from './routes/sla-policies.js';
import importRouter from './routes/import.js';
import attachmentsRouter from './routes/attachments.js';
import commentsRouter from './routes/comments.js';
import categoriesRouter from './routes/categories.js';
import customFieldsRouter from './routes/custom-fields.js';
import kanbanColumnsRouter from './routes/kanban-columns.js';
import emailMailboxesRouter from './routes/email-mailboxes.js';
import { startEmailIngestor } from './services/emailIngestor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging


// Routes
app.use('/api/auth', authRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/areas', areasRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/products', productsRouter);
app.use('/api/sla-policies', slaPoliciesRouter);
app.use('/api/import', importRouter);
app.use('/api/attachments', attachmentsRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/custom-fields', customFieldsRouter);
app.use('/api', kanbanColumnsRouter);
app.use('/api', emailMailboxesRouter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

// Initialize database and start server
async function start() {
    try {
        await initDatabase();
        console.log('✅ Database initialized');
        startEmailIngestor();

        app.listen(PORT, () => {
            console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎫 CliqueTickets API Server (Multi-Tenant)              ║
║                                                           ║
║   Server running at: http://localhost:${PORT}               ║
║                                                           ║
║   Auth Endpoints:                                         ║
║   - POST /api/auth/register    Create org + admin         ║
║   - POST /api/auth/login       Login                      ║
║   - GET  /api/auth/me          Get current user           ║
║   - POST /api/auth/invite      Invite user (admin)        ║
║   - GET  /api/auth/users       List users (admin/sup)     ║
║                                                           ║
║   API Endpoints:                                          ║
║   - GET  /api/tickets          List tickets               ║
║   - POST /api/tickets          Create ticket              ║
║   - PATCH /api/tickets/:id/status  Change status          ║
║   - GET  /api/clients          List clients               ║
║   - GET  /api/areas            List areas                 ║
║   - GET  /api/reports/*        Reports                    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

start();
