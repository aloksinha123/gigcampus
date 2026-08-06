import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5003';

// Create axios instance
const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;

// Auth API
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
    resendVerification: (data) => api.post('/auth/resend-verification', data),
    getMe: () => api.get('/auth/me'),
    updateProfile: (data) => api.put('/auth/profile', data)
};

// AI API
export const aiAPI = {
    improveDescription: (description) => api.post('/ai/improve-description', { description })
};

// Projects API
export const projectsAPI = {
    getAll: (params) => api.get('/projects', { params }),
    getOne: (id) => api.get(`/projects/${id}`),
    create: (data) => api.post('/projects', data),
    update: (id, data) => api.put(`/projects/${id}`, data),
    delete: (id) => api.delete(`/projects/${id}`),
    getMy: () => api.get('/projects/my/all'),
    acceptBid: (id, bidId) => api.put(`/projects/${id}/accept-bid/${bidId}`),
    rejectBid: (id, bidId) => api.put(`/projects/${id}/reject-bid/${bidId}`),
    complete: (id) => api.put(`/projects/${id}/complete`),
    submitDeliverable: (id, data) => api.post(`/projects/${id}/deliverable`, data),
    approveDeliverable: (id, deliverableId) => api.put(`/projects/${id}/deliverable/${deliverableId}/approve`),
    raiseDispute: (id, reason) => api.put(`/projects/${id}/dispute`, { reason })
};

// Bids API
export const bidsAPI = {
    submit: (data) => api.post('/bids', data),
    getMy: () => api.get('/bids/my'),
    getProjectBids: (projectId) => api.get(`/bids/project/${projectId}`),
    update: (id, data) => api.put(`/bids/${id}`, data),
    withdraw: (id) => api.delete(`/bids/${id}`)
};

// Messages API
export const messagesAPI = {
    send: (data) => api.post('/messages', data),
    upload: (formData) => api.post('/messages/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getConversations: () => api.get('/messages/conversations'),
    getProjectMessages: (projectId, params) => api.get(`/messages/project/${projectId}`, { params }),
    markAsRead: (projectId) => api.put(`/messages/read/${projectId}`),
    getUnreadCount: () => api.get('/messages/unread')
};

// Payments API
export const paymentsAPI = {
    create: (data) => api.post('/payments', data),
    getMy: () => api.get('/payments/my'),
    getByProject: (projectId) => api.get(`/payments/project/${projectId}`),
    release: (id) => api.put(`/payments/${id}/release`),
    refund: (id, reason) => api.put(`/payments/${id}/refund`, { reason }),
    dispute: (id, reason) => api.put(`/payments/${id}/dispute`, { reason })
};

// Reviews API
export const reviewsAPI = {
    submit: (data) => api.post('/reviews', data),
    getMy: () => api.get('/reviews/my'),
    getUserReviews: (userId, params) => api.get(`/reviews/user/${userId}`, { params }),
    getProjectReviews: (projectId) => api.get(`/reviews/project/${projectId}`),
    respond: (id, comment) => api.put(`/reviews/${id}/respond`, { comment })
};

// Portfolio API
export const portfolioAPI = {
    getAll: (params) => api.get('/portfolio', { params }),
    getMy: () => api.get('/portfolio/my'),
    getUserPortfolio: (userId, params) => api.get(`/portfolio/user/${userId}`, { params }),
    getOne: (id) => api.get(`/portfolio/${id}`),
    create: (data) => api.post('/portfolio', data),
    update: (id, data) => api.put(`/portfolio/${id}`, data),
    delete: (id) => api.delete(`/portfolio/${id}`),
    toggleFeatured: (id) => api.put(`/portfolio/${id}/feature`),
    like: (id) => api.put(`/portfolio/${id}/like`)
};

// Users API
export const usersAPI = {
    getAll: () => api.get('/users'),
    getOne: (id) => api.get(`/users/${id}`),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`)
};

// Wallet API
export const walletAPI = {
    getBalance: () => api.get('/wallet/balance'),
    getTransactions: () => api.get('/wallet/transactions'),
    withdraw: (data) => api.post('/wallet/withdraw', data),
    deposit: (data) => api.post('/wallet/deposit', data)
};

// Notifications API
export const notificationsAPI = {
    getMy: () => api.get('/notifications/my'),
    markAsRead: (id) => api.put(`/notifications/${id}/read`),
    markAllAsRead: () => api.put('/notifications/read-all'),
    delete: (id) => api.delete(`/notifications/${id}`)
};

// Admin API
export const adminAPI = {
    getStats: () => api.get('/admin/stats'),
    getUsers: (params) => api.get('/admin/users', { params }),
    suspendUser: (id) => api.put(`/admin/users/${id}/suspend`),
    activateUser: (id) => api.put(`/admin/users/${id}/activate`),
    verifyFreelancer: (id) => api.put(`/admin/users/${id}/verify`),
    getProjects: (params) => api.get('/admin/projects', { params }),
    deleteProject: (id) => api.delete(`/admin/projects/${id}`),
    getDisputes: () => api.get('/admin/disputes'),
    resolveDispute: (id, data) => api.post(`/admin/disputes/${id}/resolve`, data),
    getBids: (params) => api.get('/admin/bids', { params })
};

// Milestones API
export const milestoneAPI = {
    getProjectMilestones: (projectId) => api.get(`/milestones/project/${projectId}`),
    create: (data) => api.post('/milestones', data),
    update: (id, data) => api.put(`/milestones/${id}`, data),
    delete: (id) => api.delete(`/milestones/${id}`),
    submit: (id, data) => api.put(`/milestones/${id}/submit`, data),
    approve: (id) => api.put(`/milestones/${id}/approve`),
    reject: (id, data) => api.put(`/milestones/${id}/reject`, data)
};

// Add shortcuts to default api export
api.auth = authAPI;
api.projects = projectsAPI;
api.bids = bidsAPI;
api.messages = messagesAPI;
api.payments = paymentsAPI;
api.reviews = reviewsAPI;
api.portfolio = portfolioAPI;
api.users = usersAPI;
api.notifications = notificationsAPI;
api.wallet = walletAPI;
api.admin = adminAPI;
api.milestones = milestoneAPI;
