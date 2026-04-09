import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bot, MapPin, RefreshCw, Send, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

import { useAuth } from '../context/AuthContext'
import { aiService, tripService } from '../services/tripService'

function buildQuickPrompts(trip) {
  const destination = trip?.destination || 'my destination'
  return [
    `Create a day-wise plan for ${destination}`,
    `Give me a budget optimization strategy for ${destination}`,
    `What should I pack for ${destination}?`,
    `Give me local food and culture tips for ${destination}`,
    `What weather risks should I watch in ${destination}?`,
  ]
}

export default function AssistantPage() {
  const { user } = useAuth()
  const location = useLocation()
  const [trips, setTrips] = useState([])
  const [selectedTripId, setSelectedTripId] = useState('')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const lastHandledPromptRef = useRef('')

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
        content: `Hi ${user?.name?.split(' ')[0] || 'there'}, I am your offline travel copilot. Pick a trip context or ask anything to start.`,
      },
    ])
  }, [user?.name])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (messageOverride = null) => {
    const userText = (messageOverride ?? input).trim()
    if (!userText || loading) return

    const nextMessages = [...messages, { role: 'user', content: userText }]
    setInput('')
    setMessages(nextMessages)
    setLoading(true)

    try {
      const res = await aiService.chat(userText, selectedTrip, nextMessages)
      const reply = res?.data?.response || 'I could not generate a response right now.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: err.response?.data?.detail || 'I could not reach the local assistant right now. Please try again in a moment.',
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
      },
    ])
  }

  useEffect(() => {
    const prompt = location.state?.prompt?.trim()
    if (!prompt || lastHandledPromptRef.current === prompt || loading || messages.length === 0) return
    lastHandledPromptRef.current = prompt
    sendMessage(prompt)
    window.history.replaceState({ ...(window.history.state || {}), usr: {} }, document.title)
  }, [location.state, loading, messages.length])

  return (
    <div className="page-shell bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.95),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(103,232,249,0.20),transparent_26%),linear-gradient(180deg,#f9fbff_0%,#eef5ff_45%,#f5f8fc_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.10),transparent_24%),linear-gradient(180deg,#06111f_0%,#0b1727_45%,#111827_100%)]">
      <div className="page-container py-8 sm:py-10">
        <section className="glass-panel border-sky-100 bg-white/90 shadow-[0_18px_60px_rgba(14,165,233,0.10)] dark:border-white/10 dark:bg-slate-950/72 dark:shadow-[0_18px_60px_rgba(2,6,23,0.35)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-kicker">Assistant</p>
              <h1 className="mt-3 flex items-center gap-2 text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
                <Sparkles className="h-7 w-7 text-sky-600 dark:text-cyan-300" /> AI Travel Agent Assistant
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
                Local-only travel guidance powered by Ollama, with optional trip context from your saved plans.
              </p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700 dark:border-white/10 dark:bg-white/5 dark:text-cyan-200">
              Chat history stays in this browser session.
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[320px_1fr]">
          <aside className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/65">
            <div>
              <label className="label text-sky-700 dark:text-cyan-200">Trip Context</label>
              <select
                className="input-field"
                value={selectedTripId}
                onChange={e => setSelectedTripId(e.target.value)}
              >
                <option value="">No specific trip</option>
                {trips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.destination} ({trip.start_date})
                  </option>
                ))}
              </select>
              {selectedTrip && (
                <p className="mt-3 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <MapPin className="h-3.5 w-3.5" /> {selectedTrip.origin} to {selectedTrip.destination}
                </p>
              )}
            </div>

            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Quick Prompts</p>
              <div className="space-y-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-left text-sm text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-cyan-700/40 dark:hover:bg-white/[0.06]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={clearChat}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200 dark:hover:bg-white/[0.06]"
            >
              <RefreshCw className="h-4 w-4" /> Clear Session
            </button>
          </aside>

          <section className="flex h-[72vh] min-h-[72vh] flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white/92 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/65">
            <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(240,249,255,0.94),rgba(236,253,245,0.95))] px-5 py-4 dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(12,74,110,0.22),rgba(6,95,70,0.16))]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-sm">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Travel Copilot</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Ask for itinerary help, budget, weather, safety, or packing advice.</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-slate-50 p-4 dark:from-slate-950 dark:to-slate-900">
              <div className="space-y-3">
                {messages.map((msg, i) => (
                  <div key={`${msg.role}-${i}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-7 ${
                        msg.role === 'user'
                          ? 'rounded-br-none bg-gradient-to-r from-sky-600 to-cyan-500 text-white shadow-sm'
                          : 'rounded-bl-none border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="max-w-[88%] rounded-2xl rounded-bl-none border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200">
                      Thinking locally...
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            <div className="mt-auto border-t border-slate-200 bg-white/88 p-4 dark:border-white/10 dark:bg-slate-950/72">
              <div className="flex gap-2 rounded-[24px] border border-slate-200 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-slate-950">
                <input
                  type="text"
                  className="flex-1 rounded-2xl border-0 bg-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 dark:text-white dark:placeholder:text-slate-500"
                  placeholder="Ask about itinerary, budget, safety, packing, food..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-sm transition hover:from-sky-600 hover:to-cyan-600 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
