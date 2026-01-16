import * as Icons from 'lucide-react';

// Origin channels for ticket creation
const ORIGIN_CHANNELS = [
    { id: 'email', name: 'E-mail', icon: 'Mail', color: '#3B82F6', description: 'Cliente enviou e-mail' },
    { id: 'telefone', name: 'Telefone', icon: 'Phone', color: '#10B981', description: 'Atendimento telefônico' },
    { id: 'chat', name: 'Chat', icon: 'MessageCircle', color: '#8B5CF6', description: 'Atendimento via chat' },
    { id: 'portal', name: 'Portal', icon: 'Globe', color: '#F59E0B', description: 'Aberto pelo portal' },
    { id: 'interno', name: 'Interno', icon: 'Building', color: '#6366F1', description: 'Demanda interna' }
];

export default function StepOrigin({
    channel,
    onChannelChange,
    contact,
    onContactChange,
    reference,
    onReferenceChange
}) {
    return (

        <div>
            <h3 className="wizard-title" style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Como chegou?</h3>

            {/* Channel Selection */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Canal de Origem *</label>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '8px'
                }}>
                    {ORIGIN_CHANNELS.map(ch => {
                        const IconComponent = Icons[ch.icon] || Icons.HelpCircle;
                        const isSelected = channel === ch.id;

                        return (
                            <button
                                key={ch.id}
                                type="button"
                                onClick={() => onChannelChange(ch.id)}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '12px',
                                    border: isSelected
                                        ? `2px solid ${ch.color}`
                                        : '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius-md)',
                                    background: isSelected
                                        ? `${ch.color}15`
                                        : 'var(--color-bg-tertiary)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    height: '80px',
                                    justifyContent: 'center'
                                }}
                            >
                                <IconComponent
                                    size={20}
                                    style={{ color: isSelected ? ch.color : 'var(--color-text-muted)' }}
                                />
                                <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: isSelected ? 600 : 400,
                                    color: isSelected ? ch.color : 'var(--color-text-secondary)',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {ch.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Contact Info */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label">Solicitante</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Nome ou e-mail"
                        value={contact}
                        onChange={(e) => onContactChange(e.target.value)}
                    />
                </div>

                {/* External Reference */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label">Referência (Opcional)</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Nº Ticket / Protocolo"
                        value={reference}
                        onChange={(e) => onReferenceChange(e.target.value)}
                    />
                </div>
            </div>

            {!channel && (
                <div style={{
                    padding: '8px',
                    borderRadius: '8px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    color: 'var(--color-warning)',
                    fontSize: '0.8rem',
                    textAlign: 'center',
                    border: '1px solid rgba(245, 158, 11, 0.2)'
                }}>
                    ⚠️ Selecione o canal de origem
                </div>
            )}
        </div>
    );
}
