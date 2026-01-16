import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, X } from 'lucide-react';
import { ticketsAPI, attachmentsAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import StepOrigin from './Wizard/StepOrigin';
import StepClient from './Wizard/StepClient';
import StepProduct from './Wizard/StepProduct';
import StepCategory from './Wizard/StepCategory';
import StepDetails from './Wizard/StepDetails';
import StepOwner from './Wizard/StepOwner';

const STEPS = [
    { id: 1, label: 'Origem' },
    { id: 2, label: 'Cliente' },
    { id: 3, label: 'Produto' },
    { id: 4, label: 'Categoria' },
    { id: 5, label: 'Detalhes' },
    { id: 6, label: 'Responsável' }
];

const TOTAL_STEPS = 6;

export default function CreateTicketModal({ onClose, onSuccess }) {
    const { getAuthHeaders } = useAuth();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Form data
    const [originChannel, setOriginChannel] = useState(null);
    const [originContact, setOriginContact] = useState('');
    const [originReference, setOriginReference] = useState('');
    const [client, setClient] = useState(null);
    const [product, setProduct] = useState(undefined);
    const [category, setCategory] = useState(null);
    const [subcategory, setSubcategory] = useState(null);
    const [impact, setImpact] = useState(null);
    const [description, setDescription] = useState('');
    const [area, setArea] = useState(null);
    const [attachments, setAttachments] = useState([]);

    function handleCategoryChange(newCategory) {
        setCategory(newCategory);
        setSubcategory(null);
        setArea(null);
    }

    function canProceed() {
        switch (currentStep) {
            case 1: return !!originChannel;
            case 2: return !!client;
            case 3: return product !== undefined;
            case 4: return !!category;
            case 5:
                const descriptionValid = impact !== 'alto' || (description && description.trim().length >= 20);
                return !!subcategory && !!impact && descriptionValid;
            case 6: return !!area;
            default: return false;
        }
    }

    function nextStep() {
        if (canProceed() && currentStep < TOTAL_STEPS) {
            setCurrentStep(currentStep + 1);
        }
    }

    function prevStep() {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    }

    async function handleSubmit() {
        if (!canProceed()) return;

        try {
            setLoading(true);
            setError(null);

            const created = await ticketsAPI.create({
                origin_channel: originChannel,
                origin_contact: originContact,
                origin_reference: originReference,
                client_id: client.id,
                product_id: product?.id || null,
                category: category.id,
                subcategory: subcategory.id,
                impact,
                description,
                area_id: area.id
            }, getAuthHeaders());

            // Upload attachments if any
            if (attachments.length > 0 && created?.id) {
                for (const file of attachments) {
                    try {
                        await attachmentsAPI.upload(created.id, file);
                    } catch (err) {
                        console.error('Error uploading attachment:', err);
                    }
                }
            }

            onSuccess?.(created);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000, backdropFilter: 'blur(4px)' }}>
            <div
                className="modal animate-in fade-in zoom-in"
                onClick={e => e.stopPropagation()}
                style={{
                    maxWidth: '700px',
                    width: '95%',
                    maxHeight: '90vh',
                    borderRadius: 'var(--radius-lg)',
                    padding: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-card)'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '12px 16px',
                    background: 'var(--color-bg-secondary)',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Novo Ticket</h3>
                        <p style={{ margin: '2px 0 0', color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                            Passo {currentStep} de {TOTAL_STEPS}
                        </p>
                    </div>
                    <button className="btn btn-icon btn-ghost" onClick={onClose} style={{ color: 'var(--color-text-secondary)' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Progress Steps */}
                <div style={{
                    display: 'flex',
                    padding: '8px 16px',
                    gap: '2px',
                    background: 'var(--color-bg-tertiary)',
                    borderBottom: '1px solid var(--color-border)',
                    overflowX: 'auto'
                }}>
                    {STEPS.map((step) => (
                        <div
                            key={step.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                background: currentStep === step.id
                                    ? 'var(--color-primary)'
                                    : currentStep > step.id
                                        ? 'rgba(16, 185, 129, 0.2)'
                                        : 'transparent',
                                color: currentStep === step.id
                                    ? 'white'
                                    : currentStep > step.id
                                        ? 'var(--color-success)'
                                        : 'var(--color-text-muted)',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <span style={{
                                width: '14px',
                                height: '14px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.6rem',
                                background: currentStep > step.id ? 'var(--color-success)' : 'transparent',
                                border: currentStep === step.id ? 'none' : '1px solid currentColor'
                            }}>
                                {currentStep > step.id ? <Check size={8} color="white" /> : step.id}
                            </span>
                            {step.label}
                        </div>
                    ))}
                </div>

                {/* Content */}
                <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
                    {currentStep === 1 && (
                        <StepOrigin
                            channel={originChannel}
                            onChannelChange={setOriginChannel}
                            contact={originContact}
                            onContactChange={setOriginContact}
                            reference={originReference}
                            onReferenceChange={setOriginReference}
                        />
                    )}

                    {currentStep === 2 && (
                        <StepClient value={client} onChange={setClient} />
                    )}

                    {currentStep === 3 && (
                        <StepProduct value={product} onChange={setProduct} />
                    )}

                    {currentStep === 4 && (
                        <StepCategory value={category} onChange={handleCategoryChange} />
                    )}

                    {currentStep === 5 && (
                        <StepDetails
                            category={category}
                            subcategory={subcategory}
                            onSubcategoryChange={setSubcategory}
                            impact={impact}
                            onImpactChange={setImpact}
                            description={description}
                            onDescriptionChange={setDescription}
                            attachments={attachments}
                            onAttachmentsChange={setAttachments}
                        />
                    )}

                    {currentStep === 6 && (
                        <StepOwner
                            value={area}
                            onChange={setArea}
                            suggestedAreaId={category?.defaultArea}
                        />
                    )}

                    {error && (
                        <div className="alert alert-error" style={{ marginTop: '16px' }}>
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div style={{
                    padding: '12px 16px',
                    borderTop: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '12px',
                    background: 'var(--color-bg-secondary)'
                }}>
                    <button
                        className="btn btn-ghost"
                        onClick={currentStep === 1 ? onClose : prevStep}
                    >
                        <ArrowLeft size={16} />
                        {currentStep === 1 ? 'Cancelar' : 'Voltar'}
                    </button>

                    {currentStep < TOTAL_STEPS ? (
                        <button
                            className="btn btn-primary"
                            onClick={nextStep}
                            disabled={!canProceed()}
                        >
                            Próximo
                            <ArrowRight size={16} />
                        </button>
                    ) : (
                        <button
                            className="btn btn-success btn-lg"
                            onClick={handleSubmit}
                            disabled={!canProceed() || loading}
                            style={{ minWidth: '140px' }}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="spinning" />
                                    Criando...
                                </>
                            ) : (
                                <>
                                    <Check size={18} />
                                    Criar Ticket
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
