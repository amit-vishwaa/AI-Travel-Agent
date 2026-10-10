import { useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'

import AeroMindLogo from '../components/branding/AeroMindLogo'
import GoogleSignInButton from '../components/common/GoogleSignInButton'
import { getAuthErrorMessage, useAuth } from '../context/AuthContext'
import { stashAssistantPrompt, takeAssistantPrompt } from '../utils/assistant'

function calculatePasswordStrength(password) {
  if (!password) return { score: 0, label: 'Too short', color: 'bg-slate-200' }
  let score = 0
  if (password.length >= 8) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  switch (score) {
    case 1:
      return { score: 1, label: 'Weak', color: 'bg-rose-500', textTone: 'text-rose-500' }
    case 2:
      return { score: 2, label: 'Fair', color: 'bg-amber-500', textTone: 'text-amber-500' }
    case 3:
      return { score: 3, label: 'Good', color: 'bg-sky-500', textTone: 'text-sky-500' }
    case 4:
      return { score: 4, label: 'Strong', color: 'bg-emerald-500', textTone: 'text-emerald-500' }
    default:
      return { score: 0, label: 'Weak', color: 'bg-rose-400', textTone: 'text-rose-400' }
  }
}

export default function RegisterPage() {
  const { user, loading: authLoading, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(true)

  if (!authLoading && user) {
    return <Navigate to="/dashboard" replace />
  }

  const strength = useMemo(() => calculatePasswordStrength(form.password), [form.password])
  const passwordsMatch = form.confirm.length > 0 && form.password === form.confirm
  const passwordsMismatch = form.confirm.length > 0 && form.password !== form.confirm

  const handlePostAuthRedirect = () => {
    navigate('/dashboard', { replace: true })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const cleanName = form.name.trim()
    const cleanEmail = form.email.trim().toLowerCase()

    if (cleanName.length < 2) {
      toast.error('Please enter your full name (at least 2 characters)')
      return
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }

    if (form.password !== form.confirm) {
      toast.error('Passwords do not match. Please verify both fields.')
      return
    }

    if (!termsAccepted) {
      toast.error('Please agree to the Terms of Service to create an account')
      return
    }

    setLoading(true)
    try {
      await register(cleanName, cleanEmail, form.password)
      toast.success('Account created successfully! Welcome aboard.')
      handlePostAuthRedirect()
    } catch (err) {
      const errorMessage = getAuthErrorMessage(err, 'Registration failed. Please try again.')
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-shell flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        {/* Left Side: Modern Visual Travel Brand Hero */}
        <div className="hidden flex-col justify-between rounded-[2.5rem] border border-white/60 bg-gradient-to-br from-slate-950 via-sky-950 to-cyan-900 p-10 text-white shadow-2xl dark:border-slate-800 lg:flex">
          <div>
            <div className="flex items-center gap-3">
              <AeroMindLogo className="h-12 w-12" withWordmark={false} />
              <span className="font-['Space_Grotesk'] text-xl font-bold tracking-tight">AI Travel Agent</span>
            </div>

            <div className="mt-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-200">
                <Sparkles className="h-3.5 w-3.5" /> Start Exploring Free
              </span>
              <h1 className="mt-4 text-4xl font-extrabold leading-tight">
                Your personal travel architect awaits.
              </h1>
              <p className="mt-4 text-base leading-relaxed text-slate-300">
                Join thousands of travelers creating intelligent day-by-day itineraries, live weather alerts, smart packing checklists, and 1-click Google Calendar sync.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="mt-8 space-y-3.5 border-t border-white/10 pt-6">
              {[
                'Multi-model AI routing with Gemini intelligence',
                'Live weather forecasts and seasonal risk alerts',
                'Instant calendar export (.ics) & PDF itinerary generator',
                'Zero-cost public trip sharing with friends and family',
              ].map((feat, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm text-cyan-50">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Bank-Grade Security & Privacy
            </div>
            <p className="mt-1 text-xs text-slate-300">
              Your passwords are cryptographically salted and hashed. We never sell your personal travel preferences.
            </p>
          </div>
        </div>

        {/* Right Side: Security-Hardened Registration Form */}
        <div className="glass-panel w-full max-w-xl justify-self-center p-8 sm:p-10">
          <div className="mb-6 flex flex-col items-center text-center">
            <Link to="/" className="mb-2 text-xs font-bold uppercase tracking-wider text-sky-700 hover:underline dark:text-cyan-300">
              ← Back to Home
            </Link>
            <div className="lg:hidden">
              <AeroMindLogo className="h-12 w-12" />
            </div>
            <h1 className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">
              Create Your Free Account
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              Plan, budget, and share custom journeys in seconds
            </p>
          </div>

          {/* Google Sign In Integration */}
          <div className="space-y-4">
            <GoogleSignInButton
              onSuccess={handlePostAuthRedirect}
              text="Sign up with Google"
            />

            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              <span className="absolute bg-white px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:bg-slate-900 dark:text-slate-500">
                Or register with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Full Name */}
            <div>
              <label className="label">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  className="input-field pl-10"
                  placeholder="e.g. Amit Sharma"
                  autoComplete="name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  minLength={2}
                />
              </div>
            </div>

            {/* Email Address */}
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

            {/* Password */}
            <div>
              <label className="label">Create Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="input-field pl-10 pr-10"
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
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

              {/* Password Strength Indicator */}
              {form.password.length > 0 && (
                <div className="mt-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-500 dark:text-slate-400">Password strength:</span>
                    <span className={strength.textTone}>{strength.label}</span>
                  </div>
                  <div className="flex h-1.5 w-full gap-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    {[1, 2, 3, 4].map(idx => (
                      <div
                        key={idx}
                        className={`h-full flex-1 rounded-full transition-all duration-300 ${
                          strength.score >= idx ? strength.color : 'bg-transparent'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Requirements checklist */}
                  <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className={form.password.length >= 8 ? 'text-emerald-600 font-medium' : ''}>
                      ✓ 8+ characters
                    </span>
                    <span className={/\d/.test(form.password) ? 'text-emerald-600 font-medium' : ''}>
                      ✓ Numbers included
                    </span>
                    <span className={/[A-Z]/.test(form.password) && /[a-z]/.test(form.password) ? 'text-emerald-600 font-medium' : ''}>
                      ✓ Upper & lower case
                    </span>
                    <span className={/[^A-Za-z0-9]/.test(form.password) ? 'text-emerald-600 font-medium' : ''}>
                      ✓ Special character
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <div className="flex items-center justify-between">
                <label className="label mb-1">Confirm Password</label>
                {passwordsMatch && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Passwords match
                  </span>
                )}
                {passwordsMismatch && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-rose-500">
                    <X className="h-3.5 w-3.5" /> Passwords do not match
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type={showConfirmPwd ? 'text' : 'password'}
                  className={`input-field pl-10 pr-10 ${
                    passwordsMismatch ? 'border-rose-300 focus:ring-rose-400' : ''
                  }`}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  value={form.confirm}
                  onChange={e => setForm({ ...form, confirm: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                  aria-label={showConfirmPwd ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showConfirmPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Terms Agreement Checkbox */}
            <div className="flex items-start gap-2.5 pt-1">
              <input
                id="terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={e => setTermsAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-900"
              />
              <label htmlFor="terms" className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                I agree to the Terms of Service and Privacy Policy. All travel data is securely encrypted.
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-primary mt-2 w-full py-3.5 text-sm font-bold shadow-lg"
              disabled={loading}
            >
              {loading ? 'Creating secure account...' : 'Create Free Account'}
            </button>
          </form>

          {/* Link to Login */}
          <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-sky-700 hover:underline dark:text-cyan-300">
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
