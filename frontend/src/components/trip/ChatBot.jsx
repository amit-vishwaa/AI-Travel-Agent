import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, MessageCircle, Send, Sparkles, User, X } from 'lucide-react'

import { aiService } from '../../services/tripService'
import { compactTripContext } from '../../utils/assistant'
import MessageBody from '../common/MessageBody'

export default function ChatBot({ tripContext = null }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: `Hi! Ask about ${tripContext?.destination || 'your trip'} and I will help with practical guidance.`,
      },
    ])
  }, [tripContext?.destination])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    const nextMessages = [...messages, { role: 'user', content: userMsg }]
    setInput('')
    setMessages(nextMessages)
    setLoading(true)
    try {
      const res = await aiService.chat(userMsg, compactTripContext(tripContext), nextMessages)
      setMessages(prev => [...prev, { role: 'assistant', content: res?.data?.response || 'No response received.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Assistant is temporarily unavailable. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 flex items-center justify-center transition-all hover:scale-110 z-40"
        aria-label="Open AI Chatbot"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col z-50 max-h-[70vh]">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-slate-950 rounded-t-2xl">
            <div className="flex items-center gap-2 text-white">
              <Bot className="w-5 h-5" />
              <span className="font-semibold text-sm">Travel Assistant</span>
              <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end">
            <button
              onClick={() => navigate('/assistant', { state: { tripId: tripContext?.id } })}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              <Sparkles className="w-3.5 h-3.5" /> Open Full Assistant
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`max-w-[80%] text-sm rounded-2xl px-3.5 py-2.5 leading-relaxed whitespace-pre-line ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white rounded-tr-none'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-tl-none'
                }`}>
                  <MessageBody text={msg.content} />
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-none px-3.5 py-3 text-sm text-gray-600 dark:text-gray-300">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
            <input
              type="text"
              className="input-field py-2 text-sm flex-1"
              placeholder="Ask about your trip..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="w-10 h-10 bg-primary-600 text-white rounded-xl flex items-center justify-center hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
