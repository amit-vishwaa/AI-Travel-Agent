import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

import AeroMindLogo from '../components/branding/AeroMindLogo'
import GoogleSignInButton from '../components/common/GoogleSignInButton'
import { getAuthErrorMessage, useAuth } from '../context/AuthContext'
import { stashAssistantPrompt, takeAssistantPrompt } from '../utils/assistant'

export default function LoginPage() {
  const { user, loading: authLoading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('saved_travel_email')
      if (savedEmail) {
        setForm(prev => ({ ...prev, email: savedEmail }))
      }
    } catch {
      // ignore storage errors
    }
  }, [])

  if (!authLoading && user) {
    return <Navigate to="/dashboard" replace />
  }

  const handlePostAuthRedirect = () => {
    const from = location.state?.from
    if (from?.pathname && !['/login', '/register', '/'].includes(from.pathname)) {
      navigate(from.pathname + (from.search || ''), { replace: true, state: from.state })
      return
    }
    navigate('/dashboard', { replace: true })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const cleanEmail = form.email.trim().toLowerCase()

    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    if (!form.password) {
      toast.error('Please enter your password')
      return
    }

    setLoading(true)
    try {
      await login(cleanEmail, form.password)
      if (rememberMe) {
        try {
          localStorage.setItem('saved_travel_email', cleanEmail)
        } catch {}
      } else {
        try {
          localStorage.removeItem('saved_travel_email')
        } catch {}
      }
      toast.success('Welcome back!')
      handlePostAuthRedirect()
    } catch (err) {
      const errorMessage = getAuthErrorMessage(err, 'Login failed. Please verify your credentials.')
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-shell flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        {/* Left Side: Visual Hero */}
        <div className="hidden flex-col justify-between rounded-[2.5rem] border border-white/60 bg-gradient-to-br from-slate-950 via-sky-950 to-cyan-900 p-10 text-white shadow-2xl dark:border-slate-800 lg:flex">
          <div>
            <div className="flex items-center gap-3">
              <AeroMindLogo className="h-12 w-12" withWordmark={false} />
              <span className="font-['Space_Grotesk'] text-xl font-bold tracking-tight">AI Travel Agent</span>
            </div>

            <div className="mt-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-200">
                <Sparkles className="h-3.5 w-3.5" /> Welcome Back
              </span>
              <h1 className="mt-4 text-4xl font-extrabold leading-tight">
                Resume your journey planning anytime.
              </h1>
              <p className="mt-4 text-base leading-relaxed text-slate-300">
                Access your saved trips, synced calendars, live flight comparison routes, and tailored budget plans in one protected workspace.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Secure 256-Bit Protected Sessions
            </div>
            <p className="mt-1 text-xs text-slate-300">
              JSON Web Tokens ensure your travel plans and account data remain completely private and encrypted.
            </p>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="glass-panel w-full max-w-xl justify-self-center p-8 sm:p-10">
          <div className="mb-6 flex flex-col items-center text-center">
            <Link to="/" className="mb-2 text-xs font-bold uppercase tracking-wider text-sky-700 hover:underline dark:text-cyan-300">
              ← Back to Home
            </Link>
            <div className="lg:hidden">
              <AeroMindLogo className="h-12 w-12" />
            </div>
            <h1 className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
              Sign In to Your Account
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              Enter your details or continue with Google
            </p>
          </div>

          {/* Google Sign In Integration */}
          <div className="space-y-4">
            <GoogleSignInButton
              onSuccess={handlePostAuthRedirect}
              text="Continue with Google"
            />

            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              <span className="absolute bg-white px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:bg-slate-900 dark:text-slate-500">
                Or sign in with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  className="input-field pl-10"
                  placeholder="name@example.com"
                  autoComplete="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="label mb-0">Password</label>
                <Link to="/forgot-password" className="text-xs font-semibold text-sky-700 hover:underline dark:text-cyan-300">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="input-field pl-10 pr-10"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-900"
                />
                <span className="text-xs text-slate-600 dark:text-slate-400">Remember email</span>
              </label>
            </div>

            <button
              type="submit"
              className="btn-primary mt-2 w-full py-3.5 text-sm font-bold shadow-lg"
              disabled={loading}
            >
              {loading ? 'Verifying credentials...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Do not have an account yet?{' '}
            <Link to="/register" className="font-bold text-sky-700 hover:underline dark:text-cyan-300">
              Create one free
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
