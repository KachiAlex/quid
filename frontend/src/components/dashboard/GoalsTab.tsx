import { useEffect, useState } from 'react'
import {
  PiggyBank, Plane, Home, Car, GraduationCap, Plus,
  TrendingUp, CheckCircle2,
} from 'lucide-react'
import api from '../../lib/api'

const goalIcons: Record<string, React.ElementType> = {
  emergency: PiggyBank,
  holiday: Plane,
  house: Home,
  car: Car,
  education: GraduationCap,
  generic: PiggyBank,
}

const iconColors: Record<string, string> = {
  emergency: 'text-emerald-500',
  holiday: 'text-blue-500',
  house: 'text-violet-500',
  car: 'text-amber-500',
  education: 'text-rose-500',
  generic: 'text-white',
}

const iconBgs: Record<string, string> = {
  emergency: 'bg-emerald-500/10',
  holiday: 'bg-blue-500/10',
  house: 'bg-violet-500/10',
  car: 'bg-amber-500/10',
  education: 'bg-rose-500/10',
  generic: 'bg-white/5',
}

interface GoalItem {
  goal_id: string
  name: string
  target_amount: number
  current_amount: number
  icon_category: string
  deadline: string
}

export default function GoalsTab() {
  const [goals, setGoals] = useState<GoalItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/goals')
      .then((res) => setGoals(res.data.goals || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalTarget = goals.reduce((acc, g) => acc + Number(g.target_amount), 0)
  const totalCurrent = goals.reduce((acc, g) => acc + Number(g.current_amount), 0)
  const overallProgress = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0

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
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Goals</h1>
          <p className="mt-1 text-sm text-white/50">Track your savings goals and watch your progress.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-[#7c3aed] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6d28d9]">
          <Plus className="h-4 w-4" /> New Goal
        </button>
      </div>

      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5 shadow-xl sm:p-6">
        <div className="flex items-center gap-6">
          <div className="relative h-24 w-24 sm:h-28 sm:w-28">
            <svg className="h-24 w-24 -rotate-90 sm:h-28 sm:w-28" viewBox="0 0 36 36">
              <path className="text-white/10" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
              <path className="text-[#7c3aed]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${overallProgress}, 100`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-white sm:text-3xl">{overallProgress}%</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-sm font-semibold text-white">Overall Progress</p>
            <p className="text-xs text-white/50">£{totalCurrent.toLocaleString()} saved towards £{totalTarget.toLocaleString()} in goals</p>
            <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
              <TrendingUp className="h-3 w-3" /> On track
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal) => {
          const Icon = goalIcons[goal.icon_category] || PiggyBank
          const target = Number(goal.target_amount)
          const current = Number(goal.current_amount)
          const percent = target > 0 ? Math.round((current / target) * 100) : 0
          return (
            <div key={goal.goal_id} className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5 transition hover:border-white/20">
              <div className="mb-4 flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBgs[goal.icon_category] || 'bg-white/5'}`}>
                  <Icon className={`h-5 w-5 ${iconColors[goal.icon_category] || 'text-white'}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{goal.name}</p>
                  <p className="text-xs text-white/50">Due {goal.deadline ? new Date(goal.deadline).toLocaleDateString() : 'No deadline'}</p>
                </div>
              </div>

              <div className="mb-2 flex items-end justify-between">
                <p className="text-xl font-bold text-white">£{current.toLocaleString()}</p>
                <p className="text-xs text-white/50">of £{target.toLocaleString()}</p>
              </div>

              <div className="mb-3 h-2 w-full rounded-full bg-white/5">
                <div className="h-2 rounded-full bg-[#7c3aed] transition-all" style={{ width: `${percent}%` }} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">{percent}% complete</span>
                {percent >= 100 ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Done
                  </span>
                ) : (
                  <button className="text-xs font-medium text-[#a78bfa] transition hover:text-[#7c3aed]">
                    Add funds
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
