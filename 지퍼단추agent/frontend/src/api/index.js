import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
});

// ── 재고 ───────────────────────────────────────────────
export const getStock = () => api.get('/stock/');
export const updateStock = (id, stock_qty) => api.put(`/stock/${id}`, { stock_qty });
export const getRawMaterials = () => api.get('/stock/raw/');
export const updateRawMaterial = (id, stock_qty) => api.put(`/stock/raw/${id}`, { stock_qty });

// ── 발주 ───────────────────────────────────────────────
export const getOrders = () => api.get('/orders/');
export const getActiveOrders = () => api.get('/orders/active');
export const createOrder = (data) => api.post('/orders/', data);
export const cancelOrder = (id) => api.put(`/orders/${id}/cancel`);
export const receiveOrder = (id) => api.put(`/orders/${id}/receive`);

// ── 출고 ───────────────────────────────────────────────
export const getReleases = () => api.get('/releases/');
export const getActiveReleases = () => api.get('/releases/active');
export const createRelease = (data) => api.post('/releases/', data);
export const completeRelease = (id) => api.put(`/releases/${id}/complete`);

// ── AI Agent ───────────────────────────────────────────
export const analyzeOrder = (data) => api.post('/agent/analyze', data);
export const getAgentStatus = () => api.get('/agent/status');
