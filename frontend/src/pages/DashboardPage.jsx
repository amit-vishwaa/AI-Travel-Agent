import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, DollarSign, Eye, MapPin, PlaneTakeoff, Plus, Search, Sparkles, Trash2, Users } from 'lucide-react'
import toast from 'react-hot-toast'

import LoadingSpinner from '../components/common/LoadingSpinner'
import { useAuth } from '../context/AuthContext'
import { useTravelSettings } from '../context/TravelSettingsContext'
import { tripService } from '../services/tripService'
import { formatCurrency, sumBudgetsForCurrency } from '../utils/currency'
import { formatTripRange, parseTripDate, tripDurationDays } from '../utils/dates'

function tripStatus(trip) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = parseTripDate(trip.start_date)
  const end = parseTripDate(trip.end_date)
  if (end && end < today) return 'past'
  if (start && start > today) return 'upcoming'
  return 'active'
}

const statusStyles = {
  upcoming: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
  active: 'bg-sky-100 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300',
  past: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { selectedCountry, currency } = useTravelSettings()
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const res = await tripService.getTrips()
        setTrips(res.data || [])
      } catch {
        toast.error('Failed to load trips')
      } finally {
        setLoading(false)
      }
    }

    fetchTrips()
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this trip? This cannot be undone.')) return
    try {
      await tripService.deleteTrip(id)
      setTrips(prev => prev.filter(trip => trip.id !== id))
      toast.success('Trip deleted')
    } catch {
      toast.error('Failed to delete trip')
    }
  }

  const tripRows = useMemo(() => trips.map((trip) => ({ ...trip, status: tripStatus(trip) })), [trips])
  const upcomingTrips = useMemo(() => tripRows.filter((trip) => trip.status === 'upcoming'), [tripRows])
  const nextTrip = [...upcomingTrips].sort(
    (a, b) => (parseTripDate(a.start_date)?.getTime() || 0) - (parseTripDate(b.start_date)?.getTime() || 0)
  )[0]
  const { totalTripDays, totalBudgetNumeric } = useMemo(() => tripRows.reduce((totals, trip) => ({
    totalTripDays: totals.totalTripDays + tripDurationDays(trip.start_date, trip.end_date),
    totalBudgetNumeric: totals.totalBudgetNumeric + (Number(trip.budget) || 0),
  }), { totalTripDays: 0, totalBudgetNumeric: 0 }), [tripRows])
  const avgBudgetPerDay = totalTripDays > 0 ? totalBudgetNumeric / totalTripDays : 0
  const regionalBudgetTotal = sumBudgetsForCurrency(trips, currency)

  const filteredTrips = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tripRows.filter((trip) => {
      if (filter !== 'all' && trip.status !== filter) return false
      if (!q) return true
      return `${trip.destination} ${trip.origin} ${trip.travel_style}`.toLowerCase().includes(q)
    })
  }, [tripRows, query, filter])

  const styleColors = {
    budget: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
    balanced: 'bg-sky-100 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300',
    luxury: 'bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300',
  }

  return (
    <div className="page-shell">
      <div className="page-container py-8 sm:py-10">
        <section className="glass-panel">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-kicker">Dashboard</p>
              <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
                Welcome back, {user?.name?.split(' ')[0]}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
                Keep every trip, budget, weather alert, and packing list in one planning workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/assistant" className="btn-secondary inline-flex w-fit items-center gap-2">
                <Sparkles className="h-4 w-4" /> Ask Assistant
              </Link>
              <Link to="/plan" className="btn-primary inline-flex w-fit items-center gap-2">
                <Plus className="h-4 w-4" /> Plan New Trip
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Total Trips', value: trips.length, icon: MapPin, tone: 'text-sky-600 dark:text-cyan-300' },
              { label: 'Upcoming Trips', value: upcomingTrips.length, icon: PlaneTakeoff, tone: 'text-emerald-600 dark:text-emerald-300' },
              { label: `Budget (${selectedCountry.code})`, value: formatCurrency(regionalBudgetTotal, currency), icon: DollarSign, tone: 'text-amber-600 dark:text-amber-300' },
              { label: 'Avg Budget / Day', value: formatCurrency(avgBudgetPerDay, currency), icon: Calendar, tone: 'text-violet-600 dark:text-violet-300' },
            ].map((stat) => (
              <div key={stat.label} className="metric-card">
                <stat.icon className={`h-7 w-7 ${stat.tone}`} />
                <div className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {nextTrip && (
          <section className="mt-6 rounded-[2rem] border border-sky-200 bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-500 p-6 text-white shadow-[0_20px_70px_rgba(14,165,233,0.2)] dark:border-slate-700/70 dark:from-slate-900 dark:via-cyan-950 dark:to-slate-900 dark:shadow-[0_20px_70px_rgba(0,0,0,0.3)]">
            <p className="section-kicker !text-cyan-100">Next Departure</p>
            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold">{nextTrip.destination}</h2>
                <p className="mt-1 text-cyan-50">
                  {formatTripRange(nextTrip.start_date, nextTrip.end_date)} • {formatCurrency(nextTrip.budget, nextTrip.currency)}
                </p>
              </div>
              <Link to={`/trips/${nextTrip.id}`} className="inline-flex w-fit items-center gap-2 rounded-2xl bg-white px-5 py-3 font-semibold text-sky-700 transition hover:bg-sky-50 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200">
                <Eye className="h-4 w-4" /> Open Trip
              </Link>
            </div>
          </section>
        )}

        <section className="mt-6">
          {!loading && trips.length > 0 && (
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  className="input-field pl-10"
                  placeholder="Search destination, origin, or style"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                {['all', 'upcoming', 'active', 'past'].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={`rounded-full px-3 py-2 text-sm font-semibold capitalize ${
                      filter === key
                        ? 'bg-slate-900 text-white dark:bg-cyan-300 dark:text-slate-950'
                        : 'border border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="glass-panel">
              <LoadingSpinner text="Loading your trips..." />
            </div>
          ) : trips.length === 0 ? (
            <div className="glass-panel py-16 text-center">
              <MapPin className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
              <h3 className="mt-5 text-xl font-semibold text-slate-900 dark:text-white">No trips yet</h3>
              <p className="mt-2 text-slate-500 dark:text-slate-400">Plan your first AI-powered trip and everything will show up here.</p>
              <Link to="/plan" className="btn-primary mt-6 inline-flex items-center gap-2">
                <Plus className="h-4 w-4" /> Plan Your First Trip
              </Link>
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="glass-panel py-12 text-center">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No matching trips</h3>
              <p className="mt-2 text-slate-500 dark:text-slate-400">Try a different search or filter.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredTrips.map((trip) => {
                const { status } = trip
                return (
                  <article key={trip.id} className="card transition hover:-translate-y-1 hover:shadow-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{trip.destination}</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">From {trip.origin}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${styleColors[trip.travel_style] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
                          {trip.travel_style}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[status]}`}>
                          {status}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatTripRange(trip.start_date, trip.end_date)}</span>
                        {status === 'upcoming' && (() => {
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)
                          const start = parseTripDate(trip.start_date)
                          if (!start) return null
                          const diffDays = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                          return diffDays > 0 ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              in {diffDays}d
                            </span>
                          ) : null
                        })()}
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span>{formatCurrency(trip.budget, trip.currency)} total budget</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{trip.travelers} traveler{trip.travelers !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center gap-1.5 border-t border-slate-200 pt-4 dark:border-gray-800">
                      <Link to={`/trips/${trip.id}`} className="btn-secondary flex flex-1 items-center justify-center gap-1.5 text-xs font-semibold">
                        <Eye className="h-3.5 w-3.5" /> View
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          const url = `${window.location.origin}/trips/share/${trip.id}`
                          navigator.clipboard.writeText(url)
                          toast.success(`Share link for ${trip.destination} copied!`)
                        }}
                        className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                        title="Copy public share link"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                      </button>
                      <Link
                        to="/assistant"
                        state={{ tripId: trip.id }}
                        className="rounded-xl border border-slate-200 bg-white p-2.5 text-sky-600 transition hover:bg-sky-50 dark:border-white/10 dark:bg-white/5 dark:text-cyan-300"
                        title="Ask assistant"
                      >
                        <Sparkles className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(trip.id)}
                        className="rounded-xl border border-slate-200 bg-white p-2.5 text-red-500 transition hover:bg-red-50 dark:border-white/10 dark:bg-white/5 dark:text-red-400"
                        title="Delete trip"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
