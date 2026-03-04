import { useState } from 'react'
import { Backpack, Check } from 'lucide-react'

export default function PackingList({ packingList }) {
  const [checked, setChecked] = useState({})

  if (!packingList || packingList.length === 0) {
    return (
      <div className="card">
        <p className="text-gray-400 text-sm text-center py-4">Packing list not available</p>
      </div>
    )
  }

  const toggle = (key) => setChecked(prev => ({ ...prev, [key]: !prev[key] }))

  const totalItems = packingList.reduce((s, c) => s + (c.items?.length || 0), 0)
  const checkedCount = Object.values(checked).filter(Boolean).length

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Backpack className="w-5 h-5 text-orange-500" /> Smart Packing List
        </h3>
        <span className="text-sm text-gray-500">{checkedCount}/{totalItems} packed</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full mb-5 overflow-hidden">
        <div className="h-full bg-green-500 rounded-full transition-all duration-500"
          style={{ width: `${totalItems ? (checkedCount / totalItems) * 100 : 0}%` }} />
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        {packingList.map((category, ci) => (
          <div key={ci}>
            <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">{category.category}</h4>
            <ul className="space-y-1.5">
              {(category.items || []).map((item, ii) => {
                const key = `${ci}-${ii}`
                return (
                  <li key={ii}
                    className="flex items-center gap-2 cursor-pointer group"
                    onClick={() => toggle(key)}>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      checked[key]
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-300 dark:border-gray-600 group-hover:border-green-400'
                    }`}>
                      {checked[key] && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                    <span className={`text-sm transition-colors ${checked[key] ? 'line-through text-gray-400' : 'text-gray-600 dark:text-gray-300'}`}>
                      {item}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
