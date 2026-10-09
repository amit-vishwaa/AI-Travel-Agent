import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  Compass,
  Copy,
  DollarSign,
  Download,
  ExternalLink,
  HeartHandshake,
  Languages,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Printer,
  RefreshCw,
  Share2,
  ShieldAlert,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'

import LoadingSpinner from '../components/common/LoadingSpinner'
import ChatBot from '../components/trip/ChatBot'
import ItineraryView from '../components/trip/ItineraryView'
import PackingList from '../components/trip/PackingList'
import RiskAlerts from '../components/trip/RiskAlerts'
import TransportCard from '../components/trip/TransportCard'
import WeatherCard from '../components/trip/WeatherCard'
import { tripService } from '../services/tripService'
import { formatCurrency } from '../utils/currency'
import { formatTripRange } from '../utils/dates'

const tabs = ['Itinerary', 'Weather', 'Map & Route', 'Budget', 'Packing', 'Transport', 'Risk Alerts', 'Local Guide']
const BudgetBreakdown = lazy(() => import('../components/trip/BudgetBreakdown'))
const MapView = lazy(() => import('../components/trip/MapView'))

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
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

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
      toast.success('Trip PDF downloaded!')
    } catch (err) {
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text()
          const parsed = JSON.parse(text)
          toast.error(parsed.detail || 'PDF export failed')
          return
        } catch {
          // fall through
        }
      }
      toast.error(err.response?.data?.detail || 'PDF export failed')
    }
  }

  const downloadCalendar = async () => {
    try {
      const res = await tripService.downloadCalendar(id)
      const blob = new Blob([res.data], { type: 'text/calendar;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `trip-${trip.destination.replace(/\s+/g, '-').toLowerCase()}.ics`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Calendar file downloaded! Open it to add to Google/Apple Calendar.')
    } catch {
      toast.error('Calendar export unavailable')
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

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/trips/share/${trip?.id}` : ''

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopiedLink(true)
    toast.success('Public share link copied!')
    setTimeout(() => setCopiedLink(false), 2500)
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
  const riskLevel = String(trip.risk_alert?.overall_risk_level || 'Low').toLowerCase()
  const riskTone = riskLevel === 'high'
    ? 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-100'
    : riskLevel === 'medium'
      ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100'
      : 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100'

  const emergencyContacts = trip.itinerary?.emergencyContacts || {}
  const localPhrases = trip.itinerary?.localPhrases || []
  const travelTips = trip.itinerary?.travelTips || []

  const tabContent = {
    Itinerary: <ItineraryView itinerary={trip.itinerary} currency={trip.currency} tripPackingList={trip.packing_list} tripId={trip.id} />,
    Weather: <WeatherCard weather={trip.weather} destination={trip.destination} startDate={trip.start_date} endDate={trip.end_date} />,
    'Map & Route': <MapView routeData={trip.route_data} />,
    Budget: <BudgetBreakdown budget={{ ...(trip.budget_breakdown || {}), currency: trip.currency }} />,
    Packing: <PackingList packingList={trip.packing_list} onSave={savePackingList} onRegenerate={regeneratePackingList} saving={savingPacking} regenerating={regeneratingPacking} />,
    Transport: <TransportCard trip={trip} />,
    'Risk Alerts': <RiskAlerts riskData={trip.risk_alert} />,
    'Local Guide': (
      <div className="space-y-6">
        <div className="card">
          <div className="flex items-center gap-2.5 text-lg font-bold text-slate-900 dark:text-white">
            <Compass className="h-5 w-5 text-sky-600 dark:text-cyan-400" />
            Destination Intelligence: {trip.destination}
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Crucial local insights, safety guidelines, and emergency contacts for your journey.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Language</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                {trip.itinerary?.language || 'Local language'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Timezone</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                {trip.itinerary?.timezone || 'Local timezone'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Best Season</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                {trip.itinerary?.bestTimeToVisit || 'Shoulder season recommended'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Currency</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                {trip.currency || 'USD'}
              </p>
            </div>
          </div>
        </div>

        {/* Emergency helpline numbers */}
        <div className="rounded-[28px] border border-rose-200 bg-rose-50/70 p-6 dark:border-rose-500/20 dark:bg-rose-950/20">
          <div className="flex items-center gap-2 text-base font-bold text-rose-900 dark:text-rose-200">
            <ShieldAlert className="h-5 w-5 text-rose-600" />
            Local Emergency Helplines
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              ['Police Assistance', emergencyContacts.police || '112 / 911'],
              ['Medical / Ambulance', emergencyContacts.ambulance || '112 / 911'],
              ['Tourist Support Desk', emergencyContacts.tourist_helpline || 'Check hotel reception'],
            ].map(([label, val]) => (
              <div key={label} className="rounded-2xl border border-rose-200 bg-white p-4 shadow-sm dark:border-rose-500/20 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase text-rose-600 dark:text-rose-400">{label}</p>
                <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">{val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Essential Local Phrases */}
        {localPhrases.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <Languages className="h-5 w-5 text-sky-600" />
              Helpful Local Phrases
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {localPhrases.map((phrase, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                  <p className="text-sm font-bold text-sky-700 dark:text-cyan-300">"{phrase.phrase}"</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{phrase.meaning}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insider Travel Tips */}
        {travelTips.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <HeartHandshake className="h-5 w-5 text-emerald-600" />
              Insider Etiquette & Practical Tips
            </div>
            <ul className="mt-4 space-y-3">
              {travelTips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    ),
  }

  return (
    <div className="page-shell">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-sky-700 via-cyan-700 to-emerald-600 text-white shadow-[0_20px_70px_rgba(14,165,233,0.18)] dark:from-slate-900 dark:via-cyan-950 dark:to-slate-900 dark:shadow-[0_20px_70px_rgba(0,0,0,0.3)]">
        <div className="page-container py-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm mb-4">
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
              </Link>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">{trip.destination}</h1>
              <p className="text-sky-100 mb-4">From {trip.origin}</p>
              <div className="flex flex-wrap gap-4 text-sm text-cyan-50">
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{formatTripRange(trip.start_date, trip.end_date)}</span>
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{trip.travelers} traveler{trip.travelers !== 1 ? 's' : ''}</span>
                <span className="flex items-center gap-1.5"><DollarSign className="w-4 h-4" />{formatCurrency(trip.budget, trip.currency)} total</span>
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />Generated on {formatPlanDateTime(generatedAt)}</span>
                <span className="capitalize px-2.5 py-0.5 bg-white/20 rounded-full">{trip.travel_style}</span>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex flex-wrap gap-2.5 self-start">
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
              >
                <Share2 className="w-4 h-4" /> Share Trip
              </button>
              <button
                type="button"
                onClick={downloadCalendar}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
              >
                <Calendar className="w-4 h-4" /> Add to Calendar (.ics)
              </button>
              <button
                type="button"
                onClick={downloadPdf}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
              >
                <Download className="w-4 h-4" /> PDF Export
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
              <Link
                to="/assistant"
                state={{ tripId: trip.id }}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-sky-800 shadow-md transition hover:bg-sky-50 dark:bg-cyan-300 dark:text-slate-950"
              >
                <Sparkles className="w-4 h-4" /> Ask Copilot
              </Link>
              <button
                onClick={regenerateTrip}
                disabled={regeneratingTrip}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {regeneratingTrip ? <><Loader2 className="w-4 h-4 animate-spin" /> Regenerating...</> : <><RefreshCw className="w-4 h-4" /> Regenerate</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Weather Risk Banner */}
      <div className="page-container pt-6">
        <div className={`glass-panel mb-6 ${riskTone}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.24em] opacity-80">Weather-Aware Risk Alert</p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-2xl font-bold">{trip.risk_alert?.overall_risk_level || 'Low'}</span>
                <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1 text-sm dark:border-white/10 dark:bg-white/10">
                  {trip.risk_alert?.weather_condition || 'Conditions pending'}
                </span>
              </div>
            </div>
            <div className="max-w-xl text-sm opacity-90">
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

      {/* Tabs */}
      <div className="sticky top-16 z-10 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/90">
        <div className="page-container overflow-x-auto">
          <div className="flex gap-1 py-2">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? 'bg-sky-600 text-white dark:bg-cyan-400 dark:text-slate-950 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="page-container py-8">
        <Suspense fallback={<div className="glass-panel"><LoadingSpinner text={`Loading ${activeTab.toLowerCase()}...`} /></div>}>
          {tabContent[activeTab]}
        </Suspense>
      </div>

      <ChatBot tripContext={trip} />

      {/* Share Modal Dialog */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="card relative w-full max-w-lg animate-in fade-in zoom-in-95">
            <button
              type="button"
              onClick={() => setIsShareModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-sky-100 p-3 text-sky-600 dark:bg-cyan-900/40 dark:text-cyan-300">
                <Share2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Share Your Trip</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Anyone with this link can view the complete itinerary without signing in.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Public Link</label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="input-field text-xs text-slate-600 dark:text-slate-300"
                />
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="btn-primary shrink-0 text-xs py-3 px-4 inline-flex items-center gap-1.5"
                >
                  {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedLink ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Quick Share Buttons */}
            <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Quick Share Via</p>
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out my trip plan to ${trip.destination}: ${shareUrl}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent(`Trip plan to ${trip.destination}`)}&body=${encodeURIComponent(`Hey,\n\nHere is our trip itinerary for ${trip.destination}:\n${shareUrl}\n\nSafe travels!`)}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Mail className="h-4 w-4" /> Email
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
