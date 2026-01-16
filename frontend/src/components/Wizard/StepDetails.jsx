import React, { useState, useEffect } from 'react';
import { Tag, AlertCircle } from 'lucide-react';
import { customFieldsAPI } from '../../api';

export default function StepDetails({
    category,
    subcategory,
    onSubcategoryChange,
    impact,
    onImpactChange,
    description,
    onDescriptionChange,
    attachments,
    onAttachmentsChange,
    customData = {},
    onCustomDataChange
}) {
    const [customFields, setCustomFields] = useState([]);
    const [loadingFields, setLoadingFields] = useState(false);

    // Fetch custom fields when category changes
    useEffect(() => {
        if (category) {
            fetchCustomFields();
        } else {
            setCustomFields([]);
        }
    }, [category]);

    async function fetchCustomFields() {
        setLoadingFields(true);
        try {
            // Check if category is an object or ID
            const catId = typeof category === 'object' ? category.id : category;

            const fields = await customFieldsAPI.list({
                entity_type: 'category',
                entity_id: catId,
                active: true
            });
            setCustomFields(fields);
        } catch (error) {
            console.error('Error loading custom fields:', error);
        } finally {
            setLoadingFields(false);
        }
    }

    const handleCustomFieldChange = (fieldId, value) => {
        onCustomDataChange({ ...customData, [fieldId]: value });
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h3 className="wizard-title">
                <Tag size={20} />
                Detalhes da Solicitação
            </h3>
            <p className="wizard-subtitle" style={{ marginBottom: '12px' }}>
                Descreva o problema com o máximo de detalhes possível para agilizar o atendimento.
            </p>

            <div style={{
                padding: '16px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg-secondary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
            }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                    {/* Subcategory (Subject) */}
                    <div>
                        <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                            Subcategoria (Assunto) <span className="text-error">*</span>
                        </label>
                    <select
                            value={subcategory?.id || subcategory || ''}
                            onChange={(e) => {
                                const value = e.target.value;
                                const selected = category?.subcategories?.find(sub => sub.id === value);
                                onSubcategoryChange(selected || value);
                            }}
                            className="form-input form-select"
                        >
                            <option value="">Selecione...</option>
                            {category?.subcategories?.map(sub => (
                                <option key={sub.id} value={sub.id}>{sub.name}</option>
                            ))}
                            {/* Fallback if category is just an ID or no subcategories provided in object */}
                            {!category?.subcategories && (
                                <option value="geral">Geral</option>
                            )}
                        </select>
                    </div>

                    {/* Impact */}
                    <div style={{ marginTop: '6px' }}>
                        <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                            Impacto <span className="text-error">*</span>
                        </label>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '2px' }}>
                            {[
                                { value: 'baixo', label: 'Baixo', color: 'var(--color-success)' },
                                { value: 'medio', label: 'Médio', color: 'var(--color-warning)' },
                                { value: 'alto', label: 'Alto', color: 'var(--color-error)' }
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => onImpactChange(opt.value)}
                                    className={`btn ${impact === opt.value ? 'btn-primary' : 'btn-secondary'} px-2 py-2 text-sm`}
                                    style={{
                                        minWidth: '92px',
                                        justifyContent: 'center',
                                        border: impact === opt.value ? `1px solid ${opt.color}` : '1px solid var(--color-border)',
                                        background: impact === opt.value ? `${opt.color}22` : 'var(--color-bg-tertiary)',
                                        color: impact === opt.value ? opt.color : 'var(--color-text-secondary)',
                                        boxShadow: impact === opt.value ? `0 0 0 2px ${opt.color}33` : 'none'
                                    }}
                                >
                                    <span style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: opt.color,
                                        display: 'inline-block',
                                        marginRight: '6px'
                                    }} />
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="form-group" style={{ marginTop: '4px' }}>
                    <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>
                        Descrição Detalhada <span className="text-error">*</span>
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => onDescriptionChange(e.target.value)}
                        className="form-input form-textarea"
                        placeholder="Explique o que aconteceu, mensagens de erro, etc..."
                        rows={4}
                        style={{ marginTop: '0' }}
                    />
                </div>

                {/* Custom Fields Section */}
                {customFields.length > 0 && (
                    <div className="section-divider" style={{ marginTop: '6px' }}>
                        <h4 className="section-title">
                            Informações Específicas ({customFields.length})
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
        </div>
    );
}
