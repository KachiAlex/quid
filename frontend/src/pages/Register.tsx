import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'

export default function Register() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const passwordStrength = (p: string) => {
    if (p.length === 0) return null
    if (p.length < 8) return 'weak'
    const hasUpper = /[A-Z]/.test(p)
    const hasNum = /[0-9]/.test(p)
    const hasSpecial = /[^A-Za-z0-9]/.test(p)
    if (hasUpper && hasNum && hasSpecial) return 'strong'
    if (hasNum || hasUpper) return 'medium'
    return 'weak'
  }

  const strength = passwordStrength(password)
  const strengthColor = { weak: 'bg-red-400', medium: 'bg-yellow-400', strong: 'bg-emerald-500' }[strength || 'weak']
  const strengthLabel = { weak: 'Weak', medium: 'Medium', strong: 'Strong' }[strength || 'weak']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/register', { email, password, firstName: firstName.trim(), lastName: lastName.trim() })
      setSubmitted(true)
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <main className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Account created!</h2>
          <p className="text-slate-600 text-sm mb-6">
            Your account is ready. Sign in to get started.
          </p>
          <Link to="/login" className="text-quid-600 hover:underline text-sm font-medium">
            Go to sign in
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Create your account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-1">First name</label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Alex"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-quid-500"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-1">Last name</label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-quid-500"
              />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-quid-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-quid-500"
            />
            {strength && (
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full bg-slate-200">
                  <div className={`h-1 rounded-full transition-all ${strengthColor} ${strength === 'weak' ? 'w-1/3' : strength === 'medium' ? 'w-2/3' : 'w-full'}`} />
                </div>
                <span className="text-xs text-slate-500">{strengthLabel}</span>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-quid-500 ${
                confirmPassword && confirmPassword !== password ? 'border-red-400' : 'border-slate-300'
              }`}
            />
            {confirmPassword && confirmPassword !== password && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-quid-600 text-white rounded-lg font-medium hover:bg-quid-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-600 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-quid-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </main>
  )
}
