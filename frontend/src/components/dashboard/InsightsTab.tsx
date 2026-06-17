import { useEffect, useState } from 'react'
import {
  TrendingUp, PoundSterling, BarChart3, Clock,
} from 'lucide-react'
import api from '../../lib/api'
import { getIcon } from '../../lib/dashboardIcons'

const insightTypeColors: Record<string, string> = {
  Savings: 'bg-emerald-500/10 text-emerald-400',
  Trend: 'bg-blue-500/10 text-blue-400',
  Positive: 'bg-[#7c3aed]/10 text-[#a78bfa]',
  Warning: 'bg-amber-500/10 text-amber-400',
}

const iconColors: Record<string, string> = {
  car_insurance: 'text-rose-500',
  broadband: 'text-amber-500',
  energy: 'text-emerald-500',
  subscription: 'text-blue-500',
  trend: 'text-[#a78bfa]',
  shield: 'text-amber-500',
  generic: 'text-white',
}

interface InsightItem {
  insight_id: string
  insight_type: string
  title: string
  detail: string
  impact: string
  icon_category: string
  created_at: string
}

interface CategoryItem {
  category: string
  total: number
}

export default function InsightsTab() {
  const [insights, setInsights] = useState<InsightItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/insights'),
      api.get('/insights/spending'),
    ])
      .then(([insightsRes, spendingRes]) => {
        setInsights(insightsRes.data.insights || [])
        setCategories(spendingRes.data.categories || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const maxTotal = Math.max(...categories.map((c) => c.total), 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#7c3aed]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Insights</h1>
        <p className="mt-1 text-sm text-white/50">Personalised analysis of your spending and saving habits.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Savings found', value: '£2,847', icon: PoundSterling, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Monthly spend', value: '£1,240', icon: BarChart3, color: 'text-[#a78bfa]', bg: 'bg-[#7c3aed]/20' },
          { label: 'Savings rate', value: '18%', icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Avg. switch time', value: '4 min', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map((stat) => {
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

      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5 shadow-xl sm:p-6">
        <h2 className="mb-5 text-base font-semibold text-white sm:text-lg">Monthly Spending Breakdown</h2>
        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat.category} className="flex items-center gap-3">
              <p className="w-24 shrink-0 text-xs text-white/60">{cat.category}</p>
              <div className="flex-1">
                <div className="h-2 w-full rounded-full bg-white/5">
                  <div
                    className="h-2 rounded-full bg-[#7c3aed] transition-all"
                    style={{ width: `${Math.round((cat.total / maxTotal) * 100)}%` }}
                  />
                </div>
              </div>
              <p className="w-12 text-right text-xs text-white">£{Math.round(cat.total).toLocaleString()}</p>
            </div>
          ))}
          {categories.length === 0 && (
            <p className="text-center text-sm text-white/40 py-4">No spending data available yet.</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-base font-semibold text-white sm:mb-5 sm:text-lg">Personalised Insights</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {insights.map((insight) => {
            const Icon = getIcon(insight.icon_category)
            return (
              <div key={insight.insight_id} className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5 transition hover:border-white/20">
                <div className="mb-4 flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${insightTypeColors[insight.insight_type] || 'bg-white/5'}`}>
                    <Icon className={`h-5 w-5 ${iconColors[insight.icon_category] || 'text-white'}`} />
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${insightTypeColors[insight.insight_type] || 'bg-white/5 text-white'}`}>
                    {insight.insight_type}
                  </span>
                </div>
                <p className="text-sm font-semibold text-white">{insight.title}</p>
                <p className="mt-1 text-xs text-white/50">{insight.detail}</p>
                {insight.impact && (
                  <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                    <TrendingUp className="h-3 w-3" /> {insight.impact}
                  </div>
                )}
              </div>
            )
          })}
          {insights.length === 0 && (
            <p className="col-span-full text-center text-sm text-white/40 py-4">No insights generated yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
