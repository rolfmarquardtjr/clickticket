
import { ArrowRight, BarChart3, AlertTriangle, Star } from 'lucide-react';
import { STATUS_LABELS, STATUS_COLORS } from '../../data/constants';

export default function GlobalOverview({ tickets, areas, onAreaSelect }) {

    // 1. Calculate stats per area
    const statsByArea = areas.map(area => {
        const areaTickets = tickets.filter(t => t.area_id === area.id);

        // Count statuses & metrics
        const statusCounts = areaTickets.reduce((acc, ticket) => {
            acc[ticket.status] = (acc[ticket.status] || 0) + 1;

            // Count SLA (only for active tickets)
            if (!['resolvido', 'encerrado'].includes(ticket.status)) {
                if (ticket.sla_status === 'risco' || ticket.sla_status === 'quebrado') {
                    acc.slaIssues = (acc.slaIssues || 0) + 1;
                }
            }

            // Count VIP
            if (ticket.client_is_vip) {
                acc.vipCount = (acc.vipCount || 0) + 1;
            }

            return acc;
        }, {});

        return {
            ...area,
            totalTickets: areaTickets.length,
            statusCounts,
            slaIssues: statusCounts.slaIssues || 0,
            vipCount: statusCounts.vipCount || 0
        };
    });

    // 2. Filter out areas with 0 tickets? Or show all? User wants dashboard. Showing all is better.

    // 3. Render
    return (
        <div className="animate-fade-in">
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '24px'
            }}>
                <div style={{
                    padding: '10px',
                    borderRadius: '12px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: 'var(--color-primary)'
                }}>
                    <BarChart3 size={24} />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Visão Geral por Área</h2>
                    <p className="text-secondary" style={{ margin: 0 }}>Metricas e distribuição de tickets</p>
                </div>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '16px'
            }}>
                {statsByArea.map(area => (
                    <div
                        key={area.id}
                        className="card hover-lift"
                        onClick={() => onAreaSelect(area.id)}
                        style={{
                            cursor: 'pointer',
                            border: '1px solid var(--color-border)',
                            background: 'var(--color-bg-card)',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}
                    >
                        {/* Area Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{area.name}</h3>
                            <span className="badge badge-neutral" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                                {area.totalTickets} Tickets
                            </span>
                        </div>

                        {/* Status Chips */}
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px'
                        }}>
                            {['novo', 'em_analise', 'em_execucao', 'aguardando_cliente'].map(status => {
                                const count = area.statusCounts[status] || 0;
                                if (count === 0) return null;

                                const color = STATUS_COLORS?.[status] || 'var(--color-primary)';

                                return (
                                    <div key={status} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '0.75rem',
                                        padding: '4px 8px',
                                        background: 'var(--color-bg-tertiary)',
                                        borderRadius: '6px',
                                        border: '1px solid var(--color-border)',
                                        fontWeight: 500
                                    }}>
                                        <div style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            background: color
                                        }} />
                                        <span style={{ color: 'var(--color-text-secondary)' }}>
                                            {STATUS_LABELS[status]}:
                                        </span>
                                        <b style={{ color: 'var(--color-text)' }}>{count}</b>
                                    </div>
                                );
                            })}

                            {/* Catch-all for finalized */}
                            {((area.statusCounts['resolvido'] || 0) + (area.statusCounts['encerrado'] || 0)) > 0 && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '0.75rem',
                                    padding: '4px 8px',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    borderRadius: '6px',
                                    fontWeight: 500,
                                    color: '#10b981'
                                }}>
                                    <span>Finalizados:</span>
                                    <b>{(area.statusCounts['resolvido'] || 0) + (area.statusCounts['encerrado'] || 0)}</b>
                                </div>
                            )}
                        </div>

                        {area.totalTickets === 0 && (
                            <div className="text-muted" style={{ fontSize: '0.8rem', fontStyle: 'italic', padding: '6px 0' }}>
                                Nenhum ticket ativo
                            </div>
                        )}

                        {/* VIP Badge */}
                        {area.vipCount > 0 && (
                            <div style={{
                                marginTop: 'auto',
                                padding: '4px 8px',
                                background: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid rgba(245, 158, 11, 0.2)',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: '#d97706',
                                fontSize: '0.75rem',
                                fontWeight: 600
                            }}>
                                <Star size={12} fill="currentColor" />
                                {area.vipCount} Tickets VIP
                            </div>
                        )}

                        {/* SLA Warning */}
                        {area.slaIssues > 0 && (
                            <div style={{
                                marginTop: '4px',
                                padding: '4px 8px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: 'var(--color-error)',
                                fontSize: '0.75rem',
                                fontWeight: 600
                            }}>
                                <AlertTriangle size={12} />
                                {area.slaIssues} tickets fora do SLA
                            </div>
                        )}

                        {/* Footer Action */}
                        <div style={{
                            marginTop: '8px',
                            paddingTop: '8px',
                            borderTop: '1px solid var(--color-border-light)',
                            color: 'var(--color-primary)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                        }}>
                            Ver Kanban <ArrowRight size={14} />
                        </div>
                    </div>
                ))
                }
            </div >
        </div >
    );
}
