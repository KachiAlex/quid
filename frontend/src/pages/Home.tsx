import { Link } from 'react-router-dom'
import { ArrowUpRight, Sparkles, Bolt } from 'lucide-react'

const metrics = [
  { label: 'People saving with Quid', value: '250,000+' },
  { label: 'Total saved', value: '£18.4M+' },
  { label: 'Switches this month', value: '14,381' },
  { label: 'Average saving / user', value: '£287' },
]

const processSteps = [
  {
    title: 'Connect securely',
    detail: 'Link all your UK accounts in under 60 seconds.',
  },
  {
    title: 'Discover overpayments',
    detail: 'AI scans your feeds for spikes, duplicates, and renewal shocks.',
  },
  {
    title: 'Switch instantly',
    detail: 'See the best deals and automate the switch with one tap.',
  },
  {
    title: 'Stay protected',
    detail: 'Quid Shield monitors price changes 24/7 so you never overpay again.',
  },
]

const opportunityCards = [
  { title: 'Car insurance', value: '£712/year', tag: 'Very High', color: 'border-rose-400/40 text-rose-300' },
  { title: 'Broadband', value: '£216/year', tag: 'High', color: 'border-emerald-400/40 text-emerald-300' },
  { title: 'Energy', value: '£438/year', tag: 'High', color: 'border-amber-400/40 text-amber-300' },
  { title: 'Subscriptions', value: '£156/year', tag: 'Medium', color: 'border-sky-400/40 text-sky-300' },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-[#070b17] text-white">
      <Hero />
      <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-16 px-4 pb-20 pt-10">
        <TrustBadgeRow />
        <ProcessGrid />
        <OpportunityGrid />
        <MetricsPanel />
        <CTA />
      </main>
    </div>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#120e2c] via-[#1a2137] to-[#140d25] p-10 shadow-[0_40px_80px_rgba(3,7,18,0.8)]">
      <div className="absolute inset-0 opacity-40 blur-3xl" style={{ background: 'radial-gradient(circle at 20% 20%, rgba(59,130,246,0.4), transparent 40%), radial-gradient(circle at 80% 0%, rgba(236,72,153,0.55), transparent 30%)' }} />
      <div className="relative grid gap-12 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-1 text-xs uppercase tracking-[0.3em] text-white/70">
            <Sparkles className="h-4 w-4 text-emerald-300" />
            AI Financial Guardian
          </div>
          <h1 className="text-5xl font-bold leading-tight text-white">
            Stop overpaying. Let AI protect your money.
          </h1>
          <p className="text-lg text-white/70">
            Quid connects to your bank securely, finds hidden overpayments, and shows the best deals you can switch to in minutes.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/connect-bank"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#7c3aed] to-[#0ea5e9] px-6 py-3 text-base font-semibold shadow-[0_20px_60px_rgba(14,165,233,0.35)]"
            >
              Get my savings report
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              to="/how-it-works"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-6 py-3 text-base font-semibold text-white/80 transition hover:text-white"
            >
              See how it works
            </Link>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-white/60">
            <div className="inline-flex items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1">Bank-level security</span>
              <span className="rounded-full bg-white/10 px-3 py-1">FCA regulated</span>
            </div>
          </div>
        </div>
        <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Potential annual savings</p>
                <p className="text-4xl font-bold">£2,847</p>
              </div>
              <div className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/70">+23% vs last scan</div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {opportunityCards.map((item) => (
                <div key={item.title} className={`rounded-2xl border ${item.color} bg-white/5 p-4`}>  
                  <p className="text-sm text-white/50">{item.title}</p>
                  <p className="text-xl font-semibold text-white">{item.value}</p>
                  <p className="text-xs uppercase text-white/40">{item.tag}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TrustBadgeRow() {
  const badges = ['Bank-level security', 'FCA regulated', 'No hidden fees', 'Trusted by 250K+ users']
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-[28px] border border-white/10 bg-white/5 px-6 py-4 text-sm text-white/60">
      {badges.map((badge) => (
        <span key={badge} className="rounded-full border border-white/10 px-4 py-1">{badge}</span>
      ))}
    </div>
  )
}

function ProcessGrid() {
  return (
    <section className="grid gap-6 rounded-[32px] border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-semibold">How Quid works</h2>
          <p className="text-sm text-white/60">Four simple steps to stop overpaying.</p>
        </div>
        <button className="text-sm text-emerald-300 underline-offset-2 hover:underline">See details</button>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {processSteps.map((step) => (
          <article key={step.title} className="space-y-3 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-4">
            <div className="inline-flex items-center justify-center rounded-2xl bg-white/10 p-3">
              <Bolt className="h-5 w-5 text-emerald-300" />
            </div>
            <h3 className="text-lg font-semibold">{step.title}</h3>
            <p className="text-sm text-white/60">{step.detail}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function OpportunityGrid() {
  return (
    <section className="grid gap-6 rounded-[32px] border border-white/10 bg-gradient-to-br from-[#0b1223] to-[#090816] p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-semibold">Top opportunities</h2>
          <p className="text-sm text-white/60">Actionable alerts curated by Quid Shield.</p>
        </div>
        <button className="text-sm text-white/70 underline-offset-2 hover:text-white">See all (12)</button>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {opportunityCards.map((card) => (
          <div key={card.title} className={`rounded-3xl border bg-white/5 p-5 ${card.color}`}>
            <div className="text-sm uppercase tracking-widest text-white/40">{card.title}</div>
            <div className="mt-3 text-2xl font-semibold text-white">{card.value}</div>
            <div className="text-xs text-white/60">{card.tag} alert</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function MetricsPanel() {
  return (
    <section className="grid gap-6 rounded-[32px] border border-white/10 bg-white/5 p-6 md:grid-cols-2">
      <div className="space-y-4">
        <h2 className="text-3xl font-semibold">Real people. Real savings.</h2>
        <p className="text-sm text-white/60">Quid keeps an eye on your bills, savings and switches so you stay ahead of renewals.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-5">
              <p className="text-lg font-bold text-white">{metric.value}</p>
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">{metric.label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-6 rounded-3xl border border-white/10 bg-gradient-to-br from-[#090a16] to-[#0d0f1d] p-6 shadow-[0_30px_60px_rgba(15,23,42,0.8)]">
        <h3 className="text-xl font-semibold">Loved by thousands</h3>
        <div className="space-y-4 text-sm text-white/60">
          <p>“Quid found me £472 in potential savings within minutes.” — Sarah M.</p>
          <p>“Broadband price notice in 2 taps. The AI coach is a game changer.” — James P.</p>
          <p>“I didn’t know I was overpaying on 3 subscriptions—Quid cancelled them instantly.” — Olivia R.</p>
        </div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="flex flex-col items-center gap-6 rounded-[36px] border border-white/20 bg-gradient-to-r from-[#3b82f6]/20 via-[#8b5cf6]/20 to-[#c084fc]/20 p-10 text-center">
      <p className="text-sm uppercase tracking-[0.5em] text-white/70">Ready to stop overpaying?</p>
      <h2 className="text-4xl font-semibold">Get a free savings report in 60 seconds.</h2>
      <div className="flex flex-wrap justify-center gap-4">
        <Link
          to="/connect-bank"
          className="rounded-2xl bg-white px-8 py-3 text-lg font-semibold text-slate-900 shadow-lg shadow-slate-900/40 transition hover:-translate-y-1"
        >
          Connect my bank
        </Link>
        <Link
          to="/dashboard"
          className="rounded-2xl border border-white/70 px-6 py-3 text-lg font-semibold text-white/80 hover:text-white"
        >
          View dashboard
        </Link>
      </div>
    </section>
  )
}
