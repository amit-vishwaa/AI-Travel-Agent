import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { TravelSettingsProvider } from './context/TravelSettingsContext'
import Navbar from './components/layout/Navbar'
import ProtectedRoute from './components/common/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import DashboardPage from './pages/DashboardPage'
import PlanTripPage from './pages/PlanTripPage'
import TripDetailPage from './pages/TripDetailPage'
import AssistantPage from './pages/AssistantPage'

function AppShell() {
  const location = useLocation()
  const hideNavbar = ['/login', '/register', '/forgot-password'].includes(location.pathname)

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardPage /></ProtectedRoute>
        } />
        <Route path="/plan" element={
          <ProtectedRoute><PlanTripPage /></ProtectedRoute>
        } />
        <Route path="/assistant" element={
          <ProtectedRoute><AssistantPage /></ProtectedRoute>
        } />
        <Route path="/trips/:id" element={
          <ProtectedRoute><TripDetailPage /></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <TravelSettingsProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppShell />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--toast-bg, #fff)',
                  color: 'var(--toast-color, #1f2937)',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                }
              }}
            />
          </BrowserRouter>
        </AuthProvider>
      </TravelSettingsProvider>
    </ThemeProvider>
  )
}
