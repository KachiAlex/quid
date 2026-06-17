import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Heart, ArrowLeft, TrendingUp, Target,
  Shield, BarChart3, Info, Settings,
  Calendar, Download, RefreshCw
} from 'lucide-react'
import api from '../lib/api'
import FinancialHealthScore from '../components/FinancialHealthScore'
import FinancialHealthTrends from '../components/FinancialHealthTrends'

interface FinancialHealthScore {
  id: string
  userId: string
  overallScore: number
  scoreCategory: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  componentScores: {
    affordability: number
    optimization: number
    stability: number
    diversity: number
    awareness: number
  }
  factors: {
    totalSubscriptions: number
    totalAnnualCost: number
    potentialSavings: number
  }
  recommendations: Array<{
    category: string
    priority: 'high' | 'medium' | 'low'
    title: string
    description: string
    potentialImpact: number
    estimatedSavings: number
  }>
  calculatedAt: string
  nextReviewDate: string
}

interface UserProfile {
  estimatedAnnualIncome: number | null
  monthlyBudget: number | null
  riskTolerance: string | null
  preferredSavingsMethod: string | null
  financialGoals: Record<string, any>
  notificationPreferences: Record<string, any>
}

const scoreCategories = {
  excellent: { 
    color: 'text-emerald-400', 
    bgColor: 'bg-emerald-500/10', 
    borderColor: 'border-emerald-500/30',
    description: 'Excellent financial health'
  },
  good: { 
    color: 'text-blue-400', 
    bgColor: 'bg-blue-500/10', 
    borderColor: 'border-blue-500/30',
    description: 'Good financial health'
  },
  fair: { 
    color: 'text-amber-400', 
    bgColor: 'bg-amber-500/10', 
    borderColor: 'border-amber-500/30',
    description: 'Fair financial health'
  },
  poor: { 
    color: 'text-orange-400', 
    bgColor: 'bg-orange-500/10', 
    borderColor: 'border-orange-500/30',
    description: 'Poor financial health'
  },
  critical: { 
    color: 'text-red-400', 
    bgColor: 'bg-red-500/10', 
    borderColor: 'border-red-500/30',
    description: 'Critical financial health'
  }
}

function QuickStats({ score, profile }: { score: FinancialHealthScore; profile: UserProfile | null }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4 text-white/50" />
          <span className="text-xs text-white/50">Subscriptions</span>
        </div>
        <p className="text-2xl font-bold text-white">{score.factors.totalSubscriptions}</p>
        <p className="text-xs text-white/50 mt-1">Active services</p>
      </div>
      
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-white/50" />
          <span className="text-xs text-white/50">Annual Cost</span>
        </div>
        <p className="text-2xl font-bold text-white">£{Math.round(score.factors.totalAnnualCost).toLocaleString()}</p>
        <p className="text-xs text-white/50 mt-1">Total yearly</p>
      </div>
      
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Heart className="h-4 w-4 text-white/50" />
          <span className="text-xs text-white/50">Potential Savings</span>
        </div>
        <p className="text-2xl font-bold text-emerald-400">£{Math.round(score.factors.potentialSavings).toLocaleString()}</p>
        <p className="text-xs text-white/50 mt-1">Available to save</p>
      </div>
      
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-white/50" />
          <span className="text-xs text-white/50">Next Review</span>
        </div>
        <p className="text-lg font-bold text-white">
          {new Date(score.nextReviewDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
        </p>
        <p className="text-xs text-white/50 mt-1">Score update</p>
      </div>
    </div>
  )
}

function RecommendationsList({ recommendations }: { recommendations: FinancialHealthScore['recommendations'] }) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      default: return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5">
      <h3 className="text-lg font-semibold text-white mb-4">Personalized Recommendations</h3>
      <div className="space-y-3">
        {recommendations.map((rec, index) => (
          <div key={index} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start gap-3">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full border ${getPriorityColor(rec.priority)}`}>
                <span className="text-[10px] font-bold">{rec.priority.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-white mb-1">{rec.title}</h4>
                <p className="text-xs text-white/60 mb-2">{rec.description}</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-white/50">Impact:</span>
                    <span className="text-xs font-medium text-white">{rec.potentialImpact}%</span>
                  </div>
                  {rec.estimatedSavings > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-white/50">Savings:</span>
                      <span className="text-xs font-medium text-emerald-400">
                        £{Math.round(rec.estimatedSavings).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function UserProfileCard({ profile, onUpdate }: { profile: UserProfile | null; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    estimatedAnnualIncome: profile?.estimatedAnnualIncome || '',
    monthlyBudget: profile?.monthlyBudget || '',
    riskTolerance: profile?.riskTolerance || 'moderate',
    preferredSavingsMethod: profile?.preferredSavingsMethod || 'automatic'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.put('/products/user-profile', {
        estimatedAnnualIncome: formData.estimatedAnnualIncome ? parseFloat(formData.estimatedAnnualIncome) : null,
        monthlyBudget: formData.monthlyBudget ? parseFloat(formData.monthlyBudget) : null,
        riskTolerance: formData.riskTolerance,
        preferredSavingsMethod: formData.preferredSavingsMethod
      })
      setEditing(false)
      onUpdate()
    } catch (error) {
      console.error('Failed to update profile:', error)
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Financial Profile</h3>
        <button
          onClick={() => setEditing(!editing)}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <Settings className="h-3 w-3" />
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {editing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1">
              Estimated Annual Income
            </label>
            <input
              type="number"
              value={formData.estimatedAnnualIncome}
              onChange={(e) => setFormData({ ...formData, estimatedAnnualIncome: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/50 focus:border-[#7c3aed] focus:outline-none"
              placeholder="50000"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1">
              Monthly Budget
            </label>
            <input
              type="number"
              value={formData.monthlyBudget}
              onChange={(e) => setFormData({ ...formData, monthlyBudget: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/50 focus:border-[#7c3aed] focus:outline-none"
              placeholder="1000"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1">
              Risk Tolerance
            </label>
            <select
              value={formData.riskTolerance}
              onChange={(e) => setFormData({ ...formData, riskTolerance: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#7c3aed] focus:outline-none"
            >
              <option value="conservative">Conservative</option>
              <option value="moderate">Moderate</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>
          
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-[#7c3aed] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6d28d9]"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">Annual Income</span>
            <span className="text-sm font-medium text-white">
              {profile?.estimatedAnnualIncome ? `£${profile.estimatedAnnualIncome.toLocaleString()}` : 'Not set'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">Monthly Budget</span>
            <span className="text-sm font-medium text-white">
              {profile?.monthlyBudget ? `£${profile.monthlyBudget.toLocaleString()}` : 'Not set'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">Risk Tolerance</span>
            <span className="text-sm font-medium text-white capitalize">
              {profile?.riskTolerance || 'Not set'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">Savings Method</span>
            <span className="text-sm font-medium text-white capitalize">
              {profile?.preferredSavingsMethod || 'Not set'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function FinancialHealth() {
  const [score, setScore] = useState<FinancialHealthScore | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'recommendations'>('overview')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [scoreResponse, profileResponse] = await Promise.all([
        api.get('/products/financial-health-score'),
        api.get('/products/user-profile')
      ])

      setScore(scoreResponse.data)
      setProfile(profileResponse.data)

    } catch (err: any) {
      if (err.response?.status === 404) {
        // No score exists yet, calculate one
        try {
          const calculateResponse = await api.post('/products/financial-health-score')
          setScore(calculateResponse.data.score)
          
          const profileResponse = await api.get('/products/user-profile')
          setProfile(profileResponse.data)
        } catch (calcErr) {
          setError('Failed to calculate financial health score')
        }
      } else {
        setError('Failed to load financial health data')
      }
    } finally {
      setLoading(false)
    }
  }

  const refreshScore = async () => {
    try {
      const response = await api.post('/products/financial-health-score')
      setScore(response.data.score)
    } catch (error) {
      console.error('Failed to refresh score:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a14] text-white">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-white/10 rounded w-1/3 mb-6"></div>
            <div className="h-64 bg-white/10 rounded mb-6"></div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-white/10 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !score) {
    return (
      <div className="min-h-screen bg-[#0a0a14] text-white">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="text-center">
            <Info className="h-16 w-16 text-amber-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Financial Health</h1>
            <p className="text-white/60 mb-6">{error || 'No financial health data available'}</p>
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 rounded-xl bg-[#7c3aed] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#6d28d9]"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const categoryConfig = scoreCategories[score.scoreCategory]

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-2 text-white/60 hover:text-white transition">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Financial Health</h1>
              <p className="text-sm text-white/50">Comprehensive analysis of your subscription finances</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={refreshScore}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <QuickStats score={score} profile={profile} />

        {/* Tabs */}
        <div className="mb-6 flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
          {(['overview', 'trends', 'recommendations'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeTab === tab 
                  ? 'bg-[#7c3aed] text-white' 
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <FinancialHealthScore />
              </div>
              <div>
                <UserProfileCard profile={profile} onUpdate={fetchData} />
              </div>
            </div>
          )}
          
          {activeTab === 'trends' && (
            <FinancialHealthTrends />
          )}
          
          {activeTab === 'recommendations' && (
            <RecommendationsList recommendations={score.recommendations} />
          )}
        </div>
      </div>
    </div>
  )
}
