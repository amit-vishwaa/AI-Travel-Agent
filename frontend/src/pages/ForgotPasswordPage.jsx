import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

import AeroMindLogo from '../components/branding/AeroMindLogo'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function ForgotPasswordPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', confirm: '' })
  const [showPasswords, setShowPasswords] = useState(false)
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
      const res = await api.post('/auth/forgot-password', {
        email: form.email,
        new_password: form.password,
      })
      toast.success(res.data?.message || 'Password updated successfully')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Unable to update password right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-shell flex items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="hidden rounded-[2rem] border border-white/60 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-10 text-white shadow-[0_24px_80px_rgba(249,115,22,0.25)] dark:border-slate-700/70 dark:from-slate-900 dark:via-orange-950 dark:to-slate-900 dark:shadow-[0_24px_80px_rgba(0,0,0,0.3)] lg:block">
          <AeroMindLogo className="h-14 w-14" withWordmark={false} />
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.3em] text-orange-100">Password Reset</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight">Set a fresh password and get back to planning.</h1>
          <p className="mt-4 text-lg leading-8 text-orange-50">
            Enter the email tied to your account, choose a new password, and head back into your itinerary workspace.
          </p>
        </div>

        <div className="glass-panel w-full max-w-xl justify-self-center">
          <div className="mb-8 flex flex-col items-center text-center">
            <AeroMindLogo className="h-16 w-16" />
            <h1 className="mt-5 text-3xl font-bold text-slate-900 dark:text-white">Forgot Password</h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">Choose a new password for your account</p>
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
              <label className="label">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPasswords ? 'text' : 'password'}
                  className="input-field pl-10 pr-10"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPasswords ? 'text' : 'password'}
                  className="input-field pl-10"
                  placeholder="Re-enter your new password"
                  value={form.confirm}
                  onChange={e => setForm({ ...form, confirm: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Updating password...' : 'Reset Password'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Remembered it?{' '}
            <Link to="/login" className="font-semibold text-primary-600 hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
