import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { ticketsAPI, attachmentsAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import StepOrigin from '../components/Wizard/StepOrigin';
import StepClient from '../components/Wizard/StepClient';
import StepProduct from '../components/Wizard/StepProduct';
import StepCategory from '../components/Wizard/StepCategory';
import StepDetails from '../components/Wizard/StepDetails';
import StepOwner from '../components/Wizard/StepOwner';

const STEPS = [
    { id: 1, label: 'Origem' },
    { id: 2, label: 'Cliente' },
    { id: 3, label: 'Produto' },
    { id: 4, label: 'Categoria' },
    { id: 5, label: 'Detalhes' },
    { id: 6, label: 'Responsável' }
];

const TOTAL_STEPS = 6;

export default function CreateTicket() {
    const navigate = useNavigate();
    const { getAuthHeaders } = useAuth();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Form data
    const [originChannel, setOriginChannel] = useState(null);
    const [originContact, setOriginContact] = useState('');
    const [originReference, setOriginReference] = useState('');
    const [client, setClient] = useState(null);
    const [product, setProduct] = useState(undefined); // undefined = not set, null = skipped
    const [category, setCategory] = useState(null);
    const [subcategory, setSubcategory] = useState(null);
    const [impact, setImpact] = useState(null);
    const [description, setDescription] = useState('');
    const [area, setArea] = useState(null);
    const [attachments, setAttachments] = useState([]);
    const [customData, setCustomData] = useState({});

    // Reset subcategory when category changes
    function handleCategoryChange(newCategory) {
        setCategory(newCategory);
        setSubcategory(null);
        setArea(null);
    }

    function canProceed() {
        switch (currentStep) {
            case 1: return !!originChannel;
            case 2: return !!client;
            case 3: return product !== undefined; // null means skipped, which is valid
            case 4: return !!category;
            case 5:
                // Poka-yoke: require description for high impact
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

            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="wizard">
            {/* Progress */}
            <div className="wizard-progress">
                {STEPS.map((step, index) => (
                    <div
                        key={step.id}
                        className={`wizard-step ${currentStep === step.id ? 'active' :
                            currentStep > step.id ? 'completed' : ''
                            }`}
                    >
                        <div className="wizard-step-number">
                            {currentStep > step.id ? <Check size={18} /> : step.id}
                        </div>
                        <div className="wizard-step-label">{step.label}</div>
                    </div>
                ))}
            </div>

            {/* Content */}
            <div className="wizard-content">
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
                        onDescriptionChange={setDescription}
                        attachments={attachments}
                        onAttachmentsChange={setAttachments}
                        customData={customData}
                        onCustomDataChange={setCustomData}
                    />
                )}

                {currentStep === 6 && (
                    <StepOwner
                        value={area}
                        onChange={setArea}
                        suggestedAreaId={category?.defaultArea}
                    />
                )}

                {/* Error */}
                {error && (
                    <div className="alert alert-error" style={{ marginTop: 'var(--space-md)' }}>
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="wizard-actions">
                    <button
                        className="btn btn-ghost"
                        onClick={currentStep === 1 ? () => navigate('/') : prevStep}
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

            <style>{`
        .spinning {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}

