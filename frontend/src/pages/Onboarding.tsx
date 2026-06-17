import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Landmark, ShieldCheck, Lock, ArrowRight,
  CheckCircle2, ChevronRight, SkipForward,
  Banknote, Search, Eye, X,
} from 'lucide-react'
import api from '../lib/api'

const steps = [
  {
    icon: Landmark,
    title: 'Select your bank',
    detail: 'Choose from all major UK banks including HSBC, Barclays, Monzo, Starling, NatWest, Lloyds, and more.',
  },
  {
    icon: Lock,
    title: 'Login with your bank',
    detail: 'You authenticate directly with your bank. Your login credentials never touch our servers.',
  },
  {
    icon: Search,
    title: 'We find your savings',
    detail: 'We scan 12 months of transactions to detect subscriptions, bills, and insurance renewals.',
  },
]

const trustBadges = [
  { icon: ShieldCheck, label: 'FCA Regulated', detail: 'Open Banking Standard' },
  { icon: Lock, label: 'Bank-Level Security', detail: '256-bit Encryption' },
  { icon: Eye, label: 'You Control Access', detail: 'Revoke anytime in Settings' },
]

const supportedBanks = [
  'HSBC', 'Barclays', 'Monzo', 'Starling', 'NatWest',
  'Lloyds', 'Santander', 'Nationwide', 'Halifax', 'RBS',
]

export default function Onboarding() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [hasConnections, setHasConnections] = useState<boolean | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const checkConnections = async () => {
      try {
        const res = await api.get('/banking/connections')
        if (res.data.connections && res.data.connections.length > 0) {
          navigate('/dashboard', { replace: true })
          return
        }
        setHasConnections(false)
      } catch {
        setHasConnections(false)
      } finally {
        setLoading(false)
      }
    }
    checkConnections()
  }, [navigate])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    )
  }

  if (hasConnections) return null

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-xl font-bold tracking-tight text-slate-900">
            quid<span className="text-quid-600">.</span>
          </Link>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Skip for now <SkipForward className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        {/* Hero */}
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-quid-600/10">
            <Banknote className="h-8 w-8 text-quid-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Find your hidden savings
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base text-slate-600">
            Connect your UK bank account securely using Open Banking.
            We will scan your transactions, find overpayments, and show you better deals.
          </p>
        </div>

        {/* Steps */}
        <div className="mt-12 space-y-6">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <div
                key={step.title}
                className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-quid-600/10">
                  <Icon className="h-5 w-5 text-quid-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-quid-600 text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                    <h3 className="text-base font-semibold text-slate-900">{step.title}</h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{step.detail}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Trust badges */}
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {trustBadges.map((badge) => {
            const Icon = badge.icon
            return (
              <div
                key={badge.label}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"
              >
                <Icon className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{badge.label}</p>
                  <p className="text-xs text-slate-500">{badge.detail}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Supported banks */}
        {!dismissed && (
          <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Supported UK banks</h3>
              <button onClick={() => setDismissed(true)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {supportedBanks.map((bank) => (
                <span
                  key={bank}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {bank}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Privacy note */}
        <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-emerald-900">Your data stays private</p>
              <p className="mt-1 text-xs text-emerald-700">
                We only keep classified product records (e.g., "Energy with Octopus").
                Raw transaction details are automatically deleted within 24 hours.
                You can revoke bank access at any time from your Settings.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/connect-bank"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-quid-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-quid-700"
          >
            Connect Your Bank <ArrowRight className="h-5 w-5" />
          </Link>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-8 py-3.5 text-base font-medium text-slate-700 transition hover:bg-slate-50"
          >
            I will do this later <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Regulatory footer */}
        <p className="mt-8 text-center text-xs text-slate-400">
          Powered by TrueLayer, an FCA-authorised Open Banking provider.
          Quid acts as an Account Information Service Provider under the Payment Services Regulations 2017.
        </p>
      </div>
    </main>
  )
}
