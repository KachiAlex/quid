import {
  TrendingUp, ArrowRight, Zap as ZapIcon, Car, Wifi, Layers,
  Users, PoundSterling, BarChart3, Clock,
} from 'lucide-react'

const insights = [
  { id: 1, title: 'Your car insurance is 37% higher than average', detail: 'People in your area with similar cars pay £480 less. Consider getting new quotes.', icon: Car, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500', type: 'Savings', impact: '£480/year' },
  { id: 2, title: 'You spend 22% more on energy in winter', detail: 'Consider a fixed tariff to smooth costs, or improve insulation.', icon: ZapIcon, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500', type: 'Trend', impact: 'High' },
  { id: 3, title: 'Broadband speed vs price comparison', detail: 'You are paying for 500Mbps but only use 45Mbps on average. Downgrading could save £15/month.', icon: Wifi, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-500', type: 'Savings', impact: '£180/year' },
  { id: 4, title: 'Subscription stacking detected', detail: 'You have Netflix, Disney+, Prime Video, and Apple TV+. Most people only use 2 regularly.', icon: Layers, iconBg: 'bg-rose-500/10', iconColor: 'text-rose-500', type: 'Savings', impact: '£240/year' },
  { id: 5, title: 'Your savings rate is above average', detail: 'You save 18% of income vs the UK average of 8%. Keep it up!', icon: TrendingUp, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500', type: 'Positive', impact: 'Great' },
  { id: 6, title: 'Late bill payments affect your score', detail: '2 late payments in the last 6 months. Set up direct debits to avoid fees.', icon: Clock, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500', type: 'Warning', impact: 'Medium' },
]

const spendCategories = [
  { label: 'Bills', percent: 42, color: 'bg-violet-500' },
  { label: 'Shopping', percent: 24, color: 'bg-blue-500' },
  { label: 'Transport', percent: 18, color: 'bg-amber-500' },
  { label: 'Entertainment', percent: 10, color: 'bg-rose-500' },
  { label: 'Other', percent: 6, color: 'bg-emerald-500' },
]

export default function InsightsTab() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Insights</h1>
        <p className="mt-1 text-sm text-white/50">Personalised analysis to help you save more.</p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5 shadow-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Monthly Spending Breakdown</p>
            <p className="text-xs text-white/50">Where your money goes each month</p>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">-8% vs last month</span>
        </div>
        <div className="flex h-4 w-full overflow-hidden rounded-full bg-white/5">
          {spendCategories.map((cat) => (
            <div key={cat.label} className={`${cat.color}`} style={{ width: `${cat.percent}%` }} />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {spendCategories.map((cat) => (
            <div key={cat.label} className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${cat.color}`} />
              <span className="text-xs text-white/50">{cat.label} {cat.percent}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-4 sm:p-5">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#7c3aed]/20">
            <PoundSterling className="h-4 w-4 text-[#a78bfa]" />
          </div>
          <p className="text-2xl font-bold text-white">£2,847</p>
          <p className="mt-1 text-xs text-white/50">Potential annual savings</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-4 sm:p-5">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">18%</p>
          <p className="mt-1 text-xs text-white/50">Savings rate</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-4 sm:p-5">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
            <BarChart3 className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">£1,245</p>
          <p className="mt-1 text-xs text-white/50">Avg. monthly spend</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-4 sm:p-5">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
            <Users className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">Top 15%</p>
          <p className="mt-1 text-xs text-white/50">Of savers your age</p>
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between sm:mb-5">
          <h2 className="text-base font-semibold text-white sm:text-lg">Personalised Insights</h2>
          <span className="text-xs text-white/40">Updated daily</span>
        </div>
        <div className="space-y-3">
          {insights.map((insight) => {
            const Icon = insight.icon
            return (
              <div key={insight.id} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-4 transition hover:border-white/20 sm:p-5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${insight.iconBg}`}>
                  <Icon className={`h-5 w-5 ${insight.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-white">{insight.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      insight.type === 'Savings' ? 'bg-emerald-500/10 text-emerald-400' :
                      insight.type === 'Trend' ? 'bg-blue-500/10 text-blue-400' :
                      insight.type === 'Positive' ? 'bg-emerald-500/10 text-emerald-400' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>{insight.type}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/50">{insight.detail}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-xs font-medium text-white">Impact: {insight.impact}</span>
                    <button className="inline-flex items-center gap-1 text-xs font-medium text-[#a78bfa] transition hover:text-[#7c3aed]">
                      Learn more <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
