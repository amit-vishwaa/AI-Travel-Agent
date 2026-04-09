import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

import AeroMindLogo from '../components/branding/AeroMindLogo'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { user, loading: authLoading, login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!authLoading && user) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-shell flex items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="hidden rounded-[2rem] border border-white/60 bg-gradient-to-br from-sky-600 via-cyan-600 to-emerald-500 p-10 text-white shadow-[0_24px_80px_rgba(14,165,233,0.25)] lg:block">
          <AeroMindLogo className="h-14 w-14" withWordmark={false} />
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-100">Sign In</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight">Return to your travel planning workspace.</h1>
          <p className="mt-4 text-lg leading-8 text-cyan-50">
            Continue building itineraries, reviewing weather-aware alerts, and refining trip details in one place.
          </p>
        </div>

        <div className="glass-panel w-full max-w-xl justify-self-center">
          <div className="mb-8 flex flex-col items-center text-center">
            <AeroMindLogo className="h-16 w-16" />
            <h1 className="mt-5 text-3xl font-bold text-slate-900 dark:text-white">Welcome Back</h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">Sign in to continue planning weather-aware trips</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  className="input-field pl-10"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="label mb-0">Password</label>
                <Link to="/forgot-password" className="text-sm font-semibold text-primary-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="input-field pl-10 pr-10"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Do not have an account?{' '}
            <Link to="/register" className="font-semibold text-primary-600 hover:underline">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
