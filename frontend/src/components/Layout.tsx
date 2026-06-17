import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { ChevronDown } from 'lucide-react'
import api from '../lib/api'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const isDashboard = pathname === '/dashboard'

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {}
    clearAuth()
    navigate('/')
  }

  return (
    <div className={`min-h-screen ${isHome ? 'bg-[#04010a]' : isDashboard ? 'bg-[#0a0a14]' : 'bg-slate-50'}`}>
      {!isDashboard && (
        <header className={`sticky top-0 z-50 ${isHome ? 'bg-[#04010a]/80 backdrop-blur-md border-b border-white/10' : 'bg-white/80 backdrop-blur-md border-b border-slate-200'}`}>
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className={`text-2xl font-bold tracking-tight ${isHome ? 'text-white' : 'text-slate-900'}`}>
              quid<span className="text-[#7c3aed]">.</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              {isHome && (
                <>
                  <Link to="/how-it-works" className={`text-sm ${isHome ? 'text-white/80 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>How it works</Link>
                  <span className={`text-sm flex items-center gap-1 cursor-pointer ${isHome ? 'text-white/80 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>Features <ChevronDown className="h-3 w-3" /></span>
                  <span className={`text-sm ${isHome ? 'text-white/80 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>Quid Shield</span>
                  <span className={`text-sm ${isHome ? 'text-white/80 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>Pricing</span>
                  <span className={`text-sm ${isHome ? 'text-white/80 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>About us</span>
                  <span className={`text-sm flex items-center gap-1 cursor-pointer ${isHome ? 'text-white/80 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>Resources <ChevronDown className="h-3 w-3" /></span>
                </>
              )}
              {!isHome && (
                <>
                  <Link to="/dashboard" className="text-sm text-slate-600 hover:text-slate-900">Dashboard</Link>
                  <Link to="/settings" className="text-sm text-slate-600 hover:text-slate-900">Settings</Link>
                </>
              )}
            </nav>
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  {!isHome && <span className="text-sm text-slate-500">{user?.email}</span>}
                  <button
                    onClick={handleLogout}
                    className={`text-sm font-medium ${isHome ? 'text-white/80 hover:text-white' : 'text-quid-600 hover:text-quid-700'}`}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className={`text-sm ${isHome ? 'text-white/80 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    className="text-sm px-4 py-2 bg-gradient-to-r from-[#7c3aed] to-[#6366f1] text-white rounded-xl hover:opacity-90 transition-opacity font-medium"
                  >
                    Get my savings report
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>
      )}
      <div>{children}</div>
    </div>
  )
}
