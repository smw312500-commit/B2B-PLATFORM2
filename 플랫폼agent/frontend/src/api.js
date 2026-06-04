import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const getDashboardSummary = () => api.get('/dashboard/summary')
export const getCollectedReleases = (params) => api.get('/collected-release', { params })
export const getLabelCodeStatus = (code) => api.get(`/labelcode/${code}/status`)
export const getDispatches = () => api.get('/dispatch')
export const getInsights = () => api.get('/insights')
export const analyzeInsights = () => api.post('/insights/analyze')
export const getReportChannels = () => api.get('/report-channels')
export const getReportChannelMessages = (channel) => api.get(`/report-channels/${channel}/messages`)
