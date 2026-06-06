import { useEffect, useState } from 'react'
import {
  CheckCircle2, Bell, ArrowRight, Filter, X,
} from 'lucide-react'
import api from '../../lib/api'
import { getIcon } from '../../lib/dashboardIcons'

const filters = ['All', 'Urgent', 'Savings', 'Price Hike', 'Renewal']

const typeColors: Record<string, string> = {
  'Urgent': 'bg-rose-500/10 text-rose-400',
  'Savings': 'bg-emerald-500/10 text-emerald-400',
  'Price Hike': 'bg-amber-500/10 text-amber-400',
  'Renewal': 'bg-blue-500/10 text-blue-400',
  'System': 'bg-violet-500/10 text-violet-400',
}

const iconColors: Record<string, string> = {
  car_insurance: 'text-rose-500',
  broadband: 'text-amber-500',
  energy: 'text-emerald-500',
  subscription: 'text-blue-500',
  home_insurance: 'text-violet-500',
  shield: 'text-rose-500',
  generic: 'text-white',
}

const iconBgs: Record<string, string> = {
  car_insurance: 'bg-rose-500/10',
  broadband: 'bg-amber-500/10',
  energy: 'bg-emerald-500/10',
  subscription: 'bg-blue-500/10',
  home_insurance: 'bg-violet-500/10',
  shield: 'bg-rose-500/10',
  generic: 'bg-white/5',
}

interface AlertItem {
  alert_id: string
  alert_type: string
  title: string
  detail: string
  icon_category: string
  is_read: boolean
  is_dismissed: boolean
  urgency: string
  action_url: string | null
  action_label: string | null
  created_at: string
}

export default function AlertsTab() {
  const [activeFilter, setActiveFilter] = useState('All')
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchAlerts = () => {
    setLoading(true)
    api.get('/alerts', { params: { filter: activeFilter } })
      .then((res) => setAlerts(res.data.alerts || []))
      .catch(() => setError('Failed to load alerts'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAlerts() }, [activeFilter])

  const markAllRead = () => {
    api.patch('/alerts/read-all')
      .then(() => fetchAlerts())
      .catch(() => {})
  }

  const dismissAlert = (id: string) => {
    api.delete(`/alerts/${id}`)
      .then(() => fetchAlerts())
      .catch(() => {})
  }

  const unreadCount = alerts.filter((a) => !a.is_read && !a.is_dismissed).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#7c3aed]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Alerts</h1>
            {unreadCount > 0 && (
              <span className="flex h-6 items-center justify-center rounded-full bg-rose-500 px-2.5 text-xs font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-white/50">Stay on top of price changes and savings opportunities.</p>
        </div>
        <button
          onClick={markAllRead}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <CheckCircle2 className="h-4 w-4" /> Mark all read
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="h-4 w-4 shrink-0 text-white/40" />
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
              activeFilter === f ? 'bg-[#7c3aed] text-white' : 'border border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <div className="space-y-3">
        {alerts.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-8 text-center">
            <Bell className="mx-auto h-8 w-8 text-white/20" />
            <p className="mt-3 text-sm text-white/50">No alerts in this category.</p>
          </div>
        )}
        {alerts.map((alert) => {
          const Icon = getIcon(alert.icon_category)
          return (
            <div
              key={alert.alert_id}
              className={`relative rounded-2xl border p-4 transition hover:border-white/20 sm:p-5 ${
                alert.is_read ? 'border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a]' : 'border-[#7c3aed]/30 bg-gradient-to-br from-[#1a1033] to-[#0d061a]'
              }`}
            >
              {!alert.is_read && <div className="absolute left-0 top-4 h-2 w-2 rounded-full bg-[#7c3aed] sm:top-5" />}
              <div className={`flex items-start gap-4 ${!alert.is_read ? 'pl-4' : ''}`}>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBgs[alert.icon_category] || 'bg-white/5'}`}>
                  <Icon className={`h-5 w-5 ${iconColors[alert.icon_category] || 'text-white'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{alert.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${typeColors[alert.alert_type] || 'bg-blue-500/10 text-blue-400'}`}>
                      {alert.alert_type}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/50">{alert.detail}</p>
                  <div className="mt-3 flex items-center gap-3">
                    {alert.action_url && (
                      <a href={alert.action_url} className="inline-flex items-center gap-1 rounded-lg bg-[#7c3aed] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#6d28d9]">
                        {alert.action_label || 'Take action'} <ArrowRight className="h-3 w-3" />
                      </a>
                    )}
                    <button
                      onClick={() => dismissAlert(alert.alert_id)}
                      className="text-xs text-white/40 transition hover:text-white"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-[10px] text-white/40">
                    {new Date(alert.created_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => dismissAlert(alert.alert_id)}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-white/30 transition hover:bg-white/5 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
