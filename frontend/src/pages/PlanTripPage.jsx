import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { routeService, tripService } from '../services/tripService'
import { Plane, Brain, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const travelStyles = ['budget', 'balanced', 'luxury']
const currencies = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD']
const interestOptions = [
  'History & Culture',
  'Adventure & Sports',
  'Food & Cuisine',
  'Nature & Wildlife',
  'Art & Museums',
  'Beaches',
  'Nightlife',
  'Shopping',
  'Photography',
  'Spirituality',
]

export default function PlanTripPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [originSuggestions, setOriginSuggestions] = useState([])
  const [destinationSuggestions, setDestinationSuggestions] = useState([])
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false)
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false)
  const originBoxRef = useRef(null)
  const destinationBoxRef = useRef(null)
  const [form, setForm] = useState({
    origin: '',
    destination: '',
    start_date: '',
    end_date: '',
    budget: '',
    currency: 'USD',
    travelers: 1,
    travel_style: 'balanced',
    interests: [],
    special_requirements: ''
  })

  const toggleInterest = (interest) => {
    setForm(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }))
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (originBoxRef.current && !originBoxRef.current.contains(event.target)) {
        setShowOriginSuggestions(false)
      }
      if (destinationBoxRef.current && !destinationBoxRef.current.contains(event.target)) {
        setShowDestinationSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const query = form.origin.trim()
    if (query.length < 1) {
      setOriginSuggestions([])
      return
    }
    const t = setTimeout(async () => {
      try {
        const res = await routeService.searchCities(query, 8)
        setOriginSuggestions(res.data?.suggestions || [])
      } catch {
        setOriginSuggestions([])
      }
    }, 250)
    return () => clearTimeout(t)
  }, [form.origin])

  useEffect(() => {
    const query = form.destination.trim()
    if (query.length < 1) {
      setDestinationSuggestions([])
      return
    }
    const t = setTimeout(async () => {
      try {
        const res = await routeService.searchCities(query, 8)
        setDestinationSuggestions(res.data?.suggestions || [])
      } catch {
        setDestinationSuggestions([])
      }
    }, 250)
    return () => clearTimeout(t)
  }, [form.destination])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.start_date || !form.end_date) {
      toast.error('Please select travel dates')
      return
    }
    if (new Date(form.end_date) <= new Date(form.start_date)) {
      toast.error('End date must be after start date')
      return
    }

    setLoading(true)
    toast.loading('AI is crafting your trip plan...', { id: 'planning', duration: 60000 })

    try {
      const res = await tripService.createTrip({ ...form, budget: parseFloat(form.budget) })
      toast.dismiss('planning')
      toast.success('Your trip plan is ready!')
      if (Array.isArray(res.data?.generation_warnings) && res.data.generation_warnings.length > 0) {
        toast('Trip created with partial data. Some sections may be limited.')
      }
      navigate(`/trips/${res.data.id}`)
    } catch (err) {
      toast.dismiss('planning')
      if (err.code === 'ECONNABORTED') {
        toast.error('Trip generation took too long. It may still complete in background - check Dashboard in a few seconds.')
        navigate('/dashboard')
        return
      }
      toast.error(err.response?.data?.detail || 'Failed to create trip. Please check your API keys.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-2xl mb-4">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Plan Your AI Trip</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Fill in the details and let AI do the magic</p>
        </div>

        <div className="card shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div ref={originBoxRef} className="relative">
                <label className="label">Origin City *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. New York"
                  required
                  value={form.origin}
                  onFocus={() => setShowOriginSuggestions(true)}
                  onChange={e => {
                    setForm({ ...form, origin: e.target.value })
                    setShowOriginSuggestions(true)
                  }}
                />
                {showOriginSuggestions && originSuggestions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
                    {originSuggestions.map((s, idx) => (
                      <button
                        key={`${s.label}-${idx}`}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => {
                          setForm({ ...form, origin: s.label })
                          setShowOriginSuggestions(false)
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div ref={destinationBoxRef} className="relative">
                <label className="label">Destination *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Paris, France"
                  required
                  value={form.destination}
                  onFocus={() => setShowDestinationSuggestions(true)}
                  onChange={e => {
                    setForm({ ...form, destination: e.target.value })
                    setShowDestinationSuggestions(true)
                  }}
                />
                {showDestinationSuggestions && destinationSuggestions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
                    {destinationSuggestions.map((s, idx) => (
                      <button
                        key={`${s.label}-${idx}`}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => {
                          setForm({ ...form, destination: s.label })
                          setShowDestinationSuggestions(false)
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Start Date *</label>
                <input
                  type="date"
                  className="input-field"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={form.start_date}
                  onChange={e => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="label">End Date *</label>
                <input
                  type="date"
                  className="input-field"
                  required
                  min={form.start_date || new Date().toISOString().split('T')[0]}
                  value={form.end_date}
                  onChange={e => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Total Budget *</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="e.g. 2000"
                  required
                  min="1"
                  value={form.budget}
                  onChange={e => setForm({ ...form, budget: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Currency</label>
                <select
                  className="input-field"
                  value={form.currency}
                  onChange={e => setForm({ ...form, currency: e.target.value })}
                >
                  {currencies.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Number of Travelers</label>
                <input
                  type="number"
                  className="input-field"
                  min="1"
                  max="20"
                  value={form.travelers}
                  onChange={e => setForm({ ...form, travelers: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Travel Style</label>
                <div className="flex gap-2">
                  {travelStyles.map(style => (
                    <button
                      type="button"
                      key={style}
                      onClick={() => setForm({ ...form, travel_style: style })}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium capitalize transition-all ${
                        form.travel_style === style
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="label">Interests (select all that apply)</label>
              <div className="flex flex-wrap gap-2">
                {interestOptions.map(interest => (
                  <button
                    type="button"
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      form.interests.includes(interest)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Special Requirements <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea
                className="input-field resize-none"
                rows={3}
                placeholder="e.g. wheelchair accessible, halal food, traveling with kids..."
                value={form.special_requirements}
                onChange={e => setForm({ ...form, special_requirements: e.target.value })}
              />
            </div>

            <button type="submit" className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2" disabled={loading}>
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> AI is generating your plan...</>
              ) : (
                <><Plane className="w-5 h-5" /> Generate AI Trip Plan</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
