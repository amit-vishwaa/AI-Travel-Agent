import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import LoadingSpinner from './LoadingSpinner'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return (
    <div className="page-shell flex min-h-screen items-center justify-center">
      <LoadingSpinner size="lg" text="Authenticating..." />
    </div>
  )

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}
