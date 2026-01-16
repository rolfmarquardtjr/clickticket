import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Ticket, UserPlus, Loader2, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Register() {
    const [orgName, setOrgName] = useState('');
    const [userName, setUserName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);

        // Validações
        if (!orgName || !userName || !email || !password) {
            setError('Preencha todos os campos obrigatórios');
            return;
        }

        if (password !== confirmPassword) {
            setError('As senhas não coincidem');
            return;
        }

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres');
            return;
        }

        try {
            setLoading(true);
            await register(orgName, userName, email, password);
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-container">
            <div className="auth-card" style={{ maxWidth: '450px' }}>
                <div className="auth-logo">
                    <Ticket size={48} />
                    <h1>CliqueTickets</h1>
                </div>

                <h2 className="auth-title">Cadastrar Organização</h2>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">
                            <Building2 size={14} style={{ display: 'inline', marginRight: '4px' }} />
                            Nome da Empresa *
                        </label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Minha Empresa Ltda"
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Seu Nome *</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="João Silva"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">E-mail *</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                        <div className="form-group">
                            <label className="form-label">Senha *</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="new-password"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Confirmar Senha *</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                autoComplete="new-password"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="alert alert-error" style={{ marginBottom: 'var(--space-md)' }}>
                            {error}
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 size={18} className="spinning" />
                                Cadastrando...
                            </>
                        ) : (
                            <>
                                <UserPlus size={18} />
                                Criar Conta
                            </>
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    Já tem conta? <Link to="/login">Entrar</Link>
                </div>
            </div>

            <style>{`
        .auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-xl);
        }
        .auth-card {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          padding: var(--space-2xl);
          width: 100%;
          backdrop-filter: blur(10px);
        }
        .auth-logo {
          text-align: center;
          margin-bottom: var(--space-xl);
          color: var(--color-primary);
        }
        .auth-logo h1 {
          font-size: 1.5rem;
          margin-top: var(--space-sm);
        }
        .auth-title {
          text-align: center;
          font-size: 1.25rem;
          margin-bottom: var(--space-xl);
        }
        .auth-footer {
          text-align: center;
          margin-top: var(--space-xl);
          color: var(--color-text-secondary);
        }
        .auth-footer a {
          color: var(--color-primary);
          text-decoration: none;
        }
        .auth-footer a:hover {
          text-decoration: underline;
        }
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
