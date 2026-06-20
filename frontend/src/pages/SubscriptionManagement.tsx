import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar, DollarSign, TrendingUp, AlertCircle, CheckCircle,
  Search, Settings, Eye, RefreshCw, ChevronDown, ChevronUp, ExternalLink,
  BarChart3, PieChart, Plus, X
} from 'lucide-react'
import api from '../lib/api'

interface ProductRecord {
  recordId: string
  providerName: string
  productType: string
  annualCost: number
  status: 'active' | 'cancelled' | 'switched'
  contractEndDate?: string
  tariffName?: string
  lastUpdated: string
  createdAt: string
  renewalAlerts?: Array<{
    alertType: string
    renewalDate: string
    daysUntil: number
  }>
  priceHikeAlerts?: Array<{
    percentageIncrease: number
    detectedAt: string
  }>
  potentialSavings?: number
  rating?: number
}

interface RenewalAlert {
  id: string
  providerName: string
  productType: string
  renewalDate: string
  daysUntil: number
  annualCost: number
  alertType: string
  bestAlternatives?: Array<{
    providerName: string
    annualCost: number
    potentialSavings: number
    savingsPercentage: number
    rating?: number
  }>
}

interface PriceHikeAlert {
  id: string
  providerName: string
  productType: string
  percentageIncrease: number
  actualIncrease: number
  detectedAt: string
  oldCost: number
  newCost: number
}

interface Statistics {
  totalSubscriptions: number
  activeSubscriptions: number
  totalAnnualCost: number
  totalPotentialSavings: number
  averageCost: number
  productTypeBreakdown: Record<string, number>
  renewalAlertsCount: number
  priceHikeAlertsCount: number
}

const SubscriptionManagement: React.FC = () => {
  const navigate = useNavigate()
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [renewalAlerts, setRenewalAlerts] = useState<RenewalAlert[]>([])
  const [priceHikeAlerts, setPriceHikeAlerts] = useState<PriceHikeAlert[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // UI State
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'cancelled' | 'switched'>('all')
  const [filterProductType, setFilterProductType] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'cost' | 'renewal' | 'updated'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'overview' | 'subscriptions' | 'alerts' | 'analytics'>('overview')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [sectors, setSectors] = useState<Array<{ productType: string; label: string; providers: string[] }>>([])
  const [selectedSector, setSelectedSector] = useState<string>('')
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [sectorsLoading, setSectorsLoading] = useState(false)
  const [newSubscription, setNewSubscription] = useState({
    providerName: '',
    productType: 'subscription',
    annualCost: '',
    frequency: 'monthly',
    contractEndDate: '',
    tariffName: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const [productsRes, alertsRes, priceHikesRes, statsRes] = await Promise.all([
        api.get('/products'),
        api.get('/products/renewals/alerts'),
        api.get('/products/price-hikes/alerts'),
        api.get('/products/statistics')
      ])

      setProducts(productsRes.data)
      setRenewalAlerts(alertsRes.data)
      setPriceHikeAlerts(priceHikesRes.data)
      setStatistics(statsRes.data)

    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const filteredAndSortedProducts = products
    .filter(product => {
      const matchesSearch = product.providerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.productType.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = filterStatus === 'all' || product.status === filterStatus
      const matchesType = filterProductType === 'all' || product.productType === filterProductType
      return matchesSearch && matchesStatus && matchesType
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.providerName.localeCompare(b.providerName)
          break
        case 'cost':
          comparison = a.annualCost - b.annualCost
          break
        case 'renewal':
          const aRenewal = a.contractEndDate ? new Date(a.contractEndDate).getTime() : 0
          const bRenewal = b.contractEndDate ? new Date(b.contractEndDate).getTime() : 0
          comparison = aRenewal - bRenewal
          break
        case 'updated':
          comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime()
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  const toggleRowExpansion = (recordId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(recordId)) {
      newExpanded.delete(recordId)
    } else {
      newExpanded.add(recordId)
    }
    setExpandedRows(newExpanded)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getDaysUntil = (endDate: string) => {
    const today = new Date()
    const end = new Date(endDate)
    const diffTime = end.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100'
      case 'cancelled': return 'text-red-600 bg-red-100'
      case 'switched': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getAlertTypeColor = (alertType: string) => {
    switch (alertType) {
      case '60_day': return 'text-blue-600 bg-blue-100'
      case '14_day': return 'text-yellow-600 bg-yellow-100'
      case 'imminent': return 'text-orange-600 bg-orange-100'
      case 'overdue': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const productTypes = Array.from(new Set(products.map(p => p.productType)))

  // Fetch available sectors/providers when modal opens
  useEffect(() => {
    if (showAddModal) {
      fetchSectors()
    }
  }, [showAddModal])

  const fetchSectors = async () => {
    setSectorsLoading(true)
    try {
      const res = await api.get('/products/providers')
      setSectors(res.data.sectors)
    } catch (err: any) {
      setAddError('Failed to load providers')
    } finally {
      setSectorsLoading(false)
    }
  }

  const handleSectorSelect = (productType: string) => {
    setSelectedSector(productType)
    setSelectedProvider('')
    setNewSubscription(prev => ({ ...prev, productType }))
  }

  const handleProviderSelect = (provider: string) => {
    setSelectedProvider(provider)
    setNewSubscription(prev => ({ ...prev, providerName: provider }))
  }

  const resetAddModal = () => {
    setShowAddModal(false)
    setSelectedSector('')
    setSelectedProvider('')
    setAddError(null)
    setNewSubscription({
      providerName: '',
      productType: 'subscription',
      annualCost: '',
      frequency: 'monthly',
      contractEndDate: '',
      tariffName: '',
    })
  }

  const handleAddSubscription = async () => {
    if (!newSubscription.providerName || !newSubscription.annualCost) {
      setAddError('Provider name and annual cost are required')
      return
    }
    try {
      setAddLoading(true)
      setAddError(null)
      await api.post('/products', {
        providerName: newSubscription.providerName,
        productType: newSubscription.productType,
        annualCost: parseFloat(newSubscription.annualCost),
        frequency: newSubscription.frequency,
        contractEndDate: newSubscription.contractEndDate || undefined,
        tariffName: newSubscription.tariffName || undefined,
      })
      resetAddModal()
      fetchData()
    } catch (err: any) {
      setAddError(err.response?.data?.error || 'Failed to add subscription')
    } finally {
      setAddLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subscription data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
              <p className="text-gray-600 mt-1">Manage all your subscriptions in one place</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={fetchData}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Subscription
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: PieChart },
              { id: 'subscriptions', label: 'Subscriptions', icon: Settings },
              { id: 'alerts', label: 'Alerts', icon: AlertCircle },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
                {tab.id === 'alerts' && (renewalAlerts.length + priceHikeAlerts.length) > 0 && (
                  <span className="ml-2 bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs">
                    {renewalAlerts.length + priceHikeAlerts.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && statistics && (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Settings className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Total Subscriptions</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.totalSubscriptions}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Active</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.activeSubscriptions}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Annual Cost</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(statistics.totalAnnualCost)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Potential Savings</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(statistics.totalPotentialSavings)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('subscriptions')}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <Eye className="h-5 w-5 text-blue-600 mr-3" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">View All Subscriptions</p>
                    <p className="text-sm text-gray-600">Manage your subscriptions</p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('alerts')}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <AlertCircle className="h-5 w-5 text-yellow-600 mr-3" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Check Alerts</p>
                    <p className="text-sm text-gray-600">{renewalAlerts.length + priceHikeAlerts.length} active alerts</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/comparison')}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <TrendingUp className="h-5 w-5 text-green-600 mr-3" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Find Savings</p>
                    <p className="text-sm text-gray-600">Compare better deals</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Recent Alerts */}
            {(renewalAlerts.length > 0 || priceHikeAlerts.length > 0) && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Alerts</h2>
                <div className="space-y-3">
                  {renewalAlerts.slice(0, 3).map(alert => (
                    <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-blue-600 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">{alert.providerName} {alert.productType}</p>
                          <p className="text-sm text-gray-600">Renews in {alert.daysUntil} days</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAlertTypeColor(alert.alertType)}`}>
                        {alert.alertType.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                  {priceHikeAlerts.slice(0, 3).map(alert => (
                    <div key={alert.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center">
                        <TrendingUp className="h-4 w-4 text-red-600 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">{alert.providerName} {alert.productType}</p>
                          <p className="text-sm text-gray-600">Price increased by {alert.percentageIncrease.toFixed(1)}%</p>
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-medium">
                        Price Hike
                      </span>
                    </div>
                  ))}
                </div>
                {(renewalAlerts.length > 3 || priceHikeAlerts.length > 3) && (
                  <button
                    onClick={() => setActiveTab('alerts')}
                    className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View all alerts →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search subscriptions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="switched">Switched</option>
                  </select>

                  <select
                    value={filterProductType}
                    onChange={(e) => setFilterProductType(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Types</option>
                    {productTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="name">Name</option>
                    <option value="cost">Cost</option>
                    <option value="renewal">Renewal</option>
                    <option value="updated">Updated</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    {sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Subscriptions List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Provider
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cost
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Renewal
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAndSortedProducts.map(product => (
                      <React.Fragment key={product.recordId}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{product.providerName}</div>
                                <div className="text-sm text-gray-500">{product.tariffName}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{product.productType}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatCurrency(product.annualCost)}/year</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(product.status)}`}>
                              {product.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {product.contractEndDate ? (
                              <div>
                                <div className="text-sm text-gray-900">{formatDate(product.contractEndDate)}</div>
                                <div className="text-xs text-gray-500">{getDaysUntil(product.contractEndDate)} days</div>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">No contract end</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => toggleRowExpansion(product.recordId)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => navigate(`/compare/${product.recordId}`)}
                                className="text-green-600 hover:text-green-900"
                              >
                                <TrendingUp className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => navigate(`/switch/${product.recordId}`)}
                                className="text-purple-600 hover:text-purple-900"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedRows.has(product.recordId) && (
                          <tr>
                            <td colSpan={6} className="px-6 py-4 bg-gray-50">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-2">Details</h4>
                                  <div className="space-y-1 text-sm text-gray-600">
                                    <p>Added: {formatDate(product.createdAt)}</p>
                                    <p>Updated: {formatDate(product.lastUpdated)}</p>
                                    <p>Tariff: {product.tariffName || 'Standard'}</p>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-2">Potential Savings</h4>
                                  {product.potentialSavings ? (
                                    <div className="text-green-600 font-semibold">
                                      Save {formatCurrency(product.potentialSavings)}/year
                                    </div>
                                  ) : (
                                    <div className="text-gray-500">No better deals found</div>
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-2">Quick Actions</h4>
                                  <div className="space-y-2">
                                    <button
                                      onClick={() => navigate(`/compare/${product.recordId}`)}
                                      className="w-full px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                                    >
                                      Compare Deals
                                    </button>
                                    <button
                                      onClick={() => navigate(`/switch/${product.recordId}`)}
                                      className="w-full px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                    >
                                      Switch Provider
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="space-y-6">
            {/* Renewal Alerts */}
            {renewalAlerts.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Renewal Alerts</h2>
                <div className="space-y-4">
                  {renewalAlerts.map(alert => (
                    <div key={alert.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start">
                          <Calendar className="h-5 w-5 text-blue-600 mt-1 mr-3" />
                          <div>
                            <h3 className="font-medium text-gray-900">{alert.providerName} {alert.productType}</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              Renews on {formatDate(alert.renewalDate)} ({alert.daysUntil} days)
                            </p>
                            <p className="text-sm text-gray-600">Current cost: {formatCurrency(alert.annualCost)}/year</p>
                            {alert.bestAlternatives && alert.bestAlternatives.length > 0 && (
                              <div className="mt-3">
                                <p className="text-sm font-medium text-gray-900 mb-2">Better alternatives available:</p>
                                <div className="space-y-2">
                                  {alert.bestAlternatives.slice(0, 2).map((alt, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                      <div className="flex items-center">
                                        {alt.rating && <span className="text-yellow-500 mr-2">{'⭐'.repeat(Math.round(alt.rating))}</span>}
                                        <span className="text-sm font-medium">{alt.providerName}</span>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-sm text-green-600 font-medium">
                                          Save {formatCurrency(alt.potentialSavings)}/year
                                        </div>
                                        <div className="text-xs text-gray-500">{alt.savingsPercentage.toFixed(1)}% cheaper</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAlertTypeColor(alert.alertType)}`}>
                            {alert.alertType.replace('_', ' ')}
                          </span>
                          <button
                            onClick={() => navigate(`/compare/${alert.alertType}`)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Price Hike Alerts */}
            {priceHikeAlerts.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Price Hike Alerts</h2>
                <div className="space-y-4">
                  {priceHikeAlerts.map(alert => (
                    <div key={alert.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start">
                          <TrendingUp className="h-5 w-5 text-red-600 mt-1 mr-3" />
                          <div>
                            <h3 className="font-medium text-gray-900">{alert.providerName} {alert.productType}</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              Price increased by {alert.percentageIncrease.toFixed(1)}%
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                              <span>Old: {formatCurrency(alert.oldCost)}/year</span>
                              <span>→</span>
                              <span className="text-red-600 font-medium">New: {formatCurrency(alert.newCost)}/year</span>
                              <span className="text-red-600 font-medium">
                                +{formatCurrency(alert.actualIncrease)}/year
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Detected {formatDate(alert.detectedAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-medium">
                            Price Hike
                          </span>
                          <button
                            onClick={() => navigate(`/compare/${alert.id}`)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {renewalAlerts.length === 0 && priceHikeAlerts.length === 0 && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts</h3>
                <p className="text-gray-600">You're all caught up! No renewal or price hike alerts at the moment.</p>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && statistics && (
          <div className="space-y-6">
            {/* Cost Breakdown */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown by Type</h2>
              <div className="space-y-3">
                {Object.entries(statistics.productTypeBreakdown).map(([type, count]) => {
                  const typeProducts = products.filter(p => p.productType === type)
                  const totalCost = typeProducts.reduce((sum, p) => sum + p.annualCost, 0)
                  const percentage = (totalCost / statistics.totalAnnualCost) * 100
                  
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-blue-600 rounded mr-3"></div>
                        <span className="font-medium text-gray-900">{type}</span>
                        <span className="text-sm text-gray-500 ml-2">({count} subscriptions)</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">{formatCurrency(totalCost)}/year</div>
                        <div className="text-sm text-gray-500">{percentage.toFixed(1)}% of total</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average subscription cost</span>
                    <span className="font-medium">{formatCurrency(statistics.averageCost)}/year</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total potential savings</span>
                    <span className="font-medium text-green-600">{formatCurrency(statistics.totalPotentialSavings)}/year</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active renewal alerts</span>
                    <span className="font-medium text-yellow-600">{statistics.renewalAlertsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price hike alerts</span>
                    <span className="font-medium text-red-600">{statistics.priceHikeAlertsCount}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
                <div className="space-y-3">
                  {statistics.totalPotentialSavings > 0 && (
                    <div className="flex items-start">
                      <TrendingUp className="h-5 w-5 text-green-600 mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Review high-cost subscriptions</p>
                        <p className="text-xs text-gray-600">You could save {formatCurrency(statistics.totalPotentialSavings)} annually</p>
                      </div>
                    </div>
                  )}
                  {statistics.renewalAlertsCount > 0 && (
                    <div className="flex items-start">
                      <Calendar className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Action renewal alerts</p>
                        <p className="text-xs text-gray-600">{statistics.renewalAlertsCount} subscriptions need attention</p>
                      </div>
                    </div>
                  )}
                  {statistics.priceHikeAlertsCount > 0 && (
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Address price hikes</p>
                        <p className="text-xs text-gray-600">{statistics.priceHikeAlertsCount} providers increased prices</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Subscription Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Add Subscription</h2>
              <button
                onClick={resetAddModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {addError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {addError}
                </div>
              )}

              {/* Step 1: Select Sector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  1. Choose Sector
                </label>
                {sectorsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading sectors...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {sectors.map((sector) => (
                      <button
                        key={sector.productType}
                        onClick={() => handleSectorSelect(sector.productType)}
                        className={`px-3 py-2 text-sm rounded-lg border transition text-left ${
                          selectedSector === sector.productType
                            ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium'
                            : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {sector.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 2: Select Provider */}
              {selectedSector && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    2. Choose Provider
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {sectors
                      .find((s) => s.productType === selectedSector)
                      ?.providers.map((provider) => (
                        <button
                          key={provider}
                          onClick={() => handleProviderSelect(provider)}
                          className={`w-full text-left px-4 py-2.5 text-sm transition flex items-center justify-between ${
                            selectedProvider === provider
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {provider}
                          {selectedProvider === provider && <CheckCircle className="h-4 w-4 text-blue-600" />}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Step 3: Complete Details */}
              {selectedProvider && (
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-700">
                    3. Complete Details for <span className="text-blue-700">{selectedProvider}</span>
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Annual Cost (£) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newSubscription.annualCost}
                      onChange={(e) => setNewSubscription({ ...newSubscription, annualCost: e.target.value })}
                      placeholder="120.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Frequency *
                    </label>
                    <select
                      value={newSubscription.frequency}
                      onChange={(e) => setNewSubscription({ ...newSubscription, frequency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annual">Annual</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contract End Date
                    </label>
                    <input
                      type="date"
                      value={newSubscription.contractEndDate}
                      onChange={(e) => setNewSubscription({ ...newSubscription, contractEndDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tariff / Plan Name
                    </label>
                    <input
                      type="text"
                      value={newSubscription.tariffName}
                      onChange={(e) => setNewSubscription({ ...newSubscription, tariffName: e.target.value })}
                      placeholder="e.g. Premium, Standard"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
              <button
                onClick={resetAddModal}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSubscription}
                disabled={addLoading || !selectedProvider || !newSubscription.annualCost}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {addLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Subscription'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SubscriptionManagement
