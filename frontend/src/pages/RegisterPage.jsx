import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react'
import toast from 'react-hot-toast'

import AeroMindLogo from '../components/branding/AeroMindLogo'
import { useAuth } from '../context/AuthContext'
import { stashAssistantPrompt, takeAssistantPrompt } from '../utils/assistant'

export default function RegisterPage() {
  const { user, loading: authLoading, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!authLoading && user) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await register(form.name, form.email, form.password)
      toast.success('Account created!')
      const prompt = location.state?.prompt || takeAssistantPrompt()
      const from = location.state?.from
      if (prompt) {
        stashAssistantPrompt(prompt)
        navigate('/assistant', { replace: true, state: { prompt } })
        return
      }
      if (from?.pathname && from.pathname !== '/register') {
        navigate(from.pathname + (from.search || ''), { replace: true, state: from.state })
        return
      }
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-shell flex items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="hidden rounded-[2rem] border border-white/60 bg-gradient-to-br from-slate-900 via-sky-900 to-cyan-700 p-10 text-white shadow-[0_24px_80px_rgba(15,23,42,0.26)] dark:border-slate-700/70 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950 dark:shadow-[0_24px_80px_rgba(0,0,0,0.3)] lg:block">
          <AeroMindLogo className="h-14 w-14" withWordmark={false} />
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200">Create Account</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight">Start building trips that feel product-ready.</h1>
          <p className="mt-4 text-lg leading-8 text-slate-200">
            Create an account to generate itineraries, smart packing lists, budgets, PDFs, and weather-aware alerts from one travel workspace.
          </p>
        </div>

        <div className="glass-panel w-full max-w-xl justify-self-center">
          <div className="mb-8 flex flex-col items-center text-center">
            <Link to="/" className="mb-2 text-sm font-semibold text-sky-700 hover:underline dark:text-cyan-300">
              Back to home
            </Link>
            <AeroMindLogo className="h-16 w-16" />
            <h1 className="mt-5 text-3xl font-bold text-slate-900 dark:text-white">Create Your Account</h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">Start planning multi-AI trips for free</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  className="input-field pl-10"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  minLength={2}
                />
              </div>
            </div>

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
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="input-field pl-10 pr-10"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  className="input-field pl-10"
                  placeholder="Re-enter password"
                  value={form.confirm}
                  onChange={e => setForm({ ...form, confirm: e.target.value })}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
