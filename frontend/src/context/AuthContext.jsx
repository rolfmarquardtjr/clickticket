import { createContext, useContext, useState, useEffect } from 'react';

const API_URL = 'http://localhost:3001/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [organization, setOrganization] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            fetchUser();
        } else {
            setLoading(false);
        }
    }, []);

    async function fetchUser() {
        try {
            const res = await fetch(`${API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
                setOrganization(data.organization);
            } else {
                // Token inválido, limpar
                logout();
            }
        } catch (error) {
            console.error('Error fetching user:', error);
            logout();
        } finally {
            setLoading(false);
        }
    }

    async function login(email, password) {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Erro ao fazer login');
        }

        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        setOrganization(data.organization);

        return data;
    }

    async function register(orgName, userName, email, password) {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orgName, userName, email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || data.errors?.join(', ') || 'Erro ao cadastrar');
        }

        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        setOrganization(data.organization);

        return data;
    }

    function logout() {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setOrganization(null);
    }

    function getAuthHeaders() {
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    const value = {
        user,
        organization,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        getAuthHeaders
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}

export default AuthContext;
