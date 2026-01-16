import { useState, useEffect } from 'react';
import { Users, Check } from 'lucide-react';
import { areasAPI } from '../../api';

export default function StepOwner({ value, onChange, suggestedAreaId }) {
    const [areas, setAreas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAreas();
    }, []);

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
        </div>
    );
}
