import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import {
  Home, LayoutDashboard, AlertTriangle, Repeat, Shield,
  CreditCard, Target, Lightbulb, Users,
  User, ScanLine, Lock, Crown, ArrowRight,
  Landmark, X,
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import api from '../lib/api'

import HomeTab from '../components/dashboard/HomeTab'
import OverviewTab from '../components/dashboard/OverviewTab'
import AlertsTab from '../components/dashboard/AlertsTab'
import SwitchesTab from '../components/dashboard/SwitchesTab'
import QuidShieldTab from '../components/dashboard/QuidShieldTab'
import TransactionsTab from '../components/dashboard/TransactionsTab'
import GoalsTab from '../components/dashboard/GoalsTab'
import InsightsTab from '../components/dashboard/InsightsTab'
import CommunityTab from '../components/dashboard/CommunityTab'

type TabKey = 'Home' | 'Overview' | 'Alerts' | 'Switches' | 'Quid Shield' | 'Transactions' | 'Goals' | 'Insights' | 'Community'

function getSidebarNav(badge: number) {
  const nav: { label: TabKey; icon: React.ElementType; badge?: number }[] = [
    { label: 'Home', icon: Home },
    { label: 'Overview', icon: LayoutDashboard },
    { label: 'Alerts', icon: AlertTriangle, badge: badge > 0 ? badge : undefined },
    { label: 'Switches', icon: Repeat },
    { label: 'Quid Shield', icon: Shield },
    { label: 'Transactions', icon: CreditCard },
    { label: 'Goals', icon: Target },
    { label: 'Insights', icon: Lightbulb },
    { label: 'Community', icon: Users },
  ]
  return nav
}

function getBottomNav(badge: number) {
  const nav: { label: string; icon: React.ElementType; badge?: number; highlight?: boolean; href?: string }[] = [
    { label: 'Home', icon: Home },
    { label: 'Alerts', icon: AlertTriangle, badge: badge > 0 ? badge : undefined },
    { label: 'Scan', icon: ScanLine, highlight: true },
    { label: 'Switches', icon: Repeat },
    { label: 'Profile', icon: User, href: '/settings' },
  ]
  return nav
}

/* --- Sidebar --- */
function Sidebar({ activeTab, onTabChange, unreadCount }: { activeTab: TabKey; onTabChange: (t: TabKey) => void; unreadCount: number }) {
  const sidebarNav = getSidebarNav(unreadCount)
  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-white/5 bg-[#0d0d1a] px-4 py-6">
      <Link to="/" className="mb-8 px-2 text-2xl font-bold tracking-tight">
        quid<span className="text-[#7c3aed]">.</span>
      </Link>
      <nav className="flex-1 space-y-1">
        {sidebarNav.map((item) => (
          <button
            key={item.label}
            onClick={() => onTabChange(item.label)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              activeTab === item.label ? 'bg-[#7c3aed] text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
            {item.badge && (
              <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="mb-4 rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1033] to-[#0d061a] p-4">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#7c3aed]/20">
          <Crown className="h-5 w-5 text-[#a78bfa]" />
        </div>
        <p className="text-sm font-semibold">Upgrade to Quid Premium</p>
        <p className="mt-1 text-xs text-white/50">Unlock advanced features and maximum savings.</p>
        <button className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-xl bg-[#7c3aed] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#6d28d9]">
          Upgrade now <ArrowRight className="h-3 w-3" />
        </button>
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2.5">
        <Lock className="h-4 w-4 text-white/40" />
        <div>
          <p className="text-[10px] font-medium text-white/70">Your data is safe and secure</p>
          <p className="text-[10px] text-white/40">Bank-level encryption &middot; Open Banking standards</p>
        </div>
      </div>
    </aside>
  )
}

/* --- Bottom Nav (mobile) --- */
function BottomNav({ activeTab, onTabChange, unreadCount }: { activeTab: TabKey; onTabChange: (t: TabKey) => void; unreadCount: number }) {
  const bottomNav = getBottomNav(unreadCount)
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-[#0d0d1a] px-4 py-2 lg:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {bottomNav.map((item) => {
          if (item.highlight) {
            return (
              <button
                key={item.label}
                onClick={() => onTabChange('Overview')}
                className="relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium text-[#7c3aed] transition"
              >
                <div className="flex h-10 w-10 -translate-y-2 items-center justify-center rounded-full bg-[#7c3aed] shadow-lg shadow-[#7c3aed]/30">
                  <item.icon className="h-5 w-5 text-white" />
                </div>
                {item.label}
              </button>
            )
          }

          if (item.href) {
            return (
              <Link
                key={item.label}
                to={item.href}
                className={`relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition text-white/50`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          }

          const isActive = activeTab === item.label
          return (
            <button
              key={item.label}
              onClick={() => onTabChange(item.label as TabKey)}
              className={`relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition ${
                isActive ? 'text-white' : 'text-white/50'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
              {item.badge && (
                <span className="absolute right-1 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white">
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

/* --- Main Dashboard --- */
export default function Dashboard() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [activeTab, setActiveTab] = useState<TabKey>('Home')

  const [hasBankConnection, setHasBankConnection] = useState<boolean | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [unreadCount, setUnreadCount] = useState(5)

  useEffect(() => {
    const token = searchParams.get('token')
    const google = searchParams.get('google')
    if (google === 'success' && token) {
      api.get('/auth/me').then((res) => {
        setAuth({ id: res.data.userId, email: res.data.email, subscriptionTier: 'free' }, token)
        navigate('/onboarding', { replace: true })
      }).catch(() => { navigate('/login?error=google_auth_failed') })
    }
  }, [searchParams, navigate, setAuth])

  useEffect(() => {
    api.get('/banking/connections')
      .then((res) => setHasBankConnection(res.data.connections?.length > 0))
      .catch(() => setHasBankConnection(false))
  }, [])

  useEffect(() => {
    api.get('/alerts/count')
      .then((res) => setUnreadCount(res.data.unread))
      .catch(() => setUnreadCount(0))
  }, [activeTab])

  const renderTab = () => {
    switch (activeTab) {
      case 'Home': return <HomeTab />
      case 'Overview': return <OverviewTab />
      case 'Alerts': return <AlertsTab />
      case 'Switches': return <SwitchesTab />
      case 'Quid Shield': return <QuidShieldTab />
      case 'Transactions': return <TransactionsTab />
      case 'Goals': return <GoalsTab />
      case 'Insights': return <InsightsTab />
      case 'Community': return <CommunityTab />
      default: return <HomeTab />
    }
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a14] text-white">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} unreadCount={unreadCount} />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {hasBankConnection === false && !bannerDismissed && (
            <div className="mb-6 flex items-start gap-4 rounded-2xl border border-quid-500/30 bg-quid-600/10 p-4 sm:p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-quid-600/20">
                <Landmark className="h-5 w-5 text-quid-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">Connect your bank to see real savings</p>
                <p className="mt-1 text-xs text-white/60">
                  You haven't connected a bank account yet. Link your UK bank to discover overpayments and better deals.
                </p>
                <div className="mt-3 flex gap-3">
                  <Link
                    to="/connect-bank"
                    className="inline-flex items-center gap-1 rounded-lg bg-quid-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-quid-700"
                  >
                    Connect bank <ArrowRight className="h-3 w-3" />
                  </Link>
                  <button
                    onClick={() => setBannerDismissed(true)}
                    className="text-xs text-white/50 hover:text-white/80"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
              <button onClick={() => setBannerDismissed(true)} className="text-white/40 hover:text-white/80">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {renderTab()}
        </div>
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} unreadCount={unreadCount} />
      <div className="h-16 lg:hidden" />
    </div>
  )
}
