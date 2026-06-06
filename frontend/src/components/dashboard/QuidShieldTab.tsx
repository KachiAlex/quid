import {
  Shield, CheckCircle2, Clock, AlertTriangle, Car, Wifi, Zap as ZapIcon, Home, Smartphone, CreditCard,
  ArrowRight, Settings, Lock,
} from 'lucide-react'

const protections = [
  { category: 'Car Insurance', provider: 'Aviva', renewalDate: 'Jul 18, 2026', status: 'Monitoring', nextAction: 'Shop quotes 30 days before', icon: Car, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500' },
  { category: 'Broadband', provider: 'Virgin Media', renewalDate: 'Sep 5, 2026', status: 'Alert triggered', nextAction: 'Price hike detected', icon: Wifi, iconBg: 'bg-rose-500/10', iconColor: 'text-rose-500' },
  { category: 'Energy', provider: 'British Gas', renewalDate: 'Oct 12, 2026', status: 'Monitoring', nextAction: 'Better tariff found', icon: ZapIcon, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500' },
  { category: 'Home Insurance', provider: 'Direct Line', renewalDate: 'Aug 3, 2026', status: 'Monitoring', nextAction: 'Review due in 60 days', icon: Home, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-500' },
  { category: 'Mobile', provider: 'EE', renewalDate: 'Nov 20, 2026', status: 'Monitoring', nextAction: 'Check SIM-only deals', icon: Smartphone, iconBg: 'bg-violet-500/10', iconColor: 'text-violet-500' },
  { category: 'Credit Card', provider: 'Barclaycard', renewalDate: 'Dec 1, 2026', status: 'Monitoring', nextAction: '0% offers ending soon', icon: CreditCard, iconBg: 'bg-rose-500/10', iconColor: 'text-rose-500' },
]

const stats = [
  { label: 'Active monitors', value: '8', icon: Shield, color: 'text-[#a78bfa]', bg: 'bg-[#7c3aed]/20' },
  { label: 'Alerts sent', value: '12', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { label: 'Savings secured', value: '£1,624', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { label: 'Upcoming renewals', value: '3', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10' },
]

export default function QuidShieldTab() {
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
            <p className="text-xs text-white/50">All monitors running. Last scan: 2 hours ago.</p>
          </div>
          <div className="ml-auto hidden rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 sm:block">
            <Lock className="mr-1 inline h-3 w-3" /> Bank-grade secure
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-4 sm:p-5">
              <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
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
          <button className="text-xs font-medium text-[#a78bfa] transition hover:text-[#7c3aed]">Add service</button>
        </div>
        <div className="space-y-3">
          {protections.map((p) => {
            const Icon = p.icon
            return (
              <div key={p.category} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-4 transition hover:border-white/20 sm:p-5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${p.iconBg}`}>
                  <Icon className={`h-5 w-5 ${p.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-white">{p.category}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      p.status === 'Monitoring' ? 'bg-emerald-500/10 text-emerald-400' :
                      'bg-rose-500/10 text-rose-400'
                    }`}>{p.status}</span>
                  </div>
                  <p className="text-xs text-white/50">{p.provider} • Renewal: {p.renewalDate}</p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-xs text-white/40">Next action</p>
                  <p className="text-xs font-medium text-white">{p.nextAction}</p>
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
