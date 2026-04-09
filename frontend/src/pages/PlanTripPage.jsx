import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, MapPinned, Plane, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'

import { useTheme } from '../context/ThemeContext'
import { useTravelSettings } from '../context/TravelSettingsContext'
import { routeService, tripService } from '../services/tripService'

const travelStyles = ['budget', 'balanced', 'luxury']
const currencyOptions = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'JPY', 'AUD', 'CAD', 'SGD']
const interestOptions = ['History & Culture', 'Adventure & Sports', 'Food & Cuisine', 'Nature & Wildlife', 'Art & Museums', 'Beaches', 'Nightlife', 'Shopping', 'Photography', 'Spirituality']
const budgetRanges = {
  INR: { min: 15000, max: 600000, step: 5000, presets: [40000, 90000, 180000] },
  USD: { min: 300, max: 12000, step: 100, presets: [1200, 2800, 5200] },
  EUR: { min: 300, max: 10000, step: 100, presets: [1000, 2400, 4500] },
  GBP: { min: 250, max: 9000, step: 100, presets: [900, 2100, 3800] },
  AED: { min: 1200, max: 45000, step: 250, presets: [3500, 9000, 18000] },
  JPY: { min: 45000, max: 1500000, step: 5000, presets: [160000, 320000, 620000] },
  AUD: { min: 500, max: 15000, step: 100, presets: [1500, 3400, 6200] },
  CAD: { min: 500, max: 15000, step: 100, presets: [1600, 3500, 6500] },
  SGD: { min: 450, max: 14000, step: 100, presets: [1400, 3000, 5600] },
}
const DEFAULT_PLANNING_GUIDANCE = 'Prefer real named places, local highlights, and weather-aware timing where practical.'

function buildSpecialRequirements(base) {
  const note = String(base || '').trim()
  return note ? `${note}\n\n${DEFAULT_PLANNING_GUIDANCE}` : DEFAULT_PLANNING_GUIDANCE
}

function moneyPreview(amount, currency) {
  const value = Number(amount)
  if (!value) return `0 ${currency}`
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
  } catch {
    return `${value} ${currency}`
  }
}

function inputClass(isDark) {
  return isDark
    ? 'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30'
    : 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20'
}

function SummaryStat({ label, value, isDark }) {
  return (
    <div className={isDark ? 'rounded-2xl border border-white/10 bg-white/5 p-4' : 'rounded-2xl border border-slate-200 bg-slate-50 p-4'}>
      <p className={isDark ? 'text-xs font-medium uppercase tracking-[0.2em] text-slate-400' : 'text-xs font-medium uppercase tracking-[0.2em] text-slate-500'}>
        {label}
      </p>
      <p className={isDark ? 'mt-2 text-lg font-semibold text-white' : 'mt-2 text-lg font-semibold text-slate-900'}>
        {value}
      </p>
    </div>
  )
}

export default function PlanTripPage() {
  const navigate = useNavigate()
  const { isDark } = useTheme()
  const { selectedCountry, currency: selectedCurrency, setCurrency } = useTravelSettings()
  const [loading, setLoading] = useState(false)
  const [originSuggestions, setOriginSuggestions] = useState([])
  const [destinationSuggestions, setDestinationSuggestions] = useState([])
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false)
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false)
  const originBoxRef = useRef(null)
  const destinationBoxRef = useRef(null)
  const originCacheRef = useRef(new Map())
  const destinationCacheRef = useRef(new Map())
  const originRequestRef = useRef(0)
  const destinationRequestRef = useRef(0)
  const [form, setForm] = useState({
    origin: '',
    destination: '',
    start_date: '',
    end_date: '',
    budget: '',
    currency: selectedCurrency,
    travelers: 1,
    travel_style: 'balanced',
    interests: ['Food & Cuisine', 'History & Culture'],
    special_requirements: '',
  })

  useEffect(() => {
    setForm(prev => ({ ...prev, currency: selectedCurrency }))
  }, [selectedCurrency])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (originBoxRef.current && !originBoxRef.current.contains(event.target)) setShowOriginSuggestions(false)
      if (destinationBoxRef.current && !destinationBoxRef.current.contains(event.target)) setShowDestinationSuggestions(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const query = form.origin.trim()
    if (query.length < 2) return setOriginSuggestions([])
    const normalizedQuery = query.toLowerCase()
    if (originCacheRef.current.has(normalizedQuery)) {
      setOriginSuggestions(originCacheRef.current.get(normalizedQuery))
      return
    }
    const timer = setTimeout(async () => {
      const requestId = ++originRequestRef.current
      try {
        const res = await routeService.searchCities(query, 8)
        if (requestId !== originRequestRef.current) return
        const suggestions = res.data?.suggestions || []
        originCacheRef.current.set(normalizedQuery, suggestions)
        setOriginSuggestions(suggestions)
      } catch {
        if (requestId === originRequestRef.current) setOriginSuggestions([])
      }
    }, 120)
    return () => clearTimeout(timer)
  }, [form.origin])

  useEffect(() => {
    const query = form.destination.trim()
    if (query.length < 2) return setDestinationSuggestions([])
    const normalizedQuery = query.toLowerCase()
    if (destinationCacheRef.current.has(normalizedQuery)) {
      setDestinationSuggestions(destinationCacheRef.current.get(normalizedQuery))
      return
    }
    const timer = setTimeout(async () => {
      const requestId = ++destinationRequestRef.current
      try {
        const res = await routeService.searchCities(query, 8)
        if (requestId !== destinationRequestRef.current) return
        const suggestions = res.data?.suggestions || []
        destinationCacheRef.current.set(normalizedQuery, suggestions)
        setDestinationSuggestions(suggestions)
      } catch {
        if (requestId === destinationRequestRef.current) setDestinationSuggestions([])
      }
    }, 120)
    return () => clearTimeout(timer)
  }, [form.destination])

  const tripLength = useMemo(() => {
    if (!form.start_date || !form.end_date) return 0
    const start = new Date(form.start_date)
    const end = new Date(form.end_date)
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  }, [form.start_date, form.end_date])

  const budgetPerTraveler = useMemo(() => {
    const budget = Number(form.budget)
    const travelers = Number(form.travelers)
    if (!budget || !travelers) return `0 ${form.currency}`
    return moneyPreview(Math.round(budget / travelers), form.currency)
  }, [form.budget, form.travelers, form.currency])

  const dailyBudget = useMemo(() => {
    if (!tripLength || !Number(form.budget)) return `0 ${form.currency}`
    return moneyPreview(Math.round(Number(form.budget) / tripLength), form.currency)
  }, [form.budget, form.currency, tripLength])

  const budgetConfig = useMemo(() => budgetRanges[form.currency] || budgetRanges.USD, [form.currency])

  const pageClass = isDark ? 'min-h-screen bg-slate-950 text-white' : 'min-h-screen bg-slate-50 text-slate-900'
  const shellClass = isDark ? 'rounded-[28px] border border-white/10 bg-slate-900/70 shadow-[0_24px_80px_rgba(2,6,23,0.55)]' : 'rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(148,163,184,0.18)]'
  const subtleTextClass = isDark ? 'text-slate-400' : 'text-slate-500'
  const sectionClass = isDark ? 'rounded-3xl border border-white/10 bg-white/[0.03] p-5' : 'rounded-3xl border border-slate-200 bg-slate-50/80 p-5'

  const toggleInterest = (interest) => {
    setForm(prev => ({
      ...prev,
      interests: prev.interests.includes(interest) ? prev.interests.filter(item => item !== interest) : [...prev.interests, interest],
    }))
  }

  const applyBudgetPreset = (value) => setForm(prev => ({ ...prev, budget: String(value) }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.start_date || !form.end_date) return toast.error('Please select travel dates')
    if (new Date(form.end_date) <= new Date(form.start_date)) return toast.error('End date must be after start date')

    setLoading(true)
    toast.loading('Designing your trip plan...', { id: 'planning', duration: 60000 })
    try {
      const payload = {
        ...form,
        budget: parseFloat(form.budget),
        special_requirements: buildSpecialRequirements(form.special_requirements),
      }
      const res = await tripService.createTrip(payload)
      toast.dismiss('planning')
      toast.success('Your trip plan is ready!')
      if (Array.isArray(res.data?.generation_warnings) && res.data.generation_warnings.length > 0) {
        toast('Trip created with fallback support in some sections.')
      }
      navigate(`/trips/${res.data.id}`, { state: { trip: res.data } })
    } catch (err) {
      toast.dismiss('planning')
      if (err.code === 'ECONNABORTED') {
        toast.error('Trip generation took longer than expected. Please check your dashboard shortly.')
        navigate('/dashboard')
        return
      }
      toast.error(err.response?.data?.detail || 'Failed to create trip. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={pageClass}>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <section className={shellClass}>
          <div className="border-b border-slate-200/80 px-6 py-6 dark:border-white/10 sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">Trip Planner</p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Plan a trip with fewer steps</h1>
                <p className={`mt-3 text-sm leading-7 sm:text-base ${subtleTextClass}`}>
                  Enter the essentials and the app will generate your itinerary, budget, packing list, and travel risk notes.
                </p>
              </div>

              <div className={isDark ? 'rounded-2xl border border-white/10 bg-white/5 p-4' : 'rounded-2xl border border-slate-200 bg-slate-50 p-4'}>
                <div className="flex items-center gap-3">
                  <MapPinned className="h-5 w-5 text-cyan-500 dark:text-cyan-300" />
                  <div>
                    <p className={`text-xs uppercase tracking-[0.2em] ${subtleTextClass}`}>Region</p>
                    <p className="font-semibold">{selectedCountry.label}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-emerald-500 dark:text-emerald-300" />
                  <div>
                    <p className={`text-xs uppercase tracking-[0.2em] ${subtleTextClass}`}>Currency</p>
                    <p className="font-semibold">{form.currency}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6 sm:px-8 sm:py-8">
            <section className={sectionClass}>
              <div className="grid gap-4 md:grid-cols-2">
                <div ref={originBoxRef} className="relative">
                  <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Origin city</label>
                  <input
                    type="text"
                    className={inputClass(isDark)}
                    placeholder="e.g. New York"
                    required
                    value={form.origin}
                    onFocus={() => setShowOriginSuggestions(true)}
                    onChange={event => {
                      setForm(prev => ({ ...prev, origin: event.target.value }))
                      setShowOriginSuggestions(true)
                    }}
                  />
                  {showOriginSuggestions && originSuggestions.length > 0 && (
                    <div className={isDark ? 'absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-2xl border border-white/10 bg-slate-900 p-2 shadow-2xl' : 'absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl'}>
                      {originSuggestions.map((suggestion, index) => (
                        <button
                          key={`${suggestion.label}-${index}`}
                          type="button"
                          className={isDark ? 'w-full rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/10' : 'w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100'}
                          onClick={() => {
                            setForm(prev => ({ ...prev, origin: suggestion.label }))
                            setShowOriginSuggestions(false)
                          }}
                        >
                          {suggestion.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div ref={destinationBoxRef} className="relative">
                  <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Destination</label>
                  <input
                    type="text"
                    className={inputClass(isDark)}
                    placeholder="e.g. Paris, France"
                    required
                    value={form.destination}
                    onFocus={() => setShowDestinationSuggestions(true)}
                    onChange={event => {
                      setForm(prev => ({ ...prev, destination: event.target.value }))
                      setShowDestinationSuggestions(true)
                    }}
                  />
                  {showDestinationSuggestions && destinationSuggestions.length > 0 && (
                    <div className={isDark ? 'absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-2xl border border-white/10 bg-slate-900 p-2 shadow-2xl' : 'absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl'}>
                      {destinationSuggestions.map((suggestion, index) => (
                        <button
                          key={`${suggestion.label}-${index}`}
                          type="button"
                          className={isDark ? 'w-full rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/10' : 'w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100'}
                          onClick={() => {
                            setForm(prev => ({ ...prev, destination: suggestion.label }))
                            setShowDestinationSuggestions(false)
                          }}
                        >
                          {suggestion.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Start date</label>
                  <input
                    type="date"
                    className={inputClass(isDark)}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={form.start_date}
                    onChange={event => setForm(prev => ({ ...prev, start_date: event.target.value }))}
                  />
                </div>

                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>End date</label>
                  <input
                    type="date"
                    className={inputClass(isDark)}
                    required
                    min={form.start_date || new Date().toISOString().split('T')[0]}
                    value={form.end_date}
                    onChange={event => setForm(prev => ({ ...prev, end_date: event.target.value }))}
                  />
                </div>

                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Budget</label>
                  <input
                    type="number"
                    className={inputClass(isDark)}
                    placeholder={`Minimum ${budgetConfig.min}`}
                    min="1"
                    required
                    value={form.budget}
                    onChange={event => setForm(prev => ({ ...prev, budget: event.target.value }))}
                  />
                  <div className="mt-4">
                    <input
                      type="range"
                      min={budgetConfig.min}
                      max={budgetConfig.max}
                      step={budgetConfig.step}
                      value={form.budget || budgetConfig.min}
                      onChange={event => setForm(prev => ({ ...prev, budget: event.target.value }))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-cyan-500 dark:bg-white/10 dark:accent-cyan-300"
                    />
                    <div className={`mt-2 flex items-center justify-between text-xs ${subtleTextClass}`}>
                      <span>{moneyPreview(budgetConfig.min, form.currency)}</span>
                      <span>{moneyPreview(budgetConfig.max, form.currency)}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {budgetConfig.presets.map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => applyBudgetPreset(preset)}
                        className={Number(form.budget) === preset
                          ? 'rounded-full bg-slate-950 px-3 py-1.5 text-sm font-medium text-white dark:bg-cyan-300 dark:text-slate-950'
                          : isDark
                            ? 'rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/10'
                            : 'rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100'}
                      >
                        {moneyPreview(preset, form.currency)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Currency</label>
                    <select
                      className={inputClass(isDark)}
                      value={form.currency}
                      onChange={event => {
                        setForm(prev => ({ ...prev, currency: event.target.value }))
                        setCurrency(event.target.value)
                      }}
                    >
                      {currencyOptions.map(option => (
                        <option key={option} className={isDark ? 'bg-slate-900' : 'bg-white'}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Travelers</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className={inputClass(isDark)}
                      value={form.travelers}
                      onChange={event => {
                        const next = Number(event.target.value)
                        if (Number.isNaN(next)) return
                        setForm(prev => ({ ...prev, travelers: Math.min(10, Math.max(1, next)) }))
                      }}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className={sectionClass}>
              <label className={`mb-3 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Travel style</label>
              <div className={isDark ? 'grid grid-cols-3 gap-2 rounded-2xl bg-white/5 p-1' : 'grid grid-cols-3 gap-2 rounded-2xl bg-white p-1'}>
                {travelStyles.map(style => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, travel_style: style }))}
                    className={form.travel_style === style
                      ? 'rounded-xl bg-slate-950 px-3 py-3 text-sm font-semibold capitalize text-white dark:bg-cyan-300 dark:text-slate-950'
                      : isDark
                        ? 'rounded-xl px-3 py-3 text-sm font-semibold capitalize text-slate-300 transition hover:bg-white/10'
                        : 'rounded-xl px-3 py-3 text-sm font-semibold capitalize text-slate-700 transition hover:bg-slate-100'}
                  >
                    {style}
                  </button>
                ))}
              </div>

              <label className={`mt-6 mb-3 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Interests</label>
              <div className="flex flex-wrap gap-2">
                {interestOptions.map(interest => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={form.interests.includes(interest)
                      ? 'rounded-full bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950'
                      : isDark
                        ? 'rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10'
                        : 'rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100'}
                  >
                    {interest}
                  </button>
                ))}
              </div>

              <label className={`mt-6 mb-2 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Extra notes</label>
              <textarea
                className={`${inputClass(isDark)} min-h-[120px]`}
                rows={5}
                placeholder="Optional: mention dietary needs, slower pace, must-visit areas, accessibility needs, or activities to avoid."
                value={form.special_requirements}
                onChange={event => setForm(prev => ({ ...prev, special_requirements: event.target.value }))}
              />
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <SummaryStat label="Trip length" value={tripLength ? `${tripLength} ${tripLength === 1 ? 'day' : 'days'}` : 'Not set'} isDark={isDark} />
              <SummaryStat label="Per traveler" value={budgetPerTraveler} isDark={isDark} />
              <SummaryStat label="Daily budget" value={dailyBudget} isDark={isDark} />
            </section>

            <section className={isDark ? 'flex flex-col gap-4 rounded-3xl border border-white/10 bg-cyan-400/10 p-5 sm:flex-row sm:items-center sm:justify-between' : 'flex flex-col gap-4 rounded-3xl border border-cyan-100 bg-cyan-50 p-5 sm:flex-row sm:items-center sm:justify-between'}>
              <div>
                <h2 className="text-xl font-semibold">Generate the trip</h2>
                <p className={`mt-1 text-sm ${subtleTextClass}`}>
                  The planner will use your essentials plus a small built-in prompt for named places and weather-aware timing.
                </p>
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                disabled={loading}
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Generating plan...</> : <><Plane className="h-4 w-4" />Generate trip plan</>}
              </button>
            </section>
          </form>
        </section>
      </div>
    </div>
  )
}
