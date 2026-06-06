import { Link } from 'react-router-dom'
import {
  TrendingUp, Shield, Zap as ZapIcon, Car, Wifi, Layers,
  ArrowRight, Wallet, PiggyBank, ArrowUpRight, AlertTriangle,
} from 'lucide-react'

const quickStats = [
  { label: 'Total Savings', value: '£2,847', change: '+23%', icon: Wallet, iconBg: 'bg-[#7c3aed]/20', iconColor: 'text-[#a78bfa]' },
  { label: 'Health Score', value: '78', change: '+12 pts', icon: TrendingUp, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-400' },
  { label: 'Active Monitors', value: '8', change: '2 pending', icon: Shield, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-400' },
  { label: 'Monthly Saved', value: '£186', change: '+8%', icon: PiggyBank, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-400' },
]

const upcomingActions = [
  { title: 'Car insurance renewal in 14 days', subtitle: 'Potential saving: £712/year', icon: Car, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500', urgency: 'High' },
  { title: 'Broadband price hike detected', subtitle: 'Virgin Media +£18/month', icon: Wifi, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500', urgency: 'Medium' },
  { title: 'Energy better tariff available', subtitle: 'Save £438/year by switching', icon: ZapIcon, iconBg: 'bg-violet-500/10', iconColor: 'text-violet-500', urgency: 'High' },
  { title: '3 unused subscriptions', subtitle: 'You could save £47/month', icon: Layers, iconBg: 'bg-rose-500/10', iconColor: 'text-rose-500', urgency: 'Low' },
]

export default function OverviewTab() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Overview</h1>
          <p className="mt-1 text-sm text-white/50">Your financial snapshot at a glance.</p>
        </div>
        <Link to="/connect-bank" className="hidden items-center gap-2 rounded-xl bg-[#7c3aed] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6d28d9] sm:inline-flex">
          View my savings <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        {quickStats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.iconBg}`}>
                  <Icon className={`h-4 w-4 ${stat.iconColor}`} />
                </div>
                <span className="text-xs text-white/50">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="mt-1 text-xs text-emerald-400">{stat.change}</p>
            </div>
          )
        })}
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between sm:mb-5">
          <h2 className="text-base font-semibold text-white sm:text-lg">Upcoming Actions</h2>
          <span className="flex items-center gap-1 text-xs font-medium text-rose-400">
            <AlertTriangle className="h-3 w-3" /> 4 require attention
          </span>
        </div>
        <div className="space-y-3">
          {upcomingActions.map((action) => {
            const Icon = action.icon
            return (
              <div key={action.title} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-4 transition hover:border-white/20 sm:p-5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${action.iconBg}`}>
                  <Icon className={`h-5 w-5 ${action.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{action.title}</p>
                  <p className="text-xs text-white/50">{action.subtitle}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                  action.urgency === 'High' ? 'bg-rose-500/10 text-rose-400' :
                  action.urgency === 'Medium' ? 'bg-amber-500/10 text-amber-400' :
                  'bg-emerald-500/10 text-emerald-400'
                }`}>{action.urgency}</span>
                <ArrowRight className="hidden h-4 w-4 shrink-0 text-white/30 sm:block" />
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5 shadow-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Savings Trend</p>
            <p className="text-xs text-white/50">Potential savings found over time</p>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">+23% this month</span>
        </div>
        <div className="relative h-48 w-full">
          <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="h-full w-full overflow-visible">
            <defs>
              <linearGradient id="overviewGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points="0,50 0,40 20,35 40,28 60,20 80,12 100,5 100,50" fill="url(#overviewGrad)" />
            <polyline points="0,40 20,35 40,28 60,20 80,12 100,5" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="0" cy="40" r="2.5" fill="#a78bfa" />
            <circle cx="20" cy="35" r="2.5" fill="#a78bfa" />
            <circle cx="40" cy="28" r="2.5" fill="#a78bfa" />
            <circle cx="60" cy="20" r="2.5" fill="#a78bfa" />
            <circle cx="80" cy="12" r="2.5" fill="#a78bfa" />
            <circle cx="100" cy="5" r="2.5" fill="#a78bfa" />
          </svg>
          <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-[10px] text-white/40">
            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
          </div>
        </div>
      </div>
    </div>
  )
}
