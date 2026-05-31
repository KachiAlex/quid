import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import api from '../lib/api'

export default function Dashboard() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  useEffect(() => {
    const token = searchParams.get('token')
    const google = searchParams.get('google')
    if (google === 'success' && token) {
      api
        .get('/auth/me')
        .then((res) => {
          setAuth(
            {
              id: res.data.userId,
              email: res.data.email,
              subscriptionTier: 'free',
            },
            token
          )
          navigate('/dashboard', { replace: true })
        })
        .catch(() => {
          navigate('/login?error=google_auth_failed')
        })
    }
  }, [searchParams, navigate, setAuth])

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Your Audit Dashboard</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-sm font-medium text-slate-500 mb-1">Total Annual Overpayment</h2>
          <p className="text-3xl font-bold text-quid-600">£0.00</p>
          <p className="text-sm text-slate-500 mt-2">Connect your bank to see savings</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-sm font-medium text-slate-500 mb-1">Products Identified</h2>
          <p className="text-3xl font-bold text-slate-900">0</p>
          <p className="text-sm text-slate-500 mt-2">Insurance, energy, broadband &amp; more</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-sm font-medium text-slate-500 mb-1">Switches Completed</h2>
          <p className="text-3xl font-bold text-emerald-600">0</p>
          <p className="text-sm text-slate-500 mt-2">Start saving by switching today</p>
        </div>
      </div>
    </main>
  )
}
