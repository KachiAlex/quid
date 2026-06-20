import { useEffect, useState } from 'react'
import {
  TrendingUp, MessageSquare, ArrowRight,
} from 'lucide-react'
import { UserIcon } from '../Icons'
import api from '../../lib/api'

interface Leader {
  first_name: string
  last_name: string
  total_saved: number
}

interface Discussion {
  discussion_id: string
  title: string
  author_name: string
  icon_category: string
  created_at: string
  replies: number
}

interface Stats {
  activeMembers: number
  totalSaved: number
  tipsShared: number
}

export default function CommunityTab() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/community/stats'),
      api.get('/community/leaderboard'),
      api.get('/community/discussions'),
    ])
      .then(([statsRes, leadersRes, discRes]) => {
        setStats(statsRes.data)
        setLeaders(leadersRes.data.leaders || [])
        setDiscussions(discRes.data.discussions || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#7c3aed]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Community</h1>
        <p className="mt-1 text-sm text-white/50">Learn from fellow savers and share your own tips.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#7c3aed]/20">
            <UserIcon className="h-5 w-5 text-[#a78bfa]" />
          </div>
          <p className="text-2xl font-bold text-white">{stats ? stats.activeMembers.toLocaleString() : '-'}</p>
          <p className="mt-1 text-xs text-white/50">Active members</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">£{stats ? Math.round(stats.totalSaved).toLocaleString() : '-'}</p>
          <p className="mt-1 text-xs text-white/50">Total saved by community</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20">
            <MessageSquare className="h-5 w-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{stats ? stats.tipsShared.toLocaleString() : '-'}</p>
          <p className="mt-1 text-xs text-white/50">Tips shared</p>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5 shadow-xl sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white sm:text-lg">Top Savers This Month</h2>
          <span className="text-xs font-medium text-[#a78bfa] transition hover:text-[#7c3aed] cursor-pointer">View all</span>
        </div>
        <div className="space-y-2">
          {leaders.slice(0, 5).map((leader, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-white/5">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                i === 0 ? 'bg-amber-500/20 text-amber-400' :
                i === 1 ? 'bg-gray-500/20 text-gray-300' :
                i === 2 ? 'bg-amber-700/20 text-amber-500' :
                'text-white/40'
              }`}>{i + 1}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{leader.first_name} {leader.last_name.charAt(0)}.</p>
              </div>
              <span className="text-sm font-bold text-emerald-400">£{Math.round(leader.total_saved).toLocaleString()}</span>
            </div>
          ))}
          {leaders.length === 0 && (
            <p className="text-center text-sm text-white/40 py-4">No savers yet. Be the first!</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-base font-semibold text-white sm:mb-5 sm:text-lg">Trending Discussions</h2>
        <div className="space-y-3">
          {discussions.map((d) => (
            <div key={d.discussion_id} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-4 transition hover:border-white/20 sm:p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7c3aed]/20">
                <MessageSquare className="h-5 w-5 text-[#a78bfa]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{d.title}</p>
                <p className="text-xs text-white/50">{d.author_name} • {d.replies} replies</p>
              </div>
              <ArrowRight className="hidden h-4 w-4 shrink-0 text-white/30 sm:block" />
            </div>
          ))}
          {discussions.length === 0 && (
            <p className="text-center text-sm text-white/40 py-4">No discussions yet. Start one!</p>
          )}
        </div>
      </div>
    </div>
  )
}
