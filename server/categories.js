// Fixed categories and subcategories (immutable)

// Origin channels for ticket creation (poka-yoke)
export const ORIGIN_CHANNELS = [
    { id: 'email', name: 'E-mail', icon: 'Mail', color: '#3B82F6' },
    { id: 'telefone', name: 'Telefone', icon: 'Phone', color: '#10B981' },
    { id: 'chat', name: 'Chat', icon: 'MessageCircle', color: '#8B5CF6' },
    { id: 'portal', name: 'Portal do Cliente', icon: 'Globe', color: '#F59E0B' },
    { id: 'interno', name: 'Solicitação Interna', icon: 'Building', color: '#6366F1' }
];

export function validateOriginChannel(channelId) {
    const channel = ORIGIN_CHANNELS.find(c => c.id === channelId);
    if (!channel) {
        return { valid: false, error: `Canal de origem "${channelId}" não existe` };
    }
    return { valid: true };
}

export const CATEGORIES = [
    {
        id: 'onboarding',
        name: 'Onboarding',
        icon: 'UserPlus',
        color: '#10B981',
        defaultArea: 'area-implantacao',
        subcategories: [
            { id: 'validacao_cadastral', name: 'Validação cadastral' },
            { id: 'parametrizacao', name: 'Parametrização' },
            { id: 'treinamento_inicial', name: 'Treinamento inicial' },
            { id: 'configuracao_acessos', name: 'Configuração de acessos' }
        ],
        checklist: [
            'Verificar documentação do cliente',
            'Validar dados cadastrais',
            'Configurar parâmetros do sistema',
            'Agendar treinamento inicial'
        ]
    },
    {
        id: 'cadastro_dados',
        name: 'Cadastro de Dados',
        icon: 'Database',
        color: '#3B82F6',
        defaultArea: 'area-operacoes',
        subcategories: [
            { id: 'erro_importacao', name: 'Erro de importação' },
            { id: 'dados_duplicados', name: 'Dados duplicados' },
            { id: 'correcao_cadastral', name: 'Correção cadastral' },
            { id: 'atualizacao_massiva', name: 'Atualização massiva' }
        ],
        checklist: [
            'Identificar origem do erro',
            'Verificar formato dos dados',
            'Aplicar correção',
            'Validar integridade após correção'
        ]
    },
    {
        id: 'execucao_rodadas',
        name: 'Execução Rodadas',
        icon: 'RefreshCw',
        color: '#8B5CF6',
        defaultArea: 'area-operacoes',
        subcategories: [
            { id: 'reprocessamento', name: 'Reprocessamento' },
            { id: 'falha_execucao', name: 'Falha de execução' },
            { id: 'atraso_programacao', name: 'Atraso de programação' },
            { id: 'inconsistencia_dados', name: 'Inconsistência de dados' }
        ],
        checklist: [
            'Verificar logs de execução',
            'Identificar causa raiz',
            'Executar reprocessamento se necessário',
            'Confirmar resultados'
        ]
    },
    {
        id: 'multas_resultados',
        name: 'Multas e Resultados',
        icon: 'FileWarning',
        color: '#EF4444',
        defaultArea: 'area-operacoes',
        subcategories: [
            { id: 'desvio_detectado', name: 'Desvio detectado' },
            { id: 'falha_orgao', name: 'Falha do órgão' },
            { id: 'contestacao', name: 'Contestação' },
            { id: 'recurso_administrativo', name: 'Recurso administrativo' }
        ],
        checklist: [
            'Analisar notificação/multa',
            'Verificar histórico do veículo',
            'Preparar documentação',
            'Acompanhar prazo recursal'
        ]
    },
    {
        id: 'erro_usuario',
        name: 'Erro de Usuário',
        icon: 'UserX',
        color: '#F59E0B',
        defaultArea: 'area-cs',
        subcategories: [
            { id: 'operacao_incorreta', name: 'Operação incorreta' },
            { id: 'falta_treinamento', name: 'Falta de treinamento' },
            { id: 'uso_indevido', name: 'Uso indevido' },
            { id: 'duvida_operacional', name: 'Dúvida operacional' }
        ],
        checklist: [
            'Entender o que o usuário tentou fazer',
            'Identificar gap de conhecimento',
            'Orientar procedimento correto',
            'Avaliar necessidade de treinamento'
        ]
    },
    {
        id: 'incidente_tecnico',
        name: 'Incidente Técnico',
        icon: 'AlertTriangle',
        color: '#DC2626',
        defaultArea: 'area-dev',
        subcategories: [
            { id: 'instabilidade_sistema', name: 'Instabilidade do sistema' },
            { id: 'falha_integracao', name: 'Falha de integração' },
            { id: 'bug_producao', name: 'Bug em produção' },
            { id: 'lentidao', name: 'Lentidão' }
        ],
        checklist: [
            'Coletar evidências do erro',
            'Verificar logs do sistema',
            'Identificar impacto',
            'Escalar se necessário'
        ]
    },
    {
        id: 'atendimento_cs',
        name: 'Atendimento/CS',
        icon: 'Headphones',
        color: '#06B6D4',
        defaultArea: 'area-cs',
        subcategories: [
            { id: 'solicitacao_geral', name: 'Solicitação geral' },
            { id: 'reclamacao', name: 'Reclamação' },
            { id: 'feedback', name: 'Feedback' },
            { id: 'escalonamento', name: 'Escalonamento' }
        ],
        checklist: [
            'Registrar solicitação detalhadamente',
            'Verificar histórico do cliente',
            'Encaminhar para área responsável',
            'Acompanhar resolução'
        ]
    },
    {
        id: 'projetos_melhorias',
        name: 'Projetos/Melhorias',
        icon: 'Lightbulb',
        color: '#84CC16',
        defaultArea: 'area-dev',
        subcategories: [
            { id: 'nova_funcionalidade', name: 'Nova funcionalidade' },
            { id: 'melhoria_existente', name: 'Melhoria existente' },
            { id: 'automacao', name: 'Automação' },
            { id: 'integracao_nova', name: 'Integração nova' }
        ],
        checklist: [
            'Documentar requisito',
            'Avaliar viabilidade',
            'Priorizar no backlog',
            'Definir prazo estimado'
        ]
    }
];

/**
 * Get category by ID
 * @param {string} categoryId 
 * @returns {Object|undefined}
 */
export function getCategoryById(categoryId) {
    return CATEGORIES.find(c => c.id === categoryId);
}

/**
 * Get subcategories for a category
 * @param {string} categoryId 
 * @returns {Array}
 */
export function getSubcategoriesFor(categoryId) {
    const category = getCategoryById(categoryId);
    return category ? category.subcategories : [];
}

/**
 * Validate category and subcategory combination
 * @param {string} categoryId 
 * @param {string} subcategoryId 
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateCategorySubcategory(categoryId, subcategoryId) {
    const category = getCategoryById(categoryId);

    if (!category) {
        return { valid: false, error: `Categoria "${categoryId}" não existe` };
    }

    const subcategory = category.subcategories.find(s => s.id === subcategoryId);

    if (!subcategory) {
        return {
            valid: false,
            error: `Subcategoria "${subcategoryId}" não pertence à categoria "${category.name}"`
        };
    }

    return { valid: true };
}
