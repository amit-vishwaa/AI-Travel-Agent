import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { tripService } from '../services/tripService'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { Plus, MapPin, Calendar, DollarSign, Users, Trash2, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, summarizeBudgetsByCurrency } from '../utils/currency'

export default function DashboardPage() {
  const { user } = useAuth()
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrips()
  }, [])

  const fetchTrips = async () => {
    try {
      const res = await tripService.getTrips()
      setTrips(res.data)
    } catch {
      toast.error('Failed to load trips')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this trip?')) return
    try {
      await tripService.deleteTrip(id)
      setTrips(trips.filter(t => t.id !== id))
      toast.success('Trip deleted')
    } catch {
      toast.error('Failed to delete trip')
    }
  }

  const styleColors = { budget: 'bg-green-100 text-green-700', balanced: 'bg-blue-100 text-blue-700', luxury: 'bg-purple-100 text-purple-700' }
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
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
    return sum + days
  }, 0)
  const totalBudgetNumeric = trips.reduce((sum, trip) => sum + (Number(trip.budget) || 0), 0)
  const avgBudgetPerDay = totalTripDays > 0 ? totalBudgetNumeric / totalTripDays : 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome back, {user?.name?.split(' ')[0]}! 👋
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {trips.length} trip{trips.length !== 1 ? 's' : ''} planned
            </p>
          </div>
          <Link to="/plan" className="btn-primary flex items-center gap-2 w-fit">
            <Plus className="w-4 h-4" /> Plan New Trip
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Trips', value: trips.length, icon: MapPin, color: 'text-primary-600' },
            { label: 'Upcoming Trips', value: upcomingTrips.length, icon: Calendar, color: 'text-green-600' },
            { label: 'Total Budget', value: summarizeBudgetsByCurrency(trips), icon: DollarSign, color: 'text-yellow-600' },
            {
              label: 'Avg Budget / Day',
              value: formatCurrency(avgBudgetPerDay, nextTrip?.currency || trips[0]?.currency || 'USD'),
              icon: DollarSign,
              color: 'text-indigo-600'
            },
          ].map(stat => (
            <div key={stat.label} className="card flex items-center gap-4">
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
              <div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Next trip info */}
        {nextTrip && (
          <div className="card mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800/70 border-blue-100 dark:border-gray-700">
            <p className="text-xs uppercase tracking-wide text-blue-600 dark:text-blue-300 font-semibold mb-1">Next Departure</p>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {nextTrip.destination}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {nextTrip.start_date} to {nextTrip.end_date} • {formatCurrency(nextTrip.budget, nextTrip.currency)}
            </p>
          </div>
        )}

        {/* Trips Grid */}
        {loading ? (
          <LoadingSpinner text="Loading your trips..." />
        ) : trips.length === 0 ? (
          <div className="card text-center py-16">
            <MapPin className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No trips yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Plan your first AI-powered adventure!</p>
            <Link to="/plan" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Plan Your First Trip
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map(trip => (
              <div key={trip.id} className="card hover:shadow-md transition-all duration-200 group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">{trip.destination}</h3>
                    <p className="text-sm text-gray-500">From: {trip.origin}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${styleColors[trip.travel_style] || 'bg-gray-100 text-gray-700'}`}>
                    {trip.travel_style}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{trip.start_date} → {trip.end_date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    <span>{formatCurrency(trip.budget, trip.currency)} budget</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{trip.travelers} traveler{trip.travelers !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <Link to={`/trips/${trip.id}`} className="flex-1 btn-secondary text-sm flex items-center justify-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> View
                  </Link>
                  <button
                    onClick={() => handleDelete(trip.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete trip"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
