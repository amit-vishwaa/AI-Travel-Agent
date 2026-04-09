import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Calendar, Download, DollarSign, Loader2, RefreshCw, Users } from 'lucide-react'
import toast from 'react-hot-toast'

import LoadingSpinner from '../components/common/LoadingSpinner'
import BudgetBreakdown from '../components/trip/BudgetBreakdown'
import ChatBot from '../components/trip/ChatBot'
import ItineraryView from '../components/trip/ItineraryView'
import MapView from '../components/trip/MapView'
import PackingList from '../components/trip/PackingList'
import RiskAlerts from '../components/trip/RiskAlerts'
import TransportCard from '../components/trip/TransportCard'
import WeatherCard from '../components/trip/WeatherCard'
import { tripService } from '../services/tripService'
import { formatCurrency } from '../utils/currency'

const tabs = ['Itinerary', 'Weather', 'Map & Route', 'Budget', 'Packing', 'Transport', 'Risk Alerts']

function formatPlanDateTime(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function TripDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [trip, setTrip] = useState(() => location.state?.trip || null)
  const [loading, setLoading] = useState(() => !location.state?.trip)
  const [activeTab, setActiveTab] = useState('Itinerary')
  const [savingPacking, setSavingPacking] = useState(false)
  const [regeneratingPacking, setRegeneratingPacking] = useState(false)
  const [regeneratingTrip, setRegeneratingTrip] = useState(false)

  useEffect(() => {
    fetchTrip()
  }, [id])

  const fetchTrip = async () => {
    try {
      const res = await tripService.getTrip(id)
      setTrip(res.data)
    } catch (err) {
      const detail = err.response?.data?.detail
      const status = err.response?.status
      if (!location.state?.trip && status === 404) {
        toast.error(detail || 'Trip not found')
        navigate('/dashboard')
        return
      }
      toast.error(detail || 'Could not refresh the latest trip data. Showing the saved plan instead.')
    } finally {
      setLoading(false)
    }
  }

  const savePackingList = async (packingList) => {
    try {
      setSavingPacking(true)
      const res = await tripService.updatePackingList(id, packingList)
      setTrip(prev => ({ ...prev, packing_list: res.data.packing_list }))
      toast.success('Packing list saved')
    } catch {
      toast.error('Could not save packing list')
    } finally {
      setSavingPacking(false)
    }
  }

  const regeneratePackingList = async () => {
    try {
      setRegeneratingPacking(true)
      const res = await tripService.regeneratePackingList(id)
      setTrip(prev => ({ ...prev, packing_list: res.data.packing_list }))
      toast.success('AI packing list regenerated')
    } catch {
      toast.error('Could not regenerate packing list')
    } finally {
      setRegeneratingPacking(false)
    }
  }

  const downloadPdf = async () => {
    try {
      const res = await tripService.downloadPdf(id)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${trip.destination.replace(/\s+/g, '-').toLowerCase()}-plan.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text()
          const parsed = JSON.parse(text)
          toast.error(parsed.detail || 'PDF export failed')
          return
        } catch {
          // fall through to generic toast
        }
      }
      toast.error(err.response?.data?.detail || 'PDF export failed')
    }
  }

  const regenerateTrip = async () => {
    try {
      setRegeneratingTrip(true)
      toast.loading('Regenerating trip plan...', { id: 'regenerate-trip', duration: 60000 })
      const res = await tripService.regenerateTrip(id)
      setTrip(res.data)
      toast.dismiss('regenerate-trip')
      toast.success('Trip plan regenerated')
    } catch (err) {
      toast.dismiss('regenerate-trip')
      toast.error(err.response?.data?.detail || 'Could not regenerate trip plan')
    } finally {
      setRegeneratingTrip(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" text="Loading your trip..." />
      </div>
    )
  }

  if (!trip) return null

  const generatedAt = trip.updated_at || trip.created_at

  const tabContent = {
    Itinerary: <ItineraryView itinerary={trip.itinerary} currency={trip.currency} tripPackingList={trip.packing_list} />,
    Weather: <WeatherCard weather={trip.weather} destination={trip.destination} startDate={trip.start_date} endDate={trip.end_date} />,
    'Map & Route': <MapView routeData={trip.route_data} />,
    Budget: <BudgetBreakdown budget={{ ...(trip.budget_breakdown || {}), currency: trip.currency }} />,
    Packing: <PackingList packingList={trip.packing_list} onSave={savePackingList} onRegenerate={regeneratePackingList} saving={savingPacking} regenerating={regeneratingPacking} />,
    Transport: <TransportCard trip={trip} />,
    'Risk Alerts': <RiskAlerts riskData={trip.risk_alert} />,
  }

  return (
    <div className="page-shell">
      <div className="bg-gradient-to-r from-sky-700 via-cyan-700 to-emerald-600 text-white shadow-[0_20px_70px_rgba(14,165,233,0.18)]">
        <div className="page-container py-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm mb-4">
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
              </Link>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">{trip.destination}</h1>
              <p className="text-sky-100 mb-4">From {trip.origin}</p>
              <div className="flex flex-wrap gap-4 text-sm text-cyan-50">
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{trip.start_date} to {trip.end_date}</span>
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{trip.travelers} traveler{trip.travelers !== 1 ? 's' : ''}</span>
                <span className="flex items-center gap-1.5"><DollarSign className="w-4 h-4" />{formatCurrency(trip.budget, trip.currency)} total</span>
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />Generated on {formatPlanDateTime(generatedAt)}</span>
                <span className="capitalize px-2.5 py-0.5 bg-white/20 rounded-full">{trip.travel_style}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 self-start">
              <button onClick={downloadPdf} className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/20">
                <Download className="w-4 h-4" /> Download PDF
              </button>
              <button
                onClick={regenerateTrip}
                disabled={regeneratingTrip}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {regeneratingTrip ? <><Loader2 className="w-4 h-4 animate-spin" /> Regenerating...</> : <><RefreshCw className="w-4 h-4" /> Regenerate Plan</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="page-container pt-6">
        <div className="glass-panel mb-6 border-slate-200 bg-white/95 text-slate-900 shadow-[0_18px_60px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950/92 dark:text-white">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.24em] text-sky-700 dark:text-sky-200">Weather-Aware Risk Alert</p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-2xl font-bold">{trip.risk_alert?.overall_risk_level || 'Low'}</span>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-100">
                  {trip.risk_alert?.weather_condition || 'Conditions pending'}
                </span>
              </div>
            </div>
            <div className="max-w-xl text-sm text-slate-700 dark:text-slate-200">
              {(trip.risk_alert?.alerts || [])[0]?.smart_suggestion || 'Review the risk tab for timing and safety suggestions before you finalize activities.'}
            </div>
          </div>
          {!!trip.generation_warnings?.length && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/15 dark:text-amber-100">
              <AlertTriangle className="w-4 h-4" />
              Some sections were generated with fallback providers.
            </div>
          )}
        </div>
      </div>

      <div className="sticky top-16 z-10 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/90">
        <div className="page-container overflow-x-auto">
          <div className="flex gap-1 py-2">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="page-container py-8">
        {tabContent[activeTab]}
      </div>

      <ChatBot tripContext={trip} />
    </div>
  )
}
