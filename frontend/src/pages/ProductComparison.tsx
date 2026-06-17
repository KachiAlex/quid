import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Star, Check, X, Info, Clock, Database } from 'lucide-react'
import CommissionDisclosure from '../components/CommissionDisclosure'
import { useParams } from 'react-router-dom'

interface RankedProduct {
  provider: string
  annualCost: number
  rank: number
  overallScore: number
  priceScore: number
  featuresScore: number
  serviceScore: number
  reliabilityScore: number
  flexibilityScore: number
  greenScore: number
  reputationScore: number
  savingsAmount: number
  savingsPercent: number
  pros: string[]
  cons: string[]
}

interface ComparisonResult {
  currentProduct: RankedProduct
  alternatives: RankedProduct[]
  totalAlternatives: number
  bestAlternative: RankedProduct
  potentialSavings: number
  recommendationScore: number
  lastRateUpdate?: string
  dataSources?: string[]
  averageDataAge?: number
}

const ProductComparison: React.FC = () => {
  const { recordId } = useParams<{ recordId: string }>()
  const [comparison, setComparison] = useState<ComparisonResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>('overview')

  useEffect(() => {
    if (recordId) {
      fetchComparison()
    }
  }, [recordId])

  const fetchComparison = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/products/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ recordId })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch comparison')
      }

      const data = await response.json()
      setComparison(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 8) return 'bg-green-100'
    if (score >= 6) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  const getRecommendationColor = (score: number) => {
    if (score >= 75) return 'text-green-600 bg-green-100'
    if (score >= 50) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const ScoreBar: React.FC<{ score: number; label: string }> = ({ score, label }) => (
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm text-gray-600 w-24">{label}</span>
      <div className="flex-1 mx-3">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              score >= 8 ? 'bg-green-500' : score >= 6 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${score * 10}%` }}
          />
        </div>
      </div>
      <span className={`text-sm font-semibold w-8 text-right ${getScoreColor(score)}`}>
        {score}
      </span>
    </div>
  )

  const ProductCard: React.FC<{ 
    product: RankedProduct
    isCurrent?: boolean
    isBest?: boolean
  }> = ({ product, isCurrent = false, isBest = false }) => (
    <div className={`rounded-lg border-2 p-6 ${
      isCurrent ? 'border-blue-200 bg-blue-50' : 
      isBest ? 'border-green-200 bg-green-50' : 
      'border-gray-200 bg-white'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{product.provider}</h3>
          {isCurrent && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Current Provider
            </span>
          )}
          {isBest && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Best Alternative
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(product.annualCost)}
          </div>
          <div className="text-sm text-gray-500">per year</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Score</span>
          <div className="flex items-center">
            <span className={`text-lg font-bold ${getScoreColor(product.overallScore)}`}>
              {product.overallScore}/10
            </span>
            <span className="ml-2 text-sm text-gray-500">Rank #{product.rank}</span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${
              product.overallScore >= 8 ? 'bg-green-500' : 
              product.overallScore >= 6 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${product.overallScore * 10}%` }}
          />
        </div>
      </div>

      {product.savingsAmount !== 0 && (
        <div className={`mb-4 p-3 rounded-lg ${
          product.savingsAmount > 0 ? 'bg-green-100' : 'bg-red-100'
        }`}>
          <div className="flex items-center">
            {product.savingsAmount > 0 ? (
              <TrendingDown className="h-5 w-5 text-green-600 mr-2" />
            ) : (
              <TrendingUp className="h-5 w-5 text-red-600 mr-2" />
            )}
            <div>
              <div className={`font-semibold ${
                product.savingsAmount > 0 ? 'text-green-800' : 'text-red-800'
              }`}>
                {product.savingsAmount > 0 ? 'Save' : 'Cost'} {formatCurrency(Math.abs(product.savingsAmount))}/year
              </div>
              <div className={`text-sm ${
                product.savingsAmount > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {Math.abs(product.savingsPercent).toFixed(1)}% {product.savingsAmount > 0 ? 'cheaper' : 'more expensive'}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1">
        <ScoreBar score={product.priceScore} label="Price" />
        <ScoreBar score={product.featuresScore} label="Features" />
        <ScoreBar score={product.serviceScore} label="Service" />
        <ScoreBar score={product.reliabilityScore} label="Reliability" />
        {product.flexibilityScore > 0 && (
          <ScoreBar score={product.flexibilityScore} label="Flexibility" />
        )}
        {product.greenScore > 0 && (
          <ScoreBar score={product.greenScore} label="Green" />
        )}
        <ScoreBar score={product.reputationScore} label="Reputation" />
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-96 bg-gray-200 rounded-lg"></div>
              <div className="h-96 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex">
              <X className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!comparison) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Comparison</h1>
          <p className="text-gray-600">
            Compare your current provider with the best alternatives in the market
          </p>
        </div>

        {/* Recommendation Score */}
        <div className={`mb-8 p-6 rounded-lg border-2 ${getRecommendationColor(comparison.recommendationScore)}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">Recommendation Score</h2>
              <p className="text-sm opacity-80">
                {comparison.recommendationScore >= 75 
                  ? 'Strong recommendation to switch providers'
                  : comparison.recommendationScore >= 50
                  ? 'Moderate benefit to switching providers'
                  : 'Current provider is competitive'
                }
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold">{comparison.recommendationScore}</div>
              <div className="text-sm opacity-80">/ 100</div>
            </div>
          </div>
        </div>

        {/* Data Freshness Information */}
        <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Database className="h-5 w-5 mr-2 text-blue-600" />
              Rate Data Information
            </h3>
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="h-4 w-4 mr-1" />
              Last updated: {comparison.lastRateUpdate ? new Date(comparison.lastRateUpdate).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) : 'Unknown'}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Data Freshness</div>
              <div className={`text-lg font-semibold ${
                comparison.averageDataAge && comparison.averageDataAge <= 1 ? 'text-green-600' :
                comparison.averageDataAge && comparison.averageDataAge <= 3 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {comparison.averageDataAge ? `${comparison.averageDataAge.toFixed(1)} days` : 'Unknown'}
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Data Sources</div>
              <div className="text-lg font-semibold text-blue-600">
                {comparison.dataSources?.length || 0} sources
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Market Coverage</div>
              <div className="text-lg font-semibold text-purple-600">
                {comparison.totalAlternatives + 1} providers
              </div>
            </div>
          </div>
          
          {comparison.dataSources && comparison.dataSources.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600 mb-2">Sources:</div>
              <div className="flex flex-wrap gap-2">
                {comparison.dataSources.map((source, index) => (
                  <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {source}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Product Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <ProductCard product={comparison.currentProduct} isCurrent />
          <ProductCard product={comparison.bestAlternative} isBest />
        </div>

        {/* Detailed Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Detailed Analysis</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {/* Overview Section */}
            <div>
              <button
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50"
                onClick={() => setExpandedSection(expandedSection === 'overview' ? null : 'overview')}
              >
                <span className="font-medium text-gray-900">Overview</span>
                {expandedSection === 'overview' ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>
              {expandedSection === 'overview' && (
                <div className="px-6 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Potential Savings</div>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(comparison.potentialSavings)}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Market Alternatives</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {comparison.totalAlternatives}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Current Rank</div>
                      <div className="text-2xl font-bold text-purple-600">
                        #{comparison.currentProduct.rank}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pros and Cons */}
            <div>
              <button
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50"
                onClick={() => setExpandedSection(expandedSection === 'proscons' ? null : 'proscons')}
              >
                <span className="font-medium text-gray-900">Pros & Cons</span>
                {expandedSection === 'proscons' ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>
              {expandedSection === 'proscons' && (
                <div className="px-6 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-green-800 mb-3 flex items-center">
                        <Check className="h-5 w-5 mr-2" />
                        Current Provider - Pros
                      </h4>
                      <ul className="space-y-2">
                        {comparison.currentProduct.pros.map((pro, index) => (
                          <li key={index} className="flex items-start text-sm text-gray-700">
                            <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-red-800 mb-3 flex items-center">
                        <X className="h-5 w-5 mr-2" />
                        Current Provider - Cons
                      </h4>
                      <ul className="space-y-2">
                        {comparison.currentProduct.cons.map((con, index) => (
                          <li key={index} className="flex items-start text-sm text-gray-700">
                            <X className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* All Alternatives */}
            <div>
              <button
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50"
                onClick={() => setExpandedSection(expandedSection === 'alternatives' ? null : 'alternatives')}
              >
                <span className="font-medium text-gray-900">All Alternatives ({comparison.alternatives.length})</span>
                {expandedSection === 'alternatives' ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>
              {expandedSection === 'alternatives' && (
                <div className="px-6 pb-4">
                  <div className="space-y-3">
                    {comparison.alternatives.map((alternative, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                            alternative.rank === 1 ? 'bg-green-500' :
                            alternative.rank === 2 ? 'bg-gray-400' :
                            alternative.rank === 3 ? 'bg-orange-400' : 'bg-gray-300'
                          }`}>
                            {alternative.rank}
                          </div>
                          <div className="ml-3">
                            <div className="font-medium text-gray-900">{alternative.provider}</div>
                            <div className="text-sm text-gray-500">Score: {alternative.overallScore}/10</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">{formatCurrency(alternative.annualCost)}</div>
                          <div className={`text-sm ${
                            alternative.savingsAmount > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {alternative.savingsAmount > 0 ? 'Save' : 'Cost'} {formatCurrency(Math.abs(alternative.savingsAmount))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center space-x-4">
          <button
            className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
            onClick={() => {
              // TODO: Implement switch intent
              console.log('Switch to best alternative')
            }}
          >
            Switch to {comparison.bestAlternative.provider}
          </button>
          <button
            className="px-6 py-3 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-colors"
            onClick={() => {
              // TODO: Implement more options
              console.log('View more options')
            }}
          >
            View More Options
          </button>
        </div>

        {/* Commission Disclosure */}
        <div className="mt-8">
          <CommissionDisclosure 
            providerName={comparison.bestAlternative.provider}
            productType={comparison.currentProduct.productType}
            compact={false}
            showDetails={true}
          />
        </div>
      </div>
    </div>
  )
}

export default ProductComparison
