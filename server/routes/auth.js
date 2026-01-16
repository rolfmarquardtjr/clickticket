import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getOne, getAll, run } from '../database.js';
import { hashPassword, comparePassword, generateToken, verifyToken, ROLES } from '../auth.js';

const router = Router();

// POST /api/auth/register - Register new organization + admin user
router.post('/register', async (req, res) => {
    try {
        const { orgName, userName, email, password } = req.body;

        // Validate required fields
        const errors = [];
        if (!orgName || orgName.trim().length < 2) errors.push('Nome da organização é obrigatório (mín. 2 caracteres)');
        if (!userName || userName.trim().length < 2) errors.push('Nome do usuário é obrigatório (mín. 2 caracteres)');
        if (!email || !email.includes('@')) errors.push('E-mail válido é obrigatório');
        if (!password || password.length < 6) errors.push('Senha é obrigatória (mín. 6 caracteres)');

        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        // Check if email already exists
        const existingUser = getOne(`SELECT id FROM users WHERE email = '${email}'`);
        if (existingUser) {
            return res.status(400).json({ error: 'Este e-mail já está cadastrado' });
        }

        // Create organization
        const orgId = `org-${uuidv4().slice(0, 8)}`;
        const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

        run(`INSERT INTO organizations (id, name, slug) VALUES ('${orgId}', '${orgName.trim()}', '${slug}-${orgId.slice(-4)}')`);

        // Create admin user
        const userId = `user-${uuidv4().slice(0, 8)}`;
        const passwordHash = await hashPassword(password);

        run(`INSERT INTO users (id, org_id, email, password_hash, name, role) VALUES ('${userId}', '${orgId}', '${email}', '${passwordHash}', '${userName.trim()}', '${ROLES.ADMIN}')`);

        // Create default areas for the new org
        const defaultAreas = [
            ['Suporte Técnico'],
            ['Customer Success'],
            ['Desenvolvimento'],
            ['Implantação'],
            ['Operações']
        ];
        for (const [name] of defaultAreas) {
            const areaId = `area-${uuidv4().slice(0, 8)}`;
            run(`INSERT INTO areas (id, org_id, name) VALUES ('${areaId}', '${orgId}', '${name}')`);
        }

        // Generate token
        const token = generateToken({
            userId,
            orgId,
            email,
            name: userName.trim(),
            role: ROLES.ADMIN
        });

        res.status(201).json({
            message: 'Organização criada com sucesso',
            token,
            user: {
                id: userId,
                email,
                name: userName.trim(),
                role: ROLES.ADMIN
            },
            organization: {
                id: orgId,
                name: orgName.trim()
            }
        });
    } catch (error) {
        console.error('Error registering:', error);
        res.status(500).json({ error: 'Erro ao cadastrar organização' });
    }
});

// POST /api/auth/login - Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
        }

        // Find user
        const user = getOne(`
      SELECT u.*, o.name as org_name 
      FROM users u 
      LEFT JOIN organizations o ON u.org_id = o.id 
      WHERE u.email = '${email}' AND u.active = 1
    `);

        if (!user) {
            return res.status(401).json({ error: 'E-mail ou senha incorretos' });
        }

        // Check password
        const validPassword = await comparePassword(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'E-mail ou senha incorretos' });
        }

        // Generate token
        const token = generateToken({
            userId: user.id,
            orgId: user.org_id,
            email: user.email,
            name: user.name,
            role: user.role
        });

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            },
            organization: {
                id: user.org_id,
                name: user.org_name
            }
        });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
});

// GET /api/auth/me - Get current user info
router.get('/me', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Não autenticado' });
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(401).json({ error: 'Token inválido' });
        }

        const user = getOne(`
      SELECT u.id, u.email, u.name, u.role, u.org_id, o.name as org_name
      FROM users u
      LEFT JOIN organizations o ON u.org_id = o.id
      WHERE u.id = '${decoded.userId}'
    `);

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            },
            organization: {
                id: user.org_id,
                name: user.org_name
            }
        });
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
});

// POST /api/auth/invite - Invite new user (admin only)
router.post('/invite', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Não autenticado' });
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        if (!decoded || decoded.role !== ROLES.ADMIN) {
            return res.status(403).json({ error: 'Apenas administradores podem convidar usuários' });
        }

        const { email, name, role, password } = req.body;

        // Validate
        const errors = [];
        if (!email || !email.includes('@')) errors.push('E-mail válido é obrigatório');
        if (!name || name.trim().length < 2) errors.push('Nome é obrigatório');
        if (!password || password.length < 6) errors.push('Senha é obrigatória (mín. 6 caracteres)');
        if (role && ![ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.AGENT].includes(role)) {
            errors.push('Role inválida');
        }

        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        // Check if email exists
        const existing = getOne(`SELECT id FROM users WHERE email = '${email}'`);
        if (existing) {
            return res.status(400).json({ error: 'Este e-mail já está cadastrado' });
        }

        // Create user
        const userId = `user-${uuidv4().slice(0, 8)}`;
        const passwordHash = await hashPassword(password);
        const userRole = role || ROLES.AGENT;

        run(`INSERT INTO users (id, org_id, email, password_hash, name, role) VALUES ('${userId}', '${decoded.orgId}', '${email}', '${passwordHash}', '${name.trim()}', '${userRole}')`);

        res.status(201).json({
            message: 'Usuário criado com sucesso',
            user: {
                id: userId,
                email,
                name: name.trim(),
                role: userRole
            }
        });
    } catch (error) {
        console.error('Error inviting user:', error);
        res.status(500).json({ error: 'Erro ao convidar usuário' });
    }
});

// GET /api/auth/users - List users in org (admin/supervisor)
router.get('/users', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Não autenticado' });
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        if (!decoded || ![ROLES.ADMIN, ROLES.SUPERVISOR].includes(decoded.role)) {
            return res.status(403).json({ error: 'Permissão negada' });
        }

        const users = getAll(`
      SELECT id, email, name, role, active, created_at
      FROM users
      WHERE org_id = '${decoded.orgId}'
      ORDER BY name ASC
    `);

        res.json(users);
    } catch (error) {
        console.error('Error listing users:', error);
        res.status(500).json({ error: 'Erro ao listar usuários' });
    }
});

export default router;
