import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Ticket, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);

        if (!email || !password) {
            setError('Preencha todos os campos');
            return;
        }

        try {
            setLoading(true);
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-logo">
                    <Ticket size={48} />
                    <h1>CliqueTickets</h1>
                </div>

                <h2 className="auth-title">Entrar</h2>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">E-mail</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Senha</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                        />
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
                                Entrando...
                            </>
                        ) : (
                            <>
                                <LogIn size={18} />
                                Entrar
                            </>
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    Não tem conta? <Link to="/register">Cadastre sua empresa</Link>
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
          max-width: 400px;
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
