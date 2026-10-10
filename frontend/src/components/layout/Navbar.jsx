import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, LayoutDashboard, LogOut, Map, Menu, Moon, Settings2, Sparkles, Sun, X } from 'lucide-react'

import AeroMindLogo from '../branding/AeroMindLogo'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useTravelSettings } from '../../context/TravelSettingsContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { isDark, toggle } = useTheme()
  const {
    selectedCountry,
    currency,
    countryOptions,
    updateCountry,
    setCurrency,
    aiProvider,
    aiModel,
    aiProviderOptions,
    updateAiProvider,
  } = useTravelSettings()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [countryQuery, setCountryQuery] = useState('')
  const settingsRef = useRef(null)
  const filteredCountries = countryOptions.filter((option) => {
    const q = countryQuery.trim().toLowerCase()
    if (!q) return true
    return `${option.label} ${option.region} ${option.code} ${option.currency}`.toLowerCase().includes(q)
  })

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setSettingsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <nav aria-label="Main navigation" className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 shadow-[0_4px_24px_rgba(15,23,42,0.035)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-[#080f1b] dark:shadow-[0_8px_28px_rgba(0,0,0,0.24)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div ref={settingsRef} className="relative">
              <button
                type="button"
                onClick={() => setSettingsOpen(prev => !prev)}
                aria-expanded={settingsOpen}
                aria-haspopup="true"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-200 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-cyan-500/50 dark:hover:text-cyan-200"
              >
                <Settings2 className="h-4 w-4" />
                <span className="hidden lg:inline">{selectedCountry.label}</span>
                <span className="lg:hidden">{selectedCountry.code}</span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {settingsOpen && (
                <div className="absolute left-0 top-14 z-50 w-72 rounded-[1.5rem] border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-900">
                  <p className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-400">Travel Settings</p>
                  <label className="label">Region / Country</label>
                  <input
                    type="search"
                    className="input-field mb-2"
                    placeholder="Search country..."
                    value={countryQuery}
                    onChange={(e) => setCountryQuery(e.target.value)}
                  />
                  <select
                    className="input-field mb-4"
                    value={selectedCountry.code}
                    onChange={(e) => updateCountry(e.target.value)}
                  >
                    {(filteredCountries.length ? filteredCountries : countryOptions).map(option => (
                      <option key={option.code} value={option.code}>
                        {option.label} - {option.region}
                      </option>
                    ))}
                  </select>

                  <label className="label">Currency</label>
                  <select
                    className="input-field"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    {[...new Set(countryOptions.map(option => option.currency))].map(option => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-3 text-primary-600 dark:text-primary-400">
              <AeroMindLogo className="h-10 w-10" withWordmark={false} />
              <div className="hidden sm:block">
                <div className="font-['Space_Grotesk'] text-[1.35rem] font-bold leading-none text-slate-900 dark:text-white">
                  AI Travel Agent
                </div>
                <div className="mt-1 text-[0.72rem] uppercase tracking-[0.34em] text-slate-500 dark:text-slate-400">
                  Travel Planner
                </div>
              </div>
            </Link>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <div className="mr-2 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-1.5 py-1 dark:border-slate-700/80 dark:bg-slate-900">
              <select
                aria-label="AI provider"
                value={aiProvider}
                onChange={(e) => updateAiProvider(e.target.value)}
                className="rounded-full bg-transparent px-2 py-0.5 text-xs font-semibold text-slate-700 outline-none dark:text-slate-200"
              >
                {aiProviderOptions.map(option => (
                  <option key={option.value} value={option.value} className={isDark ? 'bg-slate-900' : 'bg-white'}>
                    {option.label}
                  </option>
                ))}
              </select>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {aiModel}
              </span>
            </div>

            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive('/dashboard')
                      ? 'border border-sky-200 bg-sky-50 text-sky-700 dark:border-cyan-400/35 dark:bg-cyan-300/10 dark:text-cyan-200'
                      : 'border border-slate-200 bg-white/80 text-slate-700 hover:border-sky-200 hover:text-sky-700 dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-cyan-500/50 dark:hover:text-cyan-200'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
                <Link
                  to="/plan"
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive('/plan')
                      ? 'border border-sky-200 bg-sky-50 text-sky-700 dark:border-cyan-400/35 dark:bg-cyan-300/10 dark:text-cyan-200'
                      : 'border border-slate-200 bg-white/80 text-slate-700 hover:border-sky-200 hover:text-sky-700 dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-cyan-500/50 dark:hover:text-cyan-200'
                  }`}
                >
                  <Map className="h-4 w-4" /> Plan
                </Link>
                <Link
                  to="/assistant"
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive('/assistant')
                      ? 'border border-sky-200 bg-sky-50 text-sky-700 dark:border-cyan-400/35 dark:bg-cyan-300/10 dark:text-cyan-200'
                      : 'border border-slate-200 bg-white/80 text-slate-700 hover:border-sky-200 hover:text-sky-700 dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-cyan-500/50 dark:hover:text-cyan-200'
                  }`}
                >
                  <Sparkles className="h-4 w-4" /> Assistant
                </Link>
                <div className="ml-2 flex items-center gap-1 border-l border-slate-200 pl-2 dark:border-gray-800">
                  <span className="px-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
                    Hi, {user.name?.split(' ')[0]}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-sky-700 transition hover:text-sky-800 dark:text-cyan-300 dark:hover:text-cyan-200">
                  Login
                </Link>
                <Link to="/register" className="btn-primary text-sm">
                  Get Started
                </Link>
              </>
            )}

            <button onClick={toggle} className="rounded-full border border-slate-200 bg-white/80 p-2 text-slate-500 transition hover:border-sky-200 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-cyan-500/50 dark:hover:text-cyan-200" aria-label="Toggle theme">
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={toggle}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              className="rounded-full border border-slate-200 bg-white/80 p-2 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              className="rounded-full border border-slate-200 bg-white/80 p-2 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
          <div id="mobile-navigation" className="space-y-1 border-t border-slate-200/70 bg-white/95 px-4 py-4 shadow-xl backdrop-blur-xl dark:border-slate-700/70 dark:bg-[#080f1b] md:hidden">
          <div className="mb-3 rounded-[1.25rem] border border-slate-200 p-3 dark:border-gray-800">
            <label className="label">Region / Country</label>
            <select className="input-field mb-3" value={selectedCountry.code} onChange={(e) => updateCountry(e.target.value)}>
              {countryOptions.map(option => (
                <option key={option.code} value={option.code}>
                  {option.label} - {option.region}
                </option>
              ))}
            </select>

            <label className="label">Currency</label>
            <select className="input-field" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {[...new Set(countryOptions.map(option => option.currency))].map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <label className="label mt-3">AI Provider</label>
            <select className="input-field" value={aiProvider} onChange={(e) => updateAiProvider(e.target.value)}>
              {aiProviderOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Current model: {aiModel}</p>
          </div>

          {user ? (
            <>
              <Link to="/dashboard" onClick={() => setMenuOpen(false)} className={`block rounded-xl px-3 py-3 text-sm font-semibold ${isActive('/dashboard') ? 'bg-sky-50 text-sky-800 dark:bg-cyan-300/10 dark:text-cyan-200' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-gray-800'}`}>
                Dashboard
              </Link>
              <Link to="/plan" onClick={() => setMenuOpen(false)} className={`block rounded-xl px-3 py-3 text-sm font-semibold ${isActive('/plan') ? 'bg-sky-50 text-sky-800 dark:bg-cyan-300/10 dark:text-cyan-200' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-gray-800'}`}>
                Plan Trip
              </Link>
              <Link to="/assistant" onClick={() => setMenuOpen(false)} className={`block rounded-xl px-3 py-3 text-sm font-semibold ${isActive('/assistant') ? 'bg-sky-50 text-sky-800 dark:bg-cyan-300/10 dark:text-cyan-200' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-gray-800'}`}>
                Assistant
              </Link>
              <button onClick={() => { handleLogout(); setMenuOpen(false) }} className="block w-full rounded-xl px-3 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:text-rose-300 dark:hover:bg-rose-400/10">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Login
              </Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-semibold text-primary-600">
                Register
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
