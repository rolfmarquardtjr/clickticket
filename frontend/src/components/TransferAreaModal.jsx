import { useState, useEffect, useRef } from 'react';
import { X, Check, Loader2, AlertTriangle, ArrowRight, Building, MessageSquare, Upload, FileText, Image, AlertOctagon } from 'lucide-react';
import { areasAPI, attachmentsAPI, customFieldsAPI } from '../api';

const MIN_NOTES_LENGTH = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

export default function TransferAreaModal({ ticket, onClose, onTransfer, isLoading = false }) {
    const [areas, setAreas] = useState([]);
    const [loadingAreas, setLoadingAreas] = useState(true);
    const [selectedArea, setSelectedArea] = useState(null);
    const [notes, setNotes] = useState('');
    const [error, setError] = useState(null);
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    // Custom Fields State
    const [customFields, setCustomFields] = useState([]);
    const [customData, setCustomData] = useState({});
    const [loadingFields, setLoadingFields] = useState(false);

    // Existing ticket custom data (to pre-fill if keys match? usually we start fresh for new area requirements, 
    // unless we want to carry over common fields. For now, let's keep it scoped to new requirements).
    // Actually, carrying over might be confusing if the field ID is different. 
    // Since custom fields are scoped to Area, they have unique IDs. So we start fresh.

    useEffect(() => {
        loadAreas();
    }, []);

    // Fetch custom fields when area changes
    useEffect(() => {
        if (selectedArea) {
            fetchCustomFields(selectedArea);
        } else {
            setCustomFields([]);
            setCustomData({});
        }
    }, [selectedArea]);

    async function loadAreas() {
        try {
            const data = await areasAPI.list();
            // Filter out current area
            const otherAreas = data.filter(a => a.id !== ticket.area_id);
            setAreas(otherAreas);
        } catch (err) {
            console.error('Error loading areas:', err);
            setError('Erro ao carregar áreas');
        } finally {
            setLoadingAreas(false);
        }
    }

    async function fetchCustomFields(areaId) {
        setLoadingFields(true);
        try {
            const fields = await customFieldsAPI.list({
                entity_type: 'area',
                entity_id: areaId,
                active: true
            });
            setCustomFields(fields);
        } catch (error) {
            console.error('Error loading custom fields:', error);
        } finally {
            setLoadingFields(false);
        }
    }

    const notesValid = notes.trim().length >= MIN_NOTES_LENGTH;

    // Validate required custom fields
    const customFieldsValid = () => {
        for (const field of customFields) {
            if (field.required) {
                const val = customData[field.id];
                if (!val || val.toString().trim() === '') return false;
            }
        }
        return true;
    };

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
        if (!selectedArea) {
            setError('Selecione uma área de destino');
            return;
        }
        if (!notesValid) {
            setError(`Justificativa obrigatória (mínimo ${MIN_NOTES_LENGTH} caracteres)`);
            return;
        }
        if (!customFieldsValid()) {
            setError('Preencha os campos obrigatórios da área de destino');
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

            // Then transfer with attachment IDs and Custom Data
            onTransfer(selectedArea, notes.trim(), attachmentIds, customData);
        } catch (err) {
            setError('Erro ao fazer upload: ' + err.message);
            setUploading(false);
        }
    }

    const handleCustomDataChange = (fieldId, value) => {
        setCustomData(prev => ({ ...prev, [fieldId]: value }));
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000, backdropFilter: 'blur(4px)' }}>
            <div
                className="modal animate-in fade-in zoom-in"
                onClick={e => e.stopPropagation()}
                style={{
                    maxWidth: '600px', // Slightly wider for fields
                    width: '95%',
                    maxHeight: '90vh',
                    borderRadius: 'var(--radius-lg)',
                    padding: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-card)'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '16px 20px',
                    background: 'var(--color-bg-secondary)',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Encaminhar Ticket</h3>
                        <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                            Selecione a nova área responsável para este ticket
                        </p>
                    </div>
                    <button
                        className="btn btn-icon btn-ghost"
                        onClick={onClose}
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    gap: '4px',
                    overflowY: 'auto'
                }}>

                    {/* Visual Flow */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '20px'
                    }}>
                        <div className="badge badge-neutral" style={{ padding: '6px 12px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                            <Building size={12} style={{ marginRight: '6px' }} />
                            {ticket.area_name || 'Origem'}
                        </div>
                        <div style={{ color: 'var(--color-text-muted)' }}>
                            <ArrowRight size={16} />
                        </div>
                        <div className={`badge ${selectedArea ? 'badge-primary' : 'badge-outline'}`} style={{ padding: '6px 12px', fontSize: '0.85rem', borderStyle: selectedArea ? 'solid' : 'dashed', color: selectedArea ? '#fff' : 'var(--color-text-secondary)' }}>
                            <Building size={12} style={{ marginRight: '6px' }} />
                            {selectedArea ? areas.find(a => a.id === selectedArea)?.name : 'Destino'}
                        </div>
                    </div>

                    {/* Area Selection */}
                    {loadingAreas ? (
                        <div style={{ padding: '40px', textAlign: 'center' }}>
                            <Loader2 size={32} className="spinning text-primary" />
                        </div>
                    ) : areas.length === 0 ? (
                        <div className="alert alert-warning">
                            <AlertTriangle size={20} />
                            <div>Não há outras áreas disponíveis para encaminhar.</div>
                        </div>
                    ) : (
                        <div style={{ marginBottom: '16px' }}>
                            <label className="form-label" style={{ color: 'var(--color-text-primary)', marginBottom: '8px', fontSize: '0.85rem' }}>Destino</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                                {areas.map(area => (
                                    <button
                                        key={area.id}
                                        type="button"
                                        onClick={() => setSelectedArea(area.id)}
                                        className={selectedArea === area.id ? 'ring-1 ring-offset-2 ring-primary' : ''}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'flex-start',
                                            gap: '10px',
                                            padding: '10px 14px',
                                            border: selectedArea === area.id
                                                ? '2px solid var(--color-primary)'
                                                : '1px solid var(--color-border)',
                                            borderRadius: 'var(--radius-md)',
                                            background: selectedArea === area.id
                                                ? 'var(--color-primary-light)'
                                                : 'var(--color-bg-hover)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            opacity: (selectedArea && selectedArea !== area.id) ? 0.6 : 1,
                                            position: 'relative'
                                        }}
                                    >
                                        <Building size={18} style={{ color: selectedArea === area.id ? 'var(--color-primary)' : 'var(--color-text-secondary)' }} />
                                        <span style={{ fontWeight: selectedArea === area.id ? 600 : 500, fontSize: '0.85rem', color: selectedArea === area.id ? 'var(--color-primary-text)' : 'var(--color-text-primary)' }}>
                                            {area.name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Custom Fields Section */}
                    {customFields.length > 0 && (
                        <div className="animate-in slide-in-from-top-2 fade-in duration-300" style={{ marginBottom: '16px', background: 'var(--color-bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <AlertOctagon size={16} className="text-secondary" />
                                <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Informações Exigidas pela Área
                                </h4>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                                {customFields.map(field => (
                                    <div key={field.id}>
                                        <label className="form-label" style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                                            {field.label} {field.required && <span className="text-error">*</span>}
                                        </label>

                                        {field.type === 'select' ? (
                                            <div style={{ position: 'relative' }}>
                                                <select
                                                    className="form-input"
                                                    value={customData[field.id] || ''}
                                                    onChange={(e) => handleCustomDataChange(field.id, e.target.value)}
                                                    required={field.required}
                                                    style={{ width: '100%', appearance: 'none' }}
                                                >
                                                    <option value="">Selecione...</option>
                                                    {field.options.map((opt, i) => (
                                                        <option key={i} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                                <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }}>▼</div>
                                            </div>
                                        ) : field.type === 'textarea' ? (
                                            <textarea
                                                className="form-input form-textarea"
                                                value={customData[field.id] || ''}
                                                onChange={(e) => handleCustomDataChange(field.id, e.target.value)}
                                                required={field.required}
                                                rows={2}
                                                style={{ width: '100%' }}
                                            />
                                        ) : (
                                            <input
                                                type={field.type}
                                                className="form-input"
                                                value={customData[field.id] || ''}
                                                onChange={(e) => handleCustomDataChange(field.id, e.target.value)}
                                                required={field.required}
                                                style={{ width: '100%' }}
                                            />
                                        )}
                                        {field.description && (
                                            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{field.description}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes Field */}
                    <div style={{
                        marginTop: '8px',
                        opacity: selectedArea ? 1 : 0.5,
                        pointerEvents: selectedArea ? 'auto' : 'none',
                        transition: 'opacity 0.2s ease'
                    }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <MessageSquare size={14} />
                                    Justificativa <span className="text-error">*</span>
                                </span>
                                <span style={{
                                    fontSize: '0.7rem',
                                    color: notesValid ? 'var(--color-success)' : 'var(--color-text-muted)',
                                    fontWeight: 600
                                }}>
                                    {notes.length}/{MIN_NOTES_LENGTH}
                                </span>
                            </label>

                            <textarea
                                className="form-input form-textarea"
                                placeholder={selectedArea ? "Motivo do encaminhamento..." : "Selecione uma área..."}
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={2}
                                style={{
                                    width: '100%',
                                    borderColor: notes.length > 0 && !notesValid ? 'var(--color-error)' : 'var(--color-border)',
                                    resize: 'none',
                                    fontSize: '0.9rem',
                                    padding: '8px 12px'
                                }}
                            />
                        </div>
                    </div>

                    {/* Evidence Upload */}
                    <div style={{
                        marginTop: '16px',
                        opacity: selectedArea ? 1 : 0.5,
                        pointerEvents: selectedArea ? 'auto' : 'none',
                        transition: 'opacity 0.2s ease'
                    }}>
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.85rem' }}>
                            <Upload size={14} />
                            Evidências (opcional)
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
                            <Upload size={20} className="text-muted" style={{ marginBottom: '6px' }} />
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                Arraste imagens ou clique para anexar
                            </p>
                            <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
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
                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
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
                                            onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                                            style={{
                                                position: 'absolute',
                                                top: '2px',
                                                right: '2px',
                                                width: '18px',
                                                height: '18px',
                                                borderRadius: '50%',
                                                background: 'rgba(0,0,0,0.7)',
                                                border: 'none',
                                                color: 'white',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '10px'
                                            }}
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="alert alert-error animate-fade-in" style={{ marginTop: '16px' }}>
                            <AlertTriangle size={16} />
                            {error}
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div style={{
                        marginTop: '16px',
                        paddingTop: '16px',
                        paddingBottom: '4px',
                        display: 'flex',
                        gap: '10px',
                        borderTop: '1px solid var(--color-border)'
                    }}>
                        <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1, padding: '8px' }}>
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={!selectedArea || !notesValid || !customFieldsValid() || isLoading || uploading}
                            style={{ flex: 2, padding: '8px', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}
                        >
                            {isLoading || uploading ? <><Loader2 size={16} className="spinning" /> {uploading ? 'Enviando...' : 'Salvando...'}</> : 'Confirmar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
