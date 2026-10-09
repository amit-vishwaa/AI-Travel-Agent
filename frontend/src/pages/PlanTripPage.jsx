import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, Loader2, MapPinned, Plane, Sparkles, Users, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'

import CityAutocomplete from '../components/common/CityAutocomplete'
import { useTheme } from '../context/ThemeContext'
import { useTravelSettings } from '../context/TravelSettingsContext'
import { tripService } from '../services/tripService'

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

const tripInspirations = [
  {
    title: '🏝️ Tropical Bali Escape',
    origin: 'Singapore',
    destination: 'Bali, Indonesia',
    days: 5,
    style: 'balanced',
    travelers: 2,
    interests: ['Nature & Wildlife', 'Food & Cuisine', 'Beaches', 'Photography'],
    budgetByCurrency: { USD: 1400, INR: 95000, EUR: 1300, GBP: 1100, AED: 5200, JPY: 210000, AUD: 2100, CAD: 1900, SGD: 1900 },
    notes: 'Relaxing beach getaway with temple visits, scenic rice terraces, and sunset seafood.',
  },
  {
    title: '⛩️ Historic & Tech Tokyo',
    origin: 'Seoul',
    destination: 'Tokyo, Japan',
    days: 6,
    style: 'balanced',
    travelers: 1,
    interests: ['History & Culture', 'Food & Cuisine', 'Shopping', 'Photography'],
    budgetByCurrency: { USD: 2200, INR: 160000, EUR: 2000, GBP: 1700, AED: 8000, JPY: 320000, AUD: 3200, CAD: 2900, SGD: 2900 },
    notes: 'Explore Shibuya, Senso-ji, Akihabara gadgets, and ramen alleys with bullet train transit.',
  },
  {
    title: '🏛️ Romantic Rome & Florence',
    origin: 'London',
    destination: 'Rome, Italy',
    days: 5,
    style: 'balanced',
    travelers: 2,
    interests: ['History & Culture', 'Art & Museums', 'Food & Cuisine'],
    budgetByCurrency: { USD: 1800, INR: 140000, EUR: 1600, GBP: 1400, AED: 6600, JPY: 270000, AUD: 2700, CAD: 2400, SGD: 2400 },
    notes: 'Colosseum, Vatican museum tour, authentic Italian espresso, and Renaissance architecture.',
  },
  {
    title: '✨ Luxury & Modern Dubai',
    origin: 'Mumbai',
    destination: 'Dubai, UAE',
    days: 4,
    style: 'luxury',
    travelers: 2,
    interests: ['Shopping', 'Nightlife', 'Adventure & Sports'],
    budgetByCurrency: { USD: 2600, INR: 210000, EUR: 2400, GBP: 2100, AED: 9500, JPY: 390000, AUD: 3900, CAD: 3500, SGD: 3500 },
    notes: 'Burj Khalifa observation deck, desert safari with BBQ, luxury marina cruise, and souk shopping.',
  },
  {
    title: '🏔️ Swiss Alps Adventure',
    origin: 'Paris',
    destination: 'Interlaken, Switzerland',
    days: 5,
    style: 'balanced',
    travelers: 2,
    interests: ['Nature & Wildlife', 'Adventure & Sports', 'Photography'],
    budgetByCurrency: { USD: 2500, INR: 190000, EUR: 2300, GBP: 2000, AED: 9200, JPY: 370000, AUD: 3700, CAD: 3300, SGD: 3300 },
    notes: 'Jungfrau train journey, panoramic cable car views, Lake Brienz cruise, and cheese tasting.',
  },
  {
    title: '🌴 Serene Kerala Backwaters',
    origin: 'Delhi',
    destination: 'Kochi, Kerala',
    days: 4,
    style: 'balanced',
    travelers: 2,
    interests: ['Nature & Wildlife', 'Food & Cuisine', 'Spirituality', 'Photography'],
    budgetByCurrency: { USD: 700, INR: 45000, EUR: 650, GBP: 550, AED: 2600, JPY: 105000, AUD: 1100, CAD: 950, SGD: 950 },
    notes: 'Alleppey houseboat stay, Kathakali performance, spice plantation tour, and Ayurvedic wellness.',
  },
]

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

  const applyInspiration = (insp) => {
    const today = new Date()
    const startDateObj = new Date(today.getTime() + 25 * 24 * 60 * 60 * 1000)
    const endDateObj = new Date(startDateObj.getTime() + insp.days * 24 * 60 * 60 * 1000)

    const startDateStr = startDateObj.toISOString().split('T')[0]
    const endDateStr = endDateObj.toISOString().split('T')[0]

    const selectedCur = form.currency || 'USD'
    const estBudget = insp.budgetByCurrency[selectedCur] || 1500

    setForm(prev => ({
      ...prev,
      origin: insp.origin,
      destination: insp.destination,
      start_date: startDateStr,
      end_date: endDateStr,
      travel_style: insp.style,
      travelers: insp.travelers,
      interests: insp.interests,
      budget: String(estBudget),
      special_requirements: insp.notes,
    }))
    toast.success(`Loaded "${insp.title}" template!`)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.start_date || !form.end_date) return toast.error('Please select travel dates')
    if (new Date(form.end_date) <= new Date(form.start_date)) return toast.error('End date must be after start date')
    if (form.origin.trim().toLowerCase() === form.destination.trim().toLowerCase()) {
      return toast.error('Origin and destination should be different')
    }
    if (tripLength > 21) return toast.error('Please keep trip length at 21 days or fewer for the best plans')

    setLoading(true)
    toast.loading('Designing your customized trip plan...', { id: 'planning', duration: 60000 })
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
                <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Plan your vacation in minutes</h1>
                <p className={`mt-3 text-sm leading-7 sm:text-base ${subtleTextClass}`}>
                  Choose a curated inspiration template or enter custom details. AI creates your day-by-day itinerary, live weather notes, and packing list.
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
            {/* Quick Inspiration Templates */}
            <div className={isDark ? 'rounded-2xl border border-white/10 bg-white/5 p-4' : 'rounded-2xl border border-sky-200/80 bg-gradient-to-r from-sky-50 to-indigo-50/60 p-4'}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-800 dark:text-cyan-300">
                  <Sparkles className="h-4 w-4 text-sky-600 dark:text-cyan-400" />
                  Need Inspiration? Click a Dream Getaway
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">1-click pre-fill</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {tripInspirations.map(insp => (
                  <button
                    key={insp.title}
                    type="button"
                    onClick={() => applyInspiration(insp)}
                    className="rounded-full border border-sky-200/80 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-sky-400 hover:bg-sky-50 dark:border-white/10 dark:bg-slate-850 dark:text-slate-200 dark:hover:bg-white/10"
                  >
                    {insp.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Origin & Destination */}
            <section className={sectionClass}>
              <div className="grid gap-4 md:grid-cols-2">
                <CityAutocomplete
                  label="Origin city"
                  placeholder="e.g. New York, London, Delhi"
                  required
                  isDark={isDark}
                  value={form.origin}
                  onChange={(origin) => setForm(prev => ({ ...prev, origin }))}
                />
                <CityAutocomplete
                  label="Destination"
                  placeholder="e.g. Paris, Tokyo, Bali"
                  required
                  isDark={isDark}
                  value={form.destination}
                  onChange={(destination) => setForm(prev => ({ ...prev, destination }))}
                />
                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, origin: prev.destination, destination: prev.origin }))}
                    className={isDark
                      ? 'inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10'
                      : 'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50'}
                  >
                    <ArrowLeftRight className="h-4 w-4" /> Swap origin and destination
                  </button>
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
                  <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Total Budget ({form.currency})</label>
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

              {/* Traveler Persona Presets */}
              <div className="mt-4 border-t border-slate-100 pt-3 dark:border-white/5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Quick Persona Preset:</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    { label: 'Solo Explorer', count: 1, style: 'budget' },
                    { label: 'Couple / Romantic', count: 2, style: 'balanced' },
                    { label: 'Family with Kids', count: 4, style: 'balanced' },
                    { label: 'Friends Group', count: 3, style: 'balanced' },
                  ].map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, travelers: p.count, travel_style: p.style }))}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                        form.travelers === p.count && form.travel_style === p.style
                          ? 'bg-sky-600 text-white dark:bg-cyan-400 dark:text-slate-950 shadow-sm'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200'
                      }`}
                    >
                      {p.label} ({p.count})
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Travel Style and Interests */}
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

              <label className={`mt-6 mb-3 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Interests & Activities</label>
              <div className="flex flex-wrap gap-2">
                {interestOptions.map(interest => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={form.interests.includes(interest)
                      ? 'rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-cyan-300 dark:text-slate-950'
                      : isDark
                        ? 'rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10'
                        : 'rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100'}
                  >
                    {interest}
                  </button>
                ))}
              </div>

              <label className={`mt-6 mb-2 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                Special preferences or notes (optional)
              </label>
              <textarea
                rows={3}
                className={inputClass(isDark)}
                placeholder="e.g. Vegetarian dining, avoid strenuous hikes, prefers historical sights..."
                value={form.special_requirements}
                onChange={event => setForm(prev => ({ ...prev, special_requirements: event.target.value }))}
              />
            </section>

            {/* Real-time Summary Cards */}
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryStat label="Trip duration" value={`${tripLength || 0} day${tripLength === 1 ? '' : 's'}`} isDark={isDark} />
              <SummaryStat label="Daily budget" value={dailyBudget} isDark={isDark} />
              <SummaryStat label="Per traveler" value={budgetPerTraveler} isDark={isDark} />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary inline-flex items-center gap-2 px-8 py-3.5 text-base shadow-lg"
              >
                {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Generating Your Plan...</> : <><Sparkles className="h-5 w-5" /> Generate AI Itinerary</>}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
