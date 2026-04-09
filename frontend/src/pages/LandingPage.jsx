import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Brain, Cloud, MapPin, MessageCircle, Shield, Sparkles, Zap } from 'lucide-react'

import AeroMindLogo from '../components/branding/AeroMindLogo'
import { useAuth } from '../context/AuthContext'

const featureCards = [
  { icon: Brain, title: 'AI Routing', desc: 'Trip creation, budgeting, and assistant flows feel connected instead of fragmented.' },
  { icon: Cloud, title: 'Weather Sense', desc: 'Trips adapt to forecast, risk level, and safer timing suggestions.' },
  { icon: Zap, title: 'Budget Clarity', desc: 'Localized currency, transport, stay, and activity cost guidance in one place.' },
  { icon: Shield, title: 'Safer Trips', desc: 'Risk alerts help travelers avoid avoidable problems before departure.' },
  { icon: MessageCircle, title: 'Travel Assistant', desc: 'Ask for ideas, refinements, and planning help from a central assistant flow.' },
  { icon: MapPin, title: 'Real Place Context', desc: 'Origin and destination planning stay grounded in real route and location data.' },
]

const promptExamples = [
  'Plan a 5-day Japan food trip under 180000 JPY',
  'Need a monsoon-friendly Kerala itinerary for 3 days',
  'Find a family Dubai plan with indoor options and packing help',
]

export default function LandingPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [assistantPrompt, setAssistantPrompt] = useState('')
  const isAuthenticated = Boolean(user)
  const firstName = user?.name?.split(' ')?.[0] || 'Traveler'

  const launchAssistant = (promptOverride = '') => {
    const prompt = (promptOverride || assistantPrompt).trim()
    if (isAuthenticated) {
      navigate('/assistant', { state: prompt ? { prompt } : undefined })
      return
    }
    navigate('/login', { state: prompt ? { prompt } : undefined })
  }

  return (
    <div className="bg-white text-slate-900 dark:bg-gray-950 dark:text-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.95),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(103,232,249,0.30),transparent_26%),linear-gradient(180deg,#f9fbff_0%,#eef5ff_45%,#f5f8fc_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_24%),linear-gradient(180deg,#06111f_0%,#0b1727_45%,#111827_100%)]" />
        <div className="absolute left-10 top-28 h-36 w-36 rounded-full border border-white/40 bg-white/15 backdrop-blur-md dark:border-white/10 dark:bg-white/5" />
        <div className="absolute bottom-12 right-12 h-24 w-24 rounded-full border border-white/40 bg-white/20 backdrop-blur-md dark:border-white/10 dark:bg-white/5" />
        <div className="absolute left-0 top-0 h-full w-full bg-[linear-gradient(115deg,rgba(255,255,255,0.6)_0%,transparent_30%,transparent_70%,rgba(186,230,253,0.35)_100%)] dark:bg-[linear-gradient(115deg,rgba(255,255,255,0.04)_0%,transparent_34%,transparent_72%,rgba(34,211,238,0.08)_100%)]" />

        <div className="relative mx-auto min-h-[calc(100vh-3.5rem)] max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">

          <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center text-center">
            <div className="inline-flex items-center gap-3 rounded-full border border-sky-200/80 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
              <Sparkles className="h-4 w-4 text-sky-600 dark:text-cyan-300" />
              AI travel assistant for planning, budgeting, and weather-aware trips
            </div>

            <div className="mt-8 flex items-center justify-center gap-4">
              <AeroMindLogo className="h-14 w-14 sm:h-16 sm:w-16" withWordmark={false} />
              <h1 className="font-['Space_Grotesk'] text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                AI Travel Agent
              </h1>
            </div>

            <div className="mt-8 max-w-6xl">
              <h2 className="text-5xl font-medium leading-[1.06] tracking-tight text-slate-400 dark:text-slate-300 sm:text-6xl lg:text-7xl">
                Our AI Travel Assistant Helps You Build
                <span className="block bg-gradient-to-r from-slate-900 via-sky-700 to-cyan-500 bg-clip-text text-transparent dark:from-white dark:via-cyan-200 dark:to-emerald-300">
                  Smarter Trips, Faster.
                </span>
              </h2>
            </div>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-500 dark:text-slate-300">
              Start with one prompt. AI Travel Agent turns it into itinerary ideas, budgets, packing lists, risk alerts, and a trip flow that feels ready to use.
            </p>

            <div className="mt-10 w-full max-w-5xl rounded-[1.7rem] border border-sky-200 bg-white/88 p-3 shadow-[0_24px_80px_rgba(148,163,184,0.28)] backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:shadow-[0_24px_80px_rgba(15,23,42,0.42)]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <textarea
                  rows={2}
                  className="min-h-[82px] flex-1 resize-none rounded-[1.15rem] border border-transparent bg-transparent px-4 py-3 text-left text-lg text-slate-900 placeholder:text-slate-400 focus:border-sky-200 focus:outline-none dark:text-white dark:placeholder:text-slate-400 dark:focus:border-white/10"
                  placeholder="Direct flights from London to Dubai, departing December 20th. Or ask for a trip plan, budget, rain-safe itinerary, or packing list."
                  value={assistantPrompt}
                  onChange={(event) => setAssistantPrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      launchAssistant()
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => launchAssistant()}
                  className="inline-flex h-14 w-14 shrink-0 items-center justify-center self-end rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg transition hover:from-sky-600 hover:to-cyan-600"
                >
                  <ArrowUpRight className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-2 flex flex-wrap gap-2 px-2 text-left">
                {promptExamples.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => {
                      setAssistantPrompt(example)
                      launchAssistant(example)
                    }}
                    className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-cyan-200"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            {!loading && (
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                {isAuthenticated ? (
                  <>
                    <Link to="/dashboard" className="rounded-2xl bg-slate-900 px-6 py-4 text-base font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                      Open Dashboard
                    </Link>
                    <Link to="/plan" className="rounded-2xl border border-slate-200 bg-white/80 px-6 py-4 text-base font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
                      Build Structured Trip
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/register" className="rounded-2xl bg-slate-900 px-6 py-4 text-base font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                      Start Planning Free
                    </Link>
                    <button
                      type="button"
                      onClick={() => launchAssistant()}
                      className="rounded-2xl border border-slate-200 bg-white/80 px-6 py-4 text-base font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                    >
                      Try Assistant
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700 dark:text-cyan-300">
                Why It Works
              </p>
              <h3 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
                One assistant, multiple planning layers
              </h3>
            </div>
            <p className="max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
              The homepage now leads with the assistant experience first, then explains the planning stack underneath it.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {featureCards.map((feature) => (
              <div key={feature.title} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-gray-800 dark:bg-gray-950/80">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-emerald-100 text-sky-700 dark:from-sky-950/60 dark:to-emerald-950/40 dark:text-cyan-300">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h4 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">{feature.title}</h4>
                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        {!loading && (
          isAuthenticated ? (
            <div className="rounded-[2rem] border border-sky-200 bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-500 p-10 text-white shadow-[0_24px_70px_rgba(14,165,233,0.22)] dark:border-white/10">
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-100">Welcome Back</p>
              <h3 className="mt-3 text-3xl font-bold sm:text-4xl">Continue planning, {firstName}</h3>
              <p className="mt-4 max-w-2xl text-lg text-cyan-50">
                Pick up where you left off, refine a trip, or ask the assistant for the next step.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link to="/dashboard" className="rounded-2xl bg-white px-6 py-4 text-base font-semibold text-sky-700 transition hover:bg-sky-50">
                  Open Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => navigate('/assistant')}
                  className="rounded-2xl border border-white/25 bg-white/10 px-6 py-4 text-base font-semibold text-white transition hover:bg-white/15"
                >
                  Ask Travel Assistant
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-r from-slate-900 via-sky-900 to-cyan-800 p-10 text-white shadow-[0_24px_70px_rgba(15,23,42,0.25)] dark:border-white/10">
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Get Started</p>
              <h3 className="mt-3 text-3xl font-bold sm:text-4xl">Turn your next trip idea into a travel-ready plan</h3>
              <p className="mt-4 max-w-2xl text-lg text-slate-200">
                The assistant can start the conversation, and the planner can carry it through to a real itinerary.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link to="/register" className="rounded-2xl bg-white px-6 py-4 text-base font-semibold text-slate-900 transition hover:bg-slate-100">
                  Create Free Account
                </Link>
                <Link to="/login" className="rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-base font-semibold text-white transition hover:bg-white/15">
                  Sign In
                </Link>
              </div>
            </div>
          )
        )}
      </section>

      <footer className="border-t border-gray-200 py-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
        <div className="mb-2 flex items-center justify-center">
          <AeroMindLogo className="h-8 w-8" />
        </div>
        <p>© {new Date().getFullYear()} AI Travel Agent. Built with FastAPI, React, MongoDB, Gemini, and Ollama.</p>
      </footer>
    </div>
  )
}
