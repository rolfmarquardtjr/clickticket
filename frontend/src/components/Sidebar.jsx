import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    BarChart3,
    Users,
    Settings,
    ChevronLeft,
    ChevronRight,
    Ticket,
    LogOut,
    Moon,
    Sun
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ isCollapsed, toggleSidebar, theme, toggleTheme }) {
    const { user, organization, logout } = useAuth();

    const navItems = [
        { to: "/", icon: LayoutDashboard, label: "Painel" },
        { to: "/relatorios", icon: BarChart3, label: "Relatórios" },
    ];

    if (user?.role === 'admin' || user?.role === 'Admin') {
        navItems.push({ to: "/equipe", icon: Users, label: "Equipe" });
        navItems.push({ to: "/admin", icon: Settings, label: "Administração" });
    }

    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            {/* Header / Logo */}
            <div className="sidebar-header">
                <div className="logo-container">
                    <Ticket size={24} className="logo-icon" />
                    {!isCollapsed && (
                        <div className="logo-text">
                            <span className="brand-name">CliqueTickets</span>
                            {organization && (
                                <span className="org-name">{organization.name}</span>
                            )}
                        </div>
                    )}
                </div>
                <button
                    className="collapse-btn"
                    onClick={toggleSidebar}
                    title={isCollapsed ? "Expandir" : "Recolher"}
                >
                    {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `nav-item ${isActive ? 'active' : ''}`
                        }
                        end={item.to === "/"}
                    >
                        <item.icon size={20} />
                        {!isCollapsed && <span>{item.label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* Footer / User Profile */}
            <div className="sidebar-footer">
                <div className="footer-actions">
                    <button
                        className="theme-btn"
                        onClick={toggleTheme}
                        title={theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
                    >
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        {!isCollapsed && <span>{theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}</span>}
                    </button>
                </div>

                <div className="user-profile">
                    <div className="user-avatar">
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    {!isCollapsed && (
                        <div className="user-info">
                            <span className="user-name">{user?.name}</span>
                            <span className="user-role">
                                {user?.role === 'admin' ? 'Administrador' : 'Agente'}
                            </span>
                        </div>
                    )}
                    <button
                        className="logout-btn"
                        onClick={logout}
                        title="Sair"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </aside>
    );
}
