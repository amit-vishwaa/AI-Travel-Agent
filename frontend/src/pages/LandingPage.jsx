import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  Brain,
  Calendar,
  Cloud,
  Compass,
  Download,
  Globe2,
  MapPin,
  MessageCircle,
  Share2,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react'

import AeroMindLogo from '../components/branding/AeroMindLogo'
import { useAuth } from '../context/AuthContext'
import { stashAssistantPrompt } from '../utils/assistant'

const featureCards = [
  {
    icon: Brain,
    title: 'Multi-Model AI Planning',
    desc: 'Powered by Google Gemini and local LLM routing for smart, context-aware day-by-day itineraries.',
  },
  {
    icon: Cloud,
    title: 'Live Weather Intelligence',
    desc: 'Forecasts integrated into every day of your itinerary with real-time seasonal and rain advisories.',
  },
  {
    icon: Zap,
    title: 'Dynamic Budget Optimization',
    desc: 'Detailed cost breakdown for accommodation, transport, dining, and activities in your local currency.',
  },
  {
    icon: Calendar,
    title: 'iCal & PDF Sync',
    desc: 'Export to Google Calendar, Apple Calendar, and Outlook (.ics) or download clean PDF itineraries in 1-click.',
  },
  {
    icon: Share2,
    title: 'Instant Public Sharing',
    desc: 'Share interactive trip itineraries with friends, family, or travel groups without requiring any login.',
  },
  {
    icon: Shield,
    title: 'Smart Safety Alerts',
    desc: 'Pre-departure alerts, emergency helpline numbers, and local cultural etiquette for safe travels.',
  },
]

const destinationShowcase = [
  {
    name: 'Tokyo, Japan',
    image: '🇯🇵',
    theme: 'Culture & High-Tech',
    duration: '6 Days',
    budget: '$1,800',
    prompt: 'Plan a 6-day cultural and foodie itinerary in Tokyo with day trips and authentic ramen shops',
  },
  {
    name: 'Bali, Indonesia',
    image: '🇮🇩',
    theme: 'Tropical Wellness & Beaches',
    duration: '5 Days',
    budget: '$1,200',
    prompt: 'Create a 5-day relaxing Bali trip with temple visits, beach clubs, and scenic waterfalls',
  },
  {
    name: 'Rome & Amalfi, Italy',
    image: '🇮🇹',
    theme: 'Historic Romance & Cuisine',
    duration: '5 Days',
    budget: '$1,600',
    prompt: 'Plan a 5-day historic Italian getaway to Rome with Vatican museum and authentic trattorias',
  },
  {
    name: 'Dubai, UAE',
    image: '🇦🇪',
    theme: 'Modern Architecture & Desert',
    duration: '4 Days',
    budget: '$2,100',
    prompt: 'Design a 4-day luxury trip to Dubai with Burj Khalifa, desert safari, and marina yacht cruise',
  },
  {
    name: 'Swiss Alps, Switzerland',
    image: '🇨🇭',
    theme: 'Alpine Scenic Adventure',
    duration: '5 Days',
    budget: '$2,400',
    prompt: 'Plan a 5-day scenic train and hiking adventure in Interlaken and Swiss Alps',
  },
  {
    name: 'Paris, France',
    image: '🇫🇷',
    theme: 'Art, Cafes & Architecture',
    duration: '4 Days',
    budget: '$1,500',
    prompt: 'Create a 4-day romantic Paris itinerary featuring museums, Seine cruises, and Parisian bistros',
  },
]

const promptExamples = [
  'Plan a 5-day Japan food trip under 180000 JPY',
  'Need a monsoon-friendly Kerala itinerary for 3 days',
  'Find a family Dubai plan with indoor options and packing help',
  'A romantic 4-day getaway in Paris under $1500',
]

export default function LandingPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [assistantPrompt, setAssistantPrompt] = useState('')
  const isAuthenticated = Boolean(user)
  const firstName = user?.name?.split(' ')?.[0] || 'Traveler'

  const launchAssistant = (promptOverride = '') => {
    const prompt = (promptOverride || assistantPrompt).trim()
    if (prompt) stashAssistantPrompt(prompt)
    if (isAuthenticated) {
      navigate('/assistant', { state: prompt ? { prompt } : undefined })
      return
    }
    navigate('/login', { state: prompt ? { prompt } : undefined })
  }

  const planDestination = (destination) => {
    if (destination.prompt) stashAssistantPrompt(destination.prompt)
    if (isAuthenticated) {
      navigate('/plan')
    } else {
      navigate('/register')
    }
  }

  return (
    <div className="bg-white text-slate-900 dark:bg-gray-950 dark:text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.95),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(103,232,249,0.30),transparent_26%),linear-gradient(180deg,#f9fbff_0%,#eef5ff_45%,#f5f8fc_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_24%),linear-gradient(180deg,#06111f_0%,#0b1727_45%,#111827_100%)]" />
        <div className="absolute left-10 top-28 h-36 w-36 rounded-full border border-white/40 bg-white/15 backdrop-blur-md dark:border-white/10 dark:bg-white/5" />
        <div className="absolute bottom-12 right-12 h-24 w-24 rounded-full border border-white/40 bg-white/20 backdrop-blur-md dark:border-white/10 dark:bg-white/5" />

        <div className="relative mx-auto min-h-[calc(100vh-3.5rem)] max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
          <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center py-10 text-center sm:py-14">
            <div className="inline-flex items-center gap-3 rounded-full border border-sky-200/80 bg-white/80 px-4 py-2 text-xs font-semibold tracking-wide text-slate-600 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/10 dark:text-slate-200 sm:text-sm">
              <Sparkles className="h-4 w-4 text-sky-600 dark:text-cyan-300" />
              100% Free AI Travel Copilot & Itinerary Architect
            </div>

            <div className="mt-8 flex items-center justify-center gap-4">
              <AeroMindLogo className="h-14 w-14 sm:h-16 sm:w-16" withWordmark={false} />
              <h1 className="font-['Space_Grotesk'] text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                AI Travel Agent
              </h1>
            </div>

            <div className="mt-8 max-w-5xl">
              <h2 className="text-4xl font-semibold leading-[1.04] tracking-[-0.045em] text-slate-800 dark:text-slate-100 sm:text-6xl lg:text-[4.75rem]">
                Smart itineraries.
                <span className="block bg-gradient-to-r from-slate-900 via-sky-700 to-cyan-500 bg-clip-text text-transparent dark:from-white dark:via-cyan-200 dark:to-emerald-300">
                  Zero planning headache.
                </span>
              </h2>
            </div>

            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-500 dark:text-slate-300 sm:text-lg sm:leading-8">
              Tell us your destination and style. Get custom day-by-day itineraries, live weather advisories, interactive checklists, and instant calendar export — completely free.
            </p>

            {/* AI Assistant Quick Prompt Box */}
            <div className="mt-9 w-full max-w-4xl rounded-[1.7rem] border border-sky-200/80 bg-white/90 p-3 shadow-[0_28px_90px_rgba(56,128,185,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/55 dark:shadow-[0_28px_90px_rgba(15,23,42,0.42)] sm:p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <textarea
                  rows={2}
                  className="min-h-[82px] flex-1 resize-none rounded-[1.15rem] border border-transparent bg-transparent px-4 py-3 text-left text-lg text-slate-900 placeholder:text-slate-400 focus:border-sky-200 focus:outline-none dark:text-white dark:placeholder:text-slate-400 dark:focus:border-white/10"
                  placeholder="A romantic week in Kyoto, a budget trip to Bali, or a family holiday in Dubai..."
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
                  aria-label="Send trip idea"
                  className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 self-end rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:bg-sky-800 sm:h-14 sm:w-14 sm:rounded-full dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
                >
                  <ArrowUpRight className="h-5 w-5" />
                  <span className="sm:hidden">Start planning</span>
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
                    className="rounded-full border border-slate-200/80 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 sm:text-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-cyan-200"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Action CTA */}
            {!loading && (
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                {isAuthenticated ? (
                  <>
                    <Link to="/dashboard" className="rounded-2xl bg-slate-900 px-6 py-4 text-base font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                      Open Dashboard
                    </Link>
                    <Link to="/plan" className="rounded-2xl border border-slate-200 bg-white/80 px-6 py-4 text-base font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
                      Plan New Trip
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
                      Try AI Assistant
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Popular Trending Destinations Section */}
      <section className="border-t border-slate-100 bg-slate-50/60 py-20 dark:border-gray-800 dark:bg-gray-900/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 text-center sm:text-left md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-600 dark:text-cyan-400">
                Trending Destinations
              </p>
              <h3 className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
                Ready-to-Explore Getaways
              </h3>
            </div>
            <Link
              to="/plan"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-600 hover:text-sky-700 dark:text-cyan-400"
            >
              Explore all destinations <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {destinationShowcase.map((dest) => (
              <div
                key={dest.name}
                className="group relative flex flex-col justify-between overflow-hidden rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-800 dark:bg-gray-950"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{dest.image}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      {dest.duration}
                    </span>
                  </div>
                  <h4 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
                    {dest.name}
                  </h4>
                  <p className="mt-1 text-xs font-medium text-sky-600 dark:text-cyan-400">
                    {dest.theme}
                  </p>
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    Estimated avg budget: <span className="font-semibold text-slate-800 dark:text-slate-200">{dest.budget}</span>
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => planDestination(dest)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white transition hover:bg-sky-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    Plan This Trip <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-20 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-700 dark:text-cyan-300">
              Complete Travel Suite
            </p>
            <h3 className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
              Everything you need for an unforgettable journey
            </h3>
            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 dark:text-slate-300">
              From intelligent route generation to live calendar sync, take complete control of your itinerary.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {featureCards.map((feature) => (
              <div
                key={feature.title}
                className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900/60"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-emerald-100 text-sky-700 dark:from-sky-950/60 dark:to-emerald-950/40 dark:text-cyan-300">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h4 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">{feature.title}</h4>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call To Action Banner */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {!loading && (
          isAuthenticated ? (
            <div className="rounded-[2.5rem] border border-sky-200 bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-500 p-10 text-white shadow-xl dark:border-slate-700/70 dark:from-slate-900 dark:via-cyan-950 dark:to-slate-900">
              <p className="text-xs uppercase font-bold tracking-[0.24em] text-cyan-100">Welcome Back</p>
              <h3 className="mt-3 text-3xl font-extrabold sm:text-4xl">Continue your adventures, {firstName}</h3>
              <p className="mt-3 max-w-2xl text-base text-cyan-50">
                Open your saved plans, generate calendars, or ask your AI copilot for ideas.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link to="/dashboard" className="rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-sky-700 transition hover:bg-sky-50 dark:bg-cyan-300 dark:text-slate-950">
                  Open Dashboard
                </Link>
                <Link to="/plan" className="rounded-2xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/20">
                  Plan Another Trip
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-[2.5rem] border border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950 p-10 text-white shadow-xl dark:border-slate-800">
              <p className="text-xs uppercase font-bold tracking-[0.24em] text-cyan-300">100% Free Forever</p>
              <h3 className="mt-3 text-3xl font-extrabold sm:text-4xl">Ready to plan your dream escape?</h3>
              <p className="mt-3 max-w-2xl text-base text-slate-300">
                Join travelers worldwide using AI Travel Agent to turn travel dreams into realistic, budget-friendly itineraries.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link to="/register" className="rounded-2xl bg-white px-7 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-slate-100">
                  Create Free Account
                </Link>
                <Link to="/login" className="rounded-2xl border border-white/20 bg-white/10 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-white/20">
                  Sign In
                </Link>
              </div>
            </div>
          )
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
        <div className="mb-3 flex items-center justify-center">
          <AeroMindLogo className="h-8 w-8" />
        </div>
        <p className="font-semibold text-slate-700 dark:text-slate-300">AI Travel Agent</p>
        <p className="mt-1 text-xs">Production-Grade Travel Planning • Zero Cost Deployment Ready</p>
      </footer>
    </div>
  )
}
