import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import api from '../lib/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resendSent, setResendSent] = useState(false)
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNeedsVerification(false)
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email, password })
      if (res.data.requireMfa) {
        // TODO: redirect to MFA page
        return
      }
      const profile = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${res.data.accessToken}` },
      })
      setAuth(
        {
          id: profile.data.userId,
          email: profile.data.email,
          firstName: profile.data.firstName,
          lastName: profile.data.lastName,
          subscriptionTier: profile.data.subscriptionTier || 'free',
        },
        res.data.accessToken
      )
      navigate('/dashboard')
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Login failed'
      if (err.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        setNeedsVerification(true)
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    try {
      await api.post('/auth/resend-verification', { email })
      setResendSent(true)
    } catch {
      setError('Failed to resend verification email.')
    }
  }

  return (
    <main className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Sign in to Quid</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-quid-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-quid-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {needsVerification && (
            <div className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">
              {resendSent ? (
                <p className="text-emerald-700 font-medium">Verification email sent — check your inbox.</p>
              ) : (
                <p className="text-amber-800">
                  Email not verified.{' '}
                  <button type="button" onClick={handleResendVerification} className="underline font-medium">
                    Resend verification email
                  </button>
                </p>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-quid-600 text-white rounded-lg font-medium hover:bg-quid-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">Or</span>
            </div>
          </div>
          <a
            href="/api/auth/google"
            className="flex items-center justify-center w-full px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </a>
        </form>
        <div className="mt-4 text-sm text-center space-y-2">
          <p className="text-slate-600">
            <Link to="/forgot-password" className="text-quid-600 hover:underline">
              Forgot password?
            </Link>
          </p>
          <p className="text-slate-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-quid-600 hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
