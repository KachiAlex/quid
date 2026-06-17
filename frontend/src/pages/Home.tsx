import { Link } from 'react-router-dom'
import { motion, useInView, Variants } from 'framer-motion'
import { useRef } from 'react'
import {
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  Shield,
  Users,
  Star,
  Search,
  Zap,
  Lock,
  Eye,
  ArrowRight,
  PlayCircle,
  Landmark,
  DollarSign,
  MessageSquare,
  ToggleLeft,
} from 'lucide-react'

/* ─── Animation variants ─── */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' } }),
}

const slideRight: Variants = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: 'easeOut' } },
}

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

const childFadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

/* ─── Reusable animated wrapper ─── */
function FadeIn({ children, className, delay = 0, once = true }: { children: React.ReactNode; className?: string; delay?: number; once?: boolean }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once, margin: '-60px' })
  return (
    <motion.div ref={ref} initial="hidden" animate={isInView ? 'visible' : 'hidden'} variants={fadeUp} custom={delay} className={className}>
      {children}
    </motion.div>
  )
}

function StaggerContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div ref={ref} initial="hidden" animate={isInView ? 'visible' : 'hidden'} variants={staggerContainer} className={className}>
      {children}
    </motion.div>
  )
}

function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return <motion.div variants={childFadeUp} className={className}>{children}</motion.div>
}

/* ─── Data ─── */
const steps = [
  { title: 'Connect securely', detail: 'Connect your bank in under 60 seconds using Open Banking.', Icon: Landmark },
  { title: 'Discover overpayments', detail: 'Our AI scans thousands of deals to find every overpayment and money leak.', Icon: Search },
  { title: 'Switch in minutes', detail: 'We show you the best deals and help you switch instantly with one tap.', Icon: Zap },
  { title: 'Stay protected', detail: 'Quid Shield monitors 24/7 and protects you from price hikes.', Icon: Shield },
]

const features = [
  { title: 'Quid Shield', detail: 'We watch for renewals, price hikes and hidden increases 24/7.', Icon: Shield, color: 'text-violet-600', bg: 'bg-violet-100' },
  { title: 'Hidden Money Finder', detail: 'We find duplicated or forgotten subscriptions and unused services.', Icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { title: 'AI Financial Coach', detail: 'Personalised advice that actually helps you save more money.', Icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-100' },
  { title: 'Autopilot Switching', detail: 'Set your top-ups and let Quid auto-switch when better deals appear.', Icon: ToggleLeft, color: 'text-amber-600', bg: 'bg-amber-100' },
  { title: 'Community Insights', detail: 'Real-time insights from thousands of people switching every day.', Icon: Users, color: 'text-rose-600', bg: 'bg-rose-100' },
]

const featuredLogos = ['MSE', 'BBC', 'Forbes', 'TechCrunch', 'This is Money', 'The Guardian']

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-emerald-500 text-emerald-500" />
      ))}
    </div>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#04010a] text-white">
      <Hero />
      <TrustBadges />
      <HowItWorks />
      <FeatureHighlights />
      <StatisticBar />
      <Testimonials />
      <FeaturedLogos />
      <CTA />
    </div>
  )
}

/* ─── HERO ─── */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute right-0 top-1/2 h-[400px] w-[400px] -translate-y-1/2 translate-x-1/4 rounded-full bg-[#7c3aed]/20 blur-[100px] sm:h-[600px] sm:w-[600px] sm:blur-[120px]" />
      <div className="relative mx-auto max-w-6xl px-4 pt-6 pb-10 sm:pt-10 sm:pb-16">
        <div className="flex flex-col gap-8 sm:gap-10 lg:flex-row lg:items-center lg:gap-12">
          {/* Left content */}
          <motion.div
            className="space-y-4 sm:space-y-6 lg:max-w-[50%]"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={childFadeUp} className="inline-flex items-center gap-2 rounded-full border border-[#7c3aed]/40 bg-[#7c3aed]/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-[#a78bfa]">
              <Sparkles className="h-3.5 w-3.5" />
              AI Financial Guardian
            </motion.div>
            <motion.h1 variants={childFadeUp} className="text-3xl font-bold leading-[1.1] text-white sm:text-5xl lg:text-6xl">
              Stop overpaying.<br className="hidden sm:block" />
              Let AI protect<br className="hidden sm:block" />
              your money.
            </motion.h1>
            <motion.p variants={childFadeUp} className="max-w-md text-sm leading-relaxed text-white/60 sm:text-base">
              Quid connects to your bank securely, finds hidden overpayments and better deals, then helps you switch in minutes. We only win when you save.
            </motion.p>
            <motion.div variants={childFadeUp} className="flex flex-wrap gap-3 sm:gap-4">
              <Link to="/connect-bank" className="inline-flex items-center gap-2 rounded-xl bg-[#7c3aed] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_40px_rgba(124,58,237,0.4)] transition hover:bg-[#6d28d9] active:scale-95 sm:px-6 sm:py-3">
                Get my savings report <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link to="/how-it-works" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/80 backdrop-blur-sm transition hover:bg-white/10 hover:text-white active:scale-95 sm:px-6 sm:py-3">
                <PlayCircle className="h-4 w-4" /> See how it works
              </Link>
            </motion.div>
            <motion.div variants={childFadeUp} className="space-y-2 pt-2">
              <StarRating count={5} />
              <p className="text-xs text-white/50">4.8/5 from 1,200+ reviews</p>
            </motion.div>
            <motion.div variants={childFadeUp} className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-white/40">As featured in</p>
              <div className="flex flex-wrap gap-3 sm:gap-4">
                {['MSE', 'BBC', 'Forbes', 'TechCrunch'].map((l) => (
                  <span key={l} className="text-sm font-semibold text-white/50">{l}</span>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Phone mockup */}
          <motion.div
            className="relative mx-auto w-full max-w-[280px] sm:max-w-[340px] lg:mx-0 lg:ml-auto"
            initial="hidden"
            animate="visible"
            variants={slideRight}
          >
            <motion.div
              className="rounded-[36px] border border-white/10 bg-gradient-to-b from-[#1a1033] to-[#0d061a] p-4 shadow-2xl sm:p-5"
              whileHover={{ scale: 1.02, transition: { duration: 0.3 } }}
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-bold text-white">quid</span>
                <div className="flex gap-1"><div className="h-1.5 w-1.5 rounded-full bg-white/30" /><div className="h-1.5 w-1.5 rounded-full bg-white/30" /><div className="h-1.5 w-1.5 rounded-full bg-white/30" /></div>
              </div>
              <div className="mb-4 space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-white/40">Total savings found</p>
                <p className="text-3xl font-bold text-white sm:text-4xl">£2,847</p>
                <p className="text-xs text-emerald-400">+23% vs last scan</p>
              </div>
              <div className="mb-4 rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1a2e] to-[#12122a] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-white/50">Financial Health Score</p>
                    <p className="text-2xl font-bold text-white sm:text-3xl">78</p>
                    <p className="text-[10px] text-emerald-400">+12 points vs last month</p>
                  </div>
                  <div className="relative h-14 w-14 sm:h-16 sm:w-16">
                    <svg className="h-14 w-14 -rotate-90 sm:h-16 sm:w-16" viewBox="0 0 36 36">
                      <path className="text-white/10" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                      <path className="text-emerald-500" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="78, 100" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center"><span className="text-[10px] font-bold text-emerald-400">Good</span></div>
                  </div>
                </div>
              </div>
              {[
                { label: 'Insurance overpayment', value: '£712/year', icon: 'shield' as const, color: 'bg-emerald-500/20 text-emerald-400' },
                { label: 'Broadband price increase', value: '£216/year', icon: 'zap' as const, color: 'bg-amber-500/20 text-amber-400' },
                { label: '4 unused subscriptions', value: '£156/year', icon: 'eye' as const, color: 'bg-rose-500/20 text-rose-400' },
              ].map((item) => (
                <div key={item.label} className="mb-2 flex items-center gap-3 rounded-2xl border border-white/5 bg-[#12122a]/80 p-3 sm:mb-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full sm:h-10 sm:w-10 ${item.color}`}>
                    {item.icon === 'shield' ? <Shield className="h-4 w-4" /> : item.icon === 'zap' ? <Zap className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-medium text-white">{item.label}</p>
                    <p className="text-xs text-white/50">{item.value}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-white/30" />
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ─── TRUST BADGES (dark) ─── */
function TrustBadges() {
  const badges = [
    { title: 'Bank-level security', detail: 'Open Banking Standards', Icon: Lock },
    { title: 'FCA regulated', detail: 'Your data is protected', Icon: ShieldCheck },
    { title: 'No hidden fees', detail: 'We only win when you save', Icon: Sparkles },
    { title: 'Trusted by 250,000+ users', detail: '250,000+ users', Icon: Users },
  ]
  return (
    <StaggerContainer className="mx-auto max-w-6xl px-4 pb-10 sm:pb-16">
      <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 md:gap-12">
        {badges.map(({ title, detail, Icon }) => (
          <StaggerItem key={title}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 sm:h-10 sm:w-10">
                <Icon className="h-4 w-4 text-white/70" />
              </div>
              <div>
                <p className="text-xs font-medium text-white sm:text-sm">{title}</p>
                <p className="text-[10px] text-white/50 sm:text-xs">{detail}</p>
              </div>
            </div>
          </StaggerItem>
        ))}
      </div>
    </StaggerContainer>
  )
}

/* ─── HOW IT WORKS (light) ─── */
function HowItWorks() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <FadeIn className="space-y-3 text-center">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl md:text-4xl">How Quid works</h2>
          <p className="text-sm text-slate-500 sm:text-base">Four simple steps to stop overpaying.</p>
        </FadeIn>
        <StaggerContainer className="relative mt-10 grid gap-8 sm:mt-12 md:grid-cols-4">
          {steps.map((step, idx) => {
            const Icon = step.Icon
            return (
              <StaggerItem key={step.title} className="relative text-center">
                <motion.div
                  className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed]/15 to-[#6366f1]/10 sm:h-16 sm:w-16"
                  whileHover={{ scale: 1.1, transition: { duration: 0.2 } }}
                >
                  <Icon className="h-6 w-6 text-[#7c3aed] sm:h-7 sm:w-7" />
                </motion.div>
                <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500 sm:text-sm">{step.detail}</p>
                {idx < steps.length - 1 && (
                  <div className="absolute right-1/2 top-8 hidden translate-x-1/2 md:right-0 md:block md:translate-x-1/2">
                    <ArrowRight className="h-5 w-5 text-slate-300" />
                  </div>
                )}
              </StaggerItem>
            )
          })}
        </StaggerContainer>
      </div>
    </section>
  )
}

/* ─── FEATURES (light) ─── */
function FeatureHighlights() {
  return (
    <section className="bg-white pb-16 sm:pb-20">
      <div className="mx-auto max-w-6xl px-4">
        <FadeIn className="space-y-2 text-center">
          <p className="text-sm text-slate-500">More than a comparison site.</p>
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl md:text-4xl">Quid is your <span className="text-[#7c3aed]">financial guardian</span>.</h2>
        </FadeIn>
        <StaggerContainer className="mt-10 grid gap-6 sm:mt-12 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {features.map((feature) => {
            const Icon = feature.Icon
            return (
              <StaggerItem key={feature.title}>
                <motion.article className="text-center" whileHover={{ y: -4, transition: { duration: 0.2 } }}>
                  <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl sm:h-14 sm:w-14 ${feature.bg}`}>
                    <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500 sm:text-sm">{feature.detail}</p>
                </motion.article>
              </StaggerItem>
            )
          })}
        </StaggerContainer>
      </div>
    </section>
  )
}

/* ─── STATS (dark) ─── */
function StatisticBar() {
  return (
    <section className="bg-[#0f0a1e] py-12 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 text-center">
        <FadeIn>
          <h2 className="text-xl font-bold text-white sm:text-2xl">Real people. Real savings.</h2>
          <p className="mt-3 text-sm text-white/60">Connect your bank to see your personalised savings report.</p>
        </FadeIn>
      </div>
    </section>
  )
}

/* ─── TESTIMONIALS (light) ─── */
function Testimonials() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 text-center">
        <FadeIn>
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl md:text-4xl">Trusted by savers</h2>
          <p className="mt-3 text-sm text-slate-500">Connect your bank to discover how much you could save.</p>
        </FadeIn>
      </div>
    </section>
  )
}

/* ─── FEATURED LOGOS (light) ─── */
function FeaturedLogos() {
  return (
    <section className="bg-white pb-16 sm:pb-20">
      <FadeIn className="mx-auto max-w-6xl px-4 text-center">
        <p className="text-[10px] uppercase tracking-widest text-slate-400">As featured in</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          {featuredLogos.map((logo) => (
            <motion.span
              key={logo}
              className="text-base font-bold text-slate-400 sm:text-lg"
              whileHover={{ scale: 1.05, color: '#7c3aed', transition: { duration: 0.2 } }}
            >
              {logo}
            </motion.span>
          ))}
        </div>
      </FadeIn>
    </section>
  )
}

/* ─── CTA (dark) ─── */
function CTA() {
  return (
    <section className="bg-[#0f0a1e] py-14 sm:py-16">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <FadeIn className="space-y-3">
          <h2 className="text-2xl font-bold text-white sm:text-3xl md:text-4xl">Ready to stop overpaying?</h2>
          <p className="text-xs text-white/60 sm:text-sm">Join 250,000+ people who are already saving with their AI financial guardian.</p>
        </FadeIn>
        <FadeIn delay={0.2} className="mt-8 flex flex-col items-center gap-4">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link to="/connect-bank" className="inline-flex items-center gap-2 rounded-xl bg-[#7c3aed] px-7 py-3 text-sm font-semibold text-white shadow-[0_10px_40px_rgba(124,58,237,0.4)] transition hover:bg-[#6d28d9] sm:px-8 sm:py-3.5">
              Get my free savings report <ArrowUpRight className="h-4 w-4" />
            </Link>
          </motion.div>
          <p className="flex items-center gap-2 text-[10px] text-white/40 sm:text-xs">
            <Lock className="h-3 w-3" /> It's free, secure and takes less than 60 seconds.
          </p>
        </FadeIn>
      </div>
    </section>
  )
}
