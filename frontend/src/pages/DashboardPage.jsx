import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, DollarSign, Eye, MapPin, PlaneTakeoff, Plus, Trash2, Users } from 'lucide-react'
import toast from 'react-hot-toast'

import LoadingSpinner from '../components/common/LoadingSpinner'
import { useAuth } from '../context/AuthContext'
import { useTravelSettings } from '../context/TravelSettingsContext'
import { tripService } from '../services/tripService'
import { formatCurrency, sumBudgetsForCurrency } from '../utils/currency'

export default function DashboardPage() {
  const { user } = useAuth()
  const { selectedCountry, currency } = useTravelSettings()
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)

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
    if (!confirm('Delete this trip?')) return
    try {
      await tripService.deleteTrip(id)
      setTrips(prev => prev.filter(trip => trip.id !== id))
      toast.success('Trip deleted')
    } catch {
      toast.error('Failed to delete trip')
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcomingTrips = trips.filter((trip) => {
    const tripStart = new Date(trip.start_date)
    return !Number.isNaN(tripStart.getTime()) && tripStart >= today
  })
  const nextTrip = [...upcomingTrips].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  )[0]
  const totalTripDays = trips.reduce((sum, trip) => {
    const start = new Date(trip.start_date)
    const end = new Date(trip.end_date)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return sum
    return sum + Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  }, 0)
  const totalBudgetNumeric = trips.reduce((sum, trip) => sum + (Number(trip.budget) || 0), 0)
  const avgBudgetPerDay = totalTripDays > 0 ? totalBudgetNumeric / totalTripDays : 0
  const regionalBudgetTotal = sumBudgetsForCurrency(trips, currency)

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
            <Link to="/plan" className="btn-primary inline-flex w-fit items-center gap-2">
              <Plus className="h-4 w-4" /> Plan New Trip
            </Link>
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
          <section className="mt-6 rounded-[2rem] border border-sky-200 bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-500 p-6 text-white shadow-[0_20px_70px_rgba(14,165,233,0.2)] dark:border-white/10">
            <p className="section-kicker !text-cyan-100">Next Departure</p>
            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold">{nextTrip.destination}</h2>
                <p className="mt-1 text-cyan-50">
                  {nextTrip.start_date} to {nextTrip.end_date} • {formatCurrency(nextTrip.budget, nextTrip.currency)}
                </p>
              </div>
              <Link to={`/trips/${nextTrip.id}`} className="inline-flex w-fit items-center gap-2 rounded-2xl bg-white px-5 py-3 font-semibold text-sky-700 transition hover:bg-sky-50">
                <Eye className="h-4 w-4" /> Open Trip
              </Link>
            </div>
          </section>
        )}

        <section className="mt-6">
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
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {trips.map((trip) => (
                <article key={trip.id} className="card transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{trip.destination}</h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">From {trip.origin}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${styleColors[trip.travel_style] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
                      {trip.travel_style}
                    </span>
                  </div>

                  <div className="mt-5 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{trip.start_date} to {trip.end_date}</span>
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

                  <div className="mt-6 flex gap-2 border-t border-slate-200 pt-4 dark:border-gray-800">
                    <Link to={`/trips/${trip.id}`} className="btn-secondary flex flex-1 items-center justify-center gap-1.5 text-sm">
                      <Eye className="h-3.5 w-3.5" /> View
                    </Link>
                    <button
                      onClick={() => handleDelete(trip.id)}
                      className="rounded-xl p-3 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Delete trip"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
