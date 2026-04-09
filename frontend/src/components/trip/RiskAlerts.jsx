import { AlertCircle, AlertTriangle, Info, Shield } from 'lucide-react'

const levelConfig = {
  low: { icon: Info, badge: 'badge-low', panel: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50' },
  medium: { icon: AlertTriangle, badge: 'badge-medium', panel: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50' },
  high: { icon: AlertCircle, badge: 'badge-high', panel: 'bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/50' },
}

export default function RiskAlerts({ riskData }) {
  const alerts = riskData?.alerts || []

  if (!alerts.length) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 text-emerald-600 py-2">
          <Shield className="w-5 h-5" />
          <span className="text-sm font-medium">No major risks identified for this trip.</span>
        </div>
      </div>
    )
  }

  const sorted = [...alerts].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2, High: 0, Medium: 1, Low: 2 }
    return (order[a.risk_level] ?? 2) - (order[b.risk_level] ?? 2)
  })

  return (
    <div className="space-y-4">
      <div className="card border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-900 dark:bg-slate-950 dark:text-white">
        <p className="mb-2 text-xs uppercase tracking-[0.24em] text-sky-700 dark:text-sky-200">Risk Snapshot</p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-2xl font-bold">{riskData?.overall_risk_level || 'Low'}</span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-100">
            {riskData?.weather_condition || 'Conditions stable'}
          </span>
        </div>
      </div>

      {sorted.map((alert, index) => {
        const level = String(alert.risk_level || 'Low').toLowerCase()
        const { icon: Icon, badge, panel } = levelConfig[level] || levelConfig.low
        return (
          <div key={`${alert.title}-${index}`} className={`rounded-2xl border p-4 ${panel}`}>
            <div className="flex items-start gap-3">
              <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white">{alert.title}</h4>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge}`}>{alert.risk_level}</span>
                  <span className="text-xs text-gray-500">{alert.category}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">{alert.weather_condition}</p>
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  <span className="font-semibold">Suggestion:</span> {alert.smart_suggestion}
                </p>
                {alert.timing && (
                  <p className="text-xs text-gray-500">
                    Best timing: {alert.timing}
                  </p>
                )}
                {alert.alternative && (
                  <p className="text-xs text-gray-500">
                    Alternative: {alert.alternative}
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
