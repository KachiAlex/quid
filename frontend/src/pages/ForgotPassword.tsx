import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [resetData, setResetData] = useState<{ token: string; resetUrl: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await api.post('/auth/forgot-password', { email })
      setSubmitted(true)
      if (res.data.token) {
        setResetData({ token: res.data.token, resetUrl: res.data.resetUrl })
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send reset email.')
    }
  }

  return (
    <main className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl border border-slate-100">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Reset password</h1>
        {submitted ? (
          <div className="space-y-4">
            {resetData ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800 mb-2">
                  <strong>Dev mode:</strong> Your reset token is displayed below.
                </p>
                <div className="bg-white border border-amber-300 rounded p-2 mb-2">
                  <code className="text-xs break-all">{resetData.token}</code>
                </div>
                <a
                  href={resetData.resetUrl}
                  className="block w-full text-center px-4 py-2 bg-quid-600 text-white rounded-lg font-medium hover:bg-quid-700 transition-colors text-sm"
                >
                  Reset password with this token
                </a>
              </div>
            ) : (
              <p className="text-slate-600">
                If an account exists for that email, a password reset link has been sent.
              </p>
            )}
          </div>
        ) : (
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
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              className="w-full px-4 py-2 bg-quid-600 text-white rounded-lg font-medium hover:bg-quid-700 transition-colors"
            >
              Send reset link
            </button>
          </form>
        )}
        <p className="mt-4 text-sm text-slate-600 text-center">
          <Link to="/login" className="text-quid-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
