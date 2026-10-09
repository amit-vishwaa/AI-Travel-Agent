/**
 * Authentication context - provides user state and auth functions
 * throughout the entire application.
 */
import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function getAuthErrorMessage(err, defaultMessage = 'An unexpected error occurred.') {
  if (!err) return defaultMessage
  if (err.message === 'Network Error' || !err.response) {
    return 'Cannot reach the backend server. Please verify your connection or check that the backend is active.'
  }
  const detail = err.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map(item => item.msg || item.message || JSON.stringify(item)).join('. ')
  }
  if (typeof detail === 'object' && detail !== null) {
    return detail.message || JSON.stringify(detail)
  }
  return err.response?.data?.message || err.message || defaultMessage
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount, check for existing token and fetch user profile
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      api.get('/auth/me')
        .then(res => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('token')
          delete api.defaults.headers.common['Authorization']
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const res = await api.post('/auth/login', {
      email: email.trim().toLowerCase(),
      password,
    })
    const { access_token, user: userData } = res.data
    localStorage.setItem('token', access_token)
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
    setUser(userData)
    return userData
  }

  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    })
    const { access_token, user: userData } = res.data
    localStorage.setItem('token', access_token)
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
    setUser(userData)
    return userData
  }

  const loginWithGoogle = async (googlePayload) => {
    const res = await api.post('/auth/google', googlePayload)
    const { access_token, user: userData } = res.data
    localStorage.setItem('token', access_token)
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
    setUser(userData)
    return userData
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
    toast.success('Logged out successfully')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
