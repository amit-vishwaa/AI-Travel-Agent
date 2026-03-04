import { useState } from 'react'
import { Sun, Coffee, Moon, Utensils, BedDouble, ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency } from '../../utils/currency'

const timeSlots = [
  { key: 'morning', icon: Coffee, label: 'Morning', color: 'text-orange-500' },
  { key: 'afternoon', icon: Sun, label: 'Afternoon', color: 'text-yellow-500' },
  { key: 'evening', icon: Moon, label: 'Evening', color: 'text-indigo-500' },
]

export default function ItineraryView({ itinerary, currency = 'USD' }) {
  const [expanded, setExpanded] = useState(0)

  if (!itinerary || itinerary.error) {
    return (
      <div className="card">
        <p className="text-gray-400 text-sm text-center py-4">
          {itinerary?.error || 'Itinerary not available'}
        </p>
      </div>
    )
  }

  const { days = [], trip_summary, highlights = [], local_tips = [] } = itinerary

  return (
    <div className="space-y-4">
      {trip_summary && (
        <div className="card bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border-primary-100 dark:border-primary-800">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{trip_summary}</p>
        </div>
      )}

      {highlights.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-base mb-3">Trip Highlights</h3>
          <ul className="space-y-1.5">
            {highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span className="text-primary-500 font-bold mt-0.5">-</span> {h}
              </li>
            ))}
          </ul>
        </div>
      )}

      {days.map((day, idx) => (
        <div key={idx} className="card overflow-hidden">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => setExpanded(expanded === idx ? -1 : idx)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600 text-white rounded-xl flex items-center justify-center font-bold text-sm">
                D{day.day}
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-900 dark:text-white">{day.theme}</p>
                <p className="text-xs text-gray-400">
                  {day.date} - Est. {formatCurrency(day.daily_total_estimate, currency)}
                </p>
              </div>
            </div>
            {expanded === idx ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          {expanded === idx && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-4">
              {timeSlots.map(({ key, icon: Icon, color }) => {
                const slot = day[key]
                if (!slot) return null
                return (
                  <div key={key} className="flex gap-3">
                    <div className="flex-shrink-0 flex flex-col items-center">
                      <Icon className={`w-5 h-5 ${color}`} />
                      <div className="w-px flex-1 bg-gray-100 dark:bg-gray-700 mt-1" />
                    </div>
                    <div className="pb-3 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm text-gray-900 dark:text-white">{slot.activity}</p>
                          <p className="text-xs text-gray-500 mb-1">{slot.location} - {slot.duration}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{slot.description}</p>
                          {slot.tips && <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 italic">Tip: {slot.tips}</p>}
                        </div>
                        <span className="text-sm font-bold text-green-600 whitespace-nowrap">{formatCurrency(slot.estimated_cost, currency)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}

              {day.meals && day.meals.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
                  <p className="font-semibold text-sm flex items-center gap-1.5 mb-2">
                    <Utensils className="w-4 h-4 text-amber-500" /> Meals
                  </p>
                  <div className="space-y-1">
                    {day.meals.map((m, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300">
                          <span className="font-medium">{m.meal}:</span> {m.suggestion} ({m.cuisine})
                        </span>
                        <span className="text-green-600 font-medium">{formatCurrency(m.cost, currency)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {day.accommodation && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3">
                  <p className="font-semibold text-sm flex items-center gap-1.5 mb-1">
                    <BedDouble className="w-4 h-4 text-purple-500" /> Accommodation
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {day.accommodation.name} ({day.accommodation.type}) - {day.accommodation.area}
                  </p>
                  <p className="text-sm font-bold text-green-600 mt-0.5">
                    {formatCurrency(day.accommodation.estimated_cost_per_night, currency)}/night
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {local_tips.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-base mb-3">Local Tips</h3>
          <ul className="space-y-2">
            {local_tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span className="text-yellow-500 mt-0.5">*</span> {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
