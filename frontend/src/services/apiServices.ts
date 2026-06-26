import api from './api';

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data).then((r) => r.data),
  register: (data: any) =>
    api.post('/auth/register', data).then((r) => r.data),
  logout: () =>
    api.post('/auth/logout').then((r) => r.data),
  me: () =>
    api.get('/auth/me').then((r) => r.data),
  updateProfile: (data: any) =>
    api.put('/auth/profile', data).then((r) => r.data),
  changePassword: (data: any) =>
    api.put('/auth/change-password', data).then((r) => r.data),
  refresh: () =>
    api.post('/auth/refresh').then((r) => r.data),
};

// ── Dashboard ─────────────────────────────────────────────────
export const dashboardApi = {
  get: () => api.get('/dashboard').then((r) => r.data),
};

// ── Vendors ───────────────────────────────────────────────────
export const vendorApi = {
  list: (params?: any) => api.get('/vendors', { params }).then((r) => r.data),
  get: (id: number) => api.get(`/vendors/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/vendors', data).then((r) => r.data),
  update: (id: number, data: any) => api.put(`/vendors/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/vendors/${id}`).then((r) => r.data),
  getItems: (vendorName: string) =>
    api.get('/vendors/items', { params: { vendorName } }).then((r) => r.data),
};

// ── Customers ─────────────────────────────────────────────────
export const customerApi = {
  list: (params?: any) => api.get('/customers', { params }).then((r) => r.data),
  get: (id: number) => api.get(`/customers/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/customers', data).then((r) => r.data),
  update: (id: number, data: any) => api.put(`/customers/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/customers/${id}`).then((r) => r.data),
};

// ── Materials ─────────────────────────────────────────────────
export const materialApi = {
  list: (params?: any) => api.get('/materials', { params }).then((r) => r.data),
  create: (data: any) => api.post('/materials', data).then((r) => r.data),
  update: (id: number, data: any) => api.put(`/materials/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/materials/${id}`).then((r) => r.data),
};

// ── Purchases ─────────────────────────────────────────────────
export const purchaseApi = {
  list: (params?: any) => api.get('/purchases', { params }).then((r) => r.data),
  get: (id: number) => api.get(`/purchases/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/purchases', data).then((r) => r.data),
  update: (id: number, data: any) => api.put(`/purchases/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/purchases/${id}`).then((r) => r.data),
  getLastPrice: (materialName: string) =>
    api.get('/purchases/last-price', { params: { materialName } }).then((r) => r.data),
  listGstInputBills: (params?: any) =>
    api.get('/purchases/gst-input-bills', { params }).then((r) => r.data),
  createGstInputBill: (data: any) =>
    api.post('/purchases/gst-input-bills', data).then((r) => r.data),
  deleteGstInputBill: (id: number) =>
    api.delete(`/purchases/gst-input-bills/${id}`).then((r) => r.data),

  // ── Payable payments (mirrors saleApi payment methods) ────────
  addPayment: (purchaseId: number, data: any) =>
    api.post('/purchases/payments', { ...data, purchaseId }).then((r) => r.data),
  getPayments: (purchaseId: number) =>
    api.get(`/purchases/${purchaseId}/payments`).then((r) => r.data),
  updatePayment: (paymentId: number, data: any) =>
    api.put(`/purchases/payments/${paymentId}`, data).then((r) => r.data),
  deletePayment: (paymentId: number) =>
    api.delete(`/purchases/payments/${paymentId}`).then((r) => r.data),
};

// ── Sales ─────────────────────────────────────────────────────
export const saleApi = {
  list: (params?: any) => api.get('/sales', { params }).then((r) => r.data),
  get: (id: number) => api.get(`/sales/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/sales', data).then((r) => r.data),
  update: (id: number, data: any) => api.put(`/sales/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/sales/${id}`).then((r) => r.data),
  addPayment: (id: number, data: any) =>
    api.post(`/sales/${id}/payments`, data).then((r) => r.data),
  getPayments: (saleId: number) =>
    api.get(`/sales/${saleId}/payments`).then((r) => r.data),
  updatePayment: (paymentId: number, data: any) =>
    api.put(`/sales/payments/${paymentId}`, data).then((r) => r.data),
  deletePayment: (paymentId: number) =>
    api.delete(`/sales/payments/${paymentId}`).then((r) => r.data),
  receivables: (params?: any) =>
    api.get('/sales/receivables', { params }).then((r) => r.data),
};

// ── Expenses ──────────────────────────────────────────────────
export const expenseApi = {
  list: (params?: any) => api.get('/expenses', { params }).then((r) => r.data),
  create: (data: any) => api.post('/expenses', data).then((r) => r.data),
  update: (id: number, data: any) => api.put(`/expenses/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/expenses/${id}`).then((r) => r.data),
};

// ── Investors ─────────────────────────────────────────────────
export const investorApi = {
  list: (params?: any) => api.get('/investors', { params }).then((r) => r.data),
  create: (data: any) => api.post('/investors', data).then((r) => r.data),
  update: (id: number, data: any) => api.put(`/investors/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/investors/${id}`).then((r) => r.data),
};

// ── Intermediary ──────────────────────────────────────────────
export const intermediaryApi = {
  list: (params?: any) => api.get('/intermediary', { params }).then((r) => r.data),
  create: (data: any) => api.post('/intermediary', data).then((r) => r.data),
  update: (id: number, data: any) => api.put(`/intermediary/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/intermediary/${id}`).then((r) => r.data),
};

// ── GST ───────────────────────────────────────────────────────
export const gstApi = {
  summary: (params?: any) => api.get('/gst/summary', { params }).then((r) => r.data),
  payments: (params?: any) => api.get('/gst/payments', { params }).then((r) => r.data),
  createPayment: (data: any) => api.post('/gst/payments', data).then((r) => r.data),
  deletePayment: (id: number) => api.delete(`/gst/payments/${id}`).then((r) => r.data),
};

// ── Bank ──────────────────────────────────────────────────────
export const bankApi = {
  accounts: () => api.get('/bank/accounts').then((r) => r.data),
  createAccount: (data: any) => api.post('/bank/accounts', data).then((r) => r.data),
  updateAccount: (id: number, data: any) => api.put(`/bank/accounts/${id}`, data).then((r) => r.data),
  deleteAccount: (id: number) => api.delete(`/bank/accounts/${id}`).then((r) => r.data),
  statements: (params?: any) => api.get('/bank/statements', { params }).then((r) => r.data),
  createStatement: (data: any) => api.post('/bank/statements', data).then((r) => r.data),
  updateStatement: (id: number, data: any) => api.put(`/bank/statements/${id}`, data).then((r) => r.data),
  deleteStatement: (id: number) => api.delete(`/bank/statements/${id}`).then((r) => r.data),
  summary: () => api.get('/bank/summary').then((r) => r.data),
};

// ── Reports ───────────────────────────────────────────────────
export const reportApi = {
  profit: (params?: any) =>
    api.get('/reports/profit', { params }).then((r) => r.data),
  inventory: (params?: any) =>
    api.get('/reports/inventory', { params }).then((r) => r.data),
  ledger: (params?: { from?: string; to?: string; party?: string }) =>
    api.get('/reports/ledger', { params }).then((r) => r.data),
  gst: (params?: any) =>
    api.get('/reports/gst', { params }).then((r) => r.data),
  receivables: (params?: any) =>
    api.get('/reports/receivables', { params }).then((r) => r.data),
  payables: (params?: any) =>
    api.get('/reports/payables', { params }).then((r) => r.data),
};

// ── Admin ─────────────────────────────────────────────────────
export const adminApi = {
  users: (params?: any) => api.get('/admin/users', { params }).then((r) => r.data),
  approveUser: (id: number) => api.post(`/admin/users/${id}/approve`).then((r) => r.data),
  rejectUser: (id: number) => api.post(`/admin/users/${id}/reject`).then((r) => r.data),
  suspendUser: (id: number) => api.post(`/admin/users/${id}/suspend`).then((r) => r.data),
  auditLogs: (params?: any) => api.get('/admin/audit-logs', { params }).then((r) => r.data),
  dashboard: () => api.get('/admin/dashboard').then((r) => r.data),
};

// ── Notifications ─────────────────────────────────────────────
export const notificationApi = {
  list: () => api.get('/notifications').then((r) => r.data),
  markRead: (id: number) => api.put(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.put('/notifications/read-all').then((r) => r.data),
};