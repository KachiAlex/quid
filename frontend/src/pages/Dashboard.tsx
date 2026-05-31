import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowUpRight, BarChart3, Clock3, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import api from '../lib/api'

export default function Dashboard() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  useEffect(() => {
    const token = searchParams.get('token')
    const google = searchParams.get('google')
    if (google === 'success' && token) {
      api
        .get('/auth/me')
        .then((res) => {
          setAuth(
            {
              id: res.data.userId,
              email: res.data.email,
              subscriptionTier: 'free',
            },
            token
          )
          navigate('/dashboard', { replace: true })
        })
        .catch(() => {
          navigate('/login?error=google_auth_failed')
        })
    }
  }, [searchParams, navigate, setAuth])

  return (
    <main className="space-y-10 px-4 py-10">
      <Hero />
      <div className="max-w-6xl mx-auto space-y-10">
        <SectionHeadline title="Live savings snapshot" description="Automated intelligence watches every bill so you stay ahead of renewals." />
        <div className="grid gap-6 md:grid-cols-3">
          {heroStats.map((stat) => (
            <article key={stat.label} className="rounded-3xl border border-slate-200/70 bg-white/70 p-5 shadow-lg transition hover:shadow-2xl">
              <div className="flex items-center justify-between text-slate-500/80">
                <p className="text-xs uppercase tracking-[0.3em]">{stat.label}</p>
                <stat.icon className="h-5 w-5 text-quid-600" />
              </div>
              <p className="mt-4 text-3xl font-semibold text-slate-900">{stat.value}</p>
              <p className="mt-1 text-sm text-slate-500">{stat.detail}</p>
            </article>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <SavingsPanel />
          <RenewalsPanel />
        </div>

        <SectionHeadline title="Proactive opportunities" description="Curated recommendations ready for one tap approval." />
        <div className="grid gap-6 lg:grid-cols-2">
          {opportunities.map((opportunity) => (
            <article key={opportunity.title} className="group flex flex-col justify-between rounded-[32px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-100 p-6 shadow-xl transition hover:translate-y-1">
              <div className="space-y-3">
                <p className="text-sm uppercase tracking-[0.4em] text-slate-500">{opportunity.category}</p>
                <h3 className="text-3xl font-semibold text-slate-900">{opportunity.title}</h3>
                <p className="text-sm text-slate-500">{opportunity.description}</p>
              </div>
              <div className="mt-6 flex items-end justify-between">
                <div>
                  <p className="text-4xl font-bold text-quid-600">{opportunity.savings}</p>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{opportunity.tag}</p>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <p>{opportunity.detail}</p>
                  <p className="text-emerald-600">{opportunity.progress}</p>
                </div>
              </div>
              <button className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-quid-600 opacity-0 transition group-hover:opacity-100">
                Explore <ArrowUpRight className="h-4 w-4" />
              </button>
            </article>
          ))}
        </div>

        <SectionHeadline title="Insights & timeline" description="See what Quid is monitoring on your behalf." />
        <div className="grid gap-6 lg:grid-cols-3">
          <InsightCard />
          <TrendCard />
          <ShieldCard />
        </div>
      </div>
    </main>
  )
}

const heroStats = [
  {
    label: 'Annual overpayment',
    value: '£4,235',
    detail: 'Estimated after latest scan',
    icon: TrendingUp,
  },
  {
    label: 'Connected accounts',
    value: '4',
    detail: 'Bank-level data synced hourly',
    icon: BarChart3,
  },
  {
    label: 'Renewals tracked',
    value: '12',
    detail: 'Real-time alerts sent',
    icon: Clock3,
  },
]

const opportunities = [
  {
    category: 'Energy',
    title: 'Business energy',
    description: 'Switch to a cleaner tariff with no admin fees.',
    savings: '£1,180',
    tag: 'High urgency',
    detail: 'Supplier holds renewal on 24 Jul',
    progress: '26% faster than last switch',
  },
  {
    category: 'Insurance',
    title: 'Fleet cover',
    description: 'Renewal window in 6 days—beat the broker rate.',
    savings: '£680',
    tag: 'Very high',
    detail: 'Quid Shield locked preferred broker',
    progress: '3 quotes ready',
  },
]

function Hero() {
  return (
    <section className="mx-auto max-w-6xl rounded-[40px] border border-quid-600/20 bg-gradient-to-r from-[#050816] via-[#10122d] to-[#090d26] p-10 text-white shadow-[0_50px_80px_rgba(8,15,45,0.85)]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.5em] text-quid-300">Premium intelligence</p>
          <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">Stay ahead of renewals, bills, and overpayments.</h1>
          <p className="max-w-2xl text-sm text-white/70">
            Quid analyses every debit and standing order, highlights the outsized costs, and delivers frictionless switches. The dashboard shows
            connected institutions, live savings, and proactive actions—so you don’t have to chase multiple providers.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-white/80">
              <Sparkles className="h-4 w-4" /> AI analyst
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-white/80">
              <ShieldCheck className="h-4 w-4" /> Bank-grade security
            </span>
          </div>
        </div>
        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">Connected targets</p>
          <p className="text-4xl font-semibold">4 accounts</p>
          <p className="text-sm text-white/70">Open banking connections refresh hourly, plus push syncs on each switch.</p>
          <div className="flex items-center gap-3 text-sm text-white/70">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Consent valid for 90 days</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function SectionHeadline({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{title}</p>
      <p className="text-2xl font-semibold text-slate-900">{description}</p>
    </div>
  )
}

function SavingsPanel() {
  const trend = [48, 68, 57, 84, 96, 110, 128]
  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Projected savings</p>
          <p className="text-5xl font-semibold text-quid-600">£4,235</p>
        </div>
        <p className="text-sm text-emerald-600">+12% vs last quarter</p>
      </div>
      <div className="mt-6 flex items-end gap-2">
        {trend.map((value, index) => (
          <div key={index} className="flex-1">
            <div className="h-28 rounded-2xl bg-gradient-to-b from-quid-400 to-quid-600" style={{ height: `${value}px` }} />
            <p className="text-center text-xs text-slate-500">{index + 1}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-slate-500">Minute-by-minute sweep keeps the estimate up to date.</p>
    </section>
  )
}

const upcomingRenewals = [
  { name: 'Commercial broadband', amount: '£216', due: '15 Jun', status: 'Review', bank: 'Monzo Business' },
  { name: 'Fleet insurance', amount: '£672', due: '21 Jun', status: 'Switch', bank: 'Lloyds' },
  { name: 'Office energy', amount: '£1,140', due: '03 Jul', status: 'Locked', bank: 'Revolut' },
]

function RenewalsPanel() {
  return (
    <section className="rounded-[32px] border border-slate-200 bg-gradient-to-b from-slate-900 to-slate-950 p-6 text-white shadow-[0_30px_60px_rgba(3,7,18,0.6)]">
      <div className="flex items-center justify-between">
        <p className="text-sm uppercase tracking-[0.5em] text-slate-400">Upcoming renewals</p>
        <p className="text-xs text-emerald-300">Next sync due in 12m</p>
      </div>
      <div className="mt-6 space-y-4">
        {upcomingRenewals.map((renewal) => (
          <div key={renewal.name} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">{renewal.name}</p>
              <p className="text-xs text-slate-400">{renewal.bank}</p>
            </div>
            <div className="text-right text-sm">
              <p className="text-lg font-semibold">{renewal.amount}</p>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">{renewal.due}</p>
            </div>
            <span className="rounded-full border border-white/40 px-3 py-1 text-xs uppercase tracking-[0.4em] text-white/80">
              {renewal.status}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

function InsightCard() {
  const insights = [
    'Billing spikes automatically flagged and suppressed.',
    'Renewal hunting reduced by 42% since last switch.',
    'Latest sync confirmed 3 new eligible products.',
  ]
  return (
    <article className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-lg">
      <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Insights</p>
      <h3 className="mt-4 text-2xl font-semibold text-slate-900">Quid is already working on:</h3>
      <ul className="mt-4 space-y-3 text-sm text-slate-600">
        {insights.map((insight) => (
          <li key={insight} className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 rounded-full bg-quid-600" />
            <span>{insight}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}

function TrendCard() {
  return (
    <article className="rounded-[32px] border border-quid-600/40 bg-gradient-to-br from-quid-600/10 to-white/80 p-6 shadow-2xl">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.4em] text-quid-600">Savings trend</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-quid-600/20 px-3 py-1 text-xs text-quid-600">
          <ShieldCheck className="h-4 w-4" /> Protected
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {[72, 98, 110, 130, 168].map((value, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Q{index + 1}</span>
            <div className="h-3 flex-1 rounded-full bg-white/30" style={{ width: `${value}%` }}>
              <div className="h-full rounded-full bg-gradient-to-r from-quid-500 to-quid-700" />
            </div>
            <span className="text-sm font-semibold text-slate-900">£{value * 10}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs uppercase tracking-[0.4em] text-slate-500">Powered by joint bank data + TrueLayer</p>
    </article>
  )
}

function ShieldCard() {
  return (
    <article className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-lg">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-quid-600" />
        <h3 className="text-lg font-semibold text-slate-900">Security & consent</h3>
      </div>
      <p className="mt-3 text-sm text-slate-500">
        TrueLayer tokens encrypted with AES-256, biometrics required for every refresh, and consent log stored per session.
      </p>
      <div className="mt-6 grid gap-4 text-sm text-slate-600">
        <div className="flex items-center justify-between">
          <span>Recent consents</span>
          <span className="text-quid-600">3 active</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Sync health</span>
          <span>99.8%</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Alert delivery</span>
          <span>Instant</span>
        </div>
      </div>
      <button className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-quid-600">
        Review security <ArrowUpRight className="h-4 w-4" />
      </button>
    </article>
  )
}
