import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Heart, TrendingUp, TrendingDown, Minus,
  AlertCircle, CheckCircle, Info, ArrowRight,
  Target, Shield, Zap, BarChart3
} from 'lucide-react'
import api from '../lib/api'

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

interface FinancialHealthInsights {
  currentScore: FinancialHealthScore | null
  trend: 'improving' | 'declining' | 'stable'
  keyInsights: string[]
  benchmarkComparison: {
    userPercentile: number
    averageScore: number
    topPerformerScore: number
  }
}

const scoreCategories = {
  excellent: { 
    color: 'text-emerald-400', 
    bgColor: 'bg-emerald-500/10', 
    borderColor: 'border-emerald-500/30',
    icon: CheckCircle,
    description: 'Excellent financial health'
  },
  good: { 
    color: 'text-blue-400', 
    bgColor: 'bg-blue-500/10', 
    borderColor: 'border-blue-500/30',
    icon: Heart,
    description: 'Good financial health'
  },
  fair: { 
    color: 'text-amber-400', 
    bgColor: 'bg-amber-500/10', 
    borderColor: 'border-amber-500/30',
    icon: AlertCircle,
    description: 'Fair financial health'
  },
  poor: { 
    color: 'text-orange-400', 
    bgColor: 'bg-orange-500/10', 
    borderColor: 'border-orange-500/30',
    icon: TrendingDown,
    description: 'Poor financial health'
  },
  critical: { 
    color: 'text-red-400', 
    bgColor: 'bg-red-500/10', 
    borderColor: 'border-red-500/30',
    icon: AlertCircle,
    description: 'Critical financial health'
  }
}

const componentLabels = {
  affordability: 'Affordability',
  optimization: 'Optimization',
  stability: 'Stability',
  diversity: 'Diversity',
  awareness: 'Awareness'
}

const componentIcons = {
  affordability: Target,
  optimization: Zap,
  stability: Shield,
  diversity: BarChart3,
  awareness: Info
}

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 20) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  const getColor = (score: number) => {
    if (score >= 90) return '#10b981'
    if (score >= 75) return '#3b82f6'
    if (score >= 60) return '#f59e0b'
    if (score >= 40) return '#f97316'
    return '#ef4444'
  }

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor(score)}
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{Math.round(score)}</span>
        <span className="text-xs text-white/50">Score</span>
      </div>
    </div>
  )
}

function ComponentBar({ label, score, icon: Icon }: { label: string; score: number; icon: any }) {
  const getColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500'
    if (score >= 60) return 'bg-blue-500'
    if (score >= 40) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
        <Icon className="h-4 w-4 text-white/70" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-white/70">{label}</span>
          <span className="text-xs font-medium text-white">{Math.round(score)}</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div 
            className={`h-full ${getColor(score)} transition-all duration-1000 ease-out`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function TrendIndicator({ trend }: { trend: 'improving' | 'declining' | 'stable' }) {
  const getTrendConfig = (trend: string) => {
    switch (trend) {
      case 'improving':
        return { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', text: 'Improving' }
      case 'declining':
        return { icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/10', text: 'Declining' }
      default:
        return { icon: Minus, color: 'text-amber-400', bg: 'bg-amber-500/10', text: 'Stable' }
    }
  }

  const config = getTrendConfig(trend)
  const Icon = config.icon

  return (
    <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${config.bg} ${config.color}`}>
      <Icon className="h-3 w-3" />
      <span className="text-xs font-medium">{config.text}</span>
    </div>
  )
}

export default function FinancialHealthScoreCard({ compact = false }: { compact?: boolean }) {
  const [score, setScore] = useState<FinancialHealthScore | null>(null)
  const [insights, setInsights] = useState<FinancialHealthInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchFinancialHealthData()
  }, [])

  const fetchFinancialHealthData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Try to get existing score first
      const scoreResponse = await api.get('/products/financial-health-score')
      setScore(scoreResponse.data)

      // Get insights
      const insightsResponse = await api.get('/products/financial-health-insights')
      setInsights(insightsResponse.data)

    } catch (err: any) {
      if (err.response?.status === 404) {
        // No score exists yet, calculate one
        try {
          const calculateResponse = await api.post('/products/financial-health-score')
          setScore(calculateResponse.data.score)
          
          // Get insights after calculation
          const insightsResponse = await api.get('/products/financial-health-insights')
          setInsights(insightsResponse.data)
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

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5 shadow-xl">
        <div className="animate-pulse">
          <div className="h-4 bg-white/10 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-white/10 rounded mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-2 bg-white/10 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !score) {
    return (
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5 shadow-xl">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-amber-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">Financial Health Score</h3>
          <p className="text-sm text-white/60 mb-4">
            {error || 'No financial health data available'}
          </p>
          <button
            onClick={fetchFinancialHealthData}
            className="inline-flex items-center gap-2 rounded-xl bg-[#7c3aed] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6d28d9]"
          >
            Calculate Score
          </button>
        </div>
      </div>
    )
  }

  const categoryConfig = scoreCategories[score.scoreCategory]
  const CategoryIcon = categoryConfig.icon

  if (compact) {
    return (
      <div className={`rounded-2xl border ${categoryConfig.borderColor} ${categoryConfig.bgColor} p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
              <CategoryIcon className={`h-5 w-5 ${categoryConfig.color}`} />
            </div>
            <div>
              <p className="text-xs text-white/50">Financial Health</p>
              <p className={`text-lg font-bold ${categoryConfig.color}`}>{Math.round(score.overallScore)}</p>
            </div>
          </div>
          <div className="text-right">
            {insights && <TrendIndicator trend={insights.trend} />}
            <p className="text-xs text-white/50 mt-1">{score.scoreCategory}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Financial Health Score</h2>
          <p className="text-sm text-white/50">Overall assessment of your subscription finances</p>
        </div>
        {insights && <TrendIndicator trend={insights.trend} />}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Score Circle */}
        <div className="flex flex-col items-center">
          <ScoreRing score={score.overallScore} />
          <div className={`mt-3 flex items-center gap-2 rounded-full ${categoryConfig.bgColor} ${categoryConfig.borderColor} border px-3 py-1`}>
            <CategoryIcon className={`h-4 w-4 ${categoryConfig.color}`} />
            <span className={`text-sm font-medium ${categoryConfig.color}`}>
              {score.scoreCategory.charAt(0).toUpperCase() + score.scoreCategory.slice(1)}
            </span>
          </div>
          <p className="text-xs text-white/50 mt-2 text-center max-w-[200px]">
            {categoryConfig.description}
          </p>
        </div>

        {/* Component Scores */}
        <div className="flex-1 space-y-3">
          <h3 className="text-sm font-medium text-white/70 mb-3">Component Scores</h3>
          {Object.entries(score.componentScores).map(([key, value]) => {
            const Icon = componentIcons[key as keyof typeof componentIcons]
            return (
              <ComponentBar
                key={key}
                label={componentLabels[key as keyof typeof componentLabels]}
                score={value}
                icon={Icon}
              />
            )
          })}
        </div>
      </div>

      {/* Key Insights */}
      {insights && insights.keyInsights.length > 0 && (
        <div className="mt-6 pt-6 border-t border-white/10">
          <h3 className="text-sm font-medium text-white/70 mb-3">Key Insights</h3>
          <div className="space-y-2">
            {insights.keyInsights.slice(0, 2).map((insight, index) => (
              <div key={index} className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-white/60">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Benchmark Comparison */}
      {insights && (
        <div className="mt-6 pt-6 border-t border-white/10">
          <h3 className="text-sm font-medium text-white/70 mb-3">How You Compare</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-lg font-bold text-white">{Math.round(insights.benchmarkComparison.userPercentile)}%</p>
              <p className="text-xs text-white/50">Better than users</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">{Math.round(insights.benchmarkComparison.averageScore)}</p>
              <p className="text-xs text-white/50">Average score</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">{Math.round(insights.benchmarkComparison.topPerformerScore)}</p>
              <p className="text-xs text-white/50">Top score</p>
            </div>
          </div>
        </div>
      )}

      {/* Top Recommendations */}
      {score.recommendations.length > 0 && (
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white/70">Top Recommendations</h3>
            <Link 
              to="/financial-health" 
              className="text-xs font-medium text-[#a78bfa] hover:text-[#7c3aed] transition"
            >
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {score.recommendations.slice(0, 2).map((rec, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full ${
                  rec.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                  rec.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-emerald-500/20 text-emerald-400'
                }`}>
                  <span className="text-[10px] font-bold">{rec.priority.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{rec.title}</p>
                  <p className="text-xs text-white/60 mt-1">{rec.description}</p>
                  {rec.estimatedSavings > 0 && (
                    <p className="text-xs text-emerald-400 mt-1">
                      Potential savings: £{Math.round(rec.estimatedSavings).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="mt-6 flex gap-3">
        <Link 
          to="/financial-health" 
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#7c3aed] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6d28d9]"
        >
          View detailed analysis <ArrowRight className="h-4 w-4" />
        </Link>
        <button
          onClick={fetchFinancialHealthData}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          Refresh
        </button>
      </div>
    </div>
  )
}
