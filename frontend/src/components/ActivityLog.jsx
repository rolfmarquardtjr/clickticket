import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, User, Clock, Loader2, Lock, Globe, Wrench, FileText, Image, Paperclip, ArrowRight } from 'lucide-react';
import { commentsAPI, attachmentsAPI } from '../api';
import { useAuth } from '../context/AuthContext';

const COMMENT_TYPES = {
    internal: { label: 'Nota Interna', icon: Lock, color: 'var(--color-text-muted)' },
    public: { label: 'Resposta ao Cliente', icon: Globe, color: 'var(--color-success)' },
    action: { label: 'Ação Realizada', icon: Wrench, color: 'var(--color-primary)' }
};

export default function ActivityLog({ ticketId, lastUpdate }) {
    const { user } = useAuth();
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [commentType, setCommentType] = useState('internal');
    const [error, setError] = useState(null);
    const [uploading, setUploading] = useState(false);
    const commentsEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        loadComments();
    }, [ticketId, lastUpdate]);

    async function loadComments() {
        try {
            setLoading(true);
            const data = await commentsAPI.list(ticketId);
            setComments(data);
        } catch (err) {
            console.error('Error loading comments:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!newComment.trim() || submitting) return;

        try {
            setSubmitting(true);
            setError(null);
            await commentsAPI.create(ticketId, newComment.trim(), commentType);
            setNewComment('');
            await loadComments();
            // Scroll to bottom
            setTimeout(() => {
                commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setError('Arquivo muito grande (máx 5MB)');
            return;
        }

        try {
            setUploading(true);
            setError(null);
            await attachmentsAPI.upload(ticketId, file);
            await loadComments();
            setTimeout(() => {
                commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (err) {
            setError('Erro ao enviar anexo: ' + err.message);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    }

    function formatTime(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Agora mesmo';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`;

        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function renderAttachments(attachments) {
        if (!attachments || attachments.length === 0) return null;
        return (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {attachments.map(att => {
                    const isImage = (att.mime_type || '').startsWith('image/');
                    const url = `http://localhost:3001/api/attachments/file/${att.id}`;

                    return (
                        <a
                            key={att.id}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '6px 10px', borderRadius: '6px',
                                background: 'var(--color-bg-tertiary)',
                                border: '1px solid var(--color-border)',
                                fontSize: '0.8rem', color: 'var(--color-text-secondary)',
                                textDecoration: 'none', transition: 'all 0.2s ease',
                                maxWidth: '100%'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = 'var(--color-primary)';
                                e.currentTarget.style.background = 'var(--color-bg-secondary)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = 'var(--color-border)';
                                e.currentTarget.style.background = 'var(--color-bg-tertiary)';
                            }}
                        >
                            {isImage ? <Image size={14} /> : <FileText size={14} />}
                            <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {att.original_name || 'Anexo'}
                            </span>
                        </a>
                    );
                })}
            </div>
        );
    }

    return (
        <div style={{ marginTop: 'var(--space-lg)' }}>
            <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <MessageSquare size={12} />
                Acompanhamento ({comments.length})
            </div>

            {/* Comments List */}
            <div
                className="card"
                style={{
                    padding: 'var(--space-md)',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    marginBottom: 'var(--space-md)'
                }}
            >
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--color-text-muted)' }}>
                        <Loader2 size={20} className="spinning" />
                    </div>
                ) : comments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--color-text-muted)' }}>
                        <MessageSquare size={24} style={{ marginBottom: 'var(--space-xs)', opacity: 0.5 }} />
                        <div>Nenhum registro de acompanhamento</div>
                        <div style={{ fontSize: '0.75rem' }}>Adicione uma nota para começar o histórico</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        {comments.map((comment, index) => {
                            const isStatusChange = comment.entry_type === 'status_change';
                            const typeInfo = COMMENT_TYPES[comment.comment_type] || COMMENT_TYPES.internal;
                            const TypeIcon = typeInfo.icon;

                            // Avatar color based on user name (simple hash or default)
                            const avatarColor = comment.is_me ? 'var(--color-primary)' : 'var(--color-text-muted)';

                            if (isStatusChange) {
                                return (
                                    <div key={comment.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', margin: '16px 0 24px 0' }}>
                                        {/* Avatar (Actions are smaller/different) */}
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '50%',
                                            background: 'var(--color-bg-tertiary)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)',
                                            flexShrink: 0, marginTop: '2px'
                                        }}>
                                            <Wrench size={14} />
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '0.9rem' }}>
                                                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                                                    {comment.user_name || 'Sistema'}
                                                </span>
                                                <span style={{ color: 'var(--color-text-secondary)' }}>alterou o status:</span>

                                                <span style={{
                                                    padding: '2px 8px', borderRadius: '12px', background: 'var(--color-bg-tertiary)',
                                                    fontSize: '0.75rem', border: '1px solid var(--color-border)', fontWeight: 500
                                                }}>
                                                    {comment.from_status || 'Novo'}
                                                </span>
                                                <ArrowRight size={14} style={{ color: 'var(--color-text-muted)' }} />
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: '12px', background: 'var(--color-primary)', color: 'white',
                                                    fontSize: '0.75rem', fontWeight: 500
                                                }}>
                                                    {comment.to_status}
                                                </span>

                                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginLeft: 'auto' }}>
                                                    {formatTime(comment.created_at)}
                                                </span>
                                            </div>

                                            {comment.notes && (
                                                <div style={{
                                                    marginTop: '6px', fontSize: '0.85rem', color: 'var(--color-text-secondary)',
                                                    padding: '8px 12px', background: 'var(--color-bg-tertiary)', borderRadius: '6px',
                                                    borderLeft: '2px solid var(--color-border)'
                                                }}>
                                                    {comment.notes.replace(/^Status alterado.*Motivo: /, '')}
                                                </div>
                                            )}

                                            {/* Render attachments for status change here too */}
                                            {comment.attachments && comment.attachments.length > 0 && (
                                                <div style={{ marginTop: '8px' }}>{renderAttachments(comment.attachments)}</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            }

                            // Standard Comment Bubble
                            return (
                                <div key={comment.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                    {/* Avatar */}
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '50%',
                                        background: 'var(--color-primary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', fontSize: '0.85rem', fontWeight: 600,
                                        flexShrink: 0
                                    }}>
                                        {comment.user_name?.charAt(0).toUpperCase() || '?'}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        {/* Bubble Header */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)' }}>
                                                {comment.user_name || 'Usuário'}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>•</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                {formatTime(comment.created_at)}
                                            </span>
                                            <div style={{
                                                marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px',
                                                padding: '2px 8px', borderRadius: '12px',
                                                background: `${typeInfo.color}15`, color: typeInfo.color,
                                                fontSize: '0.7rem', fontWeight: 600
                                            }}>
                                                <TypeIcon size={10} />
                                                {typeInfo.label}
                                            </div>
                                        </div>

                                        {/* Bubble Content */}
                                        <div style={{
                                            padding: '12px 16px',
                                            background: 'var(--color-bg-secondary)',
                                            borderRadius: '0 12px 12px 12px',
                                            fontSize: '0.9rem',
                                            color: 'var(--color-text)',
                                            lineHeight: 1.5,
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                        }}>
                                            <div style={{ whiteSpace: 'pre-wrap' }}>{comment.display_content}</div>
                                            {comment.attachments && comment.attachments.length > 0 && (
                                                <div style={{ marginTop: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
                                                    {renderAttachments(comment.attachments)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={commentsEndRef} />
                    </div>
                )}
            </div>

            {/* Add Comment Form */}
            <form onSubmit={handleSubmit}>
                {/* Comment Type Selector */}
                <div style={{
                    display: 'flex',
                    gap: 'var(--space-xs)',
                    marginBottom: 'var(--space-sm)'
                }}>
                    {Object.entries(COMMENT_TYPES).map(([type, info]) => {
                        const TypeIcon = info.icon;
                        const isActive = commentType === type;

                        return (
                            <button
                                key={type}
                                type="button"
                                className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setCommentType(type)}
                                style={{
                                    fontSize: '0.75rem',
                                    padding: '4px 10px',
                                    borderColor: isActive ? info.color : undefined,
                                    background: isActive ? `${info.color}20` : undefined,
                                    color: isActive ? info.color : undefined
                                }}
                            >
                                <TypeIcon size={12} />
                                {info.label}
                            </button>
                        );
                    })}
                </div>

                {/* Input */}
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                        accept="image/*,.pdf"
                    />
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || submitting}
                        title="Anexar arquivo"
                        style={{ padding: '0 10px', color: 'var(--color-text-muted)' }}
                    >
                        {uploading ? <Loader2 size={16} className="spinning" /> : <Paperclip size={16} />}
                    </button>
                    <textarea
                        className="form-input"
                        placeholder={
                            commentType === 'internal' ? 'Adicionar nota interna...' :
                                commentType === 'public' ? 'Resposta para o cliente...' :
                                    'Descrever ação realizada...'
                        }
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={2}
                        style={{ flex: 1, resize: 'none' }}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e);
                            }
                        }}
                    />
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={!newComment.trim() || submitting}
                        style={{ alignSelf: 'flex-end' }}
                    >
                        {submitting ? <Loader2 size={16} className="spinning" /> : <Send size={16} />}
                    </button>
                </div>

                {error && (
                    <div className="alert alert-error" style={{ marginTop: 'var(--space-sm)', fontSize: '0.75rem' }}>
                        {error}
                    </div>
                )}
            </form>
        </div>
    );
}
