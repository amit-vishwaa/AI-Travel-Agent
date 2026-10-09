import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { TravelSettingsProvider } from './context/TravelSettingsContext'
import Navbar from './components/layout/Navbar'
import ProtectedRoute from './components/common/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import LoadingSpinner from './components/common/LoadingSpinner'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const PlanTripPage = lazy(() => import('./pages/PlanTripPage'))
const TripDetailPage = lazy(() => import('./pages/TripDetailPage'))
const SharedTripPage = lazy(() => import('./pages/SharedTripPage'))
const AssistantPage = lazy(() => import('./pages/AssistantPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function AppShell() {
  const location = useLocation()
  const hideNavbar = ['/login', '/register', '/forgot-password'].includes(location.pathname)

  return (
    <div className="page-shell min-h-screen">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-slate-900">
        Skip to content
      </a>
      {!hideNavbar && <Navbar />}
      <main id="main-content">
        <Suspense fallback={<div className="page-container py-16"><LoadingSpinner text="Loading your travel workspace..." /></div>}>
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
            <Route path="/trips/share/:id" element={<SharedTripPage />} />
            <Route path="/trips/:id" element={
              <ProtectedRoute><TripDetailPage /></ProtectedRoute>
            } />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
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
                  border: '1px solid var(--toast-border, #e5e7eb)',
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
