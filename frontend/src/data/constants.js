// Fixed categories and subcategories (mirror of backend)
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
        ]
    }
];

export const STATUS = {
    NOVO: 'novo',
    EM_ANALISE: 'em_analise',
    AGUARDANDO_CLIENTE: 'aguardando_cliente',
    EM_EXECUCAO: 'em_execucao',
    RESOLVIDO: 'resolvido',
    ENCERRADO: 'encerrado'
};

export const STATUS_LABELS = {
    [STATUS.NOVO]: 'Novo',
    [STATUS.EM_ANALISE]: 'Em análise',
    [STATUS.AGUARDANDO_CLIENTE]: 'Aguardando cliente',
    [STATUS.EM_EXECUCAO]: 'Em execução',
    [STATUS.RESOLVIDO]: 'Resolvido',
    [STATUS.ENCERRADO]: 'Encerrado'
};

export const STATUS_COLORS = {
    [STATUS.NOVO]: '#6366f1',
    [STATUS.EM_ANALISE]: '#3b82f6',
    [STATUS.AGUARDANDO_CLIENTE]: '#f59e0b',
    [STATUS.EM_EXECUCAO]: '#8b5cf6',
    [STATUS.RESOLVIDO]: '#10b981',
    [STATUS.ENCERRADO]: '#71717a'
};

export const STATUS_ORDER = [
    STATUS.NOVO,
    STATUS.EM_ANALISE,
    STATUS.AGUARDANDO_CLIENTE,
    STATUS.EM_EXECUCAO,
    STATUS.RESOLVIDO,
    STATUS.ENCERRADO
];

export const IMPACT_OPTIONS = [
    {
        id: 'baixo',
        name: 'Baixo',
        description: 'Sem bloqueio operacional',
        color: '#22d3ee'
    },
    {
        id: 'medio',
        name: 'Médio',
        description: 'Impacto parcial nas operações',
        color: '#f59e0b'
    },
    {
        id: 'alto',
        name: 'Alto',
        description: 'Operação parada',
        color: '#ef4444'
    }
];

export function getCategoryById(id) {
    return CATEGORIES.find(c => c.id === id);
}

export function getSubcategoriesFor(categoryId) {
    const category = getCategoryById(categoryId);
    return category ? category.subcategories : [];
}
