import api from './http'

export const listAuditLogsApi = async (params = {}) => {
  const response = await api.get('/admin/audit-logs', { params })
  return response.data
}
