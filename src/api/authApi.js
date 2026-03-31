import api from './http'

export const loginApi = async ({ identifier, password }) => {
  const response = await api.post('/auth/login', { username: identifier, password })
  return response.data.data
}

export const getMeApi = async () => {
  const response = await api.get('/auth/me')
  return response.data.data
}
