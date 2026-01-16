// SLA configuration and calculation engine

// SLA deadlines by impact (in hours)
const SLA_HOURS = {
    baixo: 48,
    medio: 24,
    alto: 4
};

// Risk threshold: when less than 20% of time remains
const RISK_THRESHOLD = 0.2;

/**
 * Calculate SLA deadline from creation time and impact
 * @param {string} impact - 'baixo', 'medio', or 'alto'
 * @param {Date|string} createdAt - Creation timestamp
 * @returns {Date} SLA deadline
 */
export function calculateDeadline(impact, createdAt = new Date()) {
    const hours = SLA_HOURS[impact] || SLA_HOURS.medio;
    const created = new Date(createdAt);
    return new Date(created.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Calculate SLA status based on current time and deadline
 * @param {Date|string} deadline - SLA deadline
 * @param {Date|string} createdAt - Creation timestamp
 * @returns {{ status: 'ok'|'risco'|'quebrado', percentRemaining: number, hoursRemaining: number }}
 */
export function calculateSLAStatus(deadline, createdAt) {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const createdDate = new Date(createdAt);

    const totalTime = deadlineDate.getTime() - createdDate.getTime();
    const remainingTime = deadlineDate.getTime() - now.getTime();
    const hoursRemaining = remainingTime / (60 * 60 * 1000);
    const percentRemaining = remainingTime / totalTime;

    let status;
    if (remainingTime <= 0) {
        status = 'quebrado';
    } else if (percentRemaining <= RISK_THRESHOLD) {
        status = 'risco';
    } else {
        status = 'ok';
    }

    return {
        status,
        percentRemaining: Math.max(0, Math.round(percentRemaining * 100)),
        hoursRemaining: Math.round(hoursRemaining * 10) / 10
    };
}

/**
 * Get SLA configuration for display
 * @returns {Object} SLA hours by impact
 */
export function getSLAConfig() {
    return { ...SLA_HOURS };
}

/**
 * Enrich ticket with calculated SLA status
 * @param {Object} ticket - Ticket object with sla_deadline and created_at
 * @returns {Object} Ticket with sla_status added
 */
export function enrichTicketWithSLA(ticket) {
    if (!ticket) return ticket;

    const slaInfo = calculateSLAStatus(ticket.sla_deadline, ticket.created_at);

    return {
        ...ticket,
        sla_status: slaInfo.status,
        sla_percent_remaining: slaInfo.percentRemaining,
        sla_hours_remaining: slaInfo.hoursRemaining
    };
}
