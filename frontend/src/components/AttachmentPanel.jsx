import { useState, useRef } from 'react';
import { Upload, Paperclip, X, Image, FileText, File, Trash2, Download, Loader2, Eye } from 'lucide-react';
import { attachmentsAPI } from '../api';

const FILE_ICONS = {
    'image/': Image,
    'application/pdf': FileText,
    'text/': FileText,
    'default': File
};

function getFileIcon(mimeType) {
    for (const [prefix, Icon] of Object.entries(FILE_ICONS)) {
        if (mimeType.startsWith(prefix)) return Icon;
    }
    return FILE_ICONS.default;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentPanel({ ticketId, attachments = [], onUpdate }) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const fileInputRef = useRef(null);

    async function handleFileSelect(files) {
        if (!files || files.length === 0) return;

        setUploading(true);
        setError(null);

        try {
            for (const file of files) {
                await attachmentsAPI.upload(ticketId, file);
            }
            onUpdate?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        setDragActive(false);
        handleFileSelect(e.dataTransfer.files);
    }

    function handleDragOver(e) {
        e.preventDefault();
        setDragActive(true);
    }

    function handleDragLeave(e) {
        e.preventDefault();
        setDragActive(false);
    }

    async function handleDelete(attachment) {
        if (!confirm(`Excluir "${attachment.original_name}"?`)) return;

        try {
            await attachmentsAPI.delete(attachment.id);
            onUpdate?.();
        } catch (err) {
            setError(err.message);
        }
    }

    function openPreview(attachment) {
        if (attachment.mime_type.startsWith('image/')) {
            setPreviewImage(attachment);
        } else {
            window.open(attachmentsAPI.getUrl(attachment.id), '_blank');
        }
    }

    return (
        <div style={{ marginTop: 'var(--space-lg)' }}>
            <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <Paperclip size={12} />
                Evidências ({attachments.length})
            </div>

            {/* Upload Area */}
            <div
                className={`card ${dragActive ? 'drag-active' : ''}`}
                style={{
                    padding: 'var(--space-lg)',
                    border: dragActive ? '2px dashed var(--color-primary)' : '2px dashed var(--color-border)',
                    background: dragActive ? 'rgba(99, 102, 241, 0.1)' : 'var(--color-bg-secondary)',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    marginBottom: 'var(--space-md)'
                }}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileSelect(e.target.files)}
                />

                {uploading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-sm)' }}>
                        <Loader2 size={20} className="spinning" style={{ color: 'var(--color-primary)' }} />
                        <span>Enviando...</span>
                    </div>
                ) : (
                    <>
                        <Upload size={24} style={{ color: 'var(--color-primary)', marginBottom: 'var(--space-xs)' }} />
                        <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                            Arraste arquivos ou clique para enviar
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 'var(--space-xs)' }}>
                            Imagens, PDF, Word, Excel (máx. 10MB)
                        </div>
                    </>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="alert alert-error" style={{ marginBottom: 'var(--space-md)' }}>
                    {error}
                    <button
                        className="btn btn-icon btn-ghost"
                        onClick={() => setError(null)}
                        style={{ marginLeft: 'auto' }}
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Attachments List */}
            {attachments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    {attachments.map(attachment => {
                        const FileIcon = getFileIcon(attachment.mime_type);
                        const isImage = attachment.mime_type.startsWith('image/');

                        return (
                            <div
                                key={attachment.id}
                                className="card"
                                style={{
                                    padding: 'var(--space-sm) var(--space-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-md)'
                                }}
                            >
                                {/* Thumbnail for images */}
                                {isImage ? (
                                    <div
                                        style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: 'var(--radius-sm)',
                                            overflow: 'hidden',
                                            background: 'var(--color-bg-tertiary)',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => openPreview(attachment)}
                                    >
                                        <img
                                            src={attachmentsAPI.getUrl(attachment.id)}
                                            alt={attachment.original_name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    </div>
                                ) : (
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'var(--color-bg-tertiary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <FileIcon size={24} style={{ color: 'var(--color-text-muted)' }} />
                                    </div>
                                )}

                                {/* File Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontWeight: 500,
                                        fontSize: '0.875rem',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {attachment.original_name}
                                    </div>
                                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                        {formatFileSize(attachment.size)}
                                        {attachment.uploaded_by_name && (
                                            <> • por {attachment.uploaded_by_name}</>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                                    <button
                                        className="btn btn-icon btn-ghost"
                                        onClick={() => openPreview(attachment)}
                                        title="Visualizar"
                                    >
                                        <Eye size={16} />
                                    </button>
                                    <a
                                        href={attachmentsAPI.getUrl(attachment.id)}
                                        download={attachment.original_name}
                                        className="btn btn-icon btn-ghost"
                                        title="Download"
                                    >
                                        <Download size={16} />
                                    </a>
                                    <button
                                        className="btn btn-icon btn-ghost"
                                        onClick={() => handleDelete(attachment)}
                                        style={{ color: 'var(--color-error)' }}
                                        title="Excluir"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Image Preview Modal */}
            {previewImage && (
                <div
                    className="modal-overlay"
                    onClick={() => setPreviewImage(null)}
                    style={{ zIndex: 2000 }}
                >
                    <div
                        style={{
                            maxWidth: '90vw',
                            maxHeight: '90vh',
                            position: 'relative'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            className="btn btn-icon btn-ghost"
                            onClick={() => setPreviewImage(null)}
                            style={{
                                position: 'absolute',
                                top: '-40px',
                                right: '0',
                                color: 'white'
                            }}
                        >
                            <X size={24} />
                        </button>
                        <img
                            src={attachmentsAPI.getUrl(previewImage.id)}
                            alt={previewImage.original_name}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '85vh',
                                borderRadius: 'var(--radius-lg)',
                                boxShadow: 'var(--shadow-xl)'
                            }}
                        />
                        <div style={{
                            textAlign: 'center',
                            marginTop: 'var(--space-md)',
                            color: 'white',
                            fontSize: '0.875rem'
                        }}>
                            {previewImage.original_name}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
