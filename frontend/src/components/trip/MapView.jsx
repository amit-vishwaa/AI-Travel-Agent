import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icons (Leaflet + Vite issue)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const originIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
})

export default function MapView({ routeData }) {
  if (!routeData || (!routeData.origin && !routeData.destination)) {
    return (
      <div className="card">
        <div className="h-64 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-xl">
          <p className="text-gray-400 dark:text-slate-400 text-sm">Map data unavailable</p>
        </div>
      </div>
    )
  }

  const { origin, destination, route_available, distance_km, duration_hours } = routeData
  const center = [
    (origin.lat + destination.lat) / 2,
    (origin.lon + destination.lon) / 2
  ]
  const zoomLevel = distance_km > 5000 ? 2 : distance_km > 1000 ? 4 : distance_km > 100 ? 6 : 9

  const routePositions = [
    [origin.lat, origin.lon],
    [destination.lat, destination.lon]
  ]

  return (
    <div className="card">
      <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
        🗺️ Route Map
        {distance_km && (
          <span className="text-sm text-gray-400 dark:text-slate-400 font-normal ml-auto">
            {distance_km} km · ~{Math.round(duration_hours)}h drive
          </span>
        )}
      </h3>
      <div className="h-80 rounded-xl overflow-hidden">
        <MapContainer center={center} zoom={zoomLevel} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[origin.lat, origin.lon]} icon={originIcon}>
            <Popup><strong>Origin:</strong> {origin.name}</Popup>
          </Marker>
          <Marker position={[destination.lat, destination.lon]}>
            <Popup><strong>Destination:</strong> {destination.name}</Popup>
          </Marker>
          <Polyline positions={routePositions} color="#3b82f6" weight={3} dashArray="8 4" />
        </MapContainer>
      </div>
      {!route_available && (
        <p className="text-xs text-gray-400 dark:text-slate-400 text-center mt-2">
          Detailed routing not available for this distance — showing direct line
        </p>
      )}
    </div>
  )
}
