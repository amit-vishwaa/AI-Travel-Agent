import api from './api'

export const tripService = {
  createTrip: (data) => api.post('/trips/', data, { timeout: 180000 }),
  getTrips: () => api.get('/trips/'),
  getTrip: (id) => api.get(`/trips/${id}`),
  updateTrip: (id, data) => api.put(`/trips/${id}`, data),
  deleteTrip: (id) => api.delete(`/trips/${id}`),
}

export const weatherService = {
  getCurrent: (city) => api.get(`/weather/current/${encodeURIComponent(city)}`),
  getForecast: (city) => api.get(`/weather/forecast/${encodeURIComponent(city)}`),
}

export const routeService = {
  getRoute: (origin, destination, profile = 'driving-car') =>
    api.get(`/route/?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&profile=${profile}`),
  searchCities: (query, limit = 8) =>
    api.get(`/route/cities?q=${encodeURIComponent(query)}&limit=${limit}`),
}

export const aiService = {
  chat: (message, tripContext = null) =>
    api.post('/ai/chat', { message, trip_context: tripContext }),
}
