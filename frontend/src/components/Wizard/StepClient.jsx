import { useState, useEffect } from 'react';
import { Search, Building2, Plus, Star, ChevronDown } from 'lucide-react';
import { clientsAPI } from '../../api';

const MAX_VISIBLE_RESULTS = 8;

export default function StepClient({ value, onChange }) {
    const [clients, setClients] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        loadClients();
    }, []);

    async function loadClients() {
        try {
            setLoading(true);
            const data = await clientsAPI.list({ search });
            setClients(data);
            setTotalCount(data.length);
        } catch (error) {
            console.error('Error loading clients:', error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        const timeout = setTimeout(loadClients, 300);
        return () => clearTimeout(timeout);
    }, [search]);

    async function handleAddClient() {
        if (!newClientName.trim()) return;

        try {
            const created = await clientsAPI.create({ name: newClientName.trim() });
            setClients([created, ...clients]);
            onChange(created);
            setShowAdd(false);
            setNewClientName('');
        } catch (error) {
            console.error('Error creating client:', error);
        }
    }

    // Filter and limit results
    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );
    const visibleClients = filteredClients.slice(0, MAX_VISIBLE_RESULTS);
    const hasMore = filteredClients.length > MAX_VISIBLE_RESULTS;

    return (
        <div>
            <h3 className="wizard-title">Quem é o cliente?</h3>
            <p className="wizard-subtitle" style={{ marginBottom: '12px' }}>
                Digite para buscar entre {totalCount} clientes
            </p>

            {/* Search Input */}
            <div className="form-group" style={{ marginBottom: '12px' }}>
                <div style={{ position: 'relative' }}>
                    <Search
                        size={18}
                        style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--color-text-muted)'
                        }}
                    />
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Digite o nome do cliente..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ paddingLeft: '40px' }}
                        autoFocus
                    />
                </div>
            </div>

            {/* Results List */}
            {loading ? (
                <div className="loading" style={{ padding: '20px' }}>
                    <div className="spinner"></div>
                </div>
            ) : (
                <div style={{
                    maxHeight: '240px',
                    overflowY: 'auto',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-bg-secondary)'
                }}>
                    {visibleClients.length === 0 ? (
                        <div style={{
                            padding: '20px',
                            textAlign: 'center',
                            color: 'var(--color-text-muted)',
                            fontSize: '0.9rem'
                        }}>
                            {search ? 'Nenhum cliente encontrado' : 'Digite para buscar clientes'}
                        </div>
                    ) : (
                        visibleClients.map(client => (
                            <button
                                key={client.id}
                                type="button"
                                onClick={() => onChange(client)}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    border: 'none',
                                    borderBottom: '1px solid var(--color-border)',
                                    background: value?.id === client.id
                                        ? 'var(--color-primary)'
                                        : 'transparent',
                                    color: value?.id === client.id ? 'white' : 'inherit',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'background 0.15s ease'
                                }}
                            >
                                <Building2
                                    size={16}
                                    style={{
                                        color: value?.id === client.id
                                            ? 'white'
                                            : client.is_vip === 1 ? '#f59e0b' : 'var(--color-primary)'
                                    }}
                                />
                                <span style={{ flex: 1, fontWeight: 500, fontSize: '0.9rem' }}>
                                    {client.name}
                                </span>
                                {client.is_vip === 1 && (
                                    <span style={{
                                        background: value?.id === client.id
                                            ? 'rgba(255,255,255,0.2)'
                                            : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                        color: 'white',
                                        padding: '2px 6px',
                                        borderRadius: '10px',
                                        fontSize: '0.6rem',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                    }}>
                                        <Star size={8} style={{ fill: 'white' }} /> VIP
                                    </span>
                                )}
                                {client.sla_policy_name && (
                                    <span style={{
                                        fontSize: '0.65rem',
                                        color: value?.id === client.id ? 'rgba(255,255,255,0.8)' : 'var(--color-text-muted)',
                                        background: value?.id === client.id ? 'rgba(255,255,255,0.1)' : 'var(--color-bg-tertiary)',
                                        padding: '2px 6px',
                                        borderRadius: '4px'
                                    }}>
                                        {client.sla_policy_name}
                                    </span>
                                )}
                            </button>
                        ))
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
                            +{filteredClients.length - MAX_VISIBLE_RESULTS} clientes - refine sua busca
                        </div>
                    )}
                </div>
            )}

            {/* Add Client */}
            <div style={{ marginTop: '12px' }}>
                {!showAdd ? (
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setShowAdd(true)}
                    >
                        <Plus size={14} />
                        Adicionar novo cliente
                    </button>
                ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Nome do novo cliente"
                            value={newClientName}
                            onChange={(e) => setNewClientName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddClient()}
                            style={{ flex: 1, fontSize: '0.9rem', padding: '8px 12px' }}
                        />
                        <button className="btn btn-primary btn-sm" onClick={handleAddClient}>
                            Adicionar
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>
                            Cancelar
                        </button>
                    </div>
                )}
            </div>

            {/* Selected client indicator */}
            {value && (
                <div style={{
                    marginTop: '12px',
                    padding: '10px 14px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid var(--color-primary)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.9rem'
                }}>
                    <Building2 size={16} style={{ color: 'var(--color-primary)' }} />
                    <span>Cliente: <strong>{value.name}</strong></span>
                    {value.is_vip === 1 && (
                        <span style={{
                            marginLeft: 'auto',
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                        }}>
                            <Star size={9} style={{ fill: 'white' }} /> VIP
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
