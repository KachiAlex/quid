import { useState } from 'react'
import {
  Car, Wifi, Zap as ZapIcon, Layers, Shield, Smartphone,
  ArrowRight, CheckCircle2, Clock, Filter,
} from 'lucide-react'

const filters = ['All', 'Pending', 'Completed', 'Expired']

const switches = [
  { id: 1, category: 'Car Insurance', provider: 'Admiral', oldProvider: 'Aviva', saving: '£712', status: 'Pending', date: 'Due in 14 days', icon: Car, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500', progress: 65 },
  { id: 2, category: 'Broadband', provider: 'Hyperoptic', oldProvider: 'Virgin Media', saving: '£216', status: 'Pending', date: 'Switching on Jul 12', icon: Wifi, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500', progress: 30 },
  { id: 3, category: 'Energy', provider: 'Octopus Energy', oldProvider: 'British Gas', saving: '£438', status: 'Completed', date: 'Switched Jun 1', icon: ZapIcon, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-500', progress: 100 },
  { id: 4, category: 'Mobile', provider: 'giffgaff', oldProvider: 'EE', saving: '£156', status: 'Completed', date: 'Switched May 20', icon: Smartphone, iconBg: 'bg-violet-500/10', iconColor: 'text-violet-500', progress: 100 },
  { id: 5, category: 'Home Insurance', provider: 'LV=', oldProvider: 'Direct Line', saving: '£124', status: 'Expired', date: 'Expired May 15', icon: Shield, iconBg: 'bg-rose-500/10', iconColor: 'text-rose-500', progress: 0 },
  { id: 6, category: 'Subscriptions', provider: 'Cancelled Disney+', oldProvider: '-', saving: '£89', status: 'Completed', date: 'Cancelled May 10', icon: Layers, iconBg: 'bg-rose-500/10', iconColor: 'text-rose-500', progress: 100 },
]

export default function SwitchesTab() {
  const [activeFilter, setActiveFilter] = useState('All')

  const filtered = activeFilter === 'All' ? switches : switches.filter((s) => s.status === activeFilter)
  const totalSaved = switches
    .filter((s) => s.status === 'Completed')
    .reduce((acc, s) => acc + parseInt(s.saving.replace('£', '')), 0)

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Switches</h1>
          <p className="mt-1 text-sm text-white/50">Track your savings switches and cancellations.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] px-5 py-3">
          <p className="text-xs text-white/50">Total saved so far</p>
          <p className="text-2xl font-bold text-emerald-400">£{totalSaved}</p>
        </div>
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
        {filtered.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.id} className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-4 transition hover:border-white/20 sm:p-5">
              <div className="flex items-start gap-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}>
                  <Icon className={`h-5 w-5 ${item.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-white">{item.category}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      item.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' :
                      item.status === 'Pending' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-rose-500/10 text-rose-400'
                    }`}>{item.status}</span>
                  </div>
                  <p className="text-xs text-white/50">{item.oldProvider !== '-' ? `${item.oldProvider} → ${item.provider}` : item.provider}</p>

                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[10px] text-white/40">
                      <span>Progress</span>
                      <span>{item.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          item.status === 'Completed' ? 'bg-emerald-500' :
                          item.status === 'Pending' ? 'bg-amber-500' :
                          'bg-rose-500'
                        }`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                      {item.status === 'Completed' ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Clock className="h-3 w-3" />}
                      <span>{item.date}</span>
                    </div>
                    <p className="text-sm font-bold text-white">{item.saving}<span className="text-xs font-normal text-white/50">/year</span></p>
                  </div>
                </div>
                <ArrowRight className="hidden h-4 w-4 shrink-0 text-white/30 sm:block" />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
