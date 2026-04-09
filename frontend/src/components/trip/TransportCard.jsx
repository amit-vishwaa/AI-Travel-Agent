import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Loader2, Plane, Search } from 'lucide-react'

import { tripService } from '../../services/tripService'

function googleSearchUrl(parts) {
  const query = parts
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .join(' ')
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}

function formatPrice(value, currency = 'USD') {
  if (value == null) return 'Price unavailable'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value))
  } catch {
    return `${Number(value).toLocaleString('en-US')} ${currency}`
  }
}

function formatDuration(minutes) {
  if (!minutes) return 'Duration unavailable'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-100">{value || 'Not available'}</p>
    </div>
  )
}

function ResolutionNote({ label, resolution }) {
  if (!resolution?.snippet) return null
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{label}</p>
      {resolution.used_nearest_airport && (
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-200">
          Nearest airport fallback used
        </p>
      )}
      <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{resolution.snippet}</p>
    </div>
  )
}

function dateSummary(metadata, startDate, endDate) {
  if (!metadata?.searched_outbound_date) {
    return `${startDate || 'Not set'}${endDate ? ` to ${endDate}` : ''}`
  }
  const searched = `${metadata.searched_outbound_date}${metadata.searched_return_date ? ` to ${metadata.searched_return_date}` : ''}`
  if (!metadata.used_nearby_date) return searched
  const direction = metadata.date_offset_days > 0 ? `+${metadata.date_offset_days}` : `${metadata.date_offset_days}`
  return `${searched} (shifted ${direction} day${Math.abs(metadata.date_offset_days) === 1 ? '' : 's'})`
}

function FlightCard({ flight, destination, origin, startDate, bookingUrl, currency = 'USD' }) {
  const firstLeg = flight.flights?.[0]
  const lastLeg = flight.flights?.[flight.flights.length - 1]
  const searchUrl = bookingUrl || googleSearchUrl([
    'flight',
    origin,
    destination,
    firstLeg?.airline || flight.airline,
    startDate,
  ])
  return (
    <article className="rounded-[28px] border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/60">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-sky-600 p-3 text-white dark:bg-cyan-300 dark:text-slate-950">
              <Plane className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{flight.airline}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {firstLeg?.departure_airport?.id || origin} to {lastLeg?.arrival_airport?.id || destination}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
              {formatPrice(flight.price, currency)}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              {formatDuration(flight.total_duration)}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              {flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
            </span>
            {!!flight.travel_class && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                {flight.travel_class}
              </span>
            )}
          </div>
        </div>

        <a
          href={searchUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200 dark:hover:bg-cyan-400/15"
        >
          <ExternalLink className="h-4 w-4" />
          Book on Google
        </a>
      </div>

      {!!flight.flights?.length && (
        <div className="mt-5 space-y-3">
          {flight.flights.map((segment, index) => (
            <div
              key={`${segment.flight_number || segment.airline}-${index}`}
              className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {segment.departure_airport?.id}
                    {segment.departure_airport?.time ? ` - ${segment.departure_airport.time}` : ''}
                    {' '}to{' '}
                    {segment.arrival_airport?.id}
                    {segment.arrival_airport?.time ? ` - ${segment.arrival_airport.time}` : ''}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {segment.airline}
                    {segment.flight_number ? ` - ${segment.flight_number}` : ''}
                  </p>
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {formatDuration(segment.duration)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

export default function TransportCard({ trip }) {
  const [flightsData, setFlightsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadFlights() {
      if (!trip?.id) {
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        setError('')
        const res = await tripService.getTripFlights(trip.id)
        if (!active) return
        setFlightsData(res.data)
        setError(res.data?.error || '')
      } catch (err) {
        if (!active) return
        setFlightsData(null)
        setError(err.response?.data?.detail || 'Flight search is unavailable right now.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadFlights()
    return () => {
      active = false
    }
  }, [trip?.id])

  const {
    origin,
    destination,
    start_date: startDate,
    end_date: endDate,
    travelers,
  } = trip || {}

  const metadata = flightsData?.search_metadata || {}
  const flightCurrency = metadata.currency || trip?.currency || 'USD'

  const fallbackSearchUrl = useMemo(() => googleSearchUrl([
    'flights from',
    origin,
    'to',
    destination,
    startDate,
    endDate,
  ]), [origin, destination, startDate, endDate])

  const allFlights = [
    ...(flightsData?.best_flights || []),
    ...(flightsData?.other_flights || []),
  ]
  const bookingUrl = flightsData?.booking_url || flightsData?.search_url || fallbackSearchUrl

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-slate-200 bg-white/95 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-slate-950/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 dark:text-cyan-200">Transport</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">Reach {destination} by flight</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Flight options for your saved route and travel dates. This tab now tries to resolve city names into Google Flights airport codes automatically.
            </p>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-100">
            {travelers} traveler{travelers !== 1 ? 's' : ''} - {startDate} to {endDate}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          <InfoRow label="From" value={origin} />
          <InfoRow label="To" value={destination} />
          <InfoRow label="Dates" value={dateSummary(metadata, startDate, endDate)} />
          <InfoRow
            label="From code"
            value={metadata.origin_code ? `${metadata.origin_code}${metadata.origin_resolution?.used_nearest_airport ? ' (nearest)' : ''}` : ''}
          />
          <InfoRow
            label="To code"
            value={metadata.destination_code ? `${metadata.destination_code}${metadata.destination_resolution?.used_nearest_airport ? ' (nearest)' : ''}` : ''}
          />
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-sky-200 bg-sky-50/80 p-4 dark:border-cyan-400/20 dark:bg-cyan-400/10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-cyan-200">Starting fare</p>
            <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
              {formatPrice(flightsData?.lowest_price, flightCurrency)}
            </p>
          </div>
          <a
            href={bookingUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-300 bg-white px-4 py-2 text-sm font-semibold text-sky-800 transition hover:bg-sky-100 dark:border-cyan-400/20 dark:bg-slate-950/60 dark:text-cyan-100 dark:hover:bg-cyan-400/15"
          >
            <ExternalLink className="h-4 w-4" />
            Book on Google Flights
          </a>
        </div>

        {(metadata.origin_resolution?.snippet || metadata.destination_resolution?.snippet) && (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <ResolutionNote label="Origin lookup" resolution={metadata.origin_resolution} />
            <ResolutionNote label="Destination lookup" resolution={metadata.destination_resolution} />
          </div>
        )}
      </section>

      {loading ? (
        <div className="rounded-[28px] border border-slate-200 bg-white/95 p-8 text-center shadow-sm dark:border-white/10 dark:bg-slate-950/60">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-sky-600 dark:text-cyan-200" />
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Loading flight options...</p>
        </div>
      ) : allFlights.length > 0 ? (
        <div className="space-y-4">
          {allFlights.map((flight, index) => (
            <FlightCard
              key={`${flight.airline}-${flight.price}-${index}`}
              flight={flight}
              destination={destination}
              origin={origin}
              startDate={startDate}
              bookingUrl={bookingUrl}
              currency={flightCurrency}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50/90 p-6 shadow-sm dark:border-amber-400/20 dark:bg-amber-400/10">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-amber-500 p-3 text-white">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Flight results not available yet</h3>
              <p className="mt-2 text-sm leading-7 text-slate-700 dark:text-slate-200">
                {error || 'No structured flights were returned for this route.'}
              </p>
              {metadata.used_nearby_date && (
                <p className="mt-2 text-sm leading-7 text-slate-700 dark:text-slate-200">
                  The search also checked nearby dates and found the closest available window around your travel plan.
                </p>
              )}
              {(!metadata.origin_code || !metadata.destination_code) && (
                <p className="mt-2 text-sm leading-7 text-slate-700 dark:text-slate-200">
                  Tip: save the route with airport codes like Delhi (DEL) and Dubai (DXB) for the most reliable Google Flights results.
                </p>
              )}
              <a
                href={bookingUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-400/20 dark:bg-slate-950/60 dark:text-amber-100 dark:hover:bg-amber-400/15"
              >
                <ExternalLink className="h-4 w-4" />
                Book on Google Flights
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
