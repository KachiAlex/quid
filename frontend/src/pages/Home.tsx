import { Link } from 'react-router-dom'
import { Shield, Sparkles, TrendingUp, ArrowUpRight, Zap } from 'lucide-react'

const featureCards = [
  {
    title: 'Hidden Money Finder',
    description: 'We scan your bank feeds for duplicate payments, renewal spikes, and abandoned subscriptions.',
    icon: Zap,
  },
  {
    title: 'Quid Shield Alerts',
    description: 'Get notified 60/14 days before big renewals so you can cancel or renegotiate.',
    icon: Shield,
  },
  {
    title: 'Instant Comparison',
    description: 'See how much you could save with curated alternatives across all product types.',
    icon: TrendingUp,
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <GradientHeader />
      <main className="relative z-10 max-w-6xl mx-auto px-4 py-24 space-y-20">
        <Hero />
        <FeatureGrid />
        <SavingsTimeline />
        <CTA />
      </main>
    </div>
  )
}

function GradientHeader() {
  return (
    <div className="relative h-80 bg-gradient-to-br from-[#031b38] via-[#061325] to-[#0b0f1b] overflow-hidden">
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.5),_transparent_45%)]" />
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_20%,_rgba(236,72,153,0.4),_transparent_40%)]" />
      <div className="relative z-10 flex flex-col gap-3 px-6 pt-10">
        <Link to="/" className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Sparkles className="w-6 h-6 text-emerald-400" />
          <span>Quid</span>
        </Link>
        <div className="flex flex-wrap gap-4">
          <span className="px-3 py-1 rounded-full bg-white/10 text-sm text-white/80">Finance AI</span>
          <span className="px-3 py-1 rounded-full bg-white/10 text-sm text-white/80">Open Banking</span>
          <span className="px-3 py-1 rounded-full bg-white/10 text-sm text-white/80">Autopilot Switching</span>
        </div>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section className="grid gap-12 lg:grid-cols-[1.1fr,0.9fr] items-center">
      <div className="space-y-8">
        <p className="text-sm uppercase tracking-[0.4em] text-white/50">Intelligent Money Return</p>
        <h1 className="text-5xl lg:text-6xl font-semibold leading-tight">
          Find Hidden Money. Keep More Cash.
        </h1>
        <p className="text-xl text-white/70 max-w-2xl">
          Quid analyzes every subscription, insurance premium, tariff, and renewal in cadence with your bank connections. We surface
          the highest-confidence savings, rank them by urgency, and help you take action in just a few taps.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            to="/connect-bank"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0ea5e9] to-[#6366f1] px-6 py-3 font-semibold text-white shadow-[0_20px_60px_rgba(14,165,233,0.3)]"
          >
            Securely Connect My Bank
            <ArrowUpRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-6 py-3 font-semibold text-white/80 hover:text-white"
          >
            Already a member? Sign in
          </Link>
        </div>
        <div className="flex flex-wrap gap-8 text-sm text-white/60">
          <Stat label="Money Recovered" value="$2.3M+" />
          <Stat label="Active Users" value="50K+" />
          <Stat label="Rated by Users" value="4.9★" />
        </div>
      </div>
      <div className="rounded-[36px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-[0_40px_80px_rgba(15,118,110,0.2)]">
        <div className="flex items-center justify-between text-sm text-white/70 mb-6">
          <span>Financial health</span>
          <span className="text-[#34d399]">+12 pts this month</span>
        </div>
        <div className="overflow-hidden rounded-2xl bg-slate-900/70 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-white/60">Total savings identified</p>
              <p className="text-3xl font-semibold">£1,280</p>
            </div>
            <div className="rounded-full bg-white/10 px-3 py-1 text-xs">Live</div>
          </div>
          <div className="h-2 w-full rounded-full bg-white/5">
            <div className="h-full w-3/5 rounded-full bg-gradient-to-r from-[#38bdf8] to-[#a78bfa]" />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <MiniStat label="Bills scanned" value="12" />
            <MiniStat label="Alerts pending" value="3" warning />
            <MiniStat label="Renewals due" value="4" />
            <MiniStat label="Switch requests" value="2" />
          </div>
        </div>
      </div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-3xl font-bold">{value}</p>
      <p>{label}</p>
    </div>
  )
}

function MiniStat({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className={`rounded-2xl border px-3 py-2 text-xs ${warning ? 'border-rose-400/70 text-rose-300' : 'border-white/20'}`}>
      <p className="text-white/80">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )
}

function FeatureGrid() {
  return (
    <section id="features" className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-semibold">What Quid unlocks for you</h2>
        <div className="text-sm text-white/60">Trusted by savings-hungry households</div>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {featureCards.map((feature) => (
          <article
            key={feature.title}
            className="group rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6 transition-all hover:border-white/40"
          >
            <div className="inline-flex rounded-2xl bg-white/10 p-3 mb-6">
              <feature.icon className="w-6 h-6 text-emerald-300" />
            </div>
            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
            <p className="text-sm text-white/60">{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function SavingsTimeline() {
  const timeline = [
    { title: 'Connect your bank', detail: 'TrueLayer-backed connection with bank-grade security.' },
    { title: 'Scan & classify', detail: 'AI rules tag each payment and tag renewals earning you alerts.' },
    { title: 'Switch with confidence', detail: 'Tailored comparisons show what to cancel or upgrade.' },
  ]
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-semibold">From connect to compare</h2>
        <p className="text-sm text-white/60">All in less than 3 minutes</p>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {timeline.map((step, index) => (
          <div
            key={step.title}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-3 hover:border-emerald-400/70"
          >
            <p className="text-sm text-white/60">Step {index + 1}</p>
            <h3 className="text-xl font-semibold">{step.title}</h3>
            <p className="text-sm text-white/60">{step.detail}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="rounded-[36px] border border-white/30 bg-gradient-to-r from-[#0ea5e9]/30 to-[#a78bfa]/30 p-10 text-center shadow-[0_30px_80px_rgba(15,118,110,0.25)]">
      <div className="space-y-4">
        <p className="text-sm uppercase tracking-[0.5em] text-white/60">Ready to keep more cash?</p>
        <h2 className="text-4xl font-semibold">Join 50K+ users already safeguarding their renewals.</h2>
        <p className="text-lg text-white/70 max-w-3xl mx-auto">
          Connect one account and Quid keeps watching renewals, analyzing savings, and nudging you to switch before you get billed again.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/connect-bank"
            className="rounded-2xl bg-white px-7 py-3 text-base font-semibold text-slate-900 shadow-lg shadow-slate-900/40 transition-all hover:-translate-y-1"
          >
            Connect my bank
          </Link>
          <Link
            to="/login"
            className="rounded-2xl border border-white/60 px-6 py-3 text-base font-semibold text-white/80 hover:text-white"
          >
            Explore dashboard
          </Link>
        </div>
      </div>
    </section>
  )
}
