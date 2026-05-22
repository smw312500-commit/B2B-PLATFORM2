import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:8001' });

export const stockApi = {
  getAll:  ()     => api.get('/stock/'),
  create:  (data) => api.post('/stock/', data),
  update:  (id, data) => api.patch(`/stock/${id}`, data),
};

export const orderApi = {
  getAll:    () => api.get('/order/'),
  getActive: () => api.get('/order/active'),
  create:    (data) => api.post('/order/', data),
  complete:  (id)   => api.patch(`/order/${id}/complete`),
  cancel:    (id)   => api.patch(`/order/${id}/cancel`),
};

export const releaseApi = {
  getAll:    () => api.get('/release/'),
  getActive: () => api.get('/release/active'),
  create:    (data) => api.post('/release/', data),
  complete:  (id)   => api.patch(`/release/${id}/complete`),
};

export const agentApi = {
  getStatus:  ()     => api.get('/agent/status'),
  validate:   (code) => api.get(`/agent/validate/${encodeURIComponent(code)}`),
  analyze:    (data) => api.post('/agent/analyze', data),
};
