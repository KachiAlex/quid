import { useEffect, useState } from 'react'
import {
  ArrowRight, CheckCircle2, Clock, Filter,
} from 'lucide-react'
import api from '../../lib/api'
import { getIcon } from '../../lib/dashboardIcons'

const filters = ['All', 'Pending', 'Completed', 'Expired']

const iconColors: Record<string, string> = {
  car_insurance: 'text-emerald-500',
  broadband: 'text-amber-500',
  energy: 'text-blue-500',
  subscription: 'text-rose-500',
  home_insurance: 'text-violet-500',
  mobile: 'text-violet-500',
  generic: 'text-white',
}

const iconBgs: Record<string, string> = {
  car_insurance: 'bg-emerald-500/10',
  broadband: 'bg-amber-500/10',
  energy: 'bg-blue-500/10',
  subscription: 'bg-rose-500/10',
  home_insurance: 'bg-violet-500/10',
  mobile: 'bg-violet-500/10',
  generic: 'bg-white/5',
}

interface SwitchItem {
  event_id: string
  from_provider: string
  to_provider: string
  saving: number
  status: string
  created_at: string
  confirmed_at: string | null
}

export default function SwitchesTab() {
  const [activeFilter, setActiveFilter] = useState('All')
  const [switches, setSwitches] = useState<SwitchItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/switch/history')
      .then((res) => setSwitches(res.data.switches || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = activeFilter === 'All'
    ? switches
    : switches.filter((s) => {
        const statusMap: Record<string, string> = {
          Pending: 'initiated',
          Completed: 'completed',
          Expired: 'cancelled',
        }
        return s.status === statusMap[activeFilter]
      })

  const totalSaved = switches
    .filter((s) => s.status === 'completed')
    .reduce((acc, s) => acc + (Number(s.saving) || 0), 0)

  const getProgress = (status: string) => {
    if (status === 'completed') return 100
    if (status === 'initiated') return 30
    if (status === 'cancelled') return 0
    return 50
  }

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
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Switches</h1>
          <p className="mt-1 text-sm text-white/50">Track your savings switches and cancellations.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] px-5 py-3">
          <p className="text-xs text-white/50">Total saved so far</p>
          <p className="text-2xl font-bold text-emerald-400">£{totalSaved.toLocaleString()}</p>
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
          const Icon = getIcon('generic')
          const progress = getProgress(item.status)
          return (
            <div key={item.event_id} className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-4 transition hover:border-white/20 sm:p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7c3aed]/20">
                  <Icon className="h-5 w-5 text-[#a78bfa]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-white">{item.from_provider} → {item.to_provider}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      item.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                      item.status === 'initiated' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-rose-500/10 text-rose-400'
                    }`}>{item.status === 'completed' ? 'Completed' : item.status === 'initiated' ? 'Pending' : 'Expired'}</span>
                  </div>
                  <p className="text-xs text-white/50">Switch recorded on {new Date(item.created_at).toLocaleDateString()}</p>

                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[10px] text-white/40">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          item.status === 'completed' ? 'bg-emerald-500' :
                          item.status === 'initiated' ? 'bg-amber-500' :
                          'bg-rose-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                      {item.status === 'completed' ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Clock className="h-3 w-3" />}
                      <span>{item.confirmed_at ? `Confirmed ${new Date(item.confirmed_at).toLocaleDateString()}` : 'Pending confirmation'}</span>
                    </div>
                    <p className="text-sm font-bold text-white">£{Number(item.saving || 0).toLocaleString()}<span className="text-xs font-normal text-white/50">/year</span></p>
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
