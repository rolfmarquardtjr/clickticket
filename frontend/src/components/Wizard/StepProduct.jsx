import { useState, useEffect } from 'react';
import { Package, Search, Star, ChevronDown } from 'lucide-react';
import { productsAPI } from '../../api';

const MAX_VISIBLE_RESULTS = 8;

export default function StepProduct({ value, onChange }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        loadProducts();
    }, []);

    async function loadProducts() {
        try {
            setLoading(true);
            const data = await productsAPI.list();
            setProducts(data);
            setTotalCount(data.length);
        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            setLoading(false);
        }
    }

    // Filter and limit results
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
    );
    const visibleProducts = filteredProducts.slice(0, MAX_VISIBLE_RESULTS);
    const hasMore = filteredProducts.length > MAX_VISIBLE_RESULTS;

    return (
        <div>
            <h2 className="wizard-title">
                <Package size={20} />
                Qual é o produto relacionado?
            </h2>
            <p className="wizard-subtitle" style={{ marginBottom: '12px' }}>
                {totalCount > 0 ? `Selecione entre ${totalCount} produtos` : 'Selecione o produto ou serviço'}
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
                        placeholder="Buscar produto..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ paddingLeft: '40px' }}
                    />
                </div>
            </div>

            {/* Products List */}
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
                    {visibleProducts.length === 0 ? (
                        <div style={{
                            padding: '20px',
                            textAlign: 'center',
                            color: 'var(--color-text-muted)',
                            fontSize: '0.9rem'
                        }}>
                            {search ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
                        </div>
                    ) : (
                        visibleProducts.map(product => (
                            <button
                                key={product.id}
                                type="button"
                                onClick={() => onChange(product)}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    border: 'none',
                                    borderBottom: '1px solid var(--color-border)',
                                    background: value?.id === product.id
                                        ? 'var(--color-primary)'
                                        : 'transparent',
                                    color: value?.id === product.id ? 'white' : 'inherit',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'background 0.15s ease'
                                }}
                            >
                                <Package
                                    size={16}
                                    style={{
                                        color: value?.id === product.id ? 'white' : 'var(--color-primary)'
                                    }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                                        {product.name}
                                    </div>
                                    {product.description && (
                                        <div style={{
                                            fontSize: '0.75rem',
                                            opacity: 0.7,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {product.description}
                                        </div>
                                    )}
                                </div>
                                {product.sla_policy_name && (
                                    <span style={{
                                        fontSize: '0.65rem',
                                        color: value?.id === product.id ? 'rgba(255,255,255,0.8)' : 'var(--color-text-muted)',
                                        background: value?.id === product.id ? 'rgba(255,255,255,0.15)' : 'var(--color-bg-tertiary)',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        <Star size={8} /> {product.sla_policy_name}
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
                            +{filteredProducts.length - MAX_VISIBLE_RESULTS} produtos - refine sua busca
                        </div>
                    )}
                </div>
            )}

            {/* Skip Option */}
            <div style={{ marginTop: '12px', textAlign: 'center' }}>
                <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => onChange(null)}
                    style={{
                        opacity: value === null ? 1 : 0.7,
                        background: value === null ? 'var(--color-bg-tertiary)' : undefined
                    }}
                >
                    Produto não se aplica / Não sei
                </button>
            </div>

            {/* Selected product indicator */}
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
                    <Package size={16} style={{ color: 'var(--color-primary)' }} />
                    <span>Produto: <strong>{value.name}</strong></span>
                    {value.sla_policy_name && (
                        <span style={{
                            marginLeft: 'auto',
                            fontSize: '0.7rem',
                            color: 'var(--color-primary)',
                            background: 'var(--color-primary-alpha)',
                            padding: '2px 8px',
                            borderRadius: '4px'
                        }}>
                            SLA: {value.sla_policy_name}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
