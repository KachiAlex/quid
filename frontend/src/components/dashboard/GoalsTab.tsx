import {
  PiggyBank, Plane, Home, Car, GraduationCap, Plus,
  TrendingUp, CheckCircle2,
} from 'lucide-react'

const goals = [
  { id: 1, name: 'Emergency Fund', target: 5000, current: 3200, icon: PiggyBank, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500', deadline: 'Dec 2026' },
  { id: 2, name: 'Holiday to Japan', target: 3500, current: 1200, icon: Plane, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-500', deadline: 'Apr 2027' },
  { id: 3, name: 'House Deposit', target: 40000, current: 8500, icon: Home, iconBg: 'bg-violet-500/10', iconColor: 'text-violet-500', deadline: 'Dec 2028' },
  { id: 4, name: 'New Car', target: 12000, current: 4500, icon: Car, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500', deadline: 'Jun 2027' },
  { id: 5, name: 'Masters Degree', target: 15000, current: 2000, icon: GraduationCap, iconBg: 'bg-rose-500/10', iconColor: 'text-rose-500', deadline: 'Sep 2027' },
]

export default function GoalsTab() {
  const totalTarget = goals.reduce((acc, g) => acc + g.target, 0)
  const totalCurrent = goals.reduce((acc, g) => acc + g.current, 0)
  const overallProgress = Math.round((totalCurrent / totalTarget) * 100)

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
          const Icon = goal.icon
          const percent = Math.round((goal.current / goal.target) * 100)
          return (
            <div key={goal.id} className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5 transition hover:border-white/20">
              <div className="mb-4 flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${goal.iconBg}`}>
                  <Icon className={`h-5 w-5 ${goal.iconColor}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{goal.name}</p>
                  <p className="text-xs text-white/50">Due {goal.deadline}</p>
                </div>
              </div>

              <div className="mb-2 flex items-end justify-between">
                <p className="text-xl font-bold text-white">£{goal.current.toLocaleString()}</p>
                <p className="text-xs text-white/50">of £{goal.target.toLocaleString()}</p>
              </div>

              <div className="mb-3 h-2 w-full rounded-full bg-white/5">
                <div
                  className="h-2 rounded-full bg-[#7c3aed] transition-all"
                  style={{ width: `${percent}%` }}
                />
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
