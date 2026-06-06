import { useState } from 'react'
import {
  CheckCircle2, Zap as ZapIcon, Car, Wifi, Layers,
  Shield, Bell, ArrowRight, Filter, X,
} from 'lucide-react'

const filters = ['All', 'Urgent', 'Savings', 'Price Hikes', 'Renewals']

const alerts = [
  { id: 1, type: 'Urgent', title: 'Car insurance renewal in 14 days', detail: 'Your current provider quoted £1,240. We found 8 better deals starting at £528.', icon: Car, iconBg: 'bg-rose-500/10', iconColor: 'text-rose-500', time: '2h ago', read: false },
  { id: 2, type: 'Savings', title: 'Broadband price increase detected', detail: 'Virgin Media is increasing your monthly bill by £18 from next month.', icon: Wifi, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500', time: '5h ago', read: false },
  { id: 3, type: 'Savings', title: 'Better energy tariff available', detail: 'Octopus Energy Agile tariff could save you £438/year based on your usage.', icon: ZapIcon, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500', time: '1d ago', read: true },
  { id: 4, type: 'Price Hikes', title: 'Netflix subscription price increased', detail: 'Standard plan went from £10.99 to £12.99. Consider downgrading or switching.', icon: Layers, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-500', time: '2d ago', read: true },
  { id: 5, type: 'Renewals', title: 'Home insurance renewal due soon', detail: 'Renewal quote: £420. Last year you paid £340. Shop around now.', icon: Shield, iconBg: 'bg-violet-500/10', iconColor: 'text-violet-500', time: '3d ago', read: true },
  { id: 6, type: 'Savings', title: '3 unused subscriptions found', detail: 'You are paying for Disney+, Audible, and Duolingo but rarely use them.', icon: Layers, iconBg: 'bg-rose-500/10', iconColor: 'text-rose-500', time: '4d ago', read: true },
]

export default function AlertsTab() {
  const [activeFilter, setActiveFilter] = useState('All')
  const [dismissed, setDismissed] = useState<number[]>([])

  const filteredAlerts = alerts.filter((a) => {
    if (dismissed.includes(a.id)) return false
    if (activeFilter === 'All') return true
    return a.type === activeFilter
  })

  const unreadCount = alerts.filter((a) => !a.read && !dismissed.includes(a.id)).length

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
        <button className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white">
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

      <div className="space-y-3">
        {filteredAlerts.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-8 text-center">
            <Bell className="mx-auto h-8 w-8 text-white/20" />
            <p className="mt-3 text-sm text-white/50">No alerts in this category.</p>
          </div>
        )}
        {filteredAlerts.map((alert) => {
          const Icon = alert.icon
          return (
            <div
              key={alert.id}
              className={`relative rounded-2xl border p-4 transition hover:border-white/20 sm:p-5 ${
                alert.read ? 'border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a]' : 'border-[#7c3aed]/30 bg-gradient-to-br from-[#1a1033] to-[#0d061a]'
              }`}
            >
              {!alert.read && <div className="absolute left-0 top-4 h-2 w-2 rounded-full bg-[#7c3aed] sm:top-5" />}
              <div className={`flex items-start gap-4 ${!alert.read ? 'pl-4' : ''}`}>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${alert.iconBg}`}>
                  <Icon className={`h-5 w-5 ${alert.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{alert.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      alert.type === 'Urgent' ? 'bg-rose-500/10 text-rose-400' :
                      alert.type === 'Savings' ? 'bg-emerald-500/10 text-emerald-400' :
                      alert.type === 'Price Hikes' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-blue-500/10 text-blue-400'
                    }`}>{alert.type}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/50">{alert.detail}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <button className="inline-flex items-center gap-1 rounded-lg bg-[#7c3aed] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#6d28d9]">
                      Take action <ArrowRight className="h-3 w-3" />
                    </button>
                    <button className="text-xs text-white/40 transition hover:text-white">Dismiss</button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-[10px] text-white/40">{alert.time}</span>
                  <button
                    onClick={() => setDismissed((prev) => [...prev, alert.id])}
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
