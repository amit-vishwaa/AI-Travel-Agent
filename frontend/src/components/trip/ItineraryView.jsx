import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, BedDouble, CalendarRange, CircleDollarSign, Clock3, ExternalLink, Languages, ShieldAlert, Sparkles, Wallet } from 'lucide-react'

const categoryMeta = {
  sightseeing: { icon: '🏛', label: 'Sightseeing', tone: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200' },
  food: { icon: '🍽', label: 'Food', tone: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200' },
  adventure: { icon: '🧗', label: 'Adventure', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200' },
  culture: { icon: '🎭', label: 'Culture', tone: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200' },
  shopping: { icon: '🛍', label: 'Shopping', tone: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-500/20 dark:bg-fuchsia-500/10 dark:text-fuchsia-200' },
  relaxation: { icon: '🧘', label: 'Relaxation', tone: 'border-lime-200 bg-lime-50 text-lime-700 dark:border-lime-500/20 dark:bg-lime-500/10 dark:text-lime-200' },
  transport: { icon: '🚌', label: 'Transport', tone: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200' },
}

function moneyText(value, currency = 'USD') {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return String(value || '').trim()
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `${amount} ${currency}`
  }
}

function providerText(provider) {
  const value = String(provider || '').trim()
  return value ? `Powered by ${value}` : ''
}

function googleSearchUrl(...parts) {
  const query = parts
    .flat()
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .join(' ')
  return query ? `https://www.google.com/search?q=${encodeURIComponent(query)}` : '#'
}

function firstFilled(...values) {
  for (const value of values) {
    if (String(value || '').trim()) return String(value).trim()
  }
  return ''
}

function legacyCategory(slotName, slot) {
  const text = `${slot?.activity || ''} ${slot?.description || ''}`.toLowerCase()
  if (text.includes('food') || text.includes('cafe') || text.includes('restaurant') || text.includes('lunch') || text.includes('dinner')) return 'food'
  if (text.includes('market') || text.includes('shop') || text.includes('boutique')) return 'shopping'
  if (text.includes('museum') || text.includes('theatre') || text.includes('temple') || text.includes('heritage')) return 'culture'
  if (text.includes('hike') || text.includes('trail') || text.includes('adventure')) return 'adventure'
  if (text.includes('spa') || text.includes('relax') || text.includes('sunset')) return 'relaxation'
  if (slotName === 'evening') return 'culture'
  return 'sightseeing'
}

function mealObjectFromLegacy(meals) {
  const mapped = { breakfast: '', lunch: '', dinner: '' }
  for (const meal of meals || []) {
    const key = String(meal?.meal || '').trim().toLowerCase()
    if (key === 'breakfast' || key === 'lunch' || key === 'dinner') {
      mapped[key] = firstFilled(
        `${meal?.suggestion || ''}${meal?.cuisine ? ` - ${meal.cuisine}` : ''}`,
        meal?.suggestion,
      )
    }
  }
  return mapped
}

function flattenTripPackingList(packingList, limit = 10) {
  const categoryOrder = ['clothing', 'essentials', 'documents', 'custom']
  const flattened = []
  for (const category of categoryOrder) {
    for (const item of packingList?.[category] || []) {
      const name = firstFilled(item?.name, item)
      if (name && !flattened.includes(name)) flattened.push(name)
      if (flattened.length >= limit) return flattened
    }
  }
  return flattened
}

function normalizeLegacyItinerary(itinerary, currency, tripPackingList) {
  const days = (itinerary?.days || []).map((day, index) => {
    const activities = ['morning', 'afternoon', 'evening']
      .map((slotName, slotIndex) => {
        const slot = day?.[slotName]
        if (!slot) return null
        return {
          time: ['9:00 AM', '1:00 PM', '6:00 PM'][slotIndex],
          activity: firstFilled(slot.activity, `${slotName[0].toUpperCase()}${slotName.slice(1)} activity`),
          location: firstFilled(slot.location, 'Location pending'),
          duration: firstFilled(slot.duration, '2-3 hours'),
          cost: firstFilled(slot.estimated_cost ? moneyText(slot.estimated_cost, currency) : '', 'Included in plan'),
          tips: firstFilled(slot.tips, slot.description, 'Keep some buffer time around this stop.'),
          category: legacyCategory(slotName, slot),
        }
      })
      .filter(Boolean)

    const accommodation = day?.accommodation
      ? firstFilled(
          `${day.accommodation.name || 'Stay'}${day.accommodation.type ? `, ${day.accommodation.type}` : ''}${day.accommodation.area ? ` in ${day.accommodation.area}` : ''}`,
          day.accommodation.name,
        )
      : 'Accommodation details not available'

    const transport = day?.transport
      ? firstFilled(
          `${day.transport.mode || 'Local transport'}${day.transport.details ? ` - ${day.transport.details}` : ''}`,
          day.transport.mode,
        )
      : 'Transport details not available'

    return {
      day: day?.day || index + 1,
      title: firstFilled(day?.theme, `Day ${index + 1}`),
      theme: firstFilled(day?.theme, 'Daily highlights'),
      weather: firstFilled(day?.date, 'Weather details not specified'),
      activities,
      meals: mealObjectFromLegacy(day?.meals),
      accommodation,
      transport,
      estimatedDailyBudget: firstFilled(
        day?.daily_total_estimate ? moneyText(day.daily_total_estimate, currency) : '',
        'Budget not specified',
      ),
    }
  })

  const totalBudget = (itinerary?.days || []).reduce((sum, day) => {
    const amount = Number(day?.daily_total_estimate)
    return Number.isFinite(amount) ? sum + amount : sum
  }, 0)

  return {
    destination: firstFilled(itinerary?.destination, 'Planned destination'),
    duration: firstFilled(itinerary?.duration, days.length ? `${days.length} days` : '', 'Trip duration'),
    theme: firstFilled(itinerary?.theme, days[0]?.theme, 'Custom trip plan'),
    bestTimeToVisit: firstFilled(itinerary?.bestTimeToVisit, 'Check seasonal conditions before booking.'),
    currency: firstFilled(itinerary?.currency, currency),
    language: firstFilled(itinerary?.language, 'Local language varies by destination'),
    timezone: firstFilled(itinerary?.timezone, 'Local time'),
    overview: firstFilled(itinerary?.overview, itinerary?.trip_summary, 'A saved itinerary is available for this trip.'),
    travelTips: (itinerary?.travelTips?.length ? itinerary.travelTips : [...(itinerary?.local_tips || []), ...(itinerary?.travel_suggestions || [])]).slice(0, 5),
    emergencyContacts: {
      police: firstFilled(itinerary?.emergencyContacts?.police, 'Local emergency number'),
      ambulance: firstFilled(itinerary?.emergencyContacts?.ambulance, 'Local medical emergency'),
      tourist_helpline: firstFilled(itinerary?.emergencyContacts?.tourist_helpline, 'Tourist information desk'),
    },
    days,
    totalBudgetEstimate: firstFilled(itinerary?.totalBudgetEstimate, totalBudget > 0 ? moneyText(totalBudget, currency) : '', 'Budget not specified'),
    packingList: (itinerary?.packingList?.length ? itinerary.packingList : flattenTripPackingList(tripPackingList)),
    localPhrases: Array.isArray(itinerary?.localPhrases) ? itinerary.localPhrases : [],
    _meta: itinerary?._meta || {},
  }
}

function normalizeItinerary(itinerary, currency, tripPackingList) {
  if (!itinerary) return null
  if (itinerary.error) return itinerary
  if (Array.isArray(itinerary.days) && itinerary.days.every(day => Array.isArray(day?.activities))) {
    return {
      ...itinerary,
      currency: firstFilled(itinerary?.currency, currency),
      bestTimeToVisit: firstFilled(itinerary?.bestTimeToVisit, 'Check seasonal conditions before booking.'),
      language: firstFilled(itinerary?.language, 'Local language varies by destination'),
      timezone: firstFilled(itinerary?.timezone, 'Local time'),
      packingList: (itinerary?.packingList?.length ? itinerary.packingList : flattenTripPackingList(tripPackingList)),
      localPhrases: Array.isArray(itinerary?.localPhrases) ? itinerary.localPhrases : [],
      emergencyContacts: {
        police: firstFilled(itinerary?.emergencyContacts?.police, 'Local emergency number'),
        ambulance: firstFilled(itinerary?.emergencyContacts?.ambulance, 'Local medical emergency'),
        tourist_helpline: firstFilled(itinerary?.emergencyContacts?.tourist_helpline, 'Tourist information desk'),
      },
    }
  }
  return normalizeLegacyItinerary(itinerary, currency, tripPackingList)
}

function InfoStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{value || 'Not specified'}</p>
    </div>
  )
}

function Panel({ title, children, className = '' }) {
  return (
    <section className={`rounded-[28px] border border-slate-200 bg-white/92 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-slate-950/60 ${className}`}>
      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function SearchLink({ label = 'Search on Google', queryParts, className = '' }) {
  const href = googleSearchUrl(queryParts)
  if (href === '#') return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:text-sky-800 dark:text-cyan-200 dark:hover:text-cyan-100 ${className}`}
    >
      <ExternalLink className="h-3.5 w-3.5" />
      {label}
    </a>
  )
}

export default function ItineraryView({ itinerary, currency = 'USD', tripPackingList = null }) {
  const normalized = useMemo(() => normalizeItinerary(itinerary, currency, tripPackingList), [itinerary, currency, tripPackingList])
  const [activeDay, setActiveDay] = useState(0)

  useEffect(() => {
    setActiveDay(0)
  }, [normalized?.days?.length])

  if (!normalized || normalized.error) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-500/20 dark:bg-rose-500/10">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
        <p className="mt-3 text-sm font-medium text-rose-700 dark:text-rose-200">
          {normalized?.error || 'Itinerary not available'}
        </p>
      </div>
    )
  }

  const {
    destination,
    duration,
    theme,
    bestTimeToVisit,
    language,
    timezone,
    overview,
    travelTips = [],
    emergencyContacts = {},
    days = [],
    totalBudgetEstimate,
    packingList = [],
    localPhrases = [],
    _meta = {},
  } = normalized

  const packingSummary = packingList.length ? packingList : flattenTripPackingList(tripPackingList)
  const selectedDay = days[Math.min(activeDay, Math.max(days.length - 1, 0))]

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[34px] border border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(240,249,255,0.94),rgba(236,253,245,0.95))] p-6 shadow-[0_24px_70px_rgba(14,165,233,0.08)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(12,74,110,0.28),rgba(6,95,70,0.3))] sm:p-8">
        <div className="absolute right-4 top-4">
          {!!providerText(_meta.provider) && (
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
              <Sparkles className="h-3.5 w-3.5" />
              {providerText(_meta.provider)}
            </span>
          )}
        </div>

        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 dark:text-cyan-200">Destination Brief</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">{destination}</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-sm font-medium text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-100">{duration}</span>
            <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-sm font-medium text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-100">{theme}</span>
          </div>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-200">{overview}</p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <InfoStat icon={CalendarRange} label="Best Time" value={bestTimeToVisit} />
          <InfoStat icon={CircleDollarSign} label="Currency" value={normalized.currency || currency} />
          <InfoStat icon={Languages} label="Language" value={language} />
          <InfoStat icon={Clock3} label="Timezone" value={timezone} />
          <InfoStat icon={Wallet} label="Total Budget" value={totalBudgetEstimate} />
        </div>
      </section>

      <div className="rounded-[28px] border border-slate-200 bg-white/92 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-slate-950/60">
        <div className="overflow-x-auto">
          <div className="flex min-w-max gap-2">
            {days.map((day, index) => (
              <button
                key={`${day.day}-${index}`}
                type="button"
                onClick={() => setActiveDay(index)}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  index === activeDay
                    ? 'bg-slate-950 text-white shadow-[0_12px_35px_rgba(15,23,42,0.18)] dark:bg-cyan-300 dark:text-slate-950'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                }`}
              >
                Day {day.day || index + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedDay && (
        <section className="rounded-[32px] border border-slate-200 bg-white/95 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-slate-950/60 sm:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 dark:text-cyan-200">Day {selectedDay.day}</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{selectedDay.title}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">{selectedDay.theme}</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">{selectedDay.weather}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
              Daily budget: {selectedDay.estimatedDailyBudget}
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[ 
              ['Breakfast', selectedDay.meals?.breakfast],
              ['Lunch', selectedDay.meals?.lunch],
              ['Dinner', selectedDay.meals?.dinner],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-400/20 dark:bg-amber-400/10">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-200">{label}</p>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-800 dark:text-slate-100">{value || 'Not planned yet'}</p>
                {!!value && <SearchLink label={`Find ${label.toLowerCase()} place`} queryParts={[value, destination]} className="mt-3" />}
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {selectedDay.activities?.map((activity, index) => {
              const meta = categoryMeta[String(activity?.category || '').toLowerCase()] || categoryMeta.sightseeing
              return (
                <article key={`${activity.activity}-${index}`} className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">{activity.time}</span>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${meta.tone}`}>
                          {meta.icon} {meta.label}
                        </span>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">{activity.cost}</span>
                      </div>
                      <h4 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{activity.activity}</h4>
                      <SearchLink label="Search this stop" queryParts={[activity.activity, activity.location, destination]} className="mt-2" />
                    </div>
                    <div className="rounded-2xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
                      {activity.duration}
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">{activity.location}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">Tip:</span> {activity.tips}
                  </p>
                </article>
              )
            })}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <CalendarRange className="h-4 w-4 text-sky-500" />
                Transport
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{selectedDay.transport}</p>
              <SearchLink label="Search transport options" queryParts={[selectedDay.transport, destination]} className="mt-3" />
            </div>
            <div className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <BedDouble className="h-4 w-4 text-fuchsia-500" />
                Accommodation
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{selectedDay.accommodation}</p>
              <SearchLink label="Search stay" queryParts={[selectedDay.accommodation, destination]} className="mt-3" />
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Travel Tips">
          <ul className="space-y-3">
            {(travelTips.length ? travelTips : ['No travel tips available yet.']).map((tip, index) => (
              <li key={`${tip}-${index}`} className="flex items-start gap-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-sky-500" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Packing List">
          <div className="flex flex-wrap gap-2">
            {(packingSummary.length ? packingSummary : ['Packing suggestions unavailable']).map((item, index) => (
              <span key={`${item}-${index}`} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                {item}
              </span>
            ))}
          </div>
        </Panel>

        <Panel title="Local Phrases">
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
            <div className="grid grid-cols-2 bg-slate-100 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 dark:bg-white/5 dark:text-slate-300">
              <div className="px-4 py-3">Phrase</div>
              <div className="px-4 py-3">Meaning</div>
            </div>
            {(localPhrases.length ? localPhrases : [{ phrase: 'Unavailable', meaning: 'No local phrases returned' }]).map((item, index) => (
              <div key={`${item.phrase}-${index}`} className="grid grid-cols-2 border-t border-slate-200 text-sm text-slate-700 dark:border-white/10 dark:text-slate-200">
                <div className="px-4 py-3 font-medium">{item.phrase}</div>
                <div className="px-4 py-3">{item.meaning}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Emergency Contacts" className="border-rose-200 dark:border-rose-500/20">
          <div className="space-y-3">
            {[
              ['Police', emergencyContacts.police],
              ['Ambulance', emergencyContacts.ambulance],
              ['Tourist Helpline', emergencyContacts.tourist_helpline],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 dark:border-rose-500/20 dark:bg-rose-500/10">
                <ShieldAlert className="mt-0.5 h-4 w-4 text-rose-500" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700 dark:text-rose-200">{label}</p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-100">{value || 'Not specified'}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
