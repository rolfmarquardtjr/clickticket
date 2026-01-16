import React, { useState, useEffect } from 'react';
import { Plus, Tag, Edit, Trash2, CheckCircle, AlertOctagon, Type, Link as LinkIcon, Building, X } from 'lucide-react';
import { customFieldsAPI, categoriesAPI, areasAPI } from '../../api';

export default function CustomFieldsManager() {
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [areas, setAreas] = useState([]);

    const [isCreating, setIsCreating] = useState(false);
    const [editingField, setEditingField] = useState(null);

    const [formData, setFormData] = useState({
        label: '',
        type: 'text',
        required: false,
        entity_type: 'category',
        entity_id: '',
        description: '',
        options: [] // for select type
    });

    const [tempOption, setTempOption] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const [fieldsData, categoriesData, areasData] = await Promise.all([
                customFieldsAPI.list({ active: true }),
                categoriesAPI.list(),
                areasAPI.list()
            ]);
            setFields(fieldsData);
            setCategories(categoriesData);
            setAreas(areasData);
        } catch (error) {
            console.error('Error loading custom fields:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Basic validation
            if (!formData.label.trim()) return alert('Nome do campo é obrigatório');
            if (!formData.entity_id) return alert('Selecione onde este campo irá aparecer (Categoria ou Área)');

            if (editingField) {
                await customFieldsAPI.update(editingField.id, formData);
            } else {
                await customFieldsAPI.create(formData);
            }
            setIsCreating(false);
            setEditingField(null);
            resetForm();
            loadData();
        } catch (error) {
            console.error('Error saving field:', error);
            alert('Erro ao salvar campo');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja desativar este campo?')) return;
        try {
            await customFieldsAPI.delete(id);
            loadData();
        } catch (error) {
            console.error('Error deleting field:', error);
        }
    };

    const resetForm = () => {
        setFormData({
            label: '',
            type: 'text',
            required: false,
            entity_type: 'category',
            entity_id: '',
            description: '',
            options: []
        });
        setTempOption('');
    };

    const handleEdit = (field) => {
        setEditingField(field);
        setFormData({
            label: field.label,
            type: field.type,
            required: field.required,
            entity_type: field.entity_type,
            entity_id: field.entity_id,
            description: field.description || '',
            options: field.options || []
        });
        setIsCreating(true);
    };

    const addOption = () => {
        if (!tempOption.trim()) return;
        setFormData(prev => ({
            ...prev,
            options: [...prev.options, tempOption.trim()]
        }));
        setTempOption('');
    };

    const removeOption = (index) => {
        setFormData(prev => ({
            ...prev,
            options: prev.options.filter((_, i) => i !== index)
        }));
    };

    const getEntityName = (field) => {
        if (field.entity_type === 'category') {
            const cat = categories.find(c => c.id === field.entity_id);
            return cat ? `Categoria: ${cat.name}` : 'Categoria desconhecida';
        } else {
            const area = areas.find(a => a.id === field.entity_id);
            return area ? `Área: ${area.name}` : 'Área desconhecida';
        }
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div className="custom-fields-manager">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <AlertOctagon size={24} className="text-primary" />
                        Campos Personalizados
                    </h2>
                </div>
                <button
                    onClick={() => { setIsCreating(true); resetForm(); }}
                    className="btn btn-primary"
                >
                    <Plus size={16} />
                    Novo Campo
                </button>
            </div>

            {/* Create/Edit Modal */}
            {isCreating && (
                <div className="modal-overlay" onClick={() => { setIsCreating(false); setEditingField(null); }}>
                    <div className="modal animate-in fade-in zoom-in" onClick={e => e.stopPropagation()}>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-header">
                                <h3 className="modal-title flex items-center gap-2">
                                    {editingField ? <Edit size={20} /> : <Plus size={20} />}
                                    {editingField ? 'Editar Campo' : 'Novo Campo Personalizado'}
                                </h3>
                                <button type="button" className="btn btn-icon btn-ghost" onClick={() => { setIsCreating(false); setEditingField(null); }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="modal-body">
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '24px' }}>
                                    {/* Left Column: Basic Info */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Nome do Campo (Label)</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.label}
                                                onChange={e => setFormData({ ...formData, label: e.target.value })}
                                                className="form-input"
                                                placeholder="Ex: Placa do Veículo"
                                            />
                                        </div>

                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Tipo de Dado</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                {['text', 'number', 'date', 'select', 'textarea'].map(type => (
                                                    <button
                                                        key={type}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, type })}
                                                        className={`btn btn-sm ${formData.type === type ? 'btn-primary' : 'btn-secondary'}`}
                                                        style={{ justifyContent: 'center', textTransform: 'uppercase', fontSize: '0.75rem', padding: '8px' }}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label style={{
                                                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                                                background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', cursor: 'pointer'
                                            }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.required}
                                                    onChange={e => setFormData({ ...formData, required: e.target.checked })}
                                                    style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
                                                />
                                                <div>
                                                    <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>Campo Obrigatório?</span>
                                                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Bloqueia o avanço se vazio.</span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Right Column: Scope & Options */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {/* Scope Selection */}
                                        <div style={{ background: 'var(--color-bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Onde este campo aparece?</label>

                                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, entity_type: 'category', entity_id: '' })}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px',
                                                        borderRadius: 'var(--radius-md)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '8px',
                                                        background: formData.entity_type === 'category' ? 'rgba(99, 102, 241, 0.2)' : 'var(--color-bg-secondary)',
                                                        color: formData.entity_type === 'category' ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
                                                        border: formData.entity_type === 'category' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                                                        fontSize: '0.85rem',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <Tag size={14} /> Categoria
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, entity_type: 'area', entity_id: '' })}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px',
                                                        borderRadius: 'var(--radius-md)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '8px',
                                                        background: formData.entity_type === 'area' ? 'rgba(16, 185, 129, 0.2)' : 'var(--color-bg-secondary)',
                                                        color: formData.entity_type === 'area' ? 'var(--color-success)' : 'var(--color-text-muted)',
                                                        border: formData.entity_type === 'area' ? '1px solid var(--color-success)' : '1px solid var(--color-border)',
                                                        fontSize: '0.85rem',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <Building size={14} /> Área
                                                </button>
                                            </div>

                                            {formData.entity_type === 'category' ? (
                                                <select
                                                    required
                                                    value={formData.entity_id}
                                                    onChange={e => setFormData({ ...formData, entity_id: e.target.value })}
                                                    className="form-input form-select"
                                                    style={{ width: '100%' }}
                                                >
                                                    <option value="">Selecione uma Categoria...</option>
                                                    {categories.map(c => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <select
                                                    required
                                                    value={formData.entity_id}
                                                    onChange={e => setFormData({ ...formData, entity_id: e.target.value })}
                                                    className="form-input form-select"
                                                    style={{ width: '100%' }}
                                                >
                                                    <option value="">Selecione uma Área...</option>
                                                    {areas.map(a => (
                                                        <option key={a.id} value={a.id}>{a.name}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>

                                        {/* Select Options Manager */}
                                        {formData.type === 'select' && (
                                            <div style={{ background: 'var(--color-bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Opções do Select</label>
                                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                                    <input
                                                        type="text"
                                                        value={tempOption}
                                                        onChange={e => setTempOption(e.target.value)}
                                                        placeholder="Nova opção..."
                                                        className="form-input"
                                                        style={{ padding: '6px 12px', fontSize: '0.85rem', flex: 1 }}
                                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())}
                                                    />
                                                    <button type="button" onClick={addOption} className="btn btn-secondary btn-icon" style={{ width: '36px', height: '36px' }}><Plus size={16} /></button>
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflowY: 'auto' }}>
                                                    {formData.options.map((opt, i) => (
                                                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', color: 'white' }}>
                                                            {opt}
                                                            <button type="button" onClick={() => removeOption(i)} style={{ color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><Trash2 size={12} /></button>
                                                        </span>
                                                    ))}
                                                    {formData.options.length === 0 && <span className="text-gray-500 text-xs italic">Nenhuma opção</span>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    onClick={() => { setIsCreating(false); setEditingField(null); }}
                                    className="btn btn-ghost"
                                >
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingField ? 'Salvar Alterações' : 'Criar Campo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* List - Table View */}
            {fields.length === 0 ? (
                <div className="empty-state">
                    <AlertOctagon size={48} style={{ color: 'var(--color-text-muted)' }} />
                    <p>Nenhum campo personalizado cadastrado</p>
                    <button
                        onClick={() => { setIsCreating(true); resetForm(); }}
                        className="btn btn-secondary mt-4"
                    >
                        Criar Primeiro Campo
                    </button>
                </div>
            ) : (
                <div className="card glass-panel">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Vínculo (Onde aparece)</th>
                                <th>Tipo</th>
                                <th>Obrigatório</th>
                                <th style={{ width: '100px' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fields.map(field => (
                                <tr key={field.id}>
                                    <td style={{ fontWeight: 500 }}>{field.label}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                padding: '4px',
                                                borderRadius: '4px',
                                                background: field.entity_type === 'category' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                color: field.entity_type === 'category' ? 'var(--color-primary-light)' : 'var(--color-success)'
                                            }}>
                                                {field.entity_type === 'category' ? <Tag size={14} /> : <Building size={14} />}
                                            </div>
                                            <span className="text-secondary">{getEntityName(field)}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            background: 'var(--color-bg-tertiary)',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            textTransform: 'uppercase'
                                        }}>
                                            <Type size={12} /> {field.type}
                                            {field.type === 'select' && ` (${field.options?.length || 0})`}
                                        </span>
                                    </td>
                                    <td>
                                        {field.required ? (
                                            <span style={{ color: 'var(--color-error)', fontSize: '0.75rem', fontWeight: 600 }}>SIM</span>
                                        ) : (
                                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Não</span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                                            <button className="btn btn-icon btn-ghost" onClick={() => handleEdit(field)} title="Editar">
                                                <Edit size={16} />
                                            </button>
                                            <button className="btn btn-icon btn-ghost" onClick={() => handleDelete(field.id)} style={{ color: 'var(--color-error)' }} title="Desativar">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
