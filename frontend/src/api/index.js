const API_URL = 'http://localhost:3001/api';

// Get auth headers from localStorage
function getStoredAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchAPI(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...getStoredAuthHeaders(),
        ...options.headers
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.errors?.join(', ') || 'Erro na requisição');
    }

    return response.json();
}

// Tickets API
export const ticketsAPI = {
    list: (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        return fetchAPI(`/tickets${params ? `?${params}` : ''}`);
    },

    get: (id) => fetchAPI(`/tickets/${id}`),

    create: (data, authHeaders = {}) => fetchAPI('/tickets', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: authHeaders
    }),

    changeStatus: (id, status, notes = null, attachmentIds = [], authHeaders = {}) => fetchAPI(`/tickets/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, notes, attachmentIds }),
        headers: authHeaders
    }),
    delete: (id, authHeaders = {}) => fetchAPI(`/tickets/${id}`, {
        method: 'DELETE',
        headers: authHeaders
    }),

    assign: (id, userId, authHeaders = {}) => fetchAPI(`/tickets/${id}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ assigned_to: userId }),
        headers: authHeaders
    }),

    transfer: (id, areaId, notes, attachmentIds = [], authHeaders = {}) => fetchAPI(`/tickets/${id}/transfer`, {
        method: 'PATCH',
        body: JSON.stringify({ area_id: areaId, notes, attachment_ids: attachmentIds }),
        headers: authHeaders
    }),

    getCategories: () => fetchAPI('/tickets/categories/list'),

    getOriginChannels: () => fetchAPI('/tickets/origin-channels')
};

// Clients API
export const clientsAPI = {
    list: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return fetchAPI(`/clients${queryParams ? `?${queryParams}` : ''}`);
    },

    get: (id) => fetchAPI(`/clients/${id}`),

    create: (data) => fetchAPI('/clients', {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    update: (id, data) => fetchAPI(`/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),

    delete: (id) => fetchAPI(`/clients/${id}`, {
        method: 'DELETE'
    })
};

// Areas API
export const areasAPI = {
    list: () => fetchAPI('/areas'),
    get: (id) => fetchAPI(`/areas/${id}`),
    create: (data) => fetchAPI('/areas', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => fetchAPI(`/areas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id) => fetchAPI(`/areas/${id}`, {
        method: 'DELETE'
    })
};

// Products API
export const productsAPI = {
    list: () => fetchAPI('/products'),
    get: (id) => fetchAPI(`/products/${id}`),
    create: (data) => fetchAPI('/products', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => fetchAPI(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id) => fetchAPI(`/products/${id}`, {
        method: 'DELETE'
    })
};

// SLA Policies API
export const slaPoliciesAPI = {
    list: () => fetchAPI('/sla-policies'),
    get: (id) => fetchAPI(`/sla-policies/${id}`),
    create: (data) => fetchAPI('/sla-policies', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => fetchAPI(`/sla-policies/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id) => fetchAPI(`/sla-policies/${id}`, {
        method: 'DELETE'
    })
};

// Import API (Bulk)
export const importAPI = {
    clients: (csv) => fetchAPI('/import/clients', {
        method: 'POST',
        body: JSON.stringify({ csv })
    }),
    products: (csv) => fetchAPI('/import/products', {
        method: 'POST',
        body: JSON.stringify({ csv })
    }),
    getTemplateUrl: (type) => `http://localhost:3001/api/import/template/${type}`
};

// Reports API  
export const reportsAPI = {
    summary: () => fetchAPI('/reports/summary'),
    byCategory: () => fetchAPI('/reports/by-category'),
    byStatus: () => fetchAPI('/reports/by-status'),
    sla: () => fetchAPI('/reports/sla'),
    backlog: () => fetchAPI('/reports/backlog')
};

// Auth API
export const authAPI = {
    login: (email, password) => fetchAPI('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    }),

    register: (orgName, userName, email, password) => fetchAPI('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ orgName, userName, email, password })
    }),

    me: () => fetchAPI('/auth/me'),

    invite: (email, name, role, password) => fetchAPI('/auth/invite', {
        method: 'POST',
        body: JSON.stringify({ email, name, role, password })
    }),

    users: () => fetchAPI('/auth/users')
};

// Attachments API (evidence for tickets)
export const attachmentsAPI = {
    list: (ticketId) => fetchAPI(`/attachments/${ticketId}`),

    upload: (ticketId, file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
                const base64 = reader.result.split(',')[1];
                try {
                    const result = await fetchAPI(`/attachments/${ticketId}`, {
                        method: 'POST',
                        body: JSON.stringify({
                            filename: file.name,
                            data: base64,
                            mimeType: file.type
                        })
                    });
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    getUrl: (id) => `${API_BASE_URL}/attachments/file/${id}`,

    delete: (id) => fetchAPI(`/attachments/${id}`, {
        method: 'DELETE'
    })
};

// Comments/Activity Log API
export const commentsAPI = {
    list: (ticketId) => fetchAPI(`/comments/${ticketId}`),

    create: (ticketId, content, commentType = 'internal') => fetchAPI(`/comments/${ticketId}`, {
        method: 'POST',
        body: JSON.stringify({ content, comment_type: commentType })
    }),

    delete: (id) => fetchAPI(`/comments/${id}`, {
        method: 'DELETE'
    })
};

// Categories API (dynamic categories management)
export const categoriesAPI = {
    list: () => fetchAPI('/categories'),
    get: (id) => fetchAPI(`/categories/${id}`),
    create: (data) => fetchAPI('/categories', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => fetchAPI(`/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id) => fetchAPI(`/categories/${id}`, {
        method: 'DELETE'
    }),
    // Subcategories
    createSubcategory: (categoryId, name) => fetchAPI(`/categories/${categoryId}/subcategories`, {
        method: 'POST',
        body: JSON.stringify({ name })
    }),
    updateSubcategory: (categoryId, subcategoryId, data) => fetchAPI(`/categories/${categoryId}/subcategories/${subcategoryId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteSubcategory: (categoryId, subcategoryId) => fetchAPI(`/categories/${categoryId}/subcategories/${subcategoryId}`, {
        method: 'DELETE'
    })
};

// Custom Fields API
export const customFieldsAPI = {
    list: (params) => {
        const queryParams = new URLSearchParams(params).toString();
        return fetchAPI(`/custom-fields${queryParams ? `?${queryParams}` : ''}`);
    },
    create: (data) => fetchAPI('/custom-fields', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => fetchAPI(`/custom-fields/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id) => fetchAPI(`/custom-fields/${id}`, {
        method: 'DELETE'
    })
};

// Kanban Columns API
export const kanbanColumnsAPI = {
    list: (areaId) => fetchAPI(`/areas/${areaId}/kanban-columns`),
    create: (areaId, data) => fetchAPI(`/areas/${areaId}/kanban-columns`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => fetchAPI(`/kanban-columns/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id) => fetchAPI(`/kanban-columns/${id}`, {
        method: 'DELETE'
    }),
    reorder: (areaId, columns) => fetchAPI(`/areas/${areaId}/kanban-columns/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ columns })
    })
};

// Email Mailboxes API
export const emailMailboxesAPI = {
    list: () => fetchAPI('/email-mailboxes'),
    create: (data) => fetchAPI('/email-mailboxes', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => fetchAPI(`/email-mailboxes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    remove: (id) => fetchAPI(`/email-mailboxes/${id}`, {
        method: 'DELETE'
    }),
    test: (id) => fetchAPI(`/email-mailboxes/${id}/test`, {
        method: 'POST'
    })
};

export default { ticketsAPI, clientsAPI, areasAPI, productsAPI, slaPoliciesAPI, importAPI, reportsAPI, authAPI, attachmentsAPI, commentsAPI, categoriesAPI, customFieldsAPI, kanbanColumnsAPI, emailMailboxesAPI };
