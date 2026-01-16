import { useState, useEffect } from 'react';
import { X, Clock, User, Tag, AlertTriangle, CheckCircle, MessageSquare, History, Mail, Phone, MessageCircle, Globe, Building, ArrowRight, Paperclip, FileText, Settings } from 'lucide-react';
import { ticketsAPI, attachmentsAPI } from '../../api';
import { STATUS_LABELS, getCategoryById } from '../../data/constants';
import StatusChangeModal from '../StatusChangeModal';
import TransferAreaModal from '../TransferAreaModal';
import ActivityLog from '../ActivityLog';

const ORIGIN_ICONS = {
    email: Mail,
    telefone: Phone,
    chat: MessageCircle,
    portal: Globe,
    interno: Building
};

const STATUS_COLORS = {
    'novo': '#6366f1',
    'em_analise': '#3b82f6',
    'aguardando_cliente': '#f59e0b',
    'em_execucao': '#8b5cf6',
    'resolvido': '#10b981',
    'encerrado': '#71717a'
};

const ORIGIN_LABELS = {
    email: 'E-mail',
    telefone: 'Telefone',
    chat: 'Chat',
    portal: 'Portal',
    interno: 'Interno'
};

const TABS = [
    { id: 'details', label: 'Detalhes', icon: FileText },
    { id: 'activity', label: 'Acompanhamento', icon: MessageSquare },
    { id: 'history', label: 'Histórico', icon: History }
];

export default function TicketModal({ ticket, onClose, onUpdate }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferLoading, setTransferLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('details');

    const category = getCategoryById(ticket.category);

    // State for enriched history (with attachments)
    const [enrichedHistory, setEnrichedHistory] = useState(ticket.history);

    useEffect(() => {
        // Reset with prop data first
        setEnrichedHistory(ticket.history);

        // Fetch full details to get attachments in history
        ticketsAPI.get(ticket.id)
            .then(data => {
                if (data.history) {
                    setEnrichedHistory(data.history);
                }
            })
            .catch(err => console.error("Error fetching history:", err));
    }, [ticket.id, ticket.updated_at]);

    async function handleStatusChange(newStatus, notes = null, attachmentIds = []) {
        try {
            setLoading(true);
            setError(null);
            const updated = await ticketsAPI.changeStatus(ticket.id, newStatus, notes, attachmentIds);
            setShowStatusModal(false);
            onUpdate(updated);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleTransfer(areaId, notes, attachmentIds = []) {
        try {
            setTransferLoading(true);
            setError(null);
            const updated = await ticketsAPI.transfer(ticket.id, areaId, notes, attachmentIds);
            setShowTransferModal(false);
            onUpdate(updated);
        } catch (err) {
            setError(err.message);
        } finally {
            setTransferLoading(false);
        }
    }

    const getSLABadge = () => {
        const slaConfig = {
            ok: { icon: CheckCircle, color: 'var(--color-success)', bg: 'rgba(16, 185, 129, 0.1)', label: 'No Prazo' },
            risco: { icon: Clock, color: 'var(--color-warning)', bg: 'rgba(245, 158, 11, 0.1)', label: 'Em Risco' },
            quebrado: { icon: AlertTriangle, color: 'var(--color-error)', bg: 'rgba(239, 68, 68, 0.1)', label: 'Atrasado' }
        };

        const config = slaConfig[ticket.sla_status] || slaConfig.ok;
        const Icon = config.icon;

        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
                borderRadius: '6px',
                background: config.bg,
                color: config.color,
                fontSize: '0.75rem',
                fontWeight: 600,
                border: `1px solid ${config.color}30`
            }}>
                <Icon size={12} />
                <span>{config.label} ({ticket.sla_hours_remaining}h)</span>
            </div>
        );
    };

    const OriginIcon = ORIGIN_ICONS[ticket.origin_channel] || Mail;
    const canChangeStatus = ticket.status !== 'encerrado';
    const statusColor = STATUS_COLORS[ticket.status] || '#666';

    return (
        <>
            <div className="modal-overlay" onClick={onClose} style={{ backdropFilter: 'blur(4px)' }}>
                <div
                    className="modal"
                    onClick={e => e.stopPropagation()}
                    style={{
                        maxWidth: '800px',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        padding: 0,
                        overflow: 'hidden',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}
                >
                    {/* Modern Header */}
                    <div style={{
                        padding: '24px 32px',
                        background: 'var(--color-bg-secondary)',
                        borderBottom: '1px solid var(--color-border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start'
                    }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <span style={{
                                    fontFamily: 'monospace',
                                    color: 'var(--color-text-muted)',
                                    background: 'var(--color-bg-primary)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    border: '1px solid var(--color-border)'
                                }}>
                                    #{ticket.id.slice(0, 8)}
                                </span>
                                {getSLABadge()}
                                <span className={`badge badge-impact-${ticket.impact}`} style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {ticket.impact} Impacto
                                </span>
                            </div>
                            <h2 style={{
                                fontSize: '1.5rem',
                                fontWeight: 700,
                                color: 'var(--color-text)',
                                margin: 0,
                                lineHeight: 1.2
                            }}>
                                {ticket.client_name}
                            </h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                                <User size={14} />
                                <span>{ticket.area_name}</span>
                                <span>•</span>
                                <Building size={14} />
                                <span style={{ color: category?.color, fontWeight: 500 }}>{category?.name}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                            <button className="btn btn-icon btn-ghost" onClick={onClose}>
                                <X size={24} />
                            </button>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 12px',
                                background: `${STATUS_COLORS[ticket.status]}15`,
                                border: `1px solid ${STATUS_COLORS[ticket.status]}30`,
                                borderRadius: '20px',
                                color: STATUS_COLORS[ticket.status],
                                fontWeight: 600,
                                fontSize: '0.875rem'
                            }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: STATUS_COLORS[ticket.status] }} />
                                {STATUS_LABELS[ticket.status]}
                            </div>
                        </div>
                    </div>

                    {/* Modern Tabs */}
                    <div style={{
                        display: 'flex',
                        padding: '0 32px',
                        borderBottom: '1px solid var(--color-border)',
                        background: 'var(--color-bg-primary)',
                        gap: '24px'
                    }}>
                        {TABS.map(tab => {
                            const TabIcon = tab.icon;
                            const isActive = activeTab === tab.id;
                            const count = tab.id === 'attachments' ? attachments.length :
                                tab.id === 'history' ? (ticket.history?.length || 0) : null;

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        padding: '16px 0',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                                        color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        fontSize: '0.95rem',
                                        fontWeight: isActive ? 600 : 500,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        position: 'relative',
                                        top: '1px'
                                    }}
                                >
                                    <TabIcon size={18} />
                                    {tab.label}
                                    {count !== null && count > 0 && (
                                        <span style={{
                                            background: isActive ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                                            color: isActive ? 'white' : 'var(--color-text-muted)',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            transition: 'all 0.2s ease'
                                        }}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Content Area */}
                    <div className="modal-body" style={{
                        padding: '32px',
                        overflowY: 'auto',
                        flex: 1,
                        background: 'var(--color-bg-primary)'
                    }}>

                        {/* DETAILS TAB */}
                        {activeTab === 'details' && (
                            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                                {/* Metadata Grid */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                    gap: '16px',
                                    marginBottom: '32px'
                                }}>
                                    <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '8px',
                                            background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-primary)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <OriginIcon size={20} />
                                        </div>
                                        <div>
                                            <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Origem</div>
                                            <div style={{ fontWeight: 600 }}>{ORIGIN_LABELS[ticket.origin_channel] || ticket.origin_channel}</div>
                                        </div>
                                    </div>

                                    <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '8px',
                                            background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <Tag size={20} />
                                        </div>
                                        <div>
                                            <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Subcategoria</div>
                                            <div style={{ fontWeight: 600 }}>{ticket.subcategory?.replace(/_/g, ' ')}</div>
                                        </div>
                                    </div>

                                    {ticket.assigned_to_name && (
                                        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '40px', height: '40px', borderRadius: '8px',
                                                background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                <User size={20} />
                                            </div>
                                            <div>
                                                <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Responsável</div>
                                                <div style={{ fontWeight: 600 }}>{ticket.assigned_to_name}</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Data de Abertura */}
                                    <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '8px',
                                            background: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <Clock size={20} />
                                        </div>
                                        <div>
                                            <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Aberto em</div>
                                            <div style={{ fontWeight: 600 }}>
                                                {new Date(ticket.created_at).toLocaleDateString('pt-BR', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Description Section */}
                                <div>
                                    <h4 style={{ fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <FileText size={18} className="text-muted" />
                                        Descrição do Problema
                                    </h4>
                                    <div style={{
                                        padding: '24px',
                                        background: 'var(--color-bg-secondary)',
                                        borderRadius: 'var(--radius-lg)',
                                        border: '1px solid var(--color-border)',
                                        fontSize: '0.95rem',
                                        lineHeight: 1.6,
                                        color: 'var(--color-text)',
                                        whiteSpace: 'pre-line'
                                    }}>
                                        {ticket.description || <span className="text-muted">Sem descrição disponível.</span>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ACTIVITY TAB */}
                        {activeTab === 'activity' && (
                            <ActivityLog ticketId={ticket.id} lastUpdate={ticket.updated_at} />
                        )}

                        {/* HISTORY TAB */}
                        {activeTab === 'history' && (
                            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                                {enrichedHistory && enrichedHistory.length > 0 ? (
                                    <div style={{ position: 'relative', paddingLeft: '24px' }}>
                                        {/* Vertical Line */}
                                        <div style={{
                                            position: 'absolute', left: '7px', top: '10px', bottom: '0',
                                            width: '2px', background: 'var(--color-border)'
                                        }} />

                                        {enrichedHistory.map((entry, i) => (
                                            <div key={i} style={{ marginBottom: '32px', position: 'relative' }}>
                                                {/* Dot */}
                                                <div style={{
                                                    position: 'absolute', left: '-21px', top: '6px',
                                                    width: '14px', height: '14px', borderRadius: '50%',
                                                    background: 'var(--color-bg-primary)',
                                                    border: `3px solid var(--color-primary)`,
                                                    zIndex: 1
                                                }} />

                                                <div className="card" style={{ padding: '16px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                                            {entry.from_status
                                                                ? <>{STATUS_LABELS[entry.from_status]} <ArrowRight size={14} style={{ display: 'inline', margin: '0 4px' }} /> {STATUS_LABELS[entry.to_status]}</>
                                                                : `Criado como ${STATUS_LABELS[entry.to_status]}`
                                                            }
                                                        </span>
                                                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                            {new Date(entry.changed_at).toLocaleString('pt-BR')}
                                                        </span>
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 500, marginBottom: '8px' }}>
                                                        <User size={12} />
                                                        {entry.changed_by_name || 'Sistema'}
                                                    </div>

                                                    {entry.notes && (
                                                        <div style={{
                                                            marginTop: '12px',
                                                            padding: '12px',
                                                            background: 'var(--color-bg-tertiary)',
                                                            borderRadius: 'var(--radius-md)',
                                                            borderLeft: '3px solid var(--color-primary)',
                                                            fontSize: '0.9rem',
                                                            fontStyle: 'italic',
                                                            color: 'var(--color-text)'
                                                        }}>
                                                            "{entry.notes}"
                                                        </div>
                                                    )}

                                                    {entry.attachments && entry.attachments.length > 0 && (
                                                        <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                            {entry.attachments.map(att => (
                                                                <a
                                                                    key={att.id}
                                                                    href={`http://localhost:3001/api/attachments/file/${att.id}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style={{
                                                                        display: 'flex', alignItems: 'center', gap: '6px',
                                                                        padding: '6px 10px', borderRadius: '6px',
                                                                        background: 'var(--color-bg-tertiary)',
                                                                        border: '1px solid var(--color-border)',
                                                                        fontSize: '0.8rem', color: 'var(--color-text)',
                                                                        textDecoration: 'none',
                                                                        transition: 'all 0.2s ease'
                                                                    }}
                                                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                                                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                                                                >
                                                                    <Paperclip size={14} />
                                                                    {att.original_name}
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <History size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                                        <h3>Nenhum histórico</h3>
                                        <p>As alterações de status aparecerão aqui.</p>
                                    </div>
                                )}
                            </div>
                        )}


                    </div>

                    {/* Modern Footer */}
                    <div style={{
                        padding: '16px 32px',
                        borderTop: '1px solid var(--color-border)',
                        background: 'var(--color-bg-primary)',
                        display: 'flex', // Changed from 'block ' to 'flex' for alignment
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        gap: '16px'
                    }}>
                        {error && (
                            <div className="alert alert-error" style={{ flex: 1, margin: 0 }}>
                                {error}
                            </div>
                        )}

                        <button className="btn btn-ghost" onClick={onClose} style={{ color: 'var(--color-text-muted)' }}>
                            Fechar
                        </button>

                        {canChangeStatus && (
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowTransferModal(true)}
                                style={{
                                    padding: '10px 24px',
                                    fontSize: '0.95rem'
                                }}
                            >
                                <ArrowRight size={18} /> Encaminhar
                            </button>
                        )}

                        {canChangeStatus ? (
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowStatusModal(true)}
                                style={{
                                    padding: '10px 24px',
                                    fontSize: '0.95rem',
                                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
                                }}
                            >
                                <CheckCircle size={18} /> Alterar Status
                            </button>
                        ) : (
                            <div className="badge badge-neutral" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                                <CheckCircle size={16} /> Ticket Encerrado
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Status Change Modal */}
            {showStatusModal && (
                <StatusChangeModal
                    ticket={ticket}
                    onClose={() => setShowStatusModal(false)}
                    onStatusChange={handleStatusChange}
                    isLoading={loading}
                />
            )}

            {/* Transfer Area Modal */}
            {showTransferModal && (
                <TransferAreaModal
                    ticket={ticket}
                    onClose={() => setShowTransferModal(false)}
                    onTransfer={handleTransfer}
                    isLoading={transferLoading}
                />
            )}
        </>
    );
}
