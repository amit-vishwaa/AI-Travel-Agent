import { Cloud, Thermometer, Droplets, Wind } from 'lucide-react'

export default function WeatherCard({ weather }) {
  if (!weather || weather.error) {
    return (
      <div className="card">
        <p className="text-gray-400 text-sm text-center py-4">Weather data unavailable</p>
      </div>
    )
  }

  const { forecast = [] } = weather

  return (
    <div className="card">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        <Cloud className="w-5 h-5 text-blue-500" /> Weather Forecast
        <span className="text-sm text-gray-400 font-normal">— {weather.city}</span>
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {forecast.map((day, i) => (
          <div key={i} className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">
              {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
            <img
              src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`}
              alt={day.description}
              className="w-12 h-12 mx-auto"
            />
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{day.description}</p>
            <div className="flex items-center justify-center gap-1 text-sm font-bold">
              <span className="text-orange-500">{day.max_temp}°</span>
              <span className="text-gray-300">/</span>
              <span className="text-blue-500">{day.min_temp}°</span>
            </div>
            <div className="flex items-center justify-center gap-1 text-xs text-gray-400 mt-1">
              <Droplets className="w-3 h-3" />
              <span>{day.avg_humidity}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
