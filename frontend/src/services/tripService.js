import api from './api'

export const tripService = {
  createTrip: (data) => api.post('/trips/', data, { timeout: 180000 }),
  getTrips: () => api.get('/trips/'),
  getTrip: (id) => api.get(`/trips/${id}`),
  getPublicTrip: (id) => api.get(`/trips/public/${id}`),
  updateTrip: (id, data) => api.put(`/trips/${id}`, data),
  updatePackingList: (id, data) => api.put(`/trips/${id}/packing-list`, data),
  regenerateTrip: (id) => api.post(`/trips/${id}/regenerate`, {}, { timeout: 180000 }),
  regeneratePackingList: (id) => api.post(`/trips/${id}/packing-list/regenerate`),
  getTripFlights: (id) => api.get(`/trips/${id}/flights`, { timeout: 60000 }),
  downloadPdf: (id) => api.get(`/trips/${id}/generate-pdf`, { responseType: 'blob' }),
  downloadCalendar: (id) => api.get(`/trips/${id}/calendar`, { responseType: 'blob' }),
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
  chat: (message, tripContext = null, history = []) =>
    api.post('/ai/chat', { message, trip_context: tripContext, history }),
}
