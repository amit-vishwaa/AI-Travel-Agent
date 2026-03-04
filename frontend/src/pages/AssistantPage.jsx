import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, Send, Sparkles, RefreshCw, MapPin } from 'lucide-react'
import { tripService, aiService } from '../services/tripService'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

function buildQuickPrompts(trip) {
  const destination = trip?.destination || 'my destination'
  return [
    `Create a day-wise plan for ${destination}`,
    `Give me a budget optimization strategy for ${destination}`,
    `What should I pack for ${destination}?`,
    `Give me local food and culture tips for ${destination}`,
    `What are key safety precautions for ${destination}?`,
  ]
}

export default function AssistantPage() {
  const { user } = useAuth()
  const [trips, setTrips] = useState([])
  const [selectedTripId, setSelectedTripId] = useState('')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    const loadTrips = async () => {
      try {
        const res = await tripService.getTrips()
        const list = res.data || []
        setTrips(list)
        if (list.length) setSelectedTripId(list[0].id)
      } catch {
        toast.error('Could not load your trips for context')
      }
    }
    loadTrips()
  }, [])

  const selectedTrip = useMemo(
    () => trips.find(t => t.id === selectedTripId) || null,
    [trips, selectedTripId]
  )

  const quickPrompts = useMemo(() => buildQuickPrompts(selectedTrip), [selectedTrip])

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: `Hi ${user?.name?.split(' ')[0] || 'there'}, I am your AI Travel Assistant. Pick a trip context or ask anything to start.`,
      }
    ])
  }, [user?.name])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (messageOverride = null) => {
    const userText = (messageOverride ?? input).trim()
    if (!userText || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userText }])
    setLoading(true)

    try {
      const res = await aiService.chat(userText, selectedTrip)
      const reply = res?.data?.response || 'I could not generate a response right now.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I could not reach the AI service right now. Please try again in a moment.',
      }])
    } finally {
      setLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: `Session reset. Ask me anything about ${selectedTrip?.destination || 'your next trip'}.`,
      }
    ])
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary-600" /> AI Travel Assistant
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Interactive travel guidance with optional trip context.
          </p>
        </div>

        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          <aside className="card h-fit space-y-4">
            <div>
              <label className="label">Trip Context</label>
              <select
                className="input-field"
                value={selectedTripId}
                onChange={e => setSelectedTripId(e.target.value)}
              >
                <option value="">No specific trip</option>
                {trips.map(trip => (
                  <option key={trip.id} value={trip.id}>
                    {trip.destination} ({trip.start_date})
                  </option>
                ))}
              </select>
              {selectedTrip && (
                <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {selectedTrip.origin} to {selectedTrip.destination}
                </p>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Quick Prompts</p>
              <div className="space-y-2">
                {quickPrompts.map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="w-full text-left text-sm px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={clearChat}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" /> Clear Session
            </button>
          </aside>

          <section className="card p-0 overflow-hidden flex flex-col min-h-[70vh]">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Travel Copilot</p>
                  <p className="text-xs text-gray-500">Responses are tailored to your selected trip context.</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-900">
              {messages.map((msg, i) => (
                <div key={`${msg.role}-${i}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-line ${
                      msg.role === 'user'
                        ? 'bg-primary-600 text-white rounded-br-none'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-bl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-none px-4 py-3 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input-field flex-1"
                  placeholder="Ask about itinerary, budget, safety, packing, food..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="w-11 h-11 rounded-xl bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
