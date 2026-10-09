import { useEffect, useRef, useState } from 'react'

import { routeService } from '../../services/tripService'

export default function CityAutocomplete({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  isDark = false,
}) {
  const boxRef = useRef(null)
  const cacheRef = useRef(new Map())
  const requestRef = useRef(0)
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const query = String(value || '').trim()
    if (query.length < 2) {
      setSuggestions([])
      return
    }
    const normalizedQuery = query.toLowerCase()
    if (cacheRef.current.has(normalizedQuery)) {
      setSuggestions(cacheRef.current.get(normalizedQuery))
      return
    }
    const timer = setTimeout(async () => {
      const requestId = ++requestRef.current
      try {
        const res = await routeService.searchCities(query, 8)
        if (requestId !== requestRef.current) return
        const next = res.data?.suggestions || []
        cacheRef.current.set(normalizedQuery, next)
        setSuggestions(next)
      } catch {
        if (requestId === requestRef.current) setSuggestions([])
      }
    }, 160)
    return () => clearTimeout(timer)
  }, [value])

  const inputClass = isDark
    ? 'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30'
    : 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20'

  return (
    <div ref={boxRef} className="relative">
      {label && (
        <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
          {label}
        </label>
      )}
      <input
        type="text"
        className={inputClass}
        placeholder={placeholder}
        required={required}
        value={value}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
        }}
      />
      {open && suggestions.length > 0 && (
        <div className={isDark
          ? 'absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-2xl border border-white/10 bg-slate-900 p-2 shadow-2xl'
          : 'absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl'}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.label}-${index}`}
              type="button"
              className={isDark
                ? 'w-full rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/10'
                : 'w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100'}
              onClick={() => {
                onChange(suggestion.label)
                setOpen(false)
              }}
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
