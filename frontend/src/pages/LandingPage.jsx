import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Plane, MapPin, Brain, Cloud, Shield, MessageCircle, Star, ChevronRight, Zap, Globe } from 'lucide-react'

const features = [
  { icon: Brain, title: 'AI Itinerary Generator', desc: 'Get a detailed day-by-day travel plan powered by Google Gemini AI.', color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30' },
  { icon: Cloud, title: 'Real-time Weather', desc: 'Live weather forecasts and alerts for your destination from OpenWeatherMap.', color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' },
  { icon: MapPin, title: 'Smart Route Planning', desc: 'Optimised routes visualised on interactive maps via OpenRouteService.', color: 'text-green-500 bg-green-100 dark:bg-green-900/30' },
  { icon: Zap, title: 'Budget Breakdown', desc: 'AI-powered expense categorisation to keep your trip on budget.', color: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30' },
  { icon: Shield, title: 'Risk Alerts', desc: 'Intelligent safety and travel risk analysis before you go.', color: 'text-red-500 bg-red-100 dark:bg-red-900/30' },
  { icon: MessageCircle, title: 'AI Travel Chatbot', desc: 'Ask anything — your 24/7 AI travel assistant is always ready.', color: 'text-pink-500 bg-pink-100 dark:bg-pink-900/30' },
]

const stats = [
  { value: '50+', label: 'Countries Covered' },
  { value: '10K+', label: 'Trips Planned' },
  { value: '99%', label: 'Uptime' },
  { value: '4.9★', label: 'User Rating' },
]

export default function LandingPage() {
  const { user, loading } = useAuth()
  const isAuthenticated = Boolean(user)
  const firstName = user?.name?.split(' ')?.[0] || 'Traveler'

  return (
    <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden text-white">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-sky-950/85 via-blue-900/70 to-cyan-900/75" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.16),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.1),transparent_35%)]" />
        <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml,%3Csvg width=\'160\' height=\'160\' viewBox=\'0 0 160 160\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.08\'%3E%3Cpath d=\'M80 0L160 80L80 160L0 80z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm mb-8 animate-fade-in">
              <Zap className="w-4 h-4 text-yellow-400" />
              Powered by Google Gemini AI
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 animate-slide-up">
              Your AI-Powered
              <span className="block text-yellow-400">Travel Companion</span>
            </h1>
            <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
              Plan perfect trips with AI-generated itineraries, real-time weather, route optimisation, 
              smart budgeting, and a 24/7 travel chatbot.
            </p>
            {!loading && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {isAuthenticated ? (
                  <>
                    <Link to="/dashboard" className="inline-flex items-center gap-2 bg-white text-primary-700 font-bold py-4 px-8 rounded-2xl hover:bg-yellow-50 transition-all duration-200 active:scale-95 shadow-lg text-lg">
                      Go to Dashboard <ChevronRight className="w-5 h-5" />
                    </Link>
                    <Link to="/plan" className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white font-semibold py-4 px-8 rounded-2xl hover:bg-white/20 transition-all duration-200 border border-white/20 text-lg">
                      <Globe className="w-5 h-5" /> Plan New Trip
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/register" className="inline-flex items-center gap-2 bg-white text-primary-700 font-bold py-4 px-8 rounded-2xl hover:bg-yellow-50 transition-all duration-200 active:scale-95 shadow-lg text-lg">
                      Start Planning Free <ChevronRight className="w-5 h-5" />
                    </Link>
                    <Link to="/login" className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white font-semibold py-4 px-8 rounded-2xl hover:bg-white/20 transition-all duration-200 border border-white/20 text-lg">
                      <Globe className="w-5 h-5" /> Sign In
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60L1440 60L1440 0C1440 0 1080 60 720 60C360 60 0 0 0 0L0 60Z" fill="white" className="dark:fill-gray-900"/>
          </svg>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl md:text-4xl font-extrabold text-primary-600 dark:text-primary-400">{s.value}</div>
              <div className="text-gray-500 dark:text-gray-400 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Travel Smart</h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl mx-auto">
              From planning to packing — AI handles it all so you can focus on the experience.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f) => (
              <div key={f.title} className="card hover:shadow-md transition-shadow duration-200">
                <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA / Logged-in Welcome */}
      <section className="py-24 max-w-7xl mx-auto px-4 text-center">
        {!loading && (isAuthenticated ? (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-12 text-white">
            <Plane className="w-12 h-12 mx-auto mb-4 opacity-90" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Welcome back, {firstName}</h2>
            <p className="text-emerald-100 text-lg mb-8 max-w-xl mx-auto">
              Continue where you left off, refine your itinerary, or plan your next destination.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold py-4 px-10 rounded-2xl hover:bg-emerald-50 transition-all active:scale-95 text-lg shadow-lg"
              >
                Open Dashboard <ChevronRight className="w-5 h-5" />
              </Link>
              <Link
                to="/plan"
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white font-semibold py-4 px-8 rounded-2xl hover:bg-white/20 transition-all duration-200 border border-white/20 text-lg"
              >
                Plan New Trip
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-primary-600 to-blue-700 rounded-3xl p-12 text-white">
            <Plane className="w-12 h-12 mx-auto mb-4 opacity-90" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready for Your Next Adventure?</h2>
            <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
              Join thousands of travellers using AI to plan unforgettable trips. It's 100% free.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-white text-primary-700 font-bold py-4 px-10 rounded-2xl hover:bg-yellow-50 transition-all active:scale-95 text-lg shadow-lg"
            >
              Create Free Account <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Plane className="w-4 h-4 text-primary-500" />
          <span className="font-semibold text-gray-700 dark:text-gray-300">AI Travel Agent</span>
        </div>
        <p>© {new Date().getFullYear()} AI Travel Agent. Built with ❤️ using FastAPI, React & Google Gemini.</p>
      </footer>
    </div>
  )
}
