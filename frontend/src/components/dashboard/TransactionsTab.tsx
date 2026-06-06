import { useState } from 'react'
import {
  ArrowDownLeft, ShoppingBag, Coffee, Zap as ZapIcon, Car, Home, Film,
  Search, Filter, Download,
} from 'lucide-react'

const filters = ['All', 'Income', 'Bills', 'Shopping', 'Transport', 'Entertainment']

const transactions = [
  { id: 1, title: 'Salary', category: 'Income', amount: '3,200.00', type: 'income', date: 'Today', icon: ArrowDownLeft, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500' },
  { id: 2, title: 'Tesco', category: 'Shopping', amount: '87.43', type: 'expense', date: 'Today', icon: ShoppingBag, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-500' },
  { id: 3, title: 'Shell Petrol', category: 'Transport', amount: '62.50', type: 'expense', date: 'Yesterday', icon: Car, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500' },
  { id: 4, title: 'Netflix', category: 'Entertainment', amount: '12.99', type: 'expense', date: 'Yesterday', icon: Film, iconBg: 'bg-rose-500/10', iconColor: 'text-rose-500' },
  { id: 5, title: 'British Gas', category: 'Bills', amount: '134.20', type: 'expense', date: 'Jun 3', icon: ZapIcon, iconBg: 'bg-violet-500/10', iconColor: 'text-violet-500' },
  { id: 6, title: 'Starbucks', category: 'Shopping', amount: '5.60', type: 'expense', date: 'Jun 3', icon: Coffee, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500' },
  { id: 7, title: 'Rent', category: 'Bills', amount: '1,200.00', type: 'expense', date: 'Jun 1', icon: Home, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-500' },
  { id: 8, title: 'Salary', category: 'Income', amount: '3,200.00', type: 'income', date: 'May 31', icon: ArrowDownLeft, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500' },
]

export default function TransactionsTab() {
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = transactions.filter((t) => {
    if (activeFilter !== 'All' && t.category !== activeFilter) return false
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + parseFloat(t.amount.replace(',', '')), 0)

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
          <p className="mt-1 text-2xl font-bold text-white">£{totalExpense.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-4 sm:p-5">
          <p className="text-xs text-white/50">Income (Jun)</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">£3,200.00</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-4 sm:p-5">
          <p className="text-xs text-white/50">Biggest Category</p>
          <p className="mt-1 text-2xl font-bold text-white">Bills</p>
          <p className="text-xs text-white/50">£1,334.20</p>
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
          const Icon = t.icon
          return (
            <div key={t.id} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-4 transition hover:border-white/20 sm:p-5">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.iconBg}`}>
                <Icon className={`h-5 w-5 ${t.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{t.title}</p>
                <p className="text-xs text-white/50">{t.category} • {t.date}</p>
              </div>
              <p className={`text-sm font-semibold ${t.type === 'income' ? 'text-emerald-400' : 'text-white'}`}>
                {t.type === 'income' ? '+' : '-'}£{t.amount}
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
