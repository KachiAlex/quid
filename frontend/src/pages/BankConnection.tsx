import { useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import api from '../lib/api'

type Connection = {
  connection_id: string
  bank_name: string
  bank_id: string
  status: 'active' | 'revoked' | 'expired'
  connected_at: string
  expires_at: string
  last_sync_at: string | null
}


function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-GB', { hour12: false })
}

const errorMap: Record<string, string> = {
  auth_failed: 'Authorization failed. Please try again.',
  callback_failed: 'Could not connect your bank. Try again or contact support.',
  connect_failed: 'Unable to start the bank connect flow.',
  invalid_state: 'Session mismatch detected. Please try again.',
  no_accounts: 'TrueLayer did not return any accounts. Try another bank or institution.',
}

export default function BankConnection() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [syncing, setSyncing] = useState<string[]>([])
  const [revoking, setRevoking] = useState<string[]>([])
  const [error, setError] = useState('')
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const successBanner = location.pathname.endsWith('/success')
  const errorKey = searchParams.get('error')
  const displayRouteError = errorKey ? errorMap[errorKey] || 'An unexpected error occurred.' : ''

  const isBusy = syncing.length > 0 || revoking.length > 0 || loading

  useEffect(() => {
    fetchConnections()
  }, [])

  useEffect(() => {
    if (successBanner) {
      setMessage('Bank account connected. We are syncing your recent transactions now.')
    }
  }, [successBanner])

  const fetchConnections = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/banking/connections')
      setConnections(res.data.connections)
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Unable to fetch your connections.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/banking/connect')
      if (res.data.url) {
        window.location.href = res.data.url
      } else {
        setError('Unable to start the bank connect flow.')
      }
    } catch (err: any) {
      const code = err.response?.data?.error
      setError(errorMap[code] || 'Unable to start the bank connect flow.')
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async (connectionId: string) => {
    setSyncing((prev) => [...prev, connectionId])
    try {
      await api.post(`/banking/connections/${connectionId}/sync`)
      setMessage('Latest transactions are being synced. Refresh in a moment to see updates.')
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Unable to sync right now.'
      setError(msg)
    } finally {
      setSyncing((prev) => prev.filter((id) => id !== connectionId))
    }
  }

  const handleRevoke = async (connectionId: string) => {
    setRevoking((prev) => [...prev, connectionId])
    try {
      await api.delete(`/banking/connections/${connectionId}`)
      setMessage('Bank connection revoked. You can reconnect at any time.')
      fetchConnections()
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Unable to revoke this connection.'
      setError(msg)
    } finally {
      setRevoking((prev) => prev.filter((id) => id !== connectionId))
    }
  }

  const statusSummary = useMemo(() => {
    const active = connections.filter((c) => c.status === 'active').length
    const revoked = connections.filter((c) => c.status !== 'active').length
    return { total: connections.length, active, revoked }
  }, [connections])

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-slate-900">Connect Your Bank</h1>
          <p className="text-sm text-slate-500">
            We use TrueLayer to securely connect to your UK financial institutions. Your credentials never hit our servers.
          </p>
        </div>
        {(successBanner || displayRouteError || message || error) && (
          <div
            className={`mt-4 rounded-lg px-4 py-3 text-sm font-medium ${
              successBanner || message ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}
          >
            {successBanner ? message : displayRouteError || message || error}
          </div>
        )}
        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
          <button
            onClick={handleConnect}
            disabled={isBusy}
            className="flex-1 rounded-xl bg-quid-600 px-5 py-3 text-center text-white transition-colors hover:bg-quid-700 disabled:opacity-50"
          >
            Continue to Bank
          </button>
          <div className="text-sm text-slate-500">
            {statusSummary.total > 0 ? (
              <span>
                {statusSummary.active} active connection(s), {statusSummary.revoked} revoked.
              </span>
            ) : (
              'No bank connections yet. Connect to pull transactions.'
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Your Connections</h2>
          <button
            onClick={fetchConnections}
            disabled={loading}
            className="text-sm text-quid-600 hover:underline disabled:opacity-60"
          >
            Refresh
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {loading && <p className="text-sm text-slate-500">Loading connections...</p>}
          {!loading && connections.length === 0 && (
            <p className="text-sm text-slate-500">You don’t have any bank connections yet.</p>
          )}
          {connections.map((connection) => {
            const isRevoking = revoking.includes(connection.connection_id)
            const isSyncing = syncing.includes(connection.connection_id)
            return (
              <div key={connection.connection_id} className="flex flex-col rounded-2xl border border-slate-100 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-base font-semibold text-slate-900">{connection.bank_name}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{connection.bank_id}</p>
                  <p className="mt-1 text-sm text-slate-500">Status: {connection.status}</p>
                  <p className="text-sm text-slate-500">Connected: {formatDate(connection.connected_at)}</p>
                  <p className="text-sm text-slate-500">Expires: {formatDate(connection.expires_at)}</p>
                  <p className="text-sm text-slate-500">Last sync: {formatDate(connection.last_sync_at)}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 sm:mt-0">
                  <button
                    onClick={() => handleSync(connection.connection_id)}
                    disabled={connection.status !== 'active' || isSyncing}
                    className="rounded-full border border-quid-600 px-4 py-1 text-sm font-medium text-quid-600 hover:bg-quid-50 disabled:opacity-50"
                  >
                    {isSyncing ? 'Syncing…' : 'Sync now'}
                  </button>
                  <button
                    onClick={() => handleRevoke(connection.connection_id)}
                    disabled={isRevoking}
                    className="rounded-full border border-rose-600 px-4 py-1 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  >
                    {isRevoking ? 'Revoking…' : 'Revoke'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </main>
  )
}
