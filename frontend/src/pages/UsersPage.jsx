import { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Eye, Headphones, Loader2, Check, X } from 'lucide-react';
import { authAPI } from '../api';
import { useAuth } from '../context/AuthContext';

const ROLES = [
    { id: 'admin', name: 'Administrador', icon: Shield, color: '#EF4444', description: 'Acesso total' },
    { id: 'supervisor', name: 'Supervisor', icon: Eye, color: '#F59E0B', description: 'Ver todos tickets' },
    { id: 'agent', name: 'Agente', icon: Headphones, color: '#10B981', description: 'Tickets da área' }
];

export default function UsersPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showInvite, setShowInvite] = useState(false);

    // Invite form
    const [inviteName, setInviteName] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [invitePassword, setInvitePassword] = useState('');
    const [inviteRole, setInviteRole] = useState('agent');
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteError, setInviteError] = useState(null);
    const [inviteSuccess, setInviteSuccess] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    async function loadUsers() {
        try {
            setLoading(true);
            const data = await authAPI.users();
            setUsers(data);
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleInvite(e) {
        e.preventDefault();
        setInviteError(null);

        if (!inviteName || !inviteEmail || !invitePassword) {
            setInviteError('Preencha todos os campos obrigatórios');
            return;
        }

        try {
            setInviteLoading(true);
            await authAPI.invite(inviteEmail, inviteName, inviteRole, invitePassword);
            setInviteSuccess(true);
            setInviteName('');
            setInviteEmail('');
            setInvitePassword('');
            setInviteRole('agent');
            loadUsers();

            setTimeout(() => {
                setInviteSuccess(false);
                setShowInvite(false);
            }, 2000);
        } catch (err) {
            setInviteError(err.message);
        } finally {
            setInviteLoading(false);
        }
    }

    const getRoleInfo = (roleId) => ROLES.find(r => r.id === roleId) || ROLES[2];

    // Check if current user is admin
    if (currentUser?.role !== 'admin') {
        return (
            <div className="empty-state" style={{ minHeight: '400px' }}>
                <Shield size={48} style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)' }} />
                <h3>Acesso Restrito</h3>
                <p className="text-secondary">Apenas administradores podem gerenciar usuários.</p>
            </div>
        );
    }

    return (
        <div>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-xl)'
            }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                        <Users size={28} style={{ display: 'inline', marginRight: 'var(--space-sm)' }} />
                        Equipe
                    </h1>
                    <p className="text-secondary">Gerencie os usuários da sua organização</p>
                </div>
                <button className="btn btn-primary btn-lg" onClick={() => setShowInvite(true)}>
                    <UserPlus size={18} />
                    Convidar Usuário
                </button>
            </div>

            {/* Stats */}
            <div className="stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
                <div className="stat-card">
                    <div className="stat-content">
                        <div className="stat-value">{users.length}</div>
                        <div className="stat-label">Total de Usuários</div>
                    </div>
                </div>
                {ROLES.map(role => {
                    const count = users.filter(u => u.role === role.id).length;
                    const Icon = role.icon;
                    return (
                        <div key={role.id} className="stat-card">
                            <div className="stat-icon" style={{ background: `${role.color}20` }}>
                                <Icon size={24} style={{ color: role.color }} />
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{count}</div>
                                <div className="stat-label">{role.name}s</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Users List */}
            {loading ? (
                <div className="loading" style={{ minHeight: '200px' }}>
                    <div className="spinner"></div>
                </div>
            ) : (
                <div className="card glass-panel">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Usuário</th>
                                <th>E-mail</th>
                                <th>Função</th>
                                <th>Cadastrado em</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => {
                                const roleInfo = getRoleInfo(user.role);
                                const Icon = roleInfo.icon;
                                return (
                                    <tr key={user.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                                <div className="user-avatar-sm">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>{user.name}</div>
                                                    {user.id === currentUser.id && (
                                                        <span className="text-secondary" style={{ fontSize: '0.75rem' }}>
                                                            (você)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-secondary">{user.email}</td>
                                        <td>
                                            <span
                                                className="badge"
                                                style={{
                                                    background: `${roleInfo.color}20`,
                                                    color: roleInfo.color,
                                                    border: `1px solid ${roleInfo.color}30`
                                                }}
                                            >
                                                <Icon size={12} />
                                                {roleInfo.name}
                                            </span>
                                        </td>
                                        <td className="text-muted">
                                            {new Date(user.created_at).toLocaleDateString('pt-BR')}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Invite Modal */}
            {showInvite && (
                <div className="modal-overlay" onClick={() => setShowInvite(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                <UserPlus size={20} style={{ display: 'inline', marginRight: 'var(--space-sm)' }} />
                                Convidar Usuário
                            </h3>
                            <button className="btn btn-icon btn-ghost" onClick={() => setShowInvite(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body">
                            {inviteSuccess ? (
                                <div className="alert alert-success" style={{ textAlign: 'center' }}>
                                    <Check size={24} style={{ marginBottom: 'var(--space-sm)' }} />
                                    <div>Usuário convidado com sucesso!</div>
                                </div>
                            ) : (
                                <form onSubmit={handleInvite}>
                                    <div className="form-group">
                                        <label className="form-label">Nome *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Nome do usuário"
                                            value={inviteName}
                                            onChange={e => setInviteName(e.target.value)}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">E-mail *</label>
                                        <input
                                            type="email"
                                            className="form-input"
                                            placeholder="email@empresa.com"
                                            value={inviteEmail}
                                            onChange={e => setInviteEmail(e.target.value)}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Senha Inicial *</label>
                                        <input
                                            type="password"
                                            className="form-input"
                                            placeholder="Mínimo 6 caracteres"
                                            value={invitePassword}
                                            onChange={e => setInvitePassword(e.target.value)}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Função</label>
                                        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                            {ROLES.map(role => {
                                                const Icon = role.icon;
                                                const isSelected = inviteRole === role.id;
                                                return (
                                                    <button
                                                        key={role.id}
                                                        type="button"
                                                        onClick={() => setInviteRole(role.id)}
                                                        style={{
                                                            flex: 1,
                                                            padding: 'var(--space-md)',
                                                            border: isSelected ? `2px solid ${role.color}` : '1px solid var(--color-border)',
                                                            borderRadius: 'var(--radius-md)',
                                                            background: isSelected ? `${role.color}15` : 'var(--color-bg-tertiary)',
                                                            cursor: 'pointer',
                                                            textAlign: 'center'
                                                        }}
                                                    >
                                                        <Icon size={20} style={{ color: role.color, marginBottom: '4px' }} />
                                                        <div style={{ fontSize: '0.75rem', fontWeight: isSelected ? 600 : 400 }}>
                                                            {role.name}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {inviteError && (
                                        <div className="alert alert-error" style={{ marginBottom: 'var(--space-md)' }}>
                                            {inviteError}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        className="btn btn-primary btn-lg"
                                        style={{ width: '100%' }}
                                        disabled={inviteLoading}
                                    >
                                        {inviteLoading ? (
                                            <>
                                                <Loader2 size={18} className="spinning" />
                                                Convidando...
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus size={18} />
                                                Convidar
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .spinning {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
