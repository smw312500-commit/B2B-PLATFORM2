import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// 재고
export const getStock = () => api.get('/stock/')
export const updateStock = (id, stockQty) => api.patch(`/stock/${id}`, { stock_qty: stockQty })

// 발주
export const getOrders = () => api.get('/orders/')
export const createOrder = (data) => api.post('/orders/', data)
export const cancelOrder = (id) => api.patch(`/orders/${id}/cancel`)

// 출고
export const getReleases = () => api.get('/releases/')
export const createRelease = (data) => api.post('/releases/', data)
export const completeRelease = (id) => api.post(`/releases/${id}/complete`)

// AI Agent
export const analyzeOrder = (data) => api.post('/agent/analyze', data)
export const validateLabelCode = (code) => api.get(`/agent/validate/${code}`)
export const getAgentStatus = () => api.get('/agent/status')
