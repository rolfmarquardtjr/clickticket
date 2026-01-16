import { useState, useRef } from 'react';
import { X, Check, Loader2, AlertTriangle, ArrowRight, MessageSquare, Upload, Image, FileText, Trash2 } from 'lucide-react';
import { STATUS, STATUS_LABELS } from '../data/constants';
import { attachmentsAPI } from '../api';

// Valid status transitions
const VALID_TRANSITIONS = {
    [STATUS.NOVO]: [STATUS.EM_ANALISE, STATUS.EM_EXECUCAO],
    [STATUS.EM_ANALISE]: [STATUS.EM_EXECUCAO, STATUS.AGUARDANDO_CLIENTE],
    [STATUS.AGUARDANDO_CLIENTE]: [STATUS.EM_ANALISE],
    [STATUS.EM_EXECUCAO]: [STATUS.RESOLVIDO, STATUS.AGUARDANDO_CLIENTE],
    [STATUS.RESOLVIDO]: [STATUS.ENCERRADO],
    [STATUS.ENCERRADO]: []
};

const STATUS_COLORS = {
    [STATUS.NOVO]: '#6366f1',
    [STATUS.EM_ANALISE]: '#3b82f6',
    [STATUS.AGUARDANDO_CLIENTE]: '#f59e0b',
    [STATUS.EM_EXECUCAO]: '#8b5cf6',
    [STATUS.RESOLVIDO]: '#10b981',
    [STATUS.ENCERRADO]: '#6b7280'
};

const MIN_NOTES_LENGTH = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

export default function StatusChangeModal({ ticket, onClose, onStatusChange, isLoading = false }) {
    const [selectedStatus, setSelectedStatus] = useState(null);
    const [notes, setNotes] = useState('');
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const currentStatus = ticket.status;
    const availableTransitions = VALID_TRANSITIONS[currentStatus] || [];

    // Agora TODAS as transições exigem anotação
    const requiresNotes = true;
    const notesValid = notes.trim().length >= MIN_NOTES_LENGTH;

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
        setError(null);
    }

    function removeFile(index) {
        setFiles(prev => prev.filter((_, i) => i !== index));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!selectedStatus) {
            setError('Selecione um status');
            return;
        }
        if (!notesValid) {
            setError(`Anotação obrigatória (mínimo ${MIN_NOTES_LENGTH} caracteres)`);
            return;
        }

        try {
            // First upload files if any
            const attachmentIds = [];

            if (files.length > 0) {
                setUploading(true);
                for (const file of files) {
                    const uploaded = await attachmentsAPI.upload(ticket.id, file);
                    if (uploaded && uploaded.id) {
                        attachmentIds.push(uploaded.id);
                    }
                }
            }

            // Then change status with attachment IDs
            await onStatusChange(selectedStatus, notes.trim(), attachmentIds);
            // Modal close is handled by parent, but we stop loading here if needed
        } catch (err) {
            setError('Erro ao salvar alteração: ' + err.message);
            setUploading(false);
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000, backdropFilter: 'blur(4px)' }}>
            <div
                className="modal"
                onClick={e => e.stopPropagation()}
                style={{
                    maxWidth: '600px',
                    borderRadius: 'var(--radius-lg)',
                    padding: 0,
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    background: 'var(--color-bg-secondary)',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Registrar Mudança de Status</h3>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
                    {/* Status Flow Visualization */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '24px',
                        padding: '16px',
                        background: 'var(--color-bg-tertiary)',
                        borderRadius: 'var(--radius-md)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: STATUS_COLORS[currentStatus] }} />
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{STATUS_LABELS[currentStatus]}</span>
                        </div>
                        <ArrowRight size={18} className="text-muted" />
                        {selectedStatus ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: STATUS_COLORS[selectedStatus] }} />
                                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-primary)' }}>{STATUS_LABELS[selectedStatus]}</span>
                            </div>
                        ) : (
                            <span className="text-muted" style={{ fontStyle: 'italic', fontSize: '0.9rem' }}>Selecione...</span>
                        )}
                    </div>

                    {/* Status Selection */}
                    {availableTransitions.length === 0 ? (
                        <div className="alert alert-warning">
                            <AlertTriangle size={20} />
                            <div>
                                <strong>Ticket encerrado</strong>
                                <div>Não é possível alterar o status deste ticket.</div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ marginBottom: '24px' }}>
                            <label className="form-label">Para qual status deseja mover?</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {availableTransitions.map(status => (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() => setSelectedStatus(status)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '12px 16px',
                                            border: selectedStatus === status
                                                ? `2px solid ${STATUS_COLORS[status]}`
                                                : '1px solid var(--color-border)',
                                            borderRadius: 'var(--radius-md)',
                                            background: selectedStatus === status
                                                ? `${STATUS_COLORS[status]}20`
                                                : 'var(--color-bg-secondary)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            textAlign: 'left'
                                        }}
                                    >
                                        <div style={{
                                            width: '12px',
                                            height: '12px',
                                            borderRadius: '50%',
                                            background: STATUS_COLORS[status],
                                            boxShadow: `0 0 8px ${STATUS_COLORS[status]}60`
                                        }} />
                                        <span style={{
                                            fontWeight: selectedStatus === status ? 700 : 500,
                                            fontSize: '0.9rem',
                                            color: selectedStatus === status ? 'white' : 'var(--color-text-primary)'
                                        }}>
                                            {STATUS_LABELS[status]}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes Field */}
                    <div style={{
                        opacity: selectedStatus ? 1 : 0.5,
                        pointerEvents: selectedStatus ? 'auto' : 'none',
                        transition: 'opacity 0.2s ease'
                    }}>
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <MessageSquare size={16} />
                                <span>Motivo da alteração <span className="text-error">*</span></span>
                            </label>

                            <textarea
                                className="form-input form-textarea"
                                placeholder={selectedStatus ? "Descreva o que foi feito ou o motivo da mudança..." : "Selecione um status primeiro..."}
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={3}
                                style={{
                                    width: '100%',
                                    borderColor: notes.length > 0 && !notesValid ? 'var(--color-error)' : 'var(--color-border)'
                                }}
                            />

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.75rem' }}>
                                <span style={{ color: notesValid ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                                    {notesValid ? 'Observação válida' : `Mínimo ${MIN_NOTES_LENGTH} caracteres`}
                                </span>
                                <span style={{ color: notes.length >= MIN_NOTES_LENGTH ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                                    {notes.length}/{MIN_NOTES_LENGTH}
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
                                    padding: '20px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    background: 'var(--color-bg-tertiary)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <Upload size={24} className="text-muted" style={{ marginBottom: '8px' }} />
                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                    Arraste imagens ou clique para selecionar
                                </p>
                                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                    PNG, JPG, GIF, PDF (máx 5MB)
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
                                            width: '80px',
                                            height: '80px',
                                            borderRadius: '8px',
                                            overflow: 'hidden',
                                            border: '1px solid var(--color-border)',
                                            background: 'var(--color-bg-secondary)'
                                        }}>
                                            {file.preview ? (
                                                <img src={file.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                                    <FileText size={24} className="text-muted" />
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => removeFile(index)}
                                                style={{
                                                    position: 'absolute',
                                                    top: '4px',
                                                    right: '4px',
                                                    width: '20px',
                                                    height: '20px',
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
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="alert alert-error" style={{ marginTop: '16px' }}>
                            <AlertTriangle size={16} />
                            {error}
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div style={{
                        marginTop: '24px',
                        display: 'flex',
                        gap: '12px',
                        paddingTop: '20px',
                        borderTop: '1px solid var(--color-border)'
                    }}>
                        <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={!selectedStatus || !notesValid || isLoading || uploading}
                            style={{ flex: 2, boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}
                        >
                            {isLoading || uploading ? <><Loader2 size={18} className="spinning" /> Salvando...</> : 'Confirmar Alteração'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
