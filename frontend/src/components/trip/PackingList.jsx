import { useEffect, useMemo, useState } from 'react'
import { Backpack, Check, PencilLine, Plus, RefreshCw, Save, Trash2 } from 'lucide-react'

const categoryOrder = ['clothing', 'essentials', 'documents', 'custom']

export default function PackingList({ packingList, onSave, onRegenerate, saving = false, regenerating = false }) {
  const [draft, setDraft] = useState({})
  const [newItems, setNewItems] = useState({})

  useEffect(() => {
    setDraft(packingList || {})
  }, [packingList])

  const totalItems = useMemo(
    () => Object.values(draft || {}).reduce((sum, items) => sum + (items?.length || 0), 0),
    [draft]
  )
  const packedCount = useMemo(
    () => Object.values(draft || {}).flat().filter(item => item?.packed).length,
    [draft]
  )

  if (!packingList || totalItems === 0) {
    return (
      <div className="card">
        <p className="text-gray-400 text-sm text-center py-4">Packing list not available</p>
      </div>
    )
  }

  const updateItem = (category, id, patch) => {
    setDraft(prev => ({
      ...prev,
      [category]: (prev[category] || []).map(item => (item.id === id ? { ...item, ...patch } : item)),
    }))
  }

  const removeItem = (category, id) => {
    setDraft(prev => ({
      ...prev,
      [category]: (prev[category] || []).filter(item => item.id !== id),
    }))
  }

  const addItem = (category) => {
    const value = (newItems[category] || '').trim()
    if (!value) return
    setDraft(prev => ({
      ...prev,
      [category]: [
        ...(prev[category] || []),
        { id: `${category}-${Date.now()}`, name: value, packed: false },
      ],
    }))
    setNewItems(prev => ({ ...prev, [category]: '' }))
  }

  return (
    <div className="card space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Backpack className="w-5 h-5 text-orange-500" /> AI Packing List
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Generated from destination, weather, and trip type. You can edit, remove, or add your own items.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onRegenerate?.()}
            disabled={regenerating}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} /> {regenerating ? 'Regenerating...' : 'Regenerate AI List'}
          </button>
          <button
            type="button"
            onClick={() => onSave?.(draft)}
            disabled={saving}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 px-4 py-3 text-sm text-sky-800 dark:text-sky-200">
        {packedCount}/{totalItems} packed. Add any custom item directly in a category and save when you are done.
      </div>

      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 rounded-full transition-all duration-500"
          style={{ width: `${totalItems ? (packedCount / totalItems) * 100 : 0}%` }}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {categoryOrder.map((category) => (
          <div key={category} className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200 capitalize">{category}</h4>
              <span className="text-xs text-gray-400 dark:text-slate-500">{(draft[category] || []).length} items</span>
            </div>

            <div className="space-y-2 mb-3">
              {(draft[category] || []).map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-xl bg-gray-50 dark:bg-gray-800 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => updateItem(category, item.id, { packed: !item.packed })}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                      item.packed ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {item.packed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </button>
                  <input
                    className={`flex-1 bg-transparent text-sm focus:outline-none ${
                      item.packed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'
                    }`}
                    value={item.name}
                    onChange={(e) => updateItem(category, item.id, { name: e.target.value })}
                  />
                  <PencilLine className="w-4 h-4 text-gray-300" />
                  <button type="button" onClick={() => removeItem(category, item.id)} className="text-rose-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                className="input-field py-2 text-sm"
                placeholder={`Add ${category} item`}
                value={newItems[category] || ''}
                onChange={(e) => setNewItems(prev => ({ ...prev, [category]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && addItem(category)}
              />
              <button type="button" onClick={() => addItem(category)} className="btn-secondary inline-flex items-center gap-1 px-4">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
