import { useState, useEffect } from 'react';
import { Plus, RefreshCw, BarChart3, Inbox, Clock, AlertTriangle, CheckCircle, Building, Users, Headphones, Code, Settings, CheckSquare } from 'lucide-react';
import { ticketsAPI, reportsAPI, areasAPI, kanbanColumnsAPI } from '../api';
import QueuePanel from '../components/Queue/QueuePanel';
import TicketModal from '../components/Queue/TicketModal';
import CreateTicketModal from '../components/CreateTicketModal';
import GlobalOverview from '../components/Dashboard/GlobalOverview';

// Area icons mapping
const AREA_ICONS = {
    'area-suporte': Headphones,
    'area-operacoes': Settings,
    'area-cs': Users,
    'area-dev': Code,
    'area-implantacao': Building
};

export default function Dashboard() {
    const [tickets, setTickets] = useState([]);
    const [areas, setAreas] = useState([]);
    const [selectedArea, setSelectedArea] = useState('all');
    const [summary, setSummary] = useState(null);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [kanbanColumns, setKanbanColumns] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (selectedArea === 'all') {
            setKanbanColumns([]);
            return;
        }
        loadKanbanColumns(selectedArea);
    }, [selectedArea]);

    async function loadData() {
        try {
            setLoading(true);
            const [ticketsData, summaryData, areasData] = await Promise.all([
                ticketsAPI.list(),
                reportsAPI.summary(),
                areasAPI.list()
            ]);
            setTickets(ticketsData);
            setSummary(summaryData);
            setAreas(areasData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadKanbanColumns(areaId) {
        try {
            const columns = await kanbanColumnsAPI.list(areaId);
            setKanbanColumns(columns);
        } catch (error) {
            console.error('Error loading kanban columns:', error);
            setKanbanColumns([]);
        }
    }

    // Filter tickets by selected area
    const filteredTickets = selectedArea === 'all'
        ? tickets
        : tickets.filter(t => t.area_id === selectedArea);

    // Count tickets per area for badges
    const getAreaTicketCount = (areaId) => {
        if (areaId === 'all') return tickets.length;
        return tickets.filter(t => t.area_id === areaId).length;
    };

    async function handleTicketClick(ticket) {
        try {
            const fullTicket = await ticketsAPI.get(ticket.id);
            setSelectedTicket(fullTicket);
        } catch (error) {
            console.error('Error loading ticket:', error);
        }
    }

    function handleTicketUpdate(updatedTicket) {
        // Atualiza IMEDIATAMENTE o ticket na lista para mover para coluna correta
        setTickets(prev => {
            const newList = prev.map(t =>
                t.id === updatedTicket.id ? { ...t, status: updatedTicket.status, ...updatedTicket } : t
            );
            return newList;
        });
        setSelectedTicket(null);
    }

    function handleTicketDelete(ticketId) {
        setTickets(prev => prev.filter(t => t.id !== ticketId));
        setSelectedTicket(null);
    }

    const statusMeta = kanbanColumns.reduce((acc, col) => {
        acc[col.status_key] = { label: col.label, color: col.color, is_closed: !!col.is_closed };
        return acc;
    }, {});

    return (
        <div>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-xl)'
            }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Painel de Tickets</h1>
                    <p className="text-secondary">Gerencie todos os tickets em um só lugar</p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button className="btn btn-secondary" onClick={loadData} disabled={loading}>
                        <RefreshCw size={16} className={loading ? 'spinning' : ''} />
                        Atualizar
                    </button>
                    <button className="btn btn-primary btn-lg" onClick={() => setShowCreateModal(true)}>
                        <Plus size={18} />
                        Novo Ticket
                    </button>
                </div>
            </div>

            {/* Stats */}
            {summary && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.2)' }}>
                            <Inbox size={24} style={{ color: 'var(--color-primary)' }} />
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{summary.totals.active_tickets || 0}</div>
                            <div className="stat-label">Tickets Ativos</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(75, 85, 99, 0.1)' }}>
                            <CheckSquare size={24} style={{ color: 'var(--color-text-secondary)' }} />
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{summary.totals.closed_tickets || 0}</div>
                            <div className="stat-label">Finalizados</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
                            <CheckCircle size={24} style={{ color: 'var(--color-success)' }} />
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{summary.sla_overview.ok || 0}</div>
                            <div className="stat-label">SLA OK</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.2)' }}>
                            <Clock size={24} style={{ color: 'var(--color-warning)' }} />
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{summary.sla_overview.risco || 0}</div>
                            <div className="stat-label">SLA em Risco</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
                            <AlertTriangle size={24} style={{ color: 'var(--color-error)' }} />
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{summary.sla_overview.quebrado || 0}</div>
                            <div className="stat-label">SLA Quebrado</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Area Filter Chips */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: 'var(--space-lg)'
            }}>
                {/* All Areas Chip */}
                <button
                    onClick={() => setSelectedArea('all')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        border: selectedArea === 'all' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                        borderRadius: '20px',
                        background: selectedArea === 'all' ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                        color: selectedArea === 'all' ? 'white' : 'var(--color-text)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        transition: 'all 0.15s ease'
                    }}
                >
                    Todos
                    <span style={{
                        background: selectedArea === 'all' ? 'rgba(255,255,255,0.25)' : 'var(--color-bg-tertiary)',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                        fontWeight: 700
                    }}>
                        {getAreaTicketCount('all')}
                    </span>
                </button>

                {/* Area Chips */}
                {areas.map(area => {
                    const isActive = selectedArea === area.id;
                    const count = getAreaTicketCount(area.id);

                    return (
                        <button
                            key={area.id}
                            onClick={() => setSelectedArea(area.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                border: isActive ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                                borderRadius: '20px',
                                background: isActive ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                                color: isActive ? 'white' : 'var(--color-text)',
                                cursor: 'pointer',
                                fontWeight: 500,
                                fontSize: '0.85rem',
                                transition: 'all 0.15s ease',
                                opacity: count === 0 ? 0.5 : 1
                            }}
                        >
                            {area.name}
                            <span style={{
                                background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--color-bg-tertiary)',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '0.75rem',
                                fontWeight: 700
                            }}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Queue Panel */}
            {loading ? (
                <div className="loading" style={{ minHeight: '400px' }}>
                    <div className="spinner"></div>
                </div>
            ) : selectedArea === 'all' ? (
                <GlobalOverview
                    tickets={tickets}
                    areas={areas}
                    onAreaSelect={setSelectedArea}
                />
            ) : (
                <QueuePanel
                    tickets={filteredTickets}
                    columns={kanbanColumns}
                    statusMeta={statusMeta}
                    onTicketClick={handleTicketClick}
                    onTicketUpdate={handleTicketUpdate}
                />
            )}

            {/* Ticket Modal */}
            {selectedTicket && (
                <TicketModal
                    ticket={selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                    onUpdate={handleTicketUpdate}
                    onDelete={handleTicketDelete}
                    statusMeta={statusMeta}
                />
            )}

            {showCreateModal && (
                <CreateTicketModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => loadData()}
                />
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
