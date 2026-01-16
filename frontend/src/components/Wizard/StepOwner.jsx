import { useState, useEffect } from 'react';
import { Users, Check } from 'lucide-react';
import { areasAPI, customFieldsAPI } from '../../api';

export default function StepOwner({ value, onChange, suggestedAreaId, customData = {}, onCustomDataChange }) {
    const [areas, setAreas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [customFields, setCustomFields] = useState([]);

    useEffect(() => {
        loadAreas();
    }, []);

    useEffect(() => {
        if (value?.id) {
            loadCustomFields(value.id);
        } else {
            setCustomFields([]);
        }
    }, [value?.id]);

    async function loadAreas() {
        try {
            setLoading(true);
            const data = await areasAPI.list();
            setAreas(data);

            // Auto-select suggested area if available and nothing selected
            if (suggestedAreaId && !value) {
                const suggested = data.find(a => a.id === suggestedAreaId);
                if (suggested) {
                    onChange(suggested);
                }
            }
        } catch (error) {
            console.error('Error loading areas:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadCustomFields(areaId) {
        try {
            const fields = await customFieldsAPI.list({
                entity_type: 'area',
                entity_id: areaId,
                active: true
            });
            setCustomFields(fields);
        } catch (error) {
            console.error('Error loading area custom fields:', error);
            setCustomFields([]);
        }
    }

    function handleCustomFieldChange(fieldId, fieldValue) {
        if (!onCustomDataChange) return;
        onCustomDataChange({ ...customData, [fieldId]: fieldValue });
    }

    return (
        <div>
            <h3 className="wizard-title">Quem é o dono?</h3>
            <p className="text-secondary text-center mb-lg">
                Selecione a área responsável por este ticket
            </p>

            {loading ? (
                <div className="loading">
                    <div className="spinner"></div>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 'var(--space-md)'
                }}>
                    {areas.map(area => {
                        const isSelected = value?.id === area.id;
                        const isSuggested = area.id === suggestedAreaId;

                        return (
                            <button
                                key={area.id}
                                className={`card ${isSelected ? 'selected' : ''}`}
                                onClick={() => onChange(area)}
                                style={{
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: 'var(--space-lg)',
                                    border: isSelected
                                        ? '2px solid var(--color-primary)'
                                        : isSuggested
                                            ? '2px solid var(--color-success)'
                                            : '1px solid var(--color-border)',
                                    background: isSelected
                                        ? 'rgba(99, 102, 241, 0.1)'
                                        : 'var(--color-bg-tertiary)',
                                    position: 'relative'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <Users size={20} style={{ color: 'var(--color-primary-light)' }} />
                                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                                        {area.name}
                                    </span>
                                </div>

                                {isSelected && (
                                    <Check size={18} style={{ color: 'var(--color-primary)' }} />
                                )}

                                {isSuggested && !isSelected && (
                                    <span
                                        style={{
                                            fontSize: '0.625rem',
                                            background: 'var(--color-success)',
                                            color: 'white',
                                            padding: '2px 6px',
                                            borderRadius: 'var(--radius-full)',
                                            fontWeight: 600
                                        }}
                                    >
                                        SUGERIDO
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {!value && (
                <div className="alert alert-warning" style={{ marginTop: 'var(--space-lg)' }}>
                    ⚠️ Confirme a área responsável para criar o ticket
                </div>
            )}

            {value && (
                <div className="alert alert-success" style={{ marginTop: 'var(--space-lg)' }}>
                    ✅ Área "{value.name}" selecionada. Clique em "Criar Ticket" para finalizar.
                </div>
            )}

            {customFields.length > 0 && (
                <div className="section-divider" style={{ marginTop: 'var(--space-lg)' }}>
                    <h4 className="section-title">
                        Informações da Área ({customFields.length})
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {customFields.map(field => (
                            <div key={field.id} className={field.type === 'textarea' ? 'col-span-full' : 'form-group'}>
                                <label className="form-label">
                                    {field.label} {field.required && <span className="text-error">*</span>}
                                </label>

                                {field.type === 'select' ? (
                                    <select
                                        value={customData?.[field.id] || ''}
                                        onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                        className="form-input form-select"
                                    >
                                        <option value="">Selecione...</option>
                                        {field.options.map((opt, i) => (
                                            <option key={i} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                ) : field.type === 'textarea' ? (
                                    <textarea
                                        value={customData?.[field.id] || ''}
                                        onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                        className="form-input form-textarea"
                                        rows={3}
                                    />
                                ) : (
                                    <input
                                        type={field.type}
                                        value={customData?.[field.id] || ''}
                                        onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                        className="form-input"
                                    />
                                )}

                                {field.description && (
                                    <p className="form-hint">{field.description}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
