import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingDown, TrendingUp, ArrowRight, ChevronDown, ChevronUp,
  PoundSterling, AlertCircle, CheckCircle, Info, Zap
} from 'lucide-react'
import api from '../lib/api'

interface ProductSavings {
  recordId: string
  productType: string
  providerName: string
  currentCost: number
  bestCost: number
  overpaymentAmount: number
  overpaymentPercent: number
  bestProvider: string
  potentialSavings: number
  lastUpdated: string
}

interface ProductSavingsDisplayProps {
  userId?: string
  limit?: number
  showDetails?: boolean
  compact?: boolean
}

const ProductSavingsDisplay: React.FC<ProductSavingsDisplayProps> = ({
  userId,
  limit = 10,
  showDetails = true,
  compact = false
}) => {
  const [savings, setSavings] = useState<ProductSavings[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchProductSavings()
  }, [userId, limit])

  const fetchProductSavings = async () => {
    try {
      setLoading(true)
      const response = await api.get('/products/overpayment')
      const data = response.data
      
      // Sort by overpayment amount (highest first) and limit results
      const sortedSavings = (data.topOverpayments || [])
        .sort((a: ProductSavings, b: ProductSavings) => b.overpaymentAmount - a.overpaymentAmount)
        .slice(0, limit)
      
      setSavings(sortedSavings)
    } catch (error) {
      console.error('Failed to fetch product savings:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (recordId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(recordId)) {
      newExpanded.delete(recordId)
    } else {
      newExpanded.add(recordId)
    }
    setExpandedItems(newExpanded)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  const formatPercent = (percent: number) => {
    return `${percent.toFixed(1)}%`
  }

  const getSavingsLevel = (overpaymentPercent: number) => {
    if (overpaymentPercent > 30) return { level: 'High', color: 'text-red-600 bg-red-100', icon: AlertCircle }
    if (overpaymentPercent > 15) return { level: 'Medium', color: 'text-yellow-600 bg-yellow-100', icon: TrendingUp }
    if (overpaymentPercent > 5) return { level: 'Low', color: 'text-blue-600 bg-blue-100', icon: Info }
    return { level: 'Minimal', color: 'text-green-600 bg-green-100', icon: CheckCircle }
  }

  const getProductTypeLabel = (productType: string) => {
    const labels: Record<string, string> = {
      energy: 'Energy',
      broadband: 'Broadband',
      car_insurance: 'Car Insurance',
      home_insurance: 'Home Insurance',
      life_insurance: 'Life Insurance',
      pet_insurance: 'Pet Insurance',
      subscription: 'Subscription',
    }
    return labels[productType] || productType
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg h-24 mb-2"></div>
          </div>
        ))}
      </div>
    )
  }

  if (savings.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Great job!</h3>
        <p className="text-gray-600">You're already getting competitive rates on all your products.</p>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="space-y-3">
        {savings.map((product) => {
          const savingsLevel = getSavingsLevel(product.overpaymentPercent)
          const Icon = savingsLevel.icon
          
          return (
            <div key={product.recordId} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${savingsLevel.color.split(' ')[1]}`}>
                  <Icon className="h-4 w-4 text-gray-700" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{product.providerName}</div>
                  <div className="text-sm text-gray-500">{getProductTypeLabel(product.productType)}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-red-600">
                  {formatCurrency(product.overpaymentAmount)}
                </div>
                <div className="text-sm text-gray-500">{formatPercent(product.overpaymentPercent)}</div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {savings.map((product) => {
        const savingsLevel = getSavingsLevel(product.overpaymentPercent)
        const Icon = savingsLevel.icon
        const isExpanded = expandedItems.has(product.recordId)
        
        return (
          <div key={product.recordId} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${savingsLevel.color.split(' ')[1]}`}>
                    <Icon className="h-5 w-5 text-gray-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{product.providerName}</h3>
                    <p className="text-sm text-gray-500">{getProductTypeLabel(product.productType)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(product.overpaymentAmount)}
                  </div>
                  <div className="text-sm text-gray-500">{formatPercent(product.overpaymentPercent)} overpaying</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Current Cost</div>
                  <div className="font-semibold text-gray-900">{formatCurrency(product.currentCost)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Best Available</div>
                  <div className="font-semibold text-green-600">{formatCurrency(product.bestCost)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Best Provider</div>
                  <div className="font-semibold text-blue-600">{product.bestProvider}</div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${savingsLevel.color}`}>
                    {savingsLevel.level} Savings Opportunity
                  </span>
                  <span className="text-xs text-gray-500">
                    Updated {new Date(product.lastUpdated).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  {showDetails && (
                    <button
                      onClick={() => toggleExpanded(product.recordId)}
                      className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-1" />
                          Hide Details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-1" />
                          Show Details
                        </>
                      )}
                    </button>
                  )}
                  
                  <Link
                    to={`/compare/${product.recordId}`}
                    className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Compare
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              </div>

              {isExpanded && showDetails && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Savings Breakdown</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Annual Savings:</span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(product.potentialSavings)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Monthly Savings:</span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(product.potentialSavings / 12)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Overpayment Rate:</span>
                          <span className="font-semibold text-red-600">
                            {formatPercent(product.overpaymentPercent)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Quick Actions</h4>
                      <div className="space-y-2">
                        <Link
                          to={`/compare/${product.recordId}`}
                          className="flex items-center justify-center w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          View Comparison
                        </Link>
                        <button className="flex items-center justify-center w-full px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors">
                          <PoundSterling className="h-4 w-4 mr-2" />
                          See Switch Options
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
      
      {savings.length >= limit && (
        <div className="text-center pt-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            View all products
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      )}
    </div>
  )
}

export default ProductSavingsDisplay
