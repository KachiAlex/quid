import {
  Users, TrendingUp, ArrowRight, MessageSquare, Crown,
  Car, Wifi, Zap as ZapIcon, Shield, Star,
} from 'lucide-react'

const topSavers = [
  { name: 'Sarah M.', saved: '£4,230', avatar: 'SM', color: 'bg-emerald-500/20 text-emerald-400' },
  { name: 'James L.', saved: '£3,890', avatar: 'JL', color: 'bg-blue-500/20 text-blue-400' },
  { name: 'Alex K.', saved: '£2,847', avatar: 'AK', color: 'bg-[#7c3aed]/20 text-[#a78bfa]' },
  { name: 'Priya R.', saved: '£2,120', avatar: 'PR', color: 'bg-amber-500/20 text-amber-400' },
  { name: 'Tom W.', saved: '£1,980', avatar: 'TW', color: 'bg-rose-500/20 text-rose-400' },
]

const discussions = [
  { id: 1, title: 'Best broadband deals right now?', author: 'Sarah M.', replies: 24, likes: 18, time: '2h ago', icon: Wifi },
  { id: 2, title: 'Should I switch energy provider before winter?', author: 'James L.', replies: 42, likes: 31, time: '5h ago', icon: ZapIcon },
  { id: 3, title: 'Tips for haggling car insurance renewals', author: 'Priya R.', replies: 56, likes: 89, time: '1d ago', icon: Car },
  { id: 4, title: 'Quid Shield just saved me £180!', author: 'Tom W.', replies: 12, likes: 45, time: '2d ago', icon: Shield },
]

const communityStats = [
  { label: 'Active members', value: '24,583', icon: Users },
  { label: 'Total saved by community', value: '£8.4M', icon: TrendingUp },
  { label: 'Tips shared', value: '12,402', icon: MessageSquare },
]

export default function CommunityTab() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Community</h1>
        <p className="mt-1 text-sm text-white/50">Learn from others and share your savings wins.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        {communityStats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-4 sm:p-5">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#7c3aed]/20">
                <Icon className="h-4 w-4 text-[#a78bfa]" />
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="mt-1 text-xs text-white/50">{stat.label}</p>
            </div>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-4 flex items-center justify-between sm:mb-5">
            <h2 className="text-base font-semibold text-white sm:text-lg">Top Savers This Month</h2>
            <Crown className="h-4 w-4 text-amber-400" />
          </div>
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5 shadow-xl sm:p-6">
            <div className="space-y-4">
              {topSavers.map((saver, i) => (
                <div key={saver.name} className="flex items-center gap-4">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-[10px] font-bold text-white/50">
                    {i + 1}
                  </span>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${saver.color}`}>
                    {saver.avatar}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{saver.name}</p>
                  </div>
                  <p className="text-sm font-bold text-emerald-400">{saver.saved}</p>
                  {i === 0 && <Star className="h-4 w-4 text-amber-400" />}
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-white/5 pt-4">
              <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white">
                View full leaderboard <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between sm:mb-5">
            <h2 className="text-base font-semibold text-white sm:text-lg">Trending Discussions</h2>
            <MessageSquare className="h-4 w-4 text-[#a78bfa]" />
          </div>
          <div className="space-y-3">
            {discussions.map((d) => {
              const Icon = d.icon
              return (
                <div key={d.id} className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-4 transition hover:border-white/20 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#7c3aed]/20">
                      <Icon className="h-4 w-4 text-[#a78bfa]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{d.title}</p>
                      <p className="text-xs text-white/50">by {d.author} &middot; {d.time}</p>
                      <div className="mt-2 flex items-center gap-4 text-[10px] text-white/40">
                        <span>{d.replies} replies</span>
                        <span>{d.likes} likes</span>
                      </div>
                    </div>
                    <ArrowRight className="hidden h-4 w-4 shrink-0 text-white/30 sm:block" />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-3">
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white">
              Browse all discussions <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
