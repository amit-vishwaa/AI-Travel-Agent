import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Calendar, DollarSign, Download, ExternalLink, MapPin, Share2, Sparkles, Users } from 'lucide-react'
import toast from 'react-hot-toast'

import LoadingSpinner from '../components/common/LoadingSpinner'
import ItineraryView from '../components/trip/ItineraryView'
import WeatherCard from '../components/trip/WeatherCard'
import { tripService } from '../services/tripService'
import { formatCurrency } from '../utils/currency'
import { formatTripRange } from '../utils/dates'

const MapView = lazy(() => import('../components/trip/MapView'))

const tabs = ['Itinerary', 'Weather', 'Map & Route', 'Packing']

export default function SharedTripPage() {
  const { id } = useParams()
  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Itinerary')

  useEffect(() => {
    async function loadSharedTrip() {
      try {
        const res = await tripService.getPublicTrip(id)
        setTrip(res.data)
      } catch (err) {
        toast.error('Could not load shared trip. It may have expired or been removed.')
      } finally {
        setLoading(false)
      }
    }
    loadSharedTrip()
  }, [id])

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
      toast.success('Calendar downloaded! Open it to import into Google/Apple Calendar.')
    } catch {
      toast.error('Calendar export unavailable')
    }
  }

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Share link copied to clipboard!')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" text="Loading shared travel plan..." />
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="page-shell flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <div className="card max-w-md">
          <MapPin className="mx-auto h-12 w-12 text-sky-500" />
          <h2 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Trip Not Found</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            This shared trip link might be invalid or has been deleted.
          </p>
          <Link to="/" className="btn-primary mt-6 inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Plan a Free Trip Now
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell min-h-screen">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-sky-700 via-cyan-700 to-emerald-600 text-white shadow-lg dark:from-slate-900 dark:via-cyan-950 dark:to-slate-900">
        <div className="page-container py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1 text-xs font-semibold backdrop-blur-sm">
                <Share2 className="h-3.5 w-3.5" /> Shared Travel Itinerary
              </div>
              <h1 className="text-3xl font-extrabold sm:text-4xl">{trip.destination}</h1>
              <p className="mt-1 text-sky-100">Origin: {trip.origin}</p>
              
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-cyan-50">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" /> {formatTripRange(trip.start_date, trip.end_date)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> {trip.travelers} traveler{trip.travelers !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4" /> {formatCurrency(trip.budget, trip.currency)} total
                </span>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 capitalize">
                  {trip.travel_style}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={downloadCalendar}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
              >
                <Download className="h-4 w-4" /> Add to Calendar (.ics)
              </button>
              <button
                type="button"
                onClick={copyShareLink}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
              >
                <Share2 className="h-4 w-4" /> Copy Link
              </button>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-sm font-bold text-sky-800 shadow-md transition hover:bg-sky-50 dark:bg-cyan-300 dark:text-slate-950"
              >
                <Sparkles className="h-4 w-4" /> Plan Your Trip Free
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/90">
        <div className="page-container overflow-x-auto">
          <div className="flex gap-2 py-2">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? 'bg-sky-600 text-white shadow-sm dark:bg-cyan-400 dark:text-slate-950'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-gray-800'
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
        {activeTab === 'Itinerary' && (
          <ItineraryView itinerary={trip.itinerary} currency={trip.currency} tripPackingList={trip.packing_list} />
        )}
        {activeTab === 'Weather' && (
          <WeatherCard weather={trip.weather} destination={trip.destination} startDate={trip.start_date} endDate={trip.end_date} />
        )}
        {activeTab === 'Map & Route' && (
          <Suspense fallback={<div className="glass-panel"><LoadingSpinner text="Loading map..." /></div>}>
            <MapView routeData={trip.route_data} />
          </Suspense>
        )}
        {activeTab === 'Packing' && (
          <div className="card">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Recommended Packing List</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Curated essentials for {trip.destination}</p>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {['clothing', 'essentials', 'documents'].map(cat => (
                <div key={cat} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 capitalize">{cat}</h4>
                  <ul className="mt-3 space-y-2">
                    {(trip.packing_list?.[cat] || []).map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                        {typeof item === 'string' ? item : item?.name || item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="border-t border-slate-200 bg-white py-12 text-center dark:border-slate-800 dark:bg-slate-950">
        <div className="page-container max-w-2xl">
          <Sparkles className="mx-auto h-8 w-8 text-sky-500" />
          <h3 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            Want to plan your dream vacation?
          </h3>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Generate custom AI itineraries with real weather, live flight checks, and budget calculators in seconds — completely free!
          </p>
          <Link to="/register" className="btn-primary mt-6 inline-flex items-center gap-2">
            Create Free Account & Start Planning
          </Link>
        </div>
      </div>
    </div>
  )
}
