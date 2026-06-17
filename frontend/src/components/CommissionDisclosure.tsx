import React, { useState, useEffect } from 'react'
import {
  Info, DollarSign, ExternalLink, ChevronDown, ChevronUp,
  Shield, CheckCircle, AlertCircle, Users, TrendingUp
} from 'lucide-react'
import api from '../lib/api'

interface CommissionRate {
  providerName: string
  productType: string
  commissionRate: number
  commissionType: 'percentage' | 'fixed'
  effectiveFrom: string
}

interface CommissionDisclosureProps {
  providerName?: string
  productType?: string
  compact?: boolean
  showDetails?: boolean
}

const CommissionDisclosure: React.FC<CommissionDisclosureProps> = ({
  providerName,
  productType,
  compact = false,
  showDetails = true
}) => {
  const [commissionRates, setCommissionRates] = useState<CommissionRate[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetchCommissionRates()
  }, [providerName, productType])

  const fetchCommissionRates = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      if (providerName) params.append('providerName', providerName)
      if (productType) params.append('productType', productType)
      
      const response = await api.get(`/admin/commission-rates?${params.toString()}`)
      setCommissionRates(response.data)
    } catch (error) {
      console.error('Failed to fetch commission rates:', error)
      // Fallback to mock data if API fails
      const mockRates: CommissionRate[] = [
        { providerName: 'Octopus Energy', productType: 'energy', commissionRate: 5.0, commissionType: 'percentage', effectiveFrom: '2024-01-01' },
        { providerName: 'British Gas', productType: 'energy', commissionRate: 4.5, commissionType: 'percentage', effectiveFrom: '2024-01-01' },
        { providerName: 'Sky Broadband', productType: 'broadband', commissionRate: 3.0, commissionType: 'percentage', effectiveFrom: '2024-01-01' },
        { providerName: 'BT Broadband', productType: 'broadband', commissionRate: 2.5, commissionType: 'percentage', effectiveFrom: '2024-01-01' },
        { providerName: 'Admiral', productType: 'car_insurance', commissionRate: 15.0, commissionType: 'percentage', effectiveFrom: '2024-01-01' },
        { providerName: 'Direct Line', productType: 'car_insurance', commissionRate: 12.0, commissionType: 'percentage', effectiveFrom: '2024-01-01' },
      ]

      // Filter if specific provider/product type is requested
      let filteredRates = mockRates
      if (providerName) {
        filteredRates = filteredRates.filter(rate => rate.providerName === providerName)
      }
      if (productType) {
        filteredRates = filteredRates.filter(rate => rate.productType === productType)
      }

      setCommissionRates(filteredRates)
    } finally {
      setLoading(false)
    }
  }

  const formatCommissionRate = (rate: CommissionRate) => {
    if (rate.commissionType === 'percentage') {
      return `${rate.commissionRate}%`
    } else {
      return `£${rate.commissionRate}`
    }
  }

  const getProductTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      energy: 'Energy',
      broadband: 'Broadband',
      car_insurance: 'Car Insurance',
      home_insurance: 'Home Insurance',
      life_insurance: 'Life Insurance',
      pet_insurance: 'Pet Insurance',
      subscription: 'Subscription',
    }
    return labels[type] || type
  }

  if (compact) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <Info className="h-4 w-4" />
        <span>We may earn commission from some providers</span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-blue-600 hover:text-blue-800 underline"
        >
          Learn more
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    )
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-blue-900 mb-2">
            How We Make Money
          </h3>
          
          <div className="text-sm text-blue-800 space-y-2">
            <p>
              We're committed to transparency about how we earn money. When you switch to some providers through our platform, we may receive a commission from them.
            </p>
            
            <p>
              This doesn't affect your price - you'll pay the same amount (or less) than going directly to the provider. Our recommendations are always based on what's best for you.
            </p>
          </div>

          {showDetails && (
            <div className="mt-4">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center text-sm font-medium text-blue-700 hover:text-blue-900"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Hide commission details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    View commission details
                  </>
                )}
              </button>

              {expanded && (
                <div className="mt-4 space-y-4">
                  {/* Commission Rates Table */}
                  <div className="bg-white rounded-lg border border-blue-200 overflow-hidden">
                    <div className="px-4 py-3 bg-blue-100 border-b border-blue-200">
                      <h4 className="text-sm font-medium text-blue-900">
                        Commission Rates by Provider
                      </h4>
                    </div>
                    <div className="divide-y divide-blue-200">
                      {commissionRates.map((rate, index) => (
                        <div key={index} className="px-4 py-3 flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{rate.providerName}</div>
                            <div className="text-sm text-gray-500">{getProductTypeLabel(rate.productType)}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-blue-600">
                              {formatCommissionRate(rate)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Effective {new Date(rate.effectiveFrom).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Our Commitment */}
                  <div className="bg-white rounded-lg border border-blue-200 p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                      <Shield className="h-4 w-4 mr-2 text-blue-600" />
                      Our Commitment to You
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700">
                          <strong>No extra cost to you:</strong> You'll never pay more by using our platform
                        </p>
                      </div>
                      <div className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700">
                          <strong>Independent recommendations:</strong> Our advice is based on your best interests, not commission rates
                        </p>
                      </div>
                      <div className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700">
                          <strong>Full transparency:</strong> We clearly disclose all commission arrangements
                        </p>
                      </div>
                      <div className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700">
                          <strong>Best price guarantee:</strong> We always show you the best available deals
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* How It Works */}
                  <div className="bg-white rounded-lg border border-blue-200 p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
                      How It Works
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                          1
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">You find a better deal</p>
                          <p className="text-sm text-gray-500">We help you discover savings opportunities</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                          2
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">You switch through our platform</p>
                          <p className="text-sm text-gray-500">We provide a seamless switching experience</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                          3
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Provider pays us commission</p>
                          <p className="text-sm text-gray-500">This doesn't affect your price or service</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Learn More */}
                  <div className="text-center pt-4 border-t border-blue-200">
                    <button className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Read our full commission policy
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CommissionDisclosure
