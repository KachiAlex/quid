import { useEffect, useState } from 'react'
import {
  Shield, CheckCircle2, Clock, AlertTriangle,
  ArrowRight, Settings, Lock,
} from 'lucide-react'
import api from '../../lib/api'
import { getIcon } from '../../lib/dashboardIcons'

interface ShieldStatus {
  activeMonitors: number
  alertsSent: number
  savingsSecured: number
  upcomingRenewals: number
  lastScan: string
}

interface MonitorItem {
  record_id: string
  category: string
  provider_name: string
  renewal_date: string
  status: string
  next_action: string
}

const statColors: Record<string, { color: string; bg: string }> = {
  activeMonitors: { color: 'text-[#a78bfa]', bg: 'bg-[#7c3aed]/20' },
  alertsSent: { color: 'text-amber-400', bg: 'bg-amber-500/10' },
  savingsSecured: { color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  upcomingRenewals: { color: 'text-blue-400', bg: 'bg-blue-500/10' },
}

export default function QuidShieldTab() {
  const [status, setStatus] = useState<ShieldStatus | null>(null)
  const [monitors, setMonitors] = useState<MonitorItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/shield/status'),
      api.get('/shield/monitors'),
    ])
      .then(([statusRes, monitorsRes]) => {
        setStatus(statusRes.data)
        setMonitors(monitorsRes.data.monitors || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#7c3aed]" />
      </div>
    )
  }

  const stats = status ? [
    { label: 'Active monitors', value: String(status.activeMonitors), icon: Shield },
    { label: 'Alerts sent', value: String(status.alertsSent), icon: AlertTriangle },
    { label: 'Savings secured', value: `£${Math.round(status.savingsSecured).toLocaleString()}`, icon: CheckCircle2 },
    { label: 'Upcoming renewals', value: String(status.upcomingRenewals), icon: Clock },
  ] : []

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Quid Shield</h1>
          <p className="mt-1 text-sm text-white/50">24/7 protection against price hikes and missed renewals.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white">
          <Settings className="h-4 w-4" /> Settings
        </button>
      </div>

      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5 shadow-xl sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
            <Shield className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">Shield Status: Active</p>
            <p className="text-xs text-white/50">All monitors running. Last scan: {status ? new Date(status.lastScan).toLocaleString() : 'Recently'}.</p>
          </div>
          <div className="ml-auto hidden rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 sm:block">
            <Lock className="mr-1 inline h-3 w-3" /> Bank-grade secure
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          const key = ['activeMonitors', 'alertsSent', 'savingsSecured', 'upcomingRenewals'][i]
          const style = statColors[key] || { color: 'text-white', bg: 'bg-white/5' }
          return (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-4 sm:p-5">
              <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg ${style.bg}`}>
                <Icon className={`h-4 w-4 ${style.color}`} />
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="mt-1 text-xs text-white/50">{stat.label}</p>
            </div>
          )
        })}
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between sm:mb-5">
          <h2 className="text-base font-semibold text-white sm:text-lg">Monitored Services</h2>
          <span className="text-xs font-medium text-[#a78bfa] transition hover:text-[#7c3aed] cursor-pointer">Add service</span>
        </div>
        <div className="space-y-3">
          {monitors.map((p) => {
            const Icon = getIcon(p.category || 'generic')
            return (
              <div key={p.record_id} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-4 transition hover:border-white/20 sm:p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7c3aed]/20">
                  <Icon className="h-5 w-5 text-[#a78bfa]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-white">{p.category}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      p.status === 'Monitoring' ? 'bg-emerald-500/10 text-emerald-400' :
                      'bg-rose-500/10 text-rose-400'
                    }`}>{p.status}</span>
                  </div>
                  <p className="text-xs text-white/50">{p.provider_name} • Renewal: {new Date(p.renewal_date).toLocaleDateString()}</p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-xs text-white/40">Next action</p>
                  <p className="text-xs font-medium text-white">{p.next_action}</p>
                </div>
                <ArrowRight className="hidden h-4 w-4 shrink-0 text-white/30 sm:block" />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
