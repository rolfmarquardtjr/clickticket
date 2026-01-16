import { useState, useEffect } from 'react';
import { BarChart3, PieChart, TrendingUp, Clock, Users, Tag } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart as RechartsPie, Pie, Cell, Legend
} from 'recharts';
import { reportsAPI } from '../api';
import { STATUS_LABELS, CATEGORIES } from '../data/constants';

const SLA_COLORS = {
    ok: '#10b981',
    risco: '#f59e0b',
    quebrado: '#ef4444'
};

export default function Reports() {
    const [summary, setSummary] = useState(null);
    const [byCategory, setByCategory] = useState([]);
    const [byStatus, setByStatus] = useState([]);
    const [slaReport, setSlaReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        loadReports();
    }, []);

    async function loadReports() {
        try {
            setLoading(true);
            const [summaryData, categoryData, statusData, slaData] = await Promise.all([
                reportsAPI.summary(),
                reportsAPI.byCategory(),
                reportsAPI.byStatus(),
                reportsAPI.sla()
            ]);
            setSummary(summaryData);
            setByCategory(categoryData);
            setByStatus(statusData);
            setSlaReport(slaData);
        } catch (error) {
            console.error('Error loading reports:', error);
        } finally {
            setLoading(false);
        }
    }

    const slaChartData = slaReport ? [
        { name: 'OK', value: slaReport.current_active.ok, color: SLA_COLORS.ok },
        { name: 'Risco', value: slaReport.current_active.risco, color: SLA_COLORS.risco },
        { name: 'Quebrado', value: slaReport.current_active.quebrado, color: SLA_COLORS.quebrado }
    ].filter(d => d.value > 0) : [];

    if (loading) {
        return (
            <div className="loading" style={{ minHeight: '400px' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: 'var(--space-xl)' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Relatórios</h1>
                <p className="text-secondary">Análise de performance e métricas</p>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: 'var(--space-sm)',
                marginBottom: 'var(--space-xl)',
                borderBottom: '1px solid var(--color-border)',
                paddingBottom: 'var(--space-sm)'
            }}>
                {[
                    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
                    { id: 'category', label: 'Por Categoria', icon: Tag },
                    { id: 'sla', label: 'SLA', icon: Clock }
                ].map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && summary && (
                <div>
                    {/* Summary Stats */}
                    <div className="stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
                        <div className="stat-card">
                            <div className="stat-content">
                                <div className="stat-value">{summary.totals.total_tickets || 0}</div>
                                <div className="stat-label">Total de Tickets</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-content">
                                <div className="stat-value">{summary.totals.active_tickets || 0}</div>
                                <div className="stat-label">Em Andamento</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-content">
                                <div className="stat-value">{summary.totals.created_today || 0}</div>
                                <div className="stat-label">Criados Hoje</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-content">
                                <div className="stat-value">{summary.totals.closed_today || 0}</div>
                                <div className="stat-label">Fechados Hoje</div>
                            </div>
                        </div>
                    </div>

                    {/* Status Chart */}
                    <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
                        <h3 style={{ marginBottom: 'var(--space-lg)' }}>Tickets por Status</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={byStatus}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis
                                    dataKey="status_label"
                                    stroke="var(--color-text-muted)"
                                    tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                                />
                                <YAxis
                                    stroke="var(--color-text-muted)"
                                    tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--color-bg-secondary)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-md)'
                                    }}
                                />
                                <Bar dataKey="total" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Category Tab */}
            {activeTab === 'category' && (
                <div>
                    <div className="card">
                        <h3 style={{ marginBottom: 'var(--space-lg)' }}>Tickets por Categoria</h3>
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={byCategory} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis
                                    type="number"
                                    stroke="var(--color-text-muted)"
                                    tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                                />
                                <YAxis
                                    dataKey="category_name"
                                    type="category"
                                    width={150}
                                    stroke="var(--color-text-muted)"
                                    tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--color-bg-secondary)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-md)'
                                    }}
                                />
                                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                                    {byCategory.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.category_color || 'var(--color-primary)'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Category Details Table */}
                    <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
                        <h3 style={{ marginBottom: 'var(--space-lg)' }}>Detalhes por Categoria</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Categoria</th>
                                    <th style={{ textAlign: 'right', padding: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Total</th>
                                    <th style={{ textAlign: 'right', padding: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Ativos</th>
                                    <th style={{ textAlign: 'right', padding: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Fechados</th>
                                    <th style={{ textAlign: 'right', padding: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Tempo Médio (h)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {byCategory.map((cat, i) => (
                                    <tr key={i}>
                                        <td style={{ padding: 'var(--space-sm)', borderBottom: '1px solid var(--color-border-light)' }}>
                                            <span style={{ color: cat.category_color, fontWeight: 500 }}>{cat.category_name}</span>
                                        </td>
                                        <td style={{ textAlign: 'right', padding: 'var(--space-sm)', borderBottom: '1px solid var(--color-border-light)' }}>{cat.total}</td>
                                        <td style={{ textAlign: 'right', padding: 'var(--space-sm)', borderBottom: '1px solid var(--color-border-light)' }}>{cat.active || 0}</td>
                                        <td style={{ textAlign: 'right', padding: 'var(--space-sm)', borderBottom: '1px solid var(--color-border-light)' }}>{cat.closed || 0}</td>
                                        <td style={{ textAlign: 'right', padding: 'var(--space-sm)', borderBottom: '1px solid var(--color-border-light)' }}>{cat.avg_resolution_hours || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* SLA Tab */}
            {activeTab === 'sla' && slaReport && (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-xl)' }}>
                        {/* SLA Pie Chart */}
                        <div className="card">
                            <h3 style={{ marginBottom: 'var(--space-lg)' }}>SLA Status Atual</h3>
                            {slaChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <RechartsPie>
                                        <Pie
                                            data={slaChartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                            label={({ name, value }) => `${name}: ${value}`}
                                        >
                                            {slaChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </RechartsPie>
                                </ResponsiveContainer>
                            ) : (
                                <div className="empty-state">
                                    <p>Nenhum ticket ativo</p>
                                </div>
                            )}
                        </div>

                        {/* SLA Summary */}
                        <div className="card">
                            <h3 style={{ marginBottom: 'var(--space-lg)' }}>Resumo SLA</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                <div style={{
                                    padding: 'var(--space-md)',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    borderLeft: '4px solid var(--color-success)'
                                }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success)' }}>
                                        {slaReport.current_active.ok}
                                    </div>
                                    <div className="text-secondary">Dentro do SLA</div>
                                </div>

                                <div style={{
                                    padding: 'var(--space-md)',
                                    background: 'rgba(245, 158, 11, 0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    borderLeft: '4px solid var(--color-warning)'
                                }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-warning)' }}>
                                        {slaReport.current_active.risco}
                                    </div>
                                    <div className="text-secondary">Em Risco (&lt;20% tempo)</div>
                                </div>

                                <div style={{
                                    padding: 'var(--space-md)',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    borderLeft: '4px solid var(--color-error)'
                                }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-error)' }}>
                                        {slaReport.current_active.quebrado}
                                    </div>
                                    <div className="text-secondary">SLA Quebrado</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SLA by Category */}
                    {slaReport.by_category && slaReport.by_category.length > 0 && (
                        <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
                            <h3 style={{ marginBottom: 'var(--space-lg)' }}>SLA por Categoria (Tickets Resolvidos)</h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Categoria</th>
                                        <th style={{ textAlign: 'right', padding: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Dentro SLA</th>
                                        <th style={{ textAlign: 'right', padding: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Fora SLA</th>
                                        <th style={{ textAlign: 'right', padding: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Taxa Conformidade</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {slaReport.by_category.map((cat, i) => (
                                        <tr key={i}>
                                            <td style={{ padding: 'var(--space-sm)', borderBottom: '1px solid var(--color-border-light)' }}>{cat.category_name}</td>
                                            <td style={{ textAlign: 'right', padding: 'var(--space-sm)', borderBottom: '1px solid var(--color-border-light)', color: 'var(--color-success)' }}>{cat.within_sla || 0}</td>
                                            <td style={{ textAlign: 'right', padding: 'var(--space-sm)', borderBottom: '1px solid var(--color-border-light)', color: 'var(--color-error)' }}>{cat.broken_sla || 0}</td>
                                            <td style={{ textAlign: 'right', padding: 'var(--space-sm)', borderBottom: '1px solid var(--color-border-light)', fontWeight: 600 }}>
                                                <span style={{
                                                    color: cat.sla_compliance_rate >= 80 ? 'var(--color-success)' :
                                                        cat.sla_compliance_rate >= 50 ? 'var(--color-warning)' :
                                                            'var(--color-error)'
                                                }}>
                                                    {cat.sla_compliance_rate}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
