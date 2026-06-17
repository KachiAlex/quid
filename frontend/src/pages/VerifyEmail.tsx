import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../lib/api'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setMessage('Invalid verification link.')
      return
    }

    api
      .get(`/auth/verify-email?token=${token}`)
      .then(() => {
        setStatus('success')
        setMessage('Email verified successfully. You can now sign in.')
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.response?.data?.error || 'Verification failed.')
      })
  }, [searchParams])

  return (
    <main className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl border border-slate-100 text-center">
        {status === 'loading' && (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-quid-600 mx-auto" />
        )}
        {status === 'success' && (
          <>
            <h1 className="text-xl font-bold text-emerald-700 mb-2">Verified</h1>
            <p className="text-slate-600">{message}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-xl font-bold text-red-700 mb-2">Verification failed</h1>
            <p className="text-slate-600">{message}</p>
          </>
        )}
      </div>
    </main>
  )
}
