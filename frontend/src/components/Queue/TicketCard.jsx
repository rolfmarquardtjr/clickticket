import { Clock, AlertTriangle, CheckCircle, XCircle, GripVertical, Calendar, User } from 'lucide-react';
import { STATUS_LABELS, getCategoryById } from '../../data/constants';

export default function TicketCard({ ticket, onClick, isDraggable = false }) {
    const category = getCategoryById(ticket.category);

    function handleDragStart(e) {
        e.dataTransfer.setData('application/json', JSON.stringify(ticket));
        e.dataTransfer.effectAllowed = 'move';
        e.target.style.opacity = '0.5';
    }

    function handleDragEnd(e) {
        e.target.style.opacity = '1';
    }

    const slaConfig = {
        ok: { icon: CheckCircle, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
        risco: { icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
        quebrado: { icon: XCircle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' }
    };

    const impactConfig = {
        baixo: { color: '#22d3ee', bg: 'rgba(34, 211, 238, 0.15)' },
        medio: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
        alto: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' }
    };

    const sla = slaConfig[ticket.sla_status] || slaConfig.ok;
    const impact = impactConfig[ticket.impact] || impactConfig.baixo;
    const SLAIcon = sla.icon;

    return (
        <div
            onClick={() => onClick?.(ticket)}
            draggable={isDraggable}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            style={{
                background: 'var(--color-bg-secondary)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px',
                cursor: isDraggable ? 'grab' : 'pointer',
                border: '1px solid var(--color-border)',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
                e.currentTarget.style.borderColor = 'var(--color-primary)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
        >
            {/* Header: ID */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isDraggable && <GripVertical size={14} style={{ color: 'var(--color-text-muted)', cursor: 'grab' }} />}
                    <span style={{
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)',
                        background: 'var(--color-bg-tertiary)',
                        padding: '2px 8px',
                        borderRadius: '4px'
                    }}>
                        #{ticket.id.slice(0, 8)}
                    </span>
                </div>
            </div>

            {/* Category Tag + SLA Status Stacked */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '8px',
                marginBottom: '12px'
            }}>
                {/* Category Tag */}
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: `${category?.color}15` || 'var(--color-bg-tertiary)',
                    border: `1px solid ${category?.color}30` || 'var(--color-border)'
                }}>
                    <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: category?.color || 'var(--color-text-muted)'
                    }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: category?.color || 'var(--color-text-muted)' }}>
                        {category?.name || ticket.category}
                    </span>
                </div>

                {/* SLA Badge */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: sla.bg,
                    color: sla.color,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    border: `1px solid ${sla.color}20`
                }}>
                    <SLAIcon size={10} />
                    {ticket.sla_hours_remaining > 0 ? `SLA: ${ticket.sla_hours_remaining}h` : 'SLA: Atrasado'}
                </div>
            </div>

            {/* Client Name - Main Title */}
            <div style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: 'var(--color-text)',
                marginBottom: '4px',
                lineHeight: 1.3
            }}>
                {ticket.client_name}
            </div>

            {/* Subcategory */}
            <div style={{
                fontSize: '0.8rem',
                color: 'var(--color-text-muted)',
                marginBottom: '12px'
            }}>
                {ticket.subcategory?.replace(/_/g, ' ')}
            </div>

            {/* Footer: Impact & Date Stacked */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '10px',
                paddingTop: '12px',
                borderTop: '1px solid var(--color-border)'
            }}>
                {/* Impact Badge */}
                <span style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: impact.bg,
                    color: impact.color,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                }}>
                    {ticket.impact}
                </span>

                {/* Date */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    color: 'var(--color-text-muted)'
                }}>
                    <Calendar size={12} />
                    <span style={{ fontWeight: 500 }}>
                        {new Date(ticket.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • {new Date(ticket.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>
        </div>
    );
}
