import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, Minus, Calendar,
  BarChart3, LineChart, Activity, Target,
  ArrowUp, ArrowDown, Info, Download,
  Filter, ChevronDown, ChevronUp
} from 'lucide-react'
import api from '../lib/api'

interface ScoreHistory {
  id: string
  userId: string
  score: number
  category: string
  calculatedAt: string
  changeFromPrevious: number
  keyFactors: string[]
}

interface TrendAnalysis {
  trend: 'improving' | 'declining' | 'stable'
  trendStrength: 'strong' | 'moderate' | 'weak'
  averageChange: number
  volatility: number
  bestMonth: string
  worstMonth: string
  consistency: number
  projection: {
    nextMonth: number
    threeMonths: number
    confidence: number
  }
}

interface ComponentTrend {
  component: string
  current: number
  previous: number
  change: number
  trend: 'up' | 'down' | 'stable'
  history: Array<{ date: string; score: number }>
}

const scoreCategories = {
  excellent: { color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  good: { color: 'text-blue-400', bg: 'bg-blue-500/10' },
  fair: { color: 'text-amber-400', bg: 'bg-amber-500/10' },
  poor: { color: 'text-orange-400', bg: 'bg-orange-500/10' },
  critical: { color: 'text-red-400', bg: 'bg-red-500/10' }
}

const componentLabels = {
  affordability: 'Affordability',
  optimization: 'Optimization',
  stability: 'Stability',
  diversity: 'Diversity',
  awareness: 'Awareness'
}

function TrendChart({ data, height = 200 }: { data: ScoreHistory[]; height?: number }) {
  const maxScore = Math.max(...data.map(d => d.score), 100)
  const minScore = Math.min(...data.map(d => d.score), 0)
  const range = maxScore - minScore || 100

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = 100 - ((d.score - minScore) / range) * 80
    return `${x},${y}`
  }).join(' ')

  const getAreaPoints = () => {
    return `0,100 ${points} 100,100`
  }

  return (
    <div className="relative" style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((value) => (
          <line
            key={value}
            x1="0"
            y1={value}
            x2="100"
            y2={value}
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-white/5"
          />
        ))}
        
        {/* Area under curve */}
        <polygon
          points={getAreaPoints()}
          fill="url(#trendGrad)"
        />
        
        {/* Trend line */}
        <polyline
          points={points}
          fill="none"
          stroke="#7c3aed"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Data points */}
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * 100
          const y = 100 - ((d.score - minScore) / range) * 80
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="2"
              fill="#a78bfa"
              className="hover:r-3 transition-all cursor-pointer"
            />
          )
        })}
      </svg>
      
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] text-white/30">
        <span>{maxScore.toFixed(0)}</span>
        <span>{((maxScore + minScore) / 2).toFixed(0)}</span>
        <span>{minScore.toFixed(0)}</span>
      </div>
      
      {/* X-axis labels */}
      <div className="absolute left-0 right-0 bottom-0 flex justify-between text-[10px] text-white/30 px-2">
        {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0).map((d, i) => (
          <span key={i}>
            {new Date(d.calculatedAt).toLocaleDateString('en', { month: 'short' })}
          </span>
        ))}
      </div>
    </div>
  )
}

function ComponentTrendCard({ trend }: { trend: ComponentTrend }) {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return TrendingUp
      case 'down': return TrendingDown
      default: return Minus
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-emerald-400'
      case 'down': return 'text-red-400'
      default: return 'text-amber-400'
    }
  }

  const TrendIcon = getTrendIcon(trend.trend)
  const trendColor = getTrendColor(trend.trend)

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-white">{trend.component}</span>
        <div className={`flex items-center gap-1 ${trendColor}`}>
          <TrendIcon className="h-4 w-4" />
          <span className="text-xs font-medium">
            {trend.change > 0 ? '+' : ''}{trend.change.toFixed(1)}
          </span>
        </div>
      </div>
      
      <div className="flex items-end gap-2 mb-3">
        <span className="text-2xl font-bold text-white">{trend.current.toFixed(0)}</span>
        <span className="text-xs text-white/50 mb-1">/ 100</span>
      </div>
      
      <div className="h-12">
        <TrendChart data={trend.history} height={48} />
      </div>
    </div>
  )
}

function TrendSummary({ analysis, history }: { analysis: TrendAnalysis; history: ScoreHistory[] }) {
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

  const trendConfig = getTrendConfig(analysis.trend)
  const TrendIcon = trendConfig.icon

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'strong': return 'text-emerald-400'
      case 'moderate': return 'text-amber-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5">
      <h3 className="text-lg font-semibold text-white mb-4">Trend Analysis</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className={`flex items-center gap-3 rounded-xl ${trendConfig.bg} ${trendConfig.borderColor} border p-3`}>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-white/10`}>
            <TrendIcon className={`h-5 w-5 ${trendConfig.color}`} />
          </div>
          <div>
            <p className="text-xs text-white/50">Overall Trend</p>
            <p className={`text-sm font-semibold ${trendConfig.color}`}>{trendConfig.text}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
            <Activity className="h-5 w-5 text-white/70" />
          </div>
          <div>
            <p className="text-xs text-white/50">Strength</p>
            <p className={`text-sm font-semibold ${getStrengthColor(analysis.trendStrength)}`}>
              {analysis.trendStrength.charAt(0).toUpperCase() + analysis.trendStrength.slice(1)}
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/70">Average Change</span>
          <span className={`text-sm font-medium ${
            analysis.averageChange > 0 ? 'text-emerald-400' : 
            analysis.averageChange < 0 ? 'text-red-400' : 'text-amber-400'
          }`}>
            {analysis.averageChange > 0 ? '+' : ''}{analysis.averageChange.toFixed(1)} points
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/70">Volatility</span>
          <span className={`text-sm font-medium ${
            analysis.volatility < 5 ? 'text-emerald-400' : 
            analysis.volatility < 15 ? 'text-amber-400' : 'text-red-400'
          }`}>
            {analysis.volatility.toFixed(1)}%
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/70">Consistency</span>
          <span className={`text-sm font-medium ${
            analysis.consistency > 80 ? 'text-emerald-400' : 
            analysis.consistency > 60 ? 'text-amber-400' : 'text-red-400'
          }`}>
            {analysis.consistency.toFixed(0)}%
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/70">Best Month</span>
          <span className="text-sm font-medium text-emerald-400">{analysis.bestMonth}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/70">Worst Month</span>
          <span className="text-sm font-medium text-red-400">{analysis.worstMonth}</span>
        </div>
      </div>
      
      {/* Projections */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <h4 className="text-sm font-medium text-white mb-3">Projections</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-lg font-bold text-white">{analysis.projection.nextMonth.toFixed(0)}</p>
            <p className="text-xs text-white/50">Next month</p>
            <p className="text-xs text-emerald-400 mt-1">
              {analysis.projection.confidence.toFixed(0)}% confidence
            </p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-white">{analysis.projection.threeMonths.toFixed(0)}</p>
            <p className="text-xs text-white/50">3 months</p>
            <p className="text-xs text-amber-400 mt-1">
              Lower confidence
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FinancialHealthTrends() {
  const [history, setHistory] = useState<ScoreHistory[]>([])
  const [analysis, setAnalysis] = useState<TrendAnalysis | null>(null)
  const [componentTrends, setComponentTrends] = useState<ComponentTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'3m' | '6m' | '12m' | 'all'>('6m')
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    fetchTrendData()
  }, [timeRange])

  const fetchTrendData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [historyResponse, insightsResponse] = await Promise.all([
        api.get(`/products/financial-health-score/history?limit=${timeRange === 'all' ? 24 : timeRange === '12m' ? 12 : timeRange === '6m' ? 6 : 3}`),
        api.get('/products/financial-health-insights')
      ])

      setHistory(historyResponse.data)
      setAnalysis(generateTrendAnalysis(historyResponse.data))
      setComponentTrends(generateComponentTrends(historyResponse.data))

    } catch (err: any) {
      setError('Failed to load trend data')
    } finally {
      setLoading(false)
    }
  }

  const generateTrendAnalysis = (data: ScoreHistory[]): TrendAnalysis => {
    if (data.length < 2) {
      return {
        trend: 'stable',
        trendStrength: 'weak',
        averageChange: 0,
        volatility: 0,
        bestMonth: 'N/A',
        worstMonth: 'N/A',
        consistency: 0,
        projection: { nextMonth: 0, threeMonths: 0, confidence: 0 }
      }
    }

    const changes = data.slice(1).map((d, i) => d.score - data[i].score)
    const averageChange = changes.reduce((sum, c) => sum + c, 0) / changes.length
    
    const trend = averageChange > 2 ? 'improving' : averageChange < -2 ? 'declining' : 'stable'
    const trendStrength = Math.abs(averageChange) > 5 ? 'strong' : Math.abs(averageChange) > 2 ? 'moderate' : 'weak'
    
    const volatility = Math.sqrt(changes.reduce((sum, c) => sum + c * c, 0) / changes.length)
    
    const bestScore = Math.max(...data.map(d => d.score))
    const worstScore = Math.min(...data.map(d => d.score))
    const bestMonth = data.find(d => d.score === bestScore)?.calculatedAt || ''
    const worstMonth = data.find(d => d.score === worstScore)?.calculatedAt || ''
    
    const consistency = 100 - (volatility / 100 * 100)
    
    const projection = {
      nextMonth: data[data.length - 1].score + averageChange,
      threeMonths: data[data.length - 1].score + (averageChange * 3),
      confidence: Math.max(10, 100 - (volatility * 5))
    }

    return {
      trend,
      trendStrength,
      averageChange,
      volatility,
      bestMonth: new Date(bestMonth).toLocaleDateString('en', { month: 'short', year: 'numeric' }),
      worstMonth: new Date(worstMonth).toLocaleDateString('en', { month: 'short', year: 'numeric' }),
      consistency,
      projection
    }
  }

  const generateComponentTrends = (data: ScoreHistory[]): ComponentTrend[] => {
    // Mock component trends - in real implementation, would fetch from API
    return Object.entries(componentLabels).map(([key, label]) => ({
      component: label,
      current: 70 + Math.random() * 30,
      previous: 65 + Math.random() * 30,
      change: Math.random() * 10 - 5,
      trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable',
      history: data.map(d => ({
        date: d.calculatedAt,
        score: 60 + Math.random() * 40
      }))
    }))
  }

  const exportData = () => {
    const csvContent = [
      ['Date', 'Score', 'Category', 'Change from Previous'],
      ...history.map(h => [
        new Date(h.calculatedAt).toLocaleDateString(),
        h.score.toString(),
        h.category,
        h.changeFromPrevious?.toString() || '0'
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `financial-health-trends-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5 shadow-xl">
        <div className="animate-pulse">
          <div className="h-4 bg-white/10 rounded w-1/3 mb-4"></div>
          <div className="h-40 bg-white/10 rounded mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-white/10 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5 shadow-xl">
        <div className="text-center">
          <Info className="h-12 w-12 text-amber-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">Trend Analysis</h3>
          <p className="text-sm text-white/60 mb-4">{error}</p>
          <button
            onClick={fetchTrendData}
            className="inline-flex items-center gap-2 rounded-xl bg-[#7c3aed] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6d28d9]"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Financial Health Trends</h2>
          <p className="text-sm text-white/50">Track your financial health over time</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <div className="relative">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <Calendar className="h-4 w-4" />
              {timeRange === '3m' ? '3 months' : timeRange === '6m' ? '6 months' : timeRange === '12m' ? '1 year' : 'All time'}
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            
            {showDetails && (
              <div className="absolute right-0 top-full mt-2 w-40 rounded-xl border border-white/10 bg-[#1a1a2e] shadow-lg z-10">
                {['3m', '6m', '12m', 'all'].map((range) => (
                  <button
                    key={range}
                    onClick={() => {
                      setTimeRange(range as any)
                      setShowDetails(false)
                    }}
                    className={`w-full text-left px-4 py-2 text-sm transition first:rounded-t-xl last:rounded-b-xl ${
                      timeRange === range ? 'bg-[#7c3aed] text-white' : 'text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {range === '3m' ? '3 months' : range === '6m' ? '6 months' : range === '12m' ? '1 year' : 'All time'}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <button
            onClick={exportData}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Main Chart */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Score History</h3>
        <div className="h-64">
          <TrendChart data={history} height={256} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trend Analysis */}
        {analysis && <TrendSummary analysis={analysis} history={history} />}
        
        {/* Component Trends */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Component Trends</h3>
          <div className="space-y-3">
            {componentTrends.slice(0, 4).map((trend) => (
              <ComponentTrendCard key={trend.component} trend={trend} />
            ))}
          </div>
        </div>
      </div>

      {/* Detailed History Table */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Detailed History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-white/70">Date</th>
                <th className="text-left py-3 px-4 text-white/70">Score</th>
                <th className="text-left py-3 px-4 text-white/70">Category</th>
                <th className="text-left py-3 px-4 text-white/70">Change</th>
                <th className="text-left py-3 px-4 text-white/70">Key Factors</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id} className="border-b border-white/5">
                  <td className="py-3 px-4 text-white">
                    {new Date(item.calculatedAt).toLocaleDateString('en', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-white">{item.score.toFixed(1)}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                      scoreCategories[item.category as keyof typeof scoreCategories].bg
                    } ${scoreCategories[item.category as keyof typeof scoreCategories].color}`}>
                      {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {item.changeFromPrevious !== null && (
                      <div className={`flex items-center gap-1 ${
                        item.changeFromPrevious > 0 ? 'text-emerald-400' : 
                        item.changeFromPrevious < 0 ? 'text-red-400' : 'text-amber-400'
                      }`}>
                        {item.changeFromPrevious > 0 ? <ArrowUp className="h-3 w-3" /> : 
                         item.changeFromPrevious < 0 ? <ArrowDown className="h-3 w-3" /> : 
                         <Minus className="h-3 w-3" />}
                        <span className="text-xs font-medium">
                          {item.changeFromPrevious > 0 ? '+' : ''}{item.changeFromPrevious.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {item.keyFactors.slice(0, 2).map((factor, i) => (
                        <span key={i} className="text-xs text-white/50 bg-white/5 px-2 py-1 rounded">
                          {factor}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
