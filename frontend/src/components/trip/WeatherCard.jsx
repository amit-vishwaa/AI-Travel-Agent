import { Cloud, Droplets, ExternalLink, ThermometerSun } from 'lucide-react'

function weatherSearchUrl(destination, dateText = '') {
  const query = [destination, 'weather forecast', dateText].filter(Boolean).join(' ')
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}

export default function WeatherCard({ weather, destination = '', startDate = '', endDate = '' }) {
  if (!weather || weather.error) {
    return (
      <div className="card">
        <p className="text-gray-400 dark:text-slate-400 text-sm text-center py-4">
          {weather?.error || 'Weather data unavailable'}
        </p>
      </div>
    )
  }

  const { forecast = [] } = weather

  if (!forecast.length) {
    return (
      <div className="card">
        <p className="text-gray-400 dark:text-slate-400 text-sm text-center py-4">Weather forecast is not available for this trip yet.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Cloud className="w-5 h-5 text-sky-500" /> Weather Forecast
          <span className="text-sm text-gray-400 font-normal dark:text-slate-400">{weather.city}</span>
        </h3>

        {!!destination && (
          <a
            href={weatherSearchUrl(destination, startDate && endDate ? `${startDate} to ${endDate}` : startDate)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 self-start rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-100 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200 dark:hover:bg-sky-500/20"
          >
            <ExternalLink className="h-4 w-4" />
            Open travel weather
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {forecast.map((day) => (
          <div key={day.date} className="rounded-2xl border border-sky-100 bg-sky-50/80 p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-2">
              {new Date(`${day.date}T00:00:00`).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </p>
            <p className="font-semibold text-sm text-slate-900 dark:text-white mb-2">{day.description}</p>
            <div className="flex items-center gap-2 text-sm mb-2">
              <ThermometerSun className="w-4 h-4 text-orange-500 dark:text-orange-300" />
              <span className="font-semibold text-orange-600 dark:text-orange-300">{day.max_temp}°</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="font-semibold text-sky-600 dark:text-sky-300">{day.min_temp}°</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Droplets className="w-3.5 h-3.5" />
              <span>{day.precipitation_probability}% chance of rain</span>
            </div>
            {!!destination && (
              <a
                href={weatherSearchUrl(destination, day.date)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 hover:text-sky-800 dark:text-cyan-200 dark:hover:text-cyan-100"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Search this day
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
