/**
 * Axios instance configured with base URL and interceptors.
 */
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  timeout: 60000, // 60s for AI calls
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  const aiProvider = localStorage.getItem('travel_ai_provider') || 'ollama'
  const savedModel = localStorage.getItem('travel_ai_model')
  const aiModel = !savedModel || savedModel === 'qwen3-coder:30b' ? 'qwen2.5-coder:7b' : savedModel

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  config.headers['X-AI-Provider'] = aiProvider
  config.headers['X-AI-Model'] = aiModel
  return config
})

// Response interceptor: auto-handle 401 Unauthorized
api.interceptors.response.use(
  res => res,
  err => {
    const requestUrl = String(err.config?.url || '')
    if (err.response?.status === 401 && requestUrl.includes('/auth/me')) {
      localStorage.removeItem('token')
      delete api.defaults.headers.common['Authorization']
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
