import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { tripService } from '../services/tripService'
import LoadingSpinner from '../components/common/LoadingSpinner'
import WeatherCard from '../components/trip/WeatherCard'
import MapView from '../components/trip/MapView'
import ItineraryView from '../components/trip/ItineraryView'
import BudgetBreakdown from '../components/trip/BudgetBreakdown'
import PackingList from '../components/trip/PackingList'
import RiskAlerts from '../components/trip/RiskAlerts'
import ChatBot from '../components/trip/ChatBot'
import { ArrowLeft, MapPin, Calendar, Users, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '../utils/currency'

const tabs = ['Itinerary', 'Weather', 'Map & Route', 'Budget', 'Packing', 'Risk Alerts']

export default function TripDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Itinerary')

  useEffect(() => {
    fetchTrip()
  }, [id])

  const fetchTrip = async () => {
    try {
      const res = await tripService.getTrip(id)
      setTrip(res.data)
    } catch {
      toast.error('Trip not found')
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <LoadingSpinner size="lg" text="Loading your trip..." />
    </div>
  )

  if (!trip) return null

  const tabContent = {
    'Itinerary': <ItineraryView itinerary={trip.itinerary} currency={trip.currency} />,
    'Weather': <WeatherCard weather={trip.weather_data} />,
    'Map & Route': <MapView routeData={trip.route_data} />,
    'Budget': <BudgetBreakdown budget={{ ...(trip.budget_breakdown || {}), currency: trip.currency }} />,
    'Packing': <PackingList packingList={trip.packing_list} />,
    'Risk Alerts': <RiskAlerts riskAlerts={trip.risk_alerts} />,
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">{trip.destination}</h1>
          <p className="text-blue-200 mb-4">From {trip.origin}</p>
          <div className="flex flex-wrap gap-4 text-sm text-blue-100">
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{trip.start_date} → {trip.end_date}</span>
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{trip.travelers} traveler{trip.travelers !== 1 ? 's' : ''}</span>
            <span className="flex items-center gap-1.5"><DollarSign className="w-4 h-4" />{formatCurrency(trip.budget, trip.currency)} budget</span>
            <span className="capitalize px-2.5 py-0.5 bg-white/20 rounded-full">{trip.travel_style}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-16 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 overflow-x-auto">
          <div className="flex gap-1 py-2">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-fade-in">
          {tabContent[activeTab]}
        </div>
      </div>

      {/* AI Chatbot */}
      <ChatBot tripContext={trip} />
    </div>
  )
}
