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
                <Tag size={20} className="inline-block mr-2 mb-1" />
                Detalhes da Solicitação
            </h3>
            <p className="text-center text-sm text-gray-400 mb-4">
                Descreva o problema com o máximo de detalhes possível para agilizar o atendimento.
            </p>

            <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Subcategory (Subject) */}
                    <div>
                        <label className="form-label">
                            Subcategoria (Assunto) <span className="text-error">*</span>
                        </label>
                        <select
                            value={subcategory || ''}
                            onChange={(e) => onSubcategoryChange(e.target.value)}
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
                    <div>
                        <label className="form-label">
                            Impacto <span className="text-error">*</span>
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { value: 'baixo', label: 'Baixo' },
                                { value: 'medio', label: 'Médio' },
                                { value: 'alto', label: 'Alto' }
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => onImpactChange(opt.value)}
                                    className={`btn ${impact === opt.value ? 'btn-primary' : 'btn-secondary'} px-2 py-2 text-sm`}
                                    style={{
                                        justifyContent: 'center',
                                        border: impact === opt.value ? `1px solid var(--color-${opt.value === 'alto' ? 'error' : opt.value === 'medio' ? 'warning' : 'success'})` : undefined
                                    }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="form-group">
                    <label className="form-label">
                        Descrição Detalhada <span className="text-error">*</span>
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => onDescriptionChange(e.target.value)}
                        className="form-input form-textarea"
                        placeholder="Explique o que aconteceu, mensagens de erro, etc..."
                        rows={4}
                    />
                </div>

                {/* Custom Fields Section */}
                {customFields.length > 0 && (
                    <div className="section-divider">
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
