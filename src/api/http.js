import axios from 'axios'

const TOKEN_STORAGE_KEY = 'budget_admin_token'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  timeout: 10000,
})

export const getStoredToken = () => localStorage.getItem(TOKEN_STORAGE_KEY)

export const setStoredToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}

api.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
