import { useState, useEffect, useRef } from 'react';
import { Settings, Package, Users, Clock, Tags, FileText, Plus, Edit, Trash2, Star, X, Loader2, Check, Upload, Download, AlertCircle, Search, Ticket, Eye, Layers, Tag, ChevronDown, ChevronRight, AlertOctagon, Columns, ChevronUp, Mail } from 'lucide-react';
import { productsAPI, slaPoliciesAPI, clientsAPI, importAPI, ticketsAPI, areasAPI, categoriesAPI, kanbanColumnsAPI, emailMailboxesAPI } from '../api';
import CustomFieldsManager from '../components/Admin/CustomFieldsManager';
import { useAuth } from '../context/AuthContext';

const TABS = [
    { id: 'products', label: 'Produtos', icon: Package },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'areas', label: 'Áreas', icon: Layers },
    { id: 'categories', label: 'Categorias', icon: Tag },
    { id: 'custom_fields', label: 'Campos', icon: AlertOctagon },
    { id: 'sla', label: 'Políticas SLA', icon: Clock },
    { id: 'import', label: 'Importação', icon: Upload },
    { id: 'email', label: 'E-mails', icon: Mail }
];

export default function AdminPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('products');

    // Check admin access
    if (user?.role !== 'admin' && user?.role !== 'Admin') {
        return (
            <div className="empty-state" style={{ minHeight: '400px' }}>
                <Settings size={48} style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)' }} />
                <h3>Acesso Restrito</h3>
                <p className="text-secondary">Apenas administradores podem acessar esta área.</p>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 'var(--space-xl)' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <Settings size={28} />
                    Administração
                </h1>
                <p className="text-secondary">Gerencie produtos, clientes e políticas de SLA</p>
            </div>

            {/* Tabs */}
            <div className="tabs" style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-sm)' }}>
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            {activeTab === 'products' && <ProductsTab />}
            {activeTab === 'clients' && <ClientsVipTab />}
            {activeTab === 'areas' && <AreasTab />}
            {activeTab === 'categories' && <CategoriesTab />}
            {activeTab === 'custom_fields' && <CustomFieldsManager />}
            {activeTab === 'sla' && <SlaPoliciesTab />}
            {activeTab === 'import' && <BulkImportTab />}
            {activeTab === 'email' && <EmailTab />}
        </div>
    );
}

// Products Tab Component
function ProductsTab() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    useEffect(() => {
        loadProducts();
    }, []);

    async function loadProducts() {
        try {
            setLoading(true);
            const data = await productsAPI.list();
            setProducts(data);
        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            setLoading(false);
        }
    }

    function openCreateModal() {
        setEditingProduct(null);
        setShowModal(true);
    }

    function openEditModal(product) {
        setEditingProduct(product);
        setShowModal(true);
    }

    async function handleDelete(id) {
        if (!confirm('Tem certeza que deseja remover este produto?')) return;
        try {
            await productsAPI.delete(id);
            loadProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
        }
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Produtos</h2>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    <Plus size={16} /> Novo Produto
                </button>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner"></div></div>
            ) : products.length === 0 ? (
                <div className="empty-state">
                    <Package size={48} style={{ color: 'var(--color-text-muted)' }} />
                    <p>Nenhum produto cadastrado</p>
                </div>
            ) : (
                <div className="card glass-panel">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Descrição</th>
                                <th>Política SLA</th>
                                <th style={{ width: '100px' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(product => (
                                <tr key={product.id}>
                                    <td style={{ fontWeight: 500 }}>{product.name}</td>
                                    <td className="text-secondary">{product.description || '-'}</td>
                                    <td>{product.sla_policy_name || 'Padrão'}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                                            <button className="btn btn-icon btn-ghost" onClick={() => openEditModal(product)}>
                                                <Edit size={16} />
                                            </button>
                                            <button className="btn btn-icon btn-ghost" onClick={() => handleDelete(product.id)} style={{ color: 'var(--color-error)' }}>
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

            {showModal && (
                <ProductModal
                    product={editingProduct}
                    onClose={() => setShowModal(false)}
                    onSave={() => { setShowModal(false); loadProducts(); }}
                />
            )}
        </div>
    );
}

// Product Modal Component
function ProductModal({ product, onClose, onSave }) {
    const [name, setName] = useState(product?.name || '');
    const [description, setDescription] = useState(product?.description || '');
    const [slaPolicyId, setSlaPolicyId] = useState(product?.sla_policy_id || '');
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        slaPoliciesAPI.list().then(setPolicies).catch(console.error);
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!name.trim()) {
            setError('Nome é obrigatório');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = { name, description, sla_policy_id: slaPolicyId || null };

            if (product) {
                await productsAPI.update(product.id, data);
            } else {
                await productsAPI.create(data);
            }
            onSave();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">{product ? 'Editar Produto' : 'Novo Produto'}</h3>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-group">
                        <label className="form-label">Nome *</label>
                        <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Nome do produto" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Descrição</label>
                        <textarea className="form-input form-textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição opcional" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Política SLA</label>
                        <select className="form-input form-select" value={slaPolicyId} onChange={e => setSlaPolicyId(e.target.value)}>
                            <option value="">Padrão do sistema</option>
                            {policies.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    {error && <div className="alert alert-error">{error}</div>}
                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                        {loading ? <><Loader2 size={16} className="spinning" /> Salvando...</> : <><Check size={16} /> Salvar</>}
                    </button>
                </form>
            </div>
        </div>
    );
}

// Clients VIP Tab Component
function ClientsVipTab() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [policies, setPolicies] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [search, setSearch] = useState('');
    const [showTicketsModal, setShowTicketsModal] = useState(false);
    const [selectedClientTickets, setSelectedClientTickets] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const [clientsData, policiesData] = await Promise.all([
                clientsAPI.list(),
                slaPoliciesAPI.list()
            ]);
            setClients(clientsData);
            setPolicies(policiesData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }

    function openCreateModal() {
        setEditingClient(null);
        setShowModal(true);
    }

    function openEditModal(client) {
        setEditingClient(client);
        setShowModal(true);
    }

    async function toggleVip(client) {
        try {
            await clientsAPI.update(client.id, { is_vip: !client.is_vip });
            loadData();
        } catch (error) {
            console.error('Error updating client:', error);
        }
    }

    async function handleDelete(client) {
        if (!confirm(`Tem certeza que deseja excluir o cliente "${client.name}"?\n\nEsta ação não pode ser desfeita.`)) return;
        try {
            await clientsAPI.delete(client.id);
            loadData();
        } catch (error) {
            console.error('Error deleting client:', error);
            alert('Erro ao excluir cliente: ' + error.message);
        }
    }

    async function viewTickets(client) {
        try {
            const tickets = await ticketsAPI.list({ client_id: client.id });
            setSelectedClientTickets({ client, tickets });
            setShowTicketsModal(true);
        } catch (error) {
            console.error('Error loading tickets:', error);
        }
    }

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.contact_email && c.contact_email.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Clientes</h2>
                <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Buscar cliente..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ paddingLeft: '34px', width: '220px' }}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={openCreateModal}>
                        <Plus size={16} /> Novo Cliente
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner"></div></div>
            ) : filteredClients.length === 0 ? (
                <div className="empty-state">
                    <Users size={48} style={{ color: 'var(--color-text-muted)' }} />
                    <p>{search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}</p>
                </div>
            ) : (
                <div className="card glass-panel">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>VIP</th>
                                <th>Política SLA</th>
                                <th>Contato</th>
                                <th>Tickets</th>
                                <th style={{ width: '140px' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClients.map(client => (
                                <tr key={client.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                            <span style={{ fontWeight: 500 }}>{client.name}</span>
                                            {client.is_vip === 1 && (
                                                <Star size={14} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <button
                                            className={`btn ${client.is_vip ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => toggleVip(client)}
                                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                                        >
                                            {client.is_vip ? 'VIP' : 'Normal'}
                                        </button>
                                    </td>
                                    <td>
                                        <span className="text-secondary">
                                            {client.sla_policy_name || 'Padrão'}
                                        </span>
                                    </td>
                                    <td className="text-secondary">
                                        {client.contact_email || client.contact_phone || '-'}
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-ghost"
                                            onClick={() => viewTickets(client)}
                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                        >
                                            <Ticket size={14} /> Ver tickets
                                        </button>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                                            <button className="btn btn-icon btn-ghost" onClick={() => openEditModal(client)} title="Editar">
                                                <Edit size={16} />
                                            </button>
                                            <button className="btn btn-icon btn-ghost" onClick={() => handleDelete(client)} style={{ color: 'var(--color-error)' }} title="Excluir">
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

            {showModal && (
                <ClientModal
                    client={editingClient}
                    policies={policies}
                    onClose={() => setShowModal(false)}
                    onSave={() => { setShowModal(false); loadData(); }}
                />
            )}

            {showTicketsModal && selectedClientTickets && (
                <ClientTicketsModal
                    client={selectedClientTickets.client}
                    tickets={selectedClientTickets.tickets}
                    onClose={() => setShowTicketsModal(false)}
                />
            )}
        </div>
    );
}

// Client Tickets Modal
function ClientTicketsModal({ client, tickets, onClose }) {
    const STATUS_LABELS = {
        novo: 'Novo',
        em_andamento: 'Em Andamento',
        aguardando_cliente: 'Aguardando Cliente',
        resolvido: 'Resolvido',
        encerrado: 'Encerrado'
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        <Ticket size={20} /> Tickets de {client.name}
                    </h3>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="modal-body">
                    {tickets.length === 0 ? (
                        <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                            <Ticket size={48} style={{ color: 'var(--color-text-muted)' }} />
                            <p>Nenhum ticket encontrado para este cliente</p>
                        </div>
                    ) : (
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Ticket</th>
                                        <th>Categoria</th>
                                        <th>Status</th>
                                        <th>Impacto</th>
                                        <th>Data</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tickets.map(ticket => (
                                        <tr key={ticket.id}>
                                            <td style={{ fontWeight: 500 }}>#{ticket.id.slice(-6)}</td>
                                            <td className="text-secondary">{ticket.category}</td>
                                            <td>
                                                <span className={`badge badge-status-${ticket.status}`}>
                                                    {STATUS_LABELS[ticket.status] || ticket.status}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge badge-impact-${ticket.impact}`}>
                                                    {ticket.impact}
                                                </span>
                                            </td>
                                            <td className="text-secondary">
                                                {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <div style={{ marginTop: 'var(--space-lg)', textAlign: 'center' }}>
                        <p className="text-secondary">
                            Total: <strong>{tickets.length}</strong> ticket(s)
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Client Modal Component with Poka-Yoke validations
function ClientModal({ client, policies, onClose, onSave }) {
    const [name, setName] = useState(client?.name || '');
    const [contactEmail, setContactEmail] = useState(client?.contact_email || '');
    const [contactPhone, setContactPhone] = useState(client?.contact_phone || '');
    const [notes, setNotes] = useState(client?.notes || '');
    const [isVip, setIsVip] = useState(client?.is_vip === 1);
    const [slaPolicyId, setSlaPolicyId] = useState(client?.sla_policy_id || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [duplicateWarning, setDuplicateWarning] = useState(null);
    const [allClients, setAllClients] = useState([]);

    // Load clients for duplicate detection
    useEffect(() => {
        clientsAPI.list().then(setAllClients).catch(console.error);
    }, []);

    // Check for duplicates when name changes
    useEffect(() => {
        if (!name.trim() || client) {
            setDuplicateWarning(null);
            return;
        }

        const normalizedName = name.trim().toLowerCase();
        const similar = allClients.filter(c => {
            const existingName = c.name.toLowerCase();
            return existingName === normalizedName ||
                existingName.includes(normalizedName) ||
                normalizedName.includes(existingName);
        });

        if (similar.length > 0) {
            setDuplicateWarning(`Possível duplicado: ${similar.map(c => c.name).join(', ')}`);
        } else {
            setDuplicateWarning(null);
        }
    }, [name, allClients, client]);

    // Email validation
    function isValidEmail(email) {
        if (!email) return true; // Optional field
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    // Phone mask
    function formatPhone(value) {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 10) {
            return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
        }
        return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
    }

    function handlePhoneChange(e) {
        const formatted = formatPhone(e.target.value);
        setContactPhone(formatted.slice(0, 15)); // Max: (11) 99999-9999
    }

    const emailValid = isValidEmail(contactEmail);

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError('Nome é obrigatório');
            return;
        }

        if (!emailValid) {
            setError('E-mail inválido');
            return;
        }

        try {
            setLoading(true);
            const data = {
                name: name.trim(),
                contact_email: contactEmail.trim() || null,
                contact_phone: contactPhone || null,
                notes: notes.trim() || null,
                is_vip: isVip,
                sla_policy_id: slaPolicyId || null
            };

            if (client) {
                await clientsAPI.update(client.id, data);
            } else {
                await clientsAPI.create(data);
            }
            onSave();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">{client ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-group">
                        <label className="form-label">Nome *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Nome da empresa/cliente"
                        />
                        {/* Duplicate Warning - Poka-Yoke */}
                        {duplicateWarning && (
                            <div style={{
                                marginTop: 'var(--space-xs)',
                                padding: 'var(--space-sm)',
                                background: 'var(--color-warning-alpha)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.75rem',
                                color: 'var(--color-warning)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-xs)'
                            }}>
                                <AlertCircle size={14} />
                                {duplicateWarning}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                        <div className="form-group">
                            <label className="form-label">E-mail</label>
                            <input
                                type="email"
                                className={`form-input ${contactEmail && !emailValid ? 'input-error' : ''}`}
                                value={contactEmail}
                                onChange={e => setContactEmail(e.target.value)}
                                placeholder="contato@empresa.com"
                                style={{ borderColor: contactEmail && !emailValid ? 'var(--color-error)' : undefined }}
                            />
                            {contactEmail && !emailValid && (
                                <div className="form-error" style={{ fontSize: '0.75rem' }}>
                                    Formato de e-mail inválido
                                </div>
                            )}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Telefone</label>
                            <input
                                type="text"
                                className="form-input"
                                value={contactPhone}
                                onChange={handlePhoneChange}
                                placeholder="(11) 99999-9999"
                                maxLength={15}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Observações</label>
                        <textarea className="form-input form-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Informações adicionais sobre o cliente..." rows={3} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <button
                                type="button"
                                className={`btn ${isVip ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setIsVip(!isVip)}
                                style={{ width: '100%' }}
                            >
                                <Star size={16} style={isVip ? { fill: 'currentColor' } : {}} />
                                {isVip ? 'Cliente VIP' : 'Cliente Normal'}
                            </button>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Política SLA</label>
                            <select className="form-input form-select" value={slaPolicyId} onChange={e => setSlaPolicyId(e.target.value)}>
                                <option value="">Padrão do sistema</option>
                                {policies.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {error && <div className="alert alert-error">{error}</div>}
                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 'var(--space-md)' }} disabled={loading}>
                        {loading ? <><Loader2 size={16} className="spinning" /> Salvando...</> : <><Check size={16} /> Salvar</>}
                    </button>
                </form>
            </div>
        </div>
    );
}

// SLA Policies Tab Component
function SlaPoliciesTab() {
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState(null);

    useEffect(() => {
        loadPolicies();
    }, []);

    async function loadPolicies() {
        try {
            setLoading(true);
            const data = await slaPoliciesAPI.list();
            setPolicies(data);
        } catch (error) {
            console.error('Error loading policies:', error);
        } finally {
            setLoading(false);
        }
    }

    function openCreateModal() {
        setEditingPolicy(null);
        setShowModal(true);
    }

    function openEditModal(policy) {
        setEditingPolicy(policy);
        setShowModal(true);
    }

    async function handleDelete(id) {
        if (!confirm('Tem certeza que deseja remover esta política?')) return;
        try {
            await slaPoliciesAPI.delete(id);
            loadPolicies();
        } catch (error) {
            console.error('Error deleting policy:', error);
        }
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Políticas de SLA</h2>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    <Plus size={16} /> Nova Política
                </button>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner"></div></div>
            ) : policies.length === 0 ? (
                <div className="empty-state">
                    <Clock size={48} style={{ color: 'var(--color-text-muted)' }} />
                    <p>Nenhuma política cadastrada</p>
                    <p className="text-secondary" style={{ fontSize: '0.875rem' }}>O sistema usará os valores padrão: Alto=4h, Médio=24h, Baixo=48h</p>
                </div>
            ) : (
                <div className="card glass-panel">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Alto (h)</th>
                                <th>Médio (h)</th>
                                <th>Baixo (h)</th>
                                <th>Prioridade</th>
                                <th style={{ width: '100px' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {policies.map(policy => (
                                <tr key={policy.id}>
                                    <td style={{ fontWeight: 500 }}>{policy.name}</td>
                                    <td><span className="badge badge-impact-alto">{policy.hours_alto}h</span></td>
                                    <td><span className="badge badge-impact-medio">{policy.hours_medio}h</span></td>
                                    <td><span className="badge badge-impact-baixo">{policy.hours_baixo}h</span></td>
                                    <td>{policy.priority}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                                            <button className="btn btn-icon btn-ghost" onClick={() => openEditModal(policy)}>
                                                <Edit size={16} />
                                            </button>
                                            <button className="btn btn-icon btn-ghost" onClick={() => handleDelete(policy.id)} style={{ color: 'var(--color-error)' }}>
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

            {showModal && (
                <SlaPolicyModal
                    policy={editingPolicy}
                    onClose={() => setShowModal(false)}
                    onSave={() => { setShowModal(false); loadPolicies(); }}
                />
            )}
        </div>
    );
}

// SLA Policy Modal Component
function SlaPolicyModal({ policy, onClose, onSave }) {
    const [name, setName] = useState(policy?.name || '');
    const [hoursBaixo, setHoursBaixo] = useState(policy?.hours_baixo || 48);
    const [hoursMedio, setHoursMedio] = useState(policy?.hours_medio || 24);
    const [hoursAlto, setHoursAlto] = useState(policy?.hours_alto || 4);
    const [priority, setPriority] = useState(policy?.priority || 0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!name.trim()) {
            setError('Nome é obrigatório');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = {
                name,
                hours_baixo: parseInt(hoursBaixo),
                hours_medio: parseInt(hoursMedio),
                hours_alto: parseInt(hoursAlto),
                priority: parseInt(priority)
            };

            if (policy) {
                await slaPoliciesAPI.update(policy.id, data);
            } else {
                await slaPoliciesAPI.create(data);
            }
            onSave();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">{policy ? 'Editar Política' : 'Nova Política'}</h3>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-group">
                        <label className="form-label">Nome *</label>
                        <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: VIP, Premium, Express" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)' }}>
                        <div className="form-group">
                            <label className="form-label">Alto (h)</label>
                            <input type="number" className="form-input" value={hoursAlto} onChange={e => setHoursAlto(e.target.value)} min="1" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Médio (h)</label>
                            <input type="number" className="form-input" value={hoursMedio} onChange={e => setHoursMedio(e.target.value)} min="1" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Baixo (h)</label>
                            <input type="number" className="form-input" value={hoursBaixo} onChange={e => setHoursBaixo(e.target.value)} min="1" />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Prioridade</label>
                        <input type="number" className="form-input" value={priority} onChange={e => setPriority(e.target.value)} />
                        <small className="text-muted">Maior prioridade = usado primeiro em conflitos</small>
                    </div>
                    {error && <div className="alert alert-error">{error}</div>}
                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                        {loading ? <><Loader2 size={16} className="spinning" /> Salvando...</> : <><Check size={16} /> Salvar</>}
                    </button>
                </form>
            </div>
        </div>
    );
}

// Bulk Import Tab Component
function BulkImportTab() {
    const [importType, setImportType] = useState('clients');
    const [csvContent, setCsvContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const fileInputRef = useRef(null);

    function handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            setCsvContent(event.target.result);
            setResult(null);
        };
        reader.readAsText(file);
    }

    async function handleImport() {
        if (!csvContent.trim()) {
            setResult({ error: 'Selecione um arquivo CSV primeiro' });
            return;
        }

        try {
            setLoading(true);
            setResult(null);

            const data = importType === 'clients'
                ? await importAPI.clients(csvContent)
                : await importAPI.products(csvContent);

            setResult(data);
            if (data.success > 0) {
                setCsvContent('');
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        } catch (error) {
            setResult({ error: error.message });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 'var(--space-lg)' }}>Importação em Lote</h2>

            <div className="card glass-panel" style={{ padding: 'var(--space-xl)' }}>
                {/* Import Type Selection */}
                <div className="form-group">
                    <label className="form-label">O que você quer importar?</label>
                    <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                        <button
                            className={`btn ${importType === 'clients' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setImportType('clients')}
                        >
                            <Users size={16} /> Clientes
                        </button>
                        <button
                            className={`btn ${importType === 'products' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setImportType('products')}
                        >
                            <Package size={16} /> Produtos
                        </button>
                    </div>
                </div>

                {/* Template Download */}
                <div className="form-group" style={{ marginTop: 'var(--space-lg)' }}>
                    <label className="form-label">1. Baixe o template</label>
                    <a
                        href={importAPI.getTemplateUrl(importType)}
                        download
                        className="btn btn-secondary"
                        style={{ display: 'inline-flex' }}
                    >
                        <Download size={16} /> Baixar Template CSV
                    </a>
                    <p className="text-muted" style={{ marginTop: 'var(--space-sm)', fontSize: '0.875rem' }}>
                        {importType === 'clients'
                            ? 'Colunas: name, email, phone, is_vip (0 ou 1), notes'
                            : 'Colunas: name, description'
                        }
                    </p>
                </div>

                {/* File Upload */}
                <div className="form-group" style={{ marginTop: 'var(--space-lg)' }}>
                    <label className="form-label">2. Faça upload do arquivo preenchido</label>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        ref={fileInputRef}
                        className="form-input"
                        style={{ padding: 'var(--space-sm)' }}
                    />
                </div>

                {/* Preview */}
                {csvContent && (
                    <div className="form-group" style={{ marginTop: 'var(--space-lg)' }}>
                        <label className="form-label">3. Confira os dados</label>
                        <textarea
                            className="form-input form-textarea"
                            value={csvContent}
                            onChange={e => setCsvContent(e.target.value)}
                            rows={8}
                            style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                        />
                    </div>
                )}

                {/* Import Button */}
                <div style={{ marginTop: 'var(--space-xl)' }}>
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={handleImport}
                        disabled={loading || !csvContent}
                    >
                        {loading ? (
                            <><Loader2 size={16} className="spinning" /> Importando...</>
                        ) : (
                            <><Upload size={16} /> Importar {importType === 'clients' ? 'Clientes' : 'Produtos'}</>
                        )}
                    </button>
                </div>

                {/* Result */}
                {result && (
                    <div style={{ marginTop: 'var(--space-xl)' }}>
                        {result.error ? (
                            <div className="alert alert-error">
                                <AlertCircle size={16} /> {result.error}
                            </div>
                        ) : (
                            <div className={`alert ${result.errors?.length > 0 ? 'alert-warning' : 'alert-success'}`}>
                                <Check size={16} />
                                <div>
                                    <strong>{result.success} de {result.total}</strong> registros importados com sucesso!
                                    {result.errors?.length > 0 && (
                                        <div style={{ marginTop: 'var(--space-sm)', fontSize: '0.875rem' }}>
                                            <strong>Erros:</strong>
                                            <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
                                                {result.errors.slice(0, 5).map((err, i) => (
                                                    <li key={i}>Linha {err.row}: {err.error}</li>
                                                ))}
                                                {result.errors.length > 5 && (
                                                    <li>... e mais {result.errors.length - 5} erros</li>
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// Areas Tab Component
function AreasTab() {
    const [areas, setAreas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingArea, setEditingArea] = useState(null);
    const [showKanbanModal, setShowKanbanModal] = useState(false);
    const [kanbanArea, setKanbanArea] = useState(null);

    useEffect(() => {
        loadAreas();
    }, []);

    async function loadAreas() {
        try {
            setLoading(true);
            const data = await areasAPI.list();
            setAreas(data);
        } catch (error) {
            console.error('Error loading areas:', error);
        } finally {
            setLoading(false);
        }
    }

    function openCreateModal() {
        setEditingArea(null);
        setShowModal(true);
    }

    function openEditModal(area) {
        setEditingArea(area);
        setShowModal(true);
    }

    function openKanbanEditor(area) {
        setKanbanArea(area);
        setShowKanbanModal(true);
    }

    async function handleDelete(area) {
        if (!confirm(`Tem certeza que deseja excluir a área "${area.name}"?`)) return;
        try {
            await areasAPI.delete(area.id);
            loadAreas();
        } catch (error) {
            console.error('Error deleting area:', error);
            alert('Erro ao excluir área: ' + error.message);
        }
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Áreas de Atendimento</h2>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    <Plus size={16} /> Nova Área
                </button>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner"></div></div>
            ) : areas.length === 0 ? (
                <div className="empty-state">
                    <Layers size={48} style={{ color: 'var(--color-text-muted)' }} />
                    <p>Nenhuma área cadastrada</p>
                </div>
            ) : (
                <div className="card glass-panel">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Área</th>
                                <th>Descrição</th>
                                <th>Tickets Ativos</th>
                                <th style={{ width: '100px' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {areas.map(area => (
                                <tr key={area.id}>
                                    <td style={{ fontWeight: 500 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                            <Layers size={16} style={{ color: 'var(--color-primary)' }} />
                                            {area.name}
                                        </div>
                                    </td>
                                    <td className="text-secondary">{area.description || '-'}</td>
                                    <td>
                                        <span className={`badge ${area.active_tickets > 0 ? 'badge-warning' : 'badge-success'}`}>
                                            {area.active_tickets || 0} tickets
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                                            <button className="btn btn-icon btn-ghost" onClick={() => openKanbanEditor(area)} title="Kanban">
                                                <Columns size={16} />
                                            </button>
                                            <button className="btn btn-icon btn-ghost" onClick={() => openEditModal(area)} title="Editar">
                                                <Edit size={16} />
                                            </button>
                                            <button className="btn btn-icon btn-ghost" onClick={() => handleDelete(area)} style={{ color: 'var(--color-error)' }} title="Excluir">
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

            {showModal && (
                <AreaModal
                    area={editingArea}
                    onClose={() => setShowModal(false)}
                    onSave={() => { setShowModal(false); loadAreas(); }}
                />
            )}

            {showKanbanModal && kanbanArea && (
                <KanbanColumnsModal
                    area={kanbanArea}
                    onClose={() => setShowKanbanModal(false)}
                />
            )}
        </div>
    );
}

// Area Modal Component
function AreaModal({ area, onClose, onSave }) {
    const [name, setName] = useState(area?.name || '');
    const [description, setDescription] = useState(area?.description || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!name.trim()) {
            setError('Nome é obrigatório');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = { name, description: description || null };

            if (area) {
                await areasAPI.update(area.id, data);
            } else {
                await areasAPI.create(data);
            }
            onSave();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">{area ? 'Editar Área' : 'Nova Área'}</h3>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-group">
                        <label className="form-label">Nome *</label>
                        <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Suporte Técnico, Financeiro" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Descrição</label>
                        <textarea className="form-input form-textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição da área (opcional)" rows={3} />
                    </div>
                    {error && <div className="alert alert-error">{error}</div>}
                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                        {loading ? <><Loader2 size={16} className="spinning" /> Salvando...</> : <><Check size={16} /> Salvar</>}
                    </button>
                </form>
            </div>
        </div>
    );
}

function KanbanColumnsModal({ area, onClose }) {
    const [columns, setColumns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newLabel, setNewLabel] = useState('');
    const [newStatusKey, setNewStatusKey] = useState('');
    const [newClosed, setNewClosed] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadColumns();
    }, [area.id]);

    async function loadColumns() {
        try {
            setLoading(true);
            const data = await kanbanColumnsAPI.list(area.id);
            setColumns(data);
        } catch (err) {
            setError(err.message || 'Erro ao carregar colunas');
        } finally {
            setLoading(false);
        }
    }

    function sortedColumns() {
        return [...columns].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }

    async function handleUpdateColumn(col, updates) {
        try {
            setSaving(true);
            const updated = await kanbanColumnsAPI.update(col.id, updates);
            setColumns(prev => prev.map(c => (c.id === updated.id ? updated : c)));
        } catch (err) {
            setError(err.message || 'Erro ao atualizar coluna');
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteColumn(col) {
        if (!confirm(`Excluir coluna "${col.label}"?`)) return;
        try {
            setSaving(true);
            await kanbanColumnsAPI.delete(col.id);
            setColumns(prev => prev.filter(c => c.id !== col.id));
        } catch (err) {
            setError(err.message || 'Erro ao excluir coluna');
        } finally {
            setSaving(false);
        }
    }

    async function handleAddColumn(e) {
        e.preventDefault();
        setError(null);
        if (!newLabel.trim() || !newStatusKey.trim()) {
            setError('Preencha nome e status da coluna');
            return;
        }
        try {
            setSaving(true);
            const created = await kanbanColumnsAPI.create(area.id, {
                label: newLabel.trim(),
                status_key: newStatusKey.trim(),
                is_closed: newClosed
            });
            setColumns(prev => [...prev, created]);
            setNewLabel('');
            setNewStatusKey('');
            setNewClosed(false);
        } catch (err) {
            setError(err.message || 'Erro ao criar coluna');
        } finally {
            setSaving(false);
        }
    }

    async function moveColumn(col, direction) {
        const list = sortedColumns();
        const index = list.findIndex(c => c.id === col.id);
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= list.length) return;

        const reordered = [...list];
        [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
        const payload = reordered.map((c, idx) => ({ id: c.id, sort_order: idx + 1 }));
        try {
            setSaving(true);
            const updated = await kanbanColumnsAPI.reorder(area.id, payload);
            setColumns(updated);
        } catch (err) {
            setError(err.message || 'Erro ao reordenar colunas');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal"
                onClick={e => e.stopPropagation()}
                style={{
                    maxWidth: '860px',
                    borderRadius: '20px',
                    border: '1px solid var(--color-border)',
                    background: 'linear-gradient(180deg, var(--color-bg-surface) 0%, var(--color-bg-secondary) 100%)',
                    boxShadow: '0 24px 80px rgba(0, 0, 0, 0.25), 0 0 0 1px var(--color-border)',
                    backdropFilter: 'blur(6px)'
                }}
            >
                <div className="modal-header">
                    <h3 className="modal-title" style={{ letterSpacing: '0.01em' }}>Kanban • {area.name}</h3>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="modal-body" style={{ padding: '20px 24px 26px' }}>
                    {loading ? (
                        <div className="loading"><div className="spinner"></div></div>
                    ) : (
                        <div className="card" style={{
                            marginBottom: 'var(--space-lg)',
                            padding: '16px',
                            background: 'var(--color-bg-card)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '16px'
                        }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '140px 2fr 1fr 120px 80px',
                                gap: '12px',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                background: 'var(--color-bg-tertiary)',
                                color: 'var(--color-text-muted)',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em'
                            }}>
                                <div>Ordem</div>
                                <div>Nome</div>
                                <div>Status</div>
                                <div>Finalizado</div>
                                <div style={{ textAlign: 'right' }}>Ações</div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                                {sortedColumns().map(col => (
                                    <div key={col.id} style={{
                                        display: 'grid',
                                        gridTemplateColumns: '140px 2fr 1fr 120px 80px',
                                        gap: '12px',
                                        alignItems: 'center',
                                        padding: '12px',
                                        borderRadius: '12px',
                                        border: '1px solid var(--color-border)',
                                        background: 'linear-gradient(180deg, var(--color-bg-secondary) 0%, var(--color-bg-card) 100%)'
                                    }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <button className="btn btn-icon btn-ghost" onClick={() => moveColumn(col, -1)} disabled={saving || col.status_key === 'novo'} title="Mover para cima">
                                                <ChevronUp size={14} />
                                            </button>
                                            <button className="btn btn-icon btn-ghost" onClick={() => moveColumn(col, 1)} disabled={saving || col.status_key === 'novo'} title="Mover para baixo">
                                                <ChevronDown size={14} />
                                            </button>
                                            <span
                                                className="badge badge-neutral"
                                                style={{
                                                    fontSize: '0.7rem',
                                                    background: col.status_key === 'novo' ? 'var(--color-primary-glow)' : 'var(--color-bg-hover)',
                                                    border: col.status_key === 'novo' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                                                    color: col.status_key === 'novo' ? 'var(--color-primary-light)' : 'var(--color-text-muted)'
                                                }}
                                            >
                                                {col.status_key === 'novo' ? 'Fixado' : 'Livre'}
                                            </span>
                                        </div>

                                        <div>
                                            <input
                                                className="form-input"
                                                value={col.label}
                                                onChange={e => setColumns(prev => prev.map(c => c.id === col.id ? { ...c, label: e.target.value } : c))}
                                                onBlur={() => handleUpdateColumn(col, { label: col.label })}
                                                style={{
                                                    width: '100%',
                                                    fontWeight: 600,
                                                    background: 'var(--color-bg-tertiary)',
                                                    border: '1px solid var(--color-border)'
                                                }}
                                                disabled={col.status_key === 'novo'}
                                            />
                                        </div>

                                        <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                            {col.status_key}
                                        </div>

                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                                            <input
                                                type="checkbox"
                                                checked={!!col.is_closed}
                                                disabled={!!col.is_system || col.status_key === 'novo'}
                                                onChange={e => handleUpdateColumn(col, { is_closed: e.target.checked })}
                                            />
                                            Encerrado
                                        </label>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            {!col.is_system && col.status_key !== 'novo' && (
                                                <button className="btn btn-icon btn-ghost" onClick={() => handleDeleteColumn(col)} style={{ color: 'var(--color-error)' }} title="Excluir">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleAddColumn} className="card" style={{
                        background: 'var(--color-bg-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '16px',
                        padding: '16px'
                    }}>
                        <h4 style={{ marginTop: 0 }}>Nova Coluna</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: 'var(--space-md)' }}>
                            <div className="form-group">
                                <label className="form-label">Nome</label>
                                <input className="form-input" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Status (chave)</label>
                                <input className="form-input" value={newStatusKey} onChange={e => setNewStatusKey(e.target.value)} placeholder="ex: aguardando_aprovacao" />
                            </div>
                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input type="checkbox" checked={newClosed} onChange={e => setNewClosed(e.target.checked)} />
                                <label className="form-label" style={{ margin: 0 }}>Finalizado</label>
                            </div>
                        </div>
                        {error && <div className="alert alert-error">{error}</div>}
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? <Loader2 size={16} className="spinning" /> : <Plus size={16} />}
                            {saving ? ' Salvando...' : ' Adicionar'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

function EmailTab() {
    const [mailboxes, setMailboxes] = useState([]);
    const [areas, setAreas] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingMailbox, setEditingMailbox] = useState(null);
    const [testingId, setTestingId] = useState(null);

    useEffect(() => {
        loadAll();
    }, []);

    async function loadAll() {
        try {
            setLoading(true);
            const [mailData, areasData, categoriesData] = await Promise.all([
                emailMailboxesAPI.list(),
                areasAPI.list(),
                categoriesAPI.list()
            ]);
            setMailboxes(mailData);
            setAreas(areasData);
            setCategories(categoriesData);
        } catch (error) {
            console.error('Error loading email config:', error);
        } finally {
            setLoading(false);
        }
    }

    function openCreateModal() {
        setEditingMailbox(null);
        setShowModal(true);
    }

    function openEditModal(mailbox) {
        setEditingMailbox(mailbox);
        setShowModal(true);
    }

    async function handleDelete(id) {
        if (!confirm('Remover esta caixa de email?')) return;
        try {
            await emailMailboxesAPI.remove(id);
            loadAll();
        } catch (error) {
            console.error('Error deleting mailbox:', error);
        }
    }

    async function handleTest(id) {
        try {
            setTestingId(id);
            await emailMailboxesAPI.test(id);
            loadAll();
            alert('Conexão OK');
        } catch (error) {
            alert(error.message || 'Falha na conexão');
        } finally {
            setTestingId(null);
        }
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Conexão de Emails (IMAP)</h2>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    <Plus size={16} /> Conectar Email
                </button>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner"></div></div>
            ) : mailboxes.length === 0 ? (
                <div className="empty-state">
                    <Mail size={48} style={{ color: 'var(--color-text-muted)' }} />
                    <p>Nenhuma caixa conectada</p>
                </div>
            ) : (
                <div className="card glass-panel">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Servidor</th>
                                <th>Usuário</th>
                                <th>Status</th>
                                <th>Última checagem</th>
                                <th style={{ width: '160px' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mailboxes.map(mb => (
                                <tr key={mb.id}>
                                    <td style={{ fontWeight: 500 }}>{mb.name}</td>
                                    <td className="text-secondary">{mb.host}:{mb.port}</td>
                                    <td className="text-secondary">{mb.username}</td>
                                    <td>
                                        <span className={`badge ${mb.status === 'error' ? 'badge-error' : 'badge-success'}`}>
                                            {mb.status || 'idle'}
                                        </span>
                                        {mb.last_error && (
                                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>{mb.last_error}</div>
                                        )}
                                    </td>
                                    <td className="text-muted">
                                        {mb.last_checked_at ? new Date(mb.last_checked_at).toLocaleString('pt-BR') : '-'}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                                            <button className="btn btn-icon btn-ghost" onClick={() => handleTest(mb.id)} title="Testar">
                                                {testingId === mb.id ? <Loader2 size={16} className="spinning" /> : <Check size={16} />}
                                            </button>
                                            <button className="btn btn-icon btn-ghost" onClick={() => openEditModal(mb)} title="Editar">
                                                <Edit size={16} />
                                            </button>
                                            <button className="btn btn-icon btn-ghost" onClick={() => handleDelete(mb.id)} style={{ color: 'var(--color-error)' }} title="Excluir">
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

            {showModal && (
                <EmailMailboxModal
                    mailbox={editingMailbox}
                    areas={areas}
                    categories={categories}
                    onClose={() => setShowModal(false)}
                    onSave={() => { setShowModal(false); loadAll(); }}
                />
            )}
        </div>
    );
}

function EmailMailboxModal({ mailbox, areas, categories, onClose, onSave }) {
    const [name, setName] = useState(mailbox?.name || '');
    const [host, setHost] = useState(mailbox?.host || '');
    const [port, setPort] = useState(mailbox?.port || 993);
    const [secure, setSecure] = useState(mailbox ? !!mailbox.secure : true);
    const [username, setUsername] = useState(mailbox?.username || '');
    const [password, setPassword] = useState('');
    const [folder, setFolder] = useState(mailbox?.folder || 'INBOX');
    const [smtpHost, setSmtpHost] = useState(mailbox?.smtp_host || '');
    const [smtpPort, setSmtpPort] = useState(mailbox?.smtp_port || 465);
    const [smtpSecure, setSmtpSecure] = useState(mailbox?.smtp_secure !== undefined ? !!mailbox.smtp_secure : true);
    const [smtpUsername, setSmtpUsername] = useState(mailbox?.smtp_username || '');
    const [smtpPassword, setSmtpPassword] = useState('');
    const [smtpFromName, setSmtpFromName] = useState(mailbox?.smtp_from_name || '');
    const [smtpFromEmail, setSmtpFromEmail] = useState(mailbox?.smtp_from_email || '');
    const [defaultAreaId, setDefaultAreaId] = useState(mailbox?.default_area_id || '');
    const [allowedCategories, setAllowedCategories] = useState(() => {
        if (!mailbox?.allowed_category_ids) return [];
        try { return JSON.parse(mailbox.allowed_category_ids); } catch { return []; }
    });
    const [defaultImpact, setDefaultImpact] = useState(mailbox?.default_impact || 'medio');
    const [enabled, setEnabled] = useState(mailbox ? !!mailbox.enabled : true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showHelp, setShowHelp] = useState(false);

    function toggleCategory(id) {
        setAllowedCategories(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        if (!name || !host || !port || !username || (!mailbox && !password)) {
            setError('Preencha os campos obrigatórios');
            return;
        }
        try {
            setLoading(true);
            const payload = {
                name,
                host,
                port: Number(port),
                secure,
                username,
                password: password || undefined,
                folder,
                smtp_host: smtpHost || null,
                smtp_port: smtpPort ? Number(smtpPort) : null,
                smtp_secure: smtpSecure,
                smtp_username: smtpUsername || null,
                smtp_password: smtpPassword || undefined,
                smtp_from_name: smtpFromName || null,
                smtp_from_email: smtpFromEmail || null,
                default_area_id: defaultAreaId || null,
                allowed_category_ids: allowedCategories,
                default_impact: defaultImpact,
                enabled
            };
            if (mailbox) {
                await emailMailboxesAPI.update(mailbox.id, payload);
            } else {
                await emailMailboxesAPI.create(payload);
            }
            onSave();
        } catch (err) {
            setError(err.message || 'Erro ao salvar');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '720px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">{mailbox ? 'Editar Email' : 'Conectar Email'}</h3>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="modal-body">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-md)' }}>
                        <button type="button" className="btn btn-ghost" onClick={() => setShowHelp(true)}>
                            <AlertCircle size={16} />
                            Ajuda para conectar
                        </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                        <div className="form-group">
                            <label className="form-label">Nome *</label>
                            <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Pasta</label>
                            <input className="form-input" value={folder} onChange={e => setFolder(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Servidor IMAP *</label>
                            <input className="form-input" value={host} onChange={e => setHost(e.target.value)} placeholder="imap.seuprovedor.com" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Porta *</label>
                            <input className="form-input" type="number" value={port} onChange={e => setPort(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Usuário *</label>
                            <input className="form-input" value={username} onChange={e => setUsername(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Senha {mailbox ? '(somente se quiser trocar)' : '*'}</label>
                            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} />
                        </div>
                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="checkbox" checked={secure} onChange={e => setSecure(e.target.checked)} />
                            <label className="form-label" style={{ margin: 0 }}>SSL/TLS</label>
                        </div>
                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
                            <label className="form-label" style={{ margin: 0 }}>Ativo</label>
                        </div>
                    </div>

                    <div style={{ marginTop: 'var(--space-md)', fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                        SMTP (Envio de e-mails)
                        <div style={{ fontWeight: 400, fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                            Necessário para responder e-mails direto pelo ticket.
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
                        <div className="form-group">
                            <label className="form-label">Servidor SMTP</label>
                            <input className="form-input" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.seuprovedor.com" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Porta SMTP</label>
                            <input className="form-input" type="number" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Usuário SMTP</label>
                            <input className="form-input" value={smtpUsername} onChange={e => setSmtpUsername(e.target.value)} placeholder="seu email completo" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Senha SMTP {mailbox ? '(somente se quiser trocar)' : ''}</label>
                            <input className="form-input" type="password" value={smtpPassword} onChange={e => setSmtpPassword(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nome de Remetente</label>
                            <input className="form-input" value={smtpFromName} onChange={e => setSmtpFromName(e.target.value)} placeholder="Suporte" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">E-mail de Remetente</label>
                            <input className="form-input" value={smtpFromEmail} onChange={e => setSmtpFromEmail(e.target.value)} placeholder="suporte@empresa.com" />
                        </div>
                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="checkbox" checked={smtpSecure} onChange={e => setSmtpSecure(e.target.checked)} />
                            <label className="form-label" style={{ margin: 0 }}>SSL/TLS (SMTP)</label>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                        <div className="form-group">
                            <label className="form-label">Área padrão</label>
                            <select className="form-input" value={defaultAreaId} onChange={e => setDefaultAreaId(e.target.value)}>
                                <option value="">Selecionar</option>
                                {areas.map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Impacto padrão</label>
                            <select className="form-input" value={defaultImpact} onChange={e => setDefaultImpact(e.target.value)}>
                                <option value="baixo">Baixo</option>
                                <option value="medio">Médio</option>
                                <option value="alto">Alto</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
                        <label className="form-label">Categorias permitidas</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                            {categories.map(cat => (
                                <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input type="checkbox" checked={allowedCategories.includes(cat.id)} onChange={() => toggleCategory(cat.id)} />
                                    <span>{cat.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {error && <div className="alert alert-error">{error}</div>}
                    <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
                        {loading ? <><Loader2 size={16} className="spinning" /> Salvando...</> : <><Check size={16} /> Salvar</>}
                    </button>
                </form>
            </div>
            {showHelp && (
                <div className="modal-overlay" onClick={() => setShowHelp(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '760px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Ajuda para conectar IMAP</h3>
                            <button className="btn btn-icon btn-ghost" onClick={() => setShowHelp(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
                                <h4 style={{ marginTop: 0 }}>Gmail (passo a passo completo)</h4>
                                <ol style={{ paddingLeft: '20px', margin: 0 }}>
                                    <li>Acesse o Gmail no navegador e clique na engrenagem.</li>
                                    <li>Clique em "Ver todas as configurações".</li>
                                    <li>Abra a aba "Encaminhamento e POP/IMAP".</li>
                                    <li>Em "Acesso IMAP", selecione "Ativar IMAP" e salve.</li>
                                    <li>Se sua conta usa verificação em 2 etapas, abra "Minha Conta Google" &gt; "Segurança".</li>
                                    <li>Procure "Senhas de app" e crie uma senha para "E-mail".</li>
                                    <li>Link direto: <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">myaccount.google.com/apppasswords</a></li>
                                    <li>Use estes dados aqui:
                                        <div style={{ marginTop: '6px' }}>
                                            <div><strong>Servidor:</strong> imap.gmail.com</div>
                                            <div><strong>Porta:</strong> 993</div>
                                            <div><strong>SSL/TLS:</strong> ativado</div>
                                            <div><strong>Usuário:</strong> seu email completo</div>
                                            <div><strong>Senha:</strong> senha de app (se tiver 2FA)</div>
                                            <div style={{ marginTop: '6px' }}><strong>SMTP:</strong> smtp.gmail.com (porta 465, SSL/TLS)</div>
                                        </div>
                                    </li>
                                </ol>
                                <div className="text-secondary" style={{ fontSize: '0.9rem', marginTop: '8px' }}>
                                    Se não encontrar "Senhas de app", ative a verificação em duas etapas primeiro.
                                </div>
                            </div>
                            <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
                                <h4 style={{ marginTop: 0 }}>Microsoft 365 / Outlook (passo a passo)</h4>
                                <ol style={{ paddingLeft: '20px', margin: 0 }}>
                                    <li>Acesse Outlook Web e abra Configurações (ícone de engrenagem).</li>
                                    <li>Vá em "Exibir todas as configurações do Outlook".</li>
                                    <li>Em "Email" &gt; "Sincronizar email", confirme que IMAP está permitido.</li>
                                    <li>Se usar MFA, gere uma senha de app no portal da conta Microsoft.</li>
                                    <li>Use estes dados:
                                        <div style={{ marginTop: '6px' }}>
                                            <div><strong>Servidor:</strong> outlook.office365.com</div>
                                            <div><strong>Porta:</strong> 993</div>
                                            <div><strong>SSL/TLS:</strong> ativado</div>
                                            <div><strong>Usuário:</strong> seu email completo</div>
                                            <div><strong>Senha:</strong> senha de app (se tiver 2FA)</div>
                                            <div style={{ marginTop: '6px' }}><strong>SMTP:</strong> smtp.office365.com (porta 587, STARTTLS)</div>
                                        </div>
                                    </li>
                                </ol>
                            </div>
                            <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
                                <h4 style={{ marginTop: 0 }}>Zoho (passo a passo)</h4>
                                <ol style={{ paddingLeft: '20px', margin: 0 }}>
                                    <li>Entre no Zoho Mail e abra as configurações.</li>
                                    <li>Vá em "Mail Accounts" e confirme que IMAP está habilitado.</li>
                                    <li>Se houver MFA, crie uma senha de app no painel de segurança.</li>
                                    <li>Use estes dados:
                                        <div style={{ marginTop: '6px' }}>
                                            <div><strong>Servidor:</strong> imap.zoho.com</div>
                                            <div><strong>Porta:</strong> 993</div>
                                            <div><strong>SSL/TLS:</strong> ativado</div>
                                            <div><strong>Usuário:</strong> seu email completo</div>
                                            <div><strong>Senha:</strong> senha de app (se tiver 2FA)</div>
                                            <div style={{ marginTop: '6px' }}><strong>SMTP:</strong> smtp.zoho.com (porta 465, SSL/TLS)</div>
                                        </div>
                                    </li>
                                </ol>
                            </div>
                            <div className="card">
                                <h4 style={{ marginTop: 0 }}>Genérico (passo a passo)</h4>
                                <ol style={{ paddingLeft: '20px', margin: 0 }}>
                                    <li>Abra o painel do provedor de email.</li>
                                    <li>Procure por configurações de IMAP e habilite.</li>
                                    <li>Se houver MFA, gere uma senha de app.</li>
                                    <li>Use os dados do provedor. Normalmente IMAPS usa porta `993` com SSL.</li>
                                    <li>Para envio, use o SMTP do provedor (porta 465 SSL ou 587 STARTTLS).</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Categories Tab Component
function CategoriesTab() {
    const [categories, setCategories] = useState([]);
    const [areas, setAreas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedCategory, setExpandedCategory] = useState(null);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [newSubcategory, setNewSubcategory] = useState('');
    const [addingSubcategoryTo, setAddingSubcategoryTo] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const [categoriesData, areasData] = await Promise.all([
                categoriesAPI.list(),
                areasAPI.list()
            ]);
            setCategories(categoriesData);
            setAreas(areasData);
        } catch (error) {
            console.error('Error loading categories:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleDeleteCategory(id) {
        if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;
        try {
            await categoriesAPI.delete(id);
            loadData();
        } catch (error) {
            alert(error.message);
        }
    }

    async function handleAddSubcategory(categoryId) {
        if (!newSubcategory.trim()) return;
        try {
            await categoriesAPI.createSubcategory(categoryId, newSubcategory.trim());
            setNewSubcategory('');
            setAddingSubcategoryTo(null);
            loadData();
        } catch (error) {
            alert(error.message);
        }
    }

    async function handleDeleteSubcategory(categoryId, subcategoryId) {
        if (!confirm('Tem certeza que deseja excluir esta subcategoria?')) return;
        try {
            await categoriesAPI.deleteSubcategory(categoryId, subcategoryId);
            loadData();
        } catch (error) {
            alert(error.message);
        }
    }

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Categorias de Tickets</h2>
                    <p className="text-secondary">Gerencie as categorias e subcategorias disponíveis</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setEditingCategory(null); setShowCategoryModal(true); }}>
                    <Plus size={16} /> Nova Categoria
                </button>
            </div>

            {categories.length === 0 ? (
                <div className="empty-state">
                    <Tag size={48} style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)' }} />
                    <h3>Nenhuma categoria cadastrada</h3>
                    <p className="text-secondary">Crie sua primeira categoria para organizar os tickets.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {categories.map(category => (
                        <div key={category.id} className="card" style={{ overflow: 'hidden' }}>
                            {/* Category Header */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '16px 20px',
                                    cursor: 'pointer',
                                    background: expandedCategory === category.id ? 'var(--color-bg-tertiary)' : 'transparent'
                                }}
                                onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                    {expandedCategory === category.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                    <div style={{
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        background: category.color || '#6366f1'
                                    }} />
                                    <span style={{ fontWeight: 600, fontSize: '1rem' }}>{category.name}</span>
                                    <span className="badge" style={{ background: 'var(--color-bg-tertiary)' }}>
                                        {category.subcategories?.length || 0} subcategorias
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                                    <button className="btn btn-icon btn-ghost" onClick={() => { setEditingCategory(category); setShowCategoryModal(true); }}>
                                        <Edit size={16} />
                                    </button>
                                    <button className="btn btn-icon btn-ghost" onClick={() => handleDeleteCategory(category.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Subcategories */}
                            {expandedCategory === category.id && (
                                <div style={{ borderTop: '1px solid var(--color-border)', padding: '16px 20px 16px 52px' }}>
                                    {category.subcategories?.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                                            {category.subcategories.map(sub => (
                                                <div key={sub.id} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '10px 14px',
                                                    background: 'var(--color-bg-secondary)',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: '1px solid var(--color-border)'
                                                }}>
                                                    <span>{sub.name}</span>
                                                    <button
                                                        className="btn btn-icon btn-ghost"
                                                        style={{ opacity: 0.6 }}
                                                        onClick={() => handleDeleteSubcategory(category.id, sub.id)}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-secondary" style={{ marginBottom: '16px', fontSize: '0.9rem' }}>
                                            Nenhuma subcategoria cadastrada.
                                        </p>
                                    )}

                                    {/* Add subcategory */}
                                    {addingSubcategoryTo === category.id ? (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Nome da subcategoria"
                                                value={newSubcategory}
                                                onChange={e => setNewSubcategory(e.target.value)}
                                                autoFocus
                                                onKeyDown={e => e.key === 'Enter' && handleAddSubcategory(category.id)}
                                            />
                                            <button className="btn btn-primary" onClick={() => handleAddSubcategory(category.id)}>
                                                <Check size={16} />
                                            </button>
                                            <button className="btn btn-ghost" onClick={() => { setAddingSubcategoryTo(null); setNewSubcategory(''); }}>
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => setAddingSubcategoryTo(category.id)}
                                        >
                                            <Plus size={14} /> Adicionar Subcategoria
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Category Modal */}
            {showCategoryModal && (
                <CategoryModal
                    category={editingCategory}
                    areas={areas}
                    onClose={() => setShowCategoryModal(false)}
                    onSave={() => { setShowCategoryModal(false); loadData(); }}
                />
            )}
        </div>
    );
}

// Category Modal Component
function CategoryModal({ category, areas, onClose, onSave }) {
    const [name, setName] = useState(category?.name || '');
    const [icon, setIcon] = useState(category?.icon || 'Tag');
    const [color, setColor] = useState(category?.color || '#6366f1');
    const [defaultAreaId, setDefaultAreaId] = useState(category?.default_area_id || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

    // Available icons for categories
    const ICONS = [
        { id: 'Tag', label: 'Tag', component: Tag },
        { id: 'Package', label: 'Pacote', component: Package },
        { id: 'Users', label: 'Usuários', component: Users },
        { id: 'Settings', label: 'Configurações', component: Settings },
        { id: 'AlertCircle', label: 'Alerta', component: AlertCircle },
        { id: 'Clock', label: 'Relógio', component: Clock },
        { id: 'FileText', label: 'Documento', component: FileText },
        { id: 'Upload', label: 'Upload', component: Upload },
        { id: 'Download', label: 'Download', component: Download },
        { id: 'Search', label: 'Busca', component: Search },
        { id: 'Star', label: 'Estrela', component: Star },
        { id: 'Layers', label: 'Camadas', component: Layers },
        { id: 'Eye', label: 'Visualizar', component: Eye },
        { id: 'Ticket', label: 'Ticket', component: Ticket }
    ];

    async function handleSubmit(e) {
        e.preventDefault();
        if (!name.trim()) {
            setError('Nome é obrigatório');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = { name, icon, color, default_area_id: defaultAreaId || null };

            if (category) {
                await categoriesAPI.update(category.id, data);
            } else {
                await categoriesAPI.create(data);
            }
            onSave();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">{category ? 'Editar Categoria' : 'Nova Categoria'}</h3>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-group">
                        <label className="form-label">Nome *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Ex: Suporte Técnico, Financeiro"
                        />
                    </div>

                    {/* Icon Picker */}
                    <div className="form-group">
                        <label className="form-label">Ícone</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                            {ICONS.map(ic => {
                                const IconComponent = ic.component;
                                const isSelected = icon === ic.id;
                                return (
                                    <button
                                        key={ic.id}
                                        type="button"
                                        onClick={() => setIcon(ic.id)}
                                        title={ic.label}
                                        style={{
                                            width: '44px',
                                            height: '44px',
                                            borderRadius: '10px',
                                            background: isSelected ? color : 'var(--color-bg-tertiary)',
                                            border: isSelected ? 'none' : '1px solid var(--color-border)',
                                            color: isSelected ? 'white' : 'var(--color-text-muted)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <IconComponent size={20} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Color Picker */}
                    <div className="form-group">
                        <label className="form-label">Cor</label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {COLORS.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '8px',
                                        background: c,
                                        border: color === c ? '3px solid white' : 'none',
                                        boxShadow: color === c ? `0 0 0 2px ${c}` : 'none',
                                        cursor: 'pointer'
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Área Padrão</label>
                        <select
                            className="form-input"
                            value={defaultAreaId}
                            onChange={e => setDefaultAreaId(e.target.value)}
                        >
                            <option value="">Selecione uma área</option>
                            {areas.map(area => (
                                <option key={area.id} value={area.id}>{area.name}</option>
                            ))}
                        </select>
                        <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                            Tickets desta categoria serão direcionados para esta área por padrão.
                        </p>
                    </div>

                    {error && <div className="alert alert-error">{error}</div>}

                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                        {loading ? <><Loader2 size={16} className="spinning" /> Salvando...</> : <><Check size={16} /> Salvar</>}
                    </button>
                </form>
            </div>
        </div>
    );
}
