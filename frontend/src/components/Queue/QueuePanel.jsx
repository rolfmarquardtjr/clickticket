import { useState, useRef } from 'react';
import { Inbox, Search, Clock, Zap, CheckCircle2, Archive, X, Check, Loader2, MessageSquare, Upload, FileText } from 'lucide-react';
import TicketCard from './TicketCard';
import { STATUS, STATUS_LABELS, STATUS_COLORS } from '../../data/constants';
import { ticketsAPI, attachmentsAPI } from '../../api';

const STATUS_ICONS = {
    [STATUS.NOVO]: Inbox,
    [STATUS.EM_ANALISE]: Search,
    [STATUS.AGUARDANDO_CLIENTE]: Clock,
    [STATUS.EM_EXECUCAO]: Zap,
    [STATUS.RESOLVIDO]: CheckCircle2,
    [STATUS.ENCERRADO]: Archive
};

const DEFAULT_COLUMNS = [
    { status_key: STATUS.NOVO, label: STATUS_LABELS[STATUS.NOVO], color: STATUS_COLORS[STATUS.NOVO] },
    { status_key: STATUS.EM_ANALISE, label: STATUS_LABELS[STATUS.EM_ANALISE], color: STATUS_COLORS[STATUS.EM_ANALISE] },
    { status_key: STATUS.AGUARDANDO_CLIENTE, label: STATUS_LABELS[STATUS.AGUARDANDO_CLIENTE], color: STATUS_COLORS[STATUS.AGUARDANDO_CLIENTE] },
    { status_key: STATUS.EM_EXECUCAO, label: STATUS_LABELS[STATUS.EM_EXECUCAO], color: STATUS_COLORS[STATUS.EM_EXECUCAO] },
    { status_key: STATUS.RESOLVIDO, label: STATUS_LABELS[STATUS.RESOLVIDO], color: STATUS_COLORS[STATUS.RESOLVIDO] },
    { status_key: STATUS.ENCERRADO, label: STATUS_LABELS[STATUS.ENCERRADO], color: STATUS_COLORS[STATUS.ENCERRADO] }
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

function QueueColumn({ column, tickets, onTicketClick, onDrop, dragOverStatus, onDragOver, onDragLeave, statusMeta }) {
    const status = column.status_key;
    const Icon = STATUS_ICONS[status] || Inbox;
    const color = statusMeta?.[status]?.color || column.color || STATUS_COLORS[status] || '#666';
    const label = statusMeta?.[status]?.label || column.label || STATUS_LABELS[status] || status;
    const isDropTarget = dragOverStatus === status;

    return (
        <div
            className="queue-column"
            onDragOver={(e) => { e.preventDefault(); onDragOver(status); }}
            onDragLeave={onDragLeave}
            onDrop={(e) => {
                e.preventDefault();
                const ticketData = e.dataTransfer.getData('application/json');
                if (ticketData) onDrop(JSON.parse(ticketData), status);
                onDragLeave();
            }}
            style={{
                transition: 'all 0.2s ease',
                transform: isDropTarget ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isDropTarget ? `0 0 20px ${color}40` : 'none',
                borderColor: isDropTarget ? color : 'var(--color-border)'
            }}
        >
            <div className="queue-header">
                <div className="queue-title" style={{ color }}>
                    <Icon size={16} />
                    {label}
                </div>
                <span className="queue-count">{tickets.length}</span>
            </div>
            <div className="queue-items">
                {tickets.length === 0 ? (
                    <div className="empty-state" style={{
                        padding: 'var(--space-lg)', minHeight: '100px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: isDropTarget ? `2px dashed ${color}` : '2px dashed transparent',
                        borderRadius: 'var(--radius-md)'
                    }}>
                        <p style={{ fontSize: '0.75rem' }}>{isDropTarget ? 'Solte aqui' : 'Nenhum ticket'}</p>
                    </div>
                ) : (
                    tickets.map(ticket => (
                        <TicketCard key={ticket.id} ticket={ticket} onClick={onTicketClick} isDraggable={true} />
                    ))
                )}
            </div>
        </div>
    );
}

// Modal de anotação e evidências - SEMPRE abre para qualquer transição
function NotesModal({ ticket, fromStatus, targetStatus, onConfirm, onCancel, isLoading, statusMeta }) {
    const [notes, setNotes] = useState('');
    const [files, setFiles] = useState([]);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const isValid = notes.trim().length >= 10;

    function handleFileSelect(e) {
        const selectedFiles = Array.from(e.target.files || []);
        addFiles(selectedFiles);
    }

    function handleDrop(e) {
        e.preventDefault();
        const droppedFiles = Array.from(e.dataTransfer.files || []);
        addFiles(droppedFiles);
    }

    function addFiles(newFiles) {
        const validFiles = newFiles.filter(file => {
            if (!ALLOWED_TYPES.includes(file.type)) {
                setError(`Tipo não permitido: ${file.name}`);
                return false;
            }
            if (file.size > MAX_FILE_SIZE) {
                setError(`Arquivo muito grande: ${file.name} (máx 5MB)`);
                return false;
            }
            return true;
        });

        // Create previews for images
        validFiles.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    file.preview = e.target.result;
                    setFiles(prev => [...prev]);
                };
                reader.readAsDataURL(file);
            }
        });

        setFiles(prev => [...prev, ...validFiles]);
        if (newFiles.length > 0) setError(null);
    }

    function removeFile(index) {
        setFiles(prev => prev.filter((_, i) => i !== index));
    }

    return (
        <div className="modal-overlay" onClick={onCancel} style={{ zIndex: 2000 }}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">Registrar Mudança de Status</h3>
                    <button className="btn btn-icon btn-ghost" onClick={onCancel}><X size={20} /></button>
                </div>
                <div className="modal-body">
                    {/* De -> Para */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                        <span className="badge" style={{ background: statusMeta?.[fromStatus]?.color || STATUS_COLORS[fromStatus], color: 'white' }}>
                            {statusMeta?.[fromStatus]?.label || STATUS_LABELS[fromStatus] || fromStatus}
                        </span>
                        <span>→</span>
                        <span className="badge" style={{ background: statusMeta?.[targetStatus]?.color || STATUS_COLORS[targetStatus], color: 'white' }}>
                            {statusMeta?.[targetStatus]?.label || STATUS_LABELS[targetStatus] || targetStatus}
                        </span>
                    </div>

                    {/* Campo de comentário */}
                    <div className="form-group">
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MessageSquare size={16} />
                            Comentário da tratativa *
                        </label>
                        <textarea
                            className="form-input form-textarea"
                            placeholder="Descreva o que foi feito ou o motivo da mudança..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={4}
                            autoFocus
                            style={{ width: '100%' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.75rem' }}>
                            <span style={{ color: isValid ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                                {isValid ? '✓ Observação válida' : 'Mínimo 10 caracteres'}
                            </span>
                            <span style={{ color: notes.length >= 10 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                                {notes.length}/10
                            </span>
                        </div>
                    </div>

                    {/* Evidence Upload */}
                    <div className="form-group" style={{ marginTop: '16px' }}>
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Upload size={16} />
                            <span>Evidências (opcional)</span>
                        </label>

                        {/* Drop Zone */}
                        <div
                            onDragOver={e => e.preventDefault()}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                border: '2px dashed var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                padding: '16px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                background: 'var(--color-bg-tertiary)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Upload size={20} className="text-muted" style={{ marginBottom: '8px' }} />
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                Arraste imagens para cá
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="image/*,.pdf"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />
                        </div>

                        {/* File Previews */}
                        {files.length > 0 && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                                {files.map((file, index) => (
                                    <div key={index} style={{
                                        position: 'relative',
                                        width: '60px',
                                        height: '60px',
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        border: '1px solid var(--color-border)',
                                        background: 'var(--color-bg-secondary)'
                                    }}>
                                        {file.preview ? (
                                            <img src={file.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                                <FileText size={20} className="text-muted" />
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => removeFile(index)}
                                            style={{
                                                position: 'absolute',
                                                top: '2px',
                                                right: '2px',
                                                width: '16px',
                                                height: '16px',
                                                borderRadius: '50%',
                                                background: 'rgba(0,0,0,0.7)',
                                                border: 'none',
                                                color: 'white',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="alert alert-error" style={{ fontSize: '0.85rem', marginTop: '10px' }}>{error}</div>
                    )}

                    {/* Botões */}
                    <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                        <button className="btn btn-ghost" onClick={onCancel} style={{ flex: 1 }}>Cancelar</button>
                        <button
                            className="btn btn-primary"
                            onClick={() => onConfirm(notes.trim(), files)}
                            disabled={!isValid || isLoading || (files.length > 0 && error)}
                            style={{ flex: 1 }}
                        >
                            {isLoading ? <Loader2 size={16} className="spinning" /> : <Check size={16} />}
                            {isLoading ? ' Salvando...' : ' Confirmar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function QueuePanel({ tickets, columns, onTicketClick, onTicketUpdate, statusMeta }) {
    const [dragOverStatus, setDragOverStatus] = useState(null);
    const [error, setError] = useState(null);
    const [pendingDrop, setPendingDrop] = useState(null);
    const [loading, setLoading] = useState(false);

    const columnsToRender = columns && columns.length > 0 ? columns : DEFAULT_COLUMNS;

    // Ao arrastar, SEMPRE abre modal para pedir comentário
    function handleDrop(ticket, newStatus) {
        if (ticket.status === newStatus) return;
        const isClosed = statusMeta?.[ticket.status]?.is_closed || ticket.status === 'encerrado';
        if (isClosed) {
            setError('Ticket encerrado não pode mudar de status');
            setTimeout(() => setError(null), 3000);
            return;
        }
        // Abre modal para pedir comentário
        setPendingDrop({ ticket, fromStatus: ticket.status, targetStatus: newStatus });
    }

    async function doStatusChange(ticket, newStatus, notes, files = []) {
        setLoading(true);
        setError(null);
        try {
            // Se houver arquivos, faz o upload primeiro
            if (files && files.length > 0) {
                for (const file of files) {
                    await attachmentsAPI.upload(ticket.id, file);
                }
            }

            const updated = await ticketsAPI.changeStatus(ticket.id, newStatus, notes);
            onTicketUpdate?.(updated);
            setPendingDrop(null);
        } catch (err) {
            setError(err.message || 'Erro ao mudar status');
            setTimeout(() => setError(null), 4000);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            {error && (
                <div style={{
                    position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--color-error)', color: 'white', padding: '12px 24px',
                    borderRadius: '8px', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}>
                    ⚠️ {error}
                </div>
            )}

            <div className="queue-panel">
                {columnsToRender.map(column => {
                    const statusTickets = tickets.filter(t => t.status === column.status_key);
                    return (
                    <QueueColumn
                        key={column.status_key}
                        column={column}
                        tickets={statusTickets}
                        onTicketClick={onTicketClick}
                        onDrop={handleDrop}
                        dragOverStatus={dragOverStatus}
                        onDragOver={setDragOverStatus}
                        onDragLeave={() => setDragOverStatus(null)}
                        statusMeta={statusMeta}
                    />
                    );
                })}
            </div>

            {/* Modal de comentário - abre em QUALQUER transição */}
            {pendingDrop && (
                <NotesModal
                    ticket={pendingDrop.ticket}
                    fromStatus={pendingDrop.fromStatus}
                    targetStatus={pendingDrop.targetStatus}
                    onConfirm={(notes, files) => doStatusChange(pendingDrop.ticket, pendingDrop.targetStatus, notes, files)}
                    onCancel={() => setPendingDrop(null)}
                    isLoading={loading}
                    statusMeta={statusMeta}
                />
            )}
        </div>
    );
}
