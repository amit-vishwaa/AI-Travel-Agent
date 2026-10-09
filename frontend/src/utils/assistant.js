const PROMPT_KEY = 'pending_assistant_prompt'

export function stashAssistantPrompt(prompt) {
  const value = String(prompt || '').trim()
  if (value) sessionStorage.setItem(PROMPT_KEY, value)
  else sessionStorage.removeItem(PROMPT_KEY)
}

export function takeAssistantPrompt() {
  const value = sessionStorage.getItem(PROMPT_KEY) || ''
  sessionStorage.removeItem(PROMPT_KEY)
  return value.trim()
}

export function compactTripContext(trip) {
  if (!trip) return null
  return {
    id: trip.id,
    origin: trip.origin,
    destination: trip.destination,
    start_date: trip.start_date,
    end_date: trip.end_date,
    budget: trip.budget,
    currency: trip.currency,
    travelers: trip.travelers,
    travel_style: trip.travel_style,
    interests: trip.interests,
    risk_level: trip.risk_alert?.overall_risk_level,
    weather_city: trip.weather?.city,
  }
}
