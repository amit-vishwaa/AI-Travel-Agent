import { Shield, AlertTriangle, AlertCircle, Info } from 'lucide-react'

const levelConfig = {
  low: { icon: Info, color: 'badge-low', bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
  medium: { icon: AlertTriangle, color: 'badge-medium', bg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' },
  high: { icon: AlertCircle, color: 'badge-high', bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' },
}

export default function RiskAlerts({ riskAlerts }) {
  if (!riskAlerts || riskAlerts.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 text-green-600 py-2">
          <Shield className="w-5 h-5" />
          <span className="text-sm font-medium">No major risks identified for this trip.</span>
        </div>
      </div>
    )
  }

  const sorted = [...riskAlerts].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return (order[a.level] ?? 2) - (order[b.level] ?? 2)
  })

  return (
    <div className="space-y-3">
      {sorted.map((alert, i) => {
        const { icon: Icon, color, bg } = levelConfig[alert.level] || levelConfig.low
        return (
          <div key={i} className={`rounded-xl border p-4 ${bg}`}>
            <div className="flex items-start gap-3">
              <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white">{alert.title}</h4>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${color}`}>
                    {alert.level}
                  </span>
                  <span className="text-xs text-gray-500">{alert.category}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{alert.description}</p>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-200">
                  ✅ <span className="font-semibold">Recommendation:</span> {alert.recommendation}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
