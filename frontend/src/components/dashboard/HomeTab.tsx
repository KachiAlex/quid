import { Link } from 'react-router-dom'
import {
  TrendingUp, Car, Wifi, Zap as ZapIcon, Layers,
  CheckCircle2, ArrowRight, RefreshCw,
  Shield, Eye, Bot, MessageSquare, Users,
  AlertTriangle, ArrowUpRight,
} from 'lucide-react'

const opportunities = [
  { category: 'Car Insurance', title: 'Overpaying', amount: '£712', period: '/year', urgency: 'Very High', urgencyColor: 'bg-emerald-100 text-emerald-700', icon: Car, iconColor: 'text-emerald-500', iconBg: 'bg-emerald-500/10' },
  { category: 'Broadband', title: 'Price Increase Detected', amount: '£216', period: '/year', urgency: 'High', urgencyColor: 'bg-amber-100 text-amber-700', icon: Wifi, iconColor: 'text-amber-500', iconBg: 'bg-amber-500/10' },
  { category: 'Energy', title: 'Better Tariff Available', amount: '£438', period: '/year', urgency: 'High', urgencyColor: 'bg-amber-100 text-amber-700', icon: ZapIcon, iconColor: 'text-violet-500', iconBg: 'bg-violet-500/10' },
  { category: 'Subscriptions', title: '4 Unused Subscriptions', amount: '£156', period: '/year', urgency: 'Medium', urgencyColor: 'bg-rose-100 text-rose-700', icon: Layers, iconColor: 'text-rose-500', iconBg: 'bg-rose-500/10' },
]

const recentActivity = [
  { icon: CheckCircle2, iconColor: 'text-emerald-500', iconBg: 'bg-emerald-500/10', title: 'Car insurance scan completed', detail: 'Found 8 better quotes for you', time: '2h ago' },
  { icon: ZapIcon, iconColor: 'text-amber-500', iconBg: 'bg-amber-500/10', title: 'Energy tariff updated', detail: 'Potential saving increased', time: '5h ago' },
  { icon: AlertTriangle, iconColor: 'text-rose-500', iconBg: 'bg-rose-500/10', title: 'Broadband price increase detected', detail: 'Virgin Media increasing by £18/month', time: '1d ago' },
  { icon: Layers, iconColor: 'text-blue-500', iconBg: 'bg-blue-500/10', title: '3 unused subscriptions found', detail: 'You could save £47/month', time: '2d ago' },
]

const chartData = [
  { month: 'Feb', value: 400 },
  { month: 'Mar', value: 900 },
  { month: 'Apr', value: 1400 },
  { month: 'May', value: 2100 },
  { month: 'Jun', value: 2847 },
]

function DashboardHeader() {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Good morning, Alex 👋</h1>
        <p className="mt-1 text-sm text-white/50">Quid found £2,847 in potential savings for you.</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 sm:flex">
          <Shield className="h-3.5 w-3.5" /> Quid Shield Active
        </div>
        <div className="h-9 w-9 overflow-hidden rounded-full bg-gradient-to-br from-[#7c3aed] to-[#6366f1]">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" alt="Alex" className="h-full w-full object-cover" />
        </div>
        <Link to="/connect-bank" className="hidden items-center gap-2 rounded-xl bg-[#7c3aed] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6d28d9] sm:inline-flex">
          View my savings <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

function TotalSavingsCard() {
  const maxValue = Math.max(...chartData.map((d) => d.value))
  const points = chartData.map((d, i) => {
    const x = (i / (chartData.length - 1)) * 100
    const y = 100 - (d.value / maxValue) * 80
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="mb-6 rounded-3xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5 shadow-xl sm:mb-8 sm:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2">
            <p className="text-xs uppercase tracking-widest text-white/50">Total Savings Found</p>
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-white/20 text-[10px] text-white/40">i</span>
          </div>
          <p className="text-4xl font-bold text-white sm:text-5xl">£2,847</p>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
            <TrendingUp className="h-3 w-3" /> +23% vs last scan
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/connect-bank" className="inline-flex items-center gap-2 rounded-xl bg-[#7c3aed] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6d28d9]">
              View all savings <ArrowRight className="h-4 w-4" />
            </Link>
            <button className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white">
              <RefreshCw className="h-4 w-4" /> Rescan now
            </button>
          </div>
        </div>
        <div className="flex-1">
          <div className="relative h-40 w-full sm:h-48">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points={`0,100 ${points} 100,100`} fill="url(#chartGrad)" />
              <polyline points={points} fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {chartData.map((d, i) => {
                const x = (i / (chartData.length - 1)) * 100
                const y = 100 - (d.value / maxValue) * 80
                return <circle key={d.month} cx={x} cy={y} r="2.5" fill="#a78bfa" />
              })}
            </svg>
            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-[10px] text-white/40">
              {chartData.map((d) => (
                <span key={d.month}>{d.month}</span>
              ))}
            </div>
            <div className="absolute right-0 top-0 flex flex-col items-end gap-1 text-[10px] text-white/30">
              <span>£3K</span>
              <span>£2K</span>
              <span>£1K</span>
              <span>£0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TopOpportunities() {
  return (
    <div className="mb-6 sm:mb-8">
      <div className="mb-4 flex items-center justify-between sm:mb-5">
        <h2 className="text-base font-semibold text-white sm:text-lg">Top Opportunities</h2>
        <span className="text-xs font-medium text-[#a78bfa] transition hover:text-[#7c3aed] cursor-pointer">See all (12)</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        {opportunities.map((op) => {
          const Icon = op.icon
          return (
            <div key={op.category} className="rounded-2xl border border-white/10 bg-[#12122a]/80 p-4 transition hover:border-white/20">
              <div className="mb-3 flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${op.iconBg}`}>
                  <Icon className={`h-4 w-4 ${op.iconColor}`} />
                </div>
                <span className="text-xs text-white/60">{op.category}</span>
              </div>
              <p className="text-sm font-semibold text-white">{op.title}</p>
              <p className="mt-2 text-2xl font-bold text-white">{op.amount}<span className="text-sm font-normal text-white/50">{op.period}</span></p>
              <div className="mt-3 flex items-center justify-between">
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${op.urgencyColor}`}>{op.urgency}</span>
                <ArrowRight className="h-4 w-4 text-white/30" />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function QuidShieldCard() {
  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5 shadow-xl sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Shield className="h-5 w-5 text-[#a78bfa]" />
        <span className="text-sm font-semibold text-white">Quid Shield</span>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">Active</span>
      </div>
      <p className="text-sm text-white/60">We're watching your renewals and price changes 24/7</p>
      <div className="my-5 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7c3aed]/20 text-xl font-bold text-[#a78bfa]">8</div>
        <div>
          <p className="text-sm font-medium text-white">Updates monitored</p>
          <p className="text-xs text-white/50">Next alert expected in 3 days</p>
        </div>
      </div>
      <button className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white">
        View all protections <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function FinancialHealthScore() {
  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5 shadow-xl sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm font-semibold text-white">Financial Health Score</span>
        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-white/20 text-[10px] text-white/40">i</span>
      </div>
      <div className="flex items-center gap-6">
        <div className="relative h-24 w-24 sm:h-28 sm:w-28">
          <svg className="h-24 w-24 -rotate-90 sm:h-28 sm:w-28" viewBox="0 0 36 36">
            <path className="text-white/10" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
            <path className="text-emerald-500" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="78, 100" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-white sm:text-3xl">78</span>
            <span className="text-[10px] text-emerald-400">Good</span>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            <TrendingUp className="h-3 w-3" /> +12 points vs last month
          </div>
          <p className="text-xs text-white/50">Your financial health is improving. Keep it up!</p>
          <button className="inline-flex items-center gap-1 text-xs font-medium text-[#a78bfa] transition hover:text-[#7c3aed]">
            See how to improve <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

function HiddenMoneyFinder() {
  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5 shadow-xl sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-semibold text-white">Hidden Money Finder</span>
        <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-400">New</span>
      </div>
      <p className="text-xs text-white/50">We found 2 duplicate charges and 3 forgotten subscriptions.</p>
      <div className="my-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7c3aed]/20">
          <Eye className="h-5 w-5 text-[#a78bfa]" />
        </div>
        <div>
          <p className="text-xs text-white/50">Potential recovery</p>
          <p className="text-xl font-bold text-white">£124</p>
        </div>
      </div>
      <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white">
        Review now <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function AIFinancialCoach() {
  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5 shadow-xl sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-semibold text-white">AI Financial Coach</span>
        <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-500/10 text-[10px] text-blue-400">
          <MessageSquare className="h-3 w-3" />
        </span>
      </div>
      <p className="text-xs text-white/50">Your car insurance is 37% higher than similar people in your area.</p>
      <div className="my-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
          <Bot className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <p className="text-xs text-white/50">Potential saving</p>
          <p className="text-xl font-bold text-white">£312<span className="text-sm font-normal text-white/50">/year</span></p>
        </div>
      </div>
      <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white">
        See recommendation <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function AutopilotCard() {
  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5 shadow-xl sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-white">Autopilot</span>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">Active</span>
      </div>
      <p className="text-xs text-white/50">Quid will auto-switch if savings exceed your set rules.</p>
      <div className="my-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-white/40">Auto-switch</p>
          <p className="text-sm font-medium text-emerald-400">On</p>
        </div>
        <div className="relative h-5 w-9 rounded-full bg-emerald-500">
          <div className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-white" />
        </div>
      </div>
      <div className="space-y-2 border-t border-white/5 pt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/40">Min. saving</span>
          <span className="text-white">£150<span className="text-white/50">/year</span></span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/40">Max. monthly cost</span>
          <span className="text-white">£45</span>
        </div>
      </div>
      <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white">
        Manage rules <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function RecentActivity() {
  return (
    <div className="mb-6 sm:mb-8">
      <div className="mb-4 flex items-center justify-between sm:mb-5">
        <h2 className="text-base font-semibold text-white sm:text-lg">Recent Activity</h2>
        <span className="text-xs font-medium text-[#a78bfa] transition hover:text-[#7c3aed] cursor-pointer">See all</span>
      </div>
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-4 shadow-xl sm:p-5">
        <div className="space-y-3">
          {recentActivity.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.title} className="flex items-start gap-3 rounded-2xl p-3 transition hover:bg-white/5">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${item.iconBg}`}>
                  <Icon className={`h-4 w-4 ${item.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="text-xs text-white/50">{item.detail}</p>
                </div>
                <span className="shrink-0 text-[10px] text-white/40">{item.time}</span>
              </div>
            )
          })}
        </div>
        <div className="mt-3 border-t border-white/5 pt-3">
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white">
            View all activity <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function CommunityInsights() {
  return (
    <div className="mb-6 sm:mb-8">
      <div className="mb-4 flex items-center justify-between sm:mb-5">
        <h2 className="text-base font-semibold text-white sm:text-lg">Community Insights</h2>
        <span className="text-xs text-white/40">This month</span>
      </div>
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5 shadow-xl sm:p-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#7c3aed]/20">
                  <Users className="h-4 w-4 text-[#a78bfa]" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">14,381</p>
                  <p className="text-xs text-white/50">People switched</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">+18%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">£287</p>
                  <p className="text-xs text-white/50">Average saving</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">+23%</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-400">A</div>
                <div>
                  <p className="text-sm font-medium text-white">Admiral</p>
                  <p className="text-[10px] text-white/50">Most switched to</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-white/30" />
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-xs font-bold text-amber-400">A</div>
                <div>
                  <p className="text-sm font-medium text-white">Aviva</p>
                  <p className="text-[10px] text-white/50">Most switched from</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-white/30" />
            </div>
          </div>
        </div>
        <div className="mt-4 border-t border-white/5 pt-4">
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white">
            See more insights <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function HomeTab() {
  return (
    <>
      <DashboardHeader />
      <TotalSavingsCard />
      <TopOpportunities />
      <div className="mb-6 grid gap-4 sm:mb-8 lg:grid-cols-2 sm:gap-6">
        <QuidShieldCard />
        <FinancialHealthScore />
      </div>
      <div className="mb-6 grid gap-4 sm:mb-8 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
        <HiddenMoneyFinder />
        <AIFinancialCoach />
        <AutopilotCard />
      </div>
      <RecentActivity />
      <CommunityInsights />
    </>
  )
}
