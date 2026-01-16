import { useState, useEffect } from 'react';
import { Search, Tag, ChevronDown } from 'lucide-react';
import * as Icons from 'lucide-react';
import { categoriesAPI } from '../../api';

const MAX_VISIBLE_RESULTS = 8;

export default function StepCategory({ value, onChange }) {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadCategories();
    }, []);

    async function loadCategories() {
        try {
            const data = await categoriesAPI.list();
            setCategories(data);
        } catch (error) {
            console.error('Error loading categories:', error);
        } finally {
            setLoading(false);
        }
    }

    // Filter and limit results
    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );
    const visibleCategories = filteredCategories.slice(0, MAX_VISIBLE_RESULTS);
    const hasMore = filteredCategories.length > MAX_VISIBLE_RESULTS;

    return (
        <div>
            <h3 className="wizard-title">
                <Tag size={20} />
                Qual é a categoria?
            </h3>
            <p className="wizard-subtitle" style={{ marginBottom: '12px' }}>
                {categories.length > 0 ? `Selecione entre ${categories.length} categorias` : 'Selecione a categoria do ticket'}
            </p>

            {/* Search */}
            <div className="form-group" style={{ marginBottom: '12px' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--color-text-muted)'
                    }} />
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Buscar categoria..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ paddingLeft: '40px' }}
                    />
                </div>
            </div>

            {/* Categories List */}
            {loading ? (
                <div className="loading" style={{ padding: '20px' }}>
                    <div className="spinner"></div>
                </div>
            ) : (
                <div style={{
                    maxHeight: '220px',
                    overflowY: 'auto',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-bg-secondary)'
                }}>
                    {visibleCategories.length === 0 ? (
                        <div style={{
                            padding: '20px',
                            textAlign: 'center',
                            color: 'var(--color-text-muted)',
                            fontSize: '0.9rem'
                        }}>
                            {search ? 'Nenhuma categoria encontrada' : 'Nenhuma categoria cadastrada'}
                        </div>
                    ) : (
                        visibleCategories.map(category => {
                            const IconComponent = Icons[category.icon] || Icons.Tag;
                            const isSelected = value?.id === category.id;

                            return (
                                <button
                                    key={category.id}
                                    type="button"
                                    onClick={() => onChange(category)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        border: 'none',
                                        borderBottom: '1px solid var(--color-border)',
                                        background: isSelected
                                            ? 'var(--color-primary)'
                                            : 'transparent',
                                        color: isSelected ? 'white' : 'inherit',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'background 0.15s ease'
                                    }}
                                >
                                    <div style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '6px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: isSelected ? 'rgba(255,255,255,0.2)' : `${category.color}20`,
                                        color: isSelected ? 'white' : category.color
                                    }}>
                                        <IconComponent size={16} />
                                    </div>
                                    <span style={{ flex: 1, fontWeight: 500, fontSize: '0.9rem' }}>
                                        {category.name}
                                    </span>
                                    {category.subcategories && category.subcategories.length > 0 && (
                                        <span style={{
                                            fontSize: '0.7rem',
                                            color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--color-text-muted)',
                                            background: isSelected ? 'rgba(255,255,255,0.1)' : 'var(--color-bg-tertiary)',
                                            padding: '2px 6px',
                                            borderRadius: '4px'
                                        }}>
                                            {category.subcategories.length} sub
                                        </span>
                                    )}
                                </button>
                            );
                        })
                    )}

                    {/* Show more indicator */}
                    {hasMore && (
                        <div style={{
                            padding: '8px',
                            textAlign: 'center',
                            fontSize: '0.75rem',
                            color: 'var(--color-text-muted)',
                            background: 'var(--color-bg-tertiary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                        }}>
                            <ChevronDown size={12} />
                            +{filteredCategories.length - MAX_VISIBLE_RESULTS} categorias - refine sua busca
                        </div>
                    )}
                </div>
            )}

            {/* Selected category indicator */}
            {value && (
                <div style={{
                    marginTop: '12px',
                    padding: '10px 14px',
                    background: `${value.color}15`,
                    border: `1px solid ${value.color}`,
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.9rem'
                }}>
                    {(() => {
                        const IconComponent = Icons[value.icon] || Icons.Tag;
                        return <IconComponent size={16} style={{ color: value.color }} />;
                    })()}
                    <span>Categoria: <strong>{value.name}</strong></span>
                </div>
            )}
        </div>
    );
}
