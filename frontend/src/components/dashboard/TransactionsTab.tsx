import { useEffect, useState } from 'react'
import {
  ArrowDownLeft, ShoppingBag, Coffee, Zap as ZapIcon, Car, Film,
  Search, Filter, Download,
} from 'lucide-react'
import api from '../../lib/api'

const filters = ['All', 'Income', 'Bills', 'Shopping', 'Transport', 'Entertainment']

const categoryIcons: Record<string, { icon: typeof ArrowDownLeft; bg: string; color: string }> = {
  Income: { icon: ArrowDownLeft, bg: 'bg-emerald-500/10', color: 'text-emerald-500' },
  Shopping: { icon: ShoppingBag, bg: 'bg-blue-500/10', color: 'text-blue-500' },
  Transport: { icon: Car, bg: 'bg-amber-500/10', color: 'text-amber-500' },
  Entertainment: { icon: Film, bg: 'bg-rose-500/10', color: 'text-rose-500' },
  Bills: { icon: ZapIcon, bg: 'bg-violet-500/10', color: 'text-violet-500' },
  default: { icon: Coffee, bg: 'bg-white/5', color: 'text-white' },
}

interface TransactionItem {
  transaction_id: string
  description: string
  amount: number
  currency: string
  transaction_date: string
  merchant_name: string | null
  category: string | null
}

export default function TransactionsTab() {
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/transactions')
      .then((res) => setTransactions(res.data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = transactions.filter((t) => {
    const cat = t.category || 'default'
    if (activeFilter !== 'All' && cat !== activeFilter) return false
    if (searchQuery && !t.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const totalSpent = transactions
    .filter((t) => t.amount < 0)
    .reduce((acc, t) => acc + Math.abs(t.amount), 0)

  const totalIncome = transactions
    .filter((t) => t.amount > 0)
    .reduce((acc, t) => acc + t.amount, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#7c3aed]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Transactions</h1>
          <p className="mt-1 text-sm text-white/50">Track spending and spot hidden savings.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white">
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-4 sm:p-5">
          <p className="text-xs text-white/50">Total Spent (Jun)</p>
          <p className="mt-1 text-2xl font-bold text-white">£{totalSpent.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-4 sm:p-5">
          <p className="text-xs text-white/50">Income (Jun)</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">£{totalIncome.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-4 sm:p-5">
          <p className="text-xs text-white/50">Biggest Category</p>
          <p className="mt-1 text-2xl font-bold text-white">-</p>
          <p className="text-xs text-white/50">Coming soon</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/30 focus:border-[#7c3aed] focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          <Filter className="h-4 w-4 shrink-0 text-white/40" />
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                activeFilter === f ? 'bg-[#7c3aed] text-white' : 'border border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((t) => {
          const meta = categoryIcons[t.category || 'default'] || categoryIcons.default
          const Icon = meta.icon
          const isIncome = t.amount > 0
          return (
            <div key={t.transaction_id} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-4 transition hover:border-white/20 sm:p-5">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.bg}`}>
                <Icon className={`h-5 w-5 ${meta.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{t.merchant_name || t.description}</p>
                <p className="text-xs text-white/50">{t.category || 'Uncategorized'} • {new Date(t.transaction_date).toLocaleDateString()}</p>
              </div>
              <p className={`text-sm font-semibold ${isIncome ? 'text-emerald-400' : 'text-white'}`}>
                {isIncome ? '+' : '-'}£{Math.abs(t.amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-8 text-center">
            <p className="text-sm text-white/50">No transactions found.</p>
          </div>
        )}
      </div>
    </div>
  )
}
