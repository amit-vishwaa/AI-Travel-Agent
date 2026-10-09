import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="page-shell flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-16">
      <div className="glass-panel max-w-lg text-center">
        <Compass className="mx-auto h-12 w-12 text-sky-500" />
        <h1 className="mt-5 text-3xl font-bold text-slate-900 dark:text-white">Page not found</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          That route does not exist. Head back to the dashboard or start a new trip plan.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/" className="btn-secondary">Home</Link>
          <Link to="/dashboard" className="btn-primary">Open Dashboard</Link>
        </div>
      </div>
    </div>
  )
}
