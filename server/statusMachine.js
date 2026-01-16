// Status constants
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

/**
 * Validates if a status transition is allowed
 * TODAS as transições são permitidas, exceto de ENCERRADO para qualquer outro
 */
export function validateTransition(fromStatus, toStatus) {
    // Ticket encerrado não pode mudar
    if (fromStatus === STATUS.ENCERRADO) {
        return {
            valid: false,
            error: 'Ticket encerrado não pode mudar de status'
        };
    }

    // Qualquer outra transição é válida
    return { valid: true };
}

/**
 * Get available actions for a given status
 */
export function getAvailableActions(status) {
    if (status === STATUS.ENCERRADO) {
        return [];
    }

    // Todas as opções disponíveis (exceto o status atual e encerrado requer resolvido)
    const allStatuses = Object.values(STATUS).filter(s => s !== status);

    return allStatuses.map(s => ({
        action: s,
        targetStatus: s,
        label: STATUS_LABELS[s]
    }));
}
