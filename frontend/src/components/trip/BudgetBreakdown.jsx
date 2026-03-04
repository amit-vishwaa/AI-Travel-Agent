import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { DollarSign, TrendingUp } from 'lucide-react'
import { formatCurrency } from '../../utils/currency'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

export default function BudgetBreakdown({ budget }) {
  if (!budget || budget.error) {
    return (
      <div className="card">
        <p className="text-gray-400 text-sm text-center py-4">Budget data unavailable</p>
      </div>
    )
  }

  const { categories = [], total_budget, per_person_budget, daily_budget, money_saving_tips = [], currency = 'USD' } = budget
  const chartData = categories.map(c => ({ name: c.name, value: c.amount }))

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Budget', value: formatCurrency(total_budget, currency) },
          { label: 'Per Person', value: formatCurrency(per_person_budget, currency) },
          { label: 'Per Day', value: formatCurrency(daily_budget, currency) },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <p className="text-xl font-bold text-primary-600 dark:text-primary-400">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pie chart */}
      <div className="card">
        <h3 className="font-bold text-base mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-500" /> Budget Allocation
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                paddingAngle={3} dataKey="value">
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(val) => formatCurrency(val, currency)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="card">
        <h3 className="font-bold text-base mb-4">Category Breakdown</h3>
        <div className="space-y-3">
          {categories.map((cat, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{cat.name}</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(cat.amount, currency)} ({cat.percentage}%)</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${cat.percentage}%`, backgroundColor: COLORS[i % COLORS.length] }} />
              </div>
              {cat.tips && <p className="text-xs text-gray-400 mt-1">💡 {cat.tips}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Money saving tips */}
      {money_saving_tips.length > 0 && (
        <div className="card bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800">
          <h3 className="font-bold text-base mb-3 flex items-center gap-2 text-green-700 dark:text-green-400">
            <TrendingUp className="w-5 h-5" /> Money Saving Tips
          </h3>
          <ul className="space-y-1.5">
            {money_saving_tips.map((tip, i) => (
              <li key={i} className="text-sm text-green-700 dark:text-green-300 flex items-start gap-2">
                <span className="font-bold">•</span> {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
