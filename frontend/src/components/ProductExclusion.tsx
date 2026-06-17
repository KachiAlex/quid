import React, { useState, useEffect } from 'react'
import { 
  X, AlertCircle, CheckCircle, Info, Search, Filter, 
  Settings, Eye, EyeOff, RefreshCw, ChevronDown, ChevronUp,
  Calendar, DollarSign, TrendingUp, Shield
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
  isExcluded?: boolean
  exclusionReason?: string
  exclusionDate?: string
}

interface ExclusionRule {
  id: string
  ruleType: 'provider' | 'product_type' | 'cost_range' | 'custom'
  ruleValue: string
  description: string
  isActive: boolean
  createdAt: string
  affectedProducts: number
}

interface ExclusionSettings {
  excludeCancelledProducts: boolean
  excludeLowValueProducts: boolean
  lowValueThreshold: number
  autoRenewalExclusions: boolean
  notificationPreferences: {
    renewalAlerts: boolean
    priceHikeAlerts: boolean
    comparisonAlerts: boolean
  }
}

const ProductExclusion: React.FC = () => {
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [exclusionRules, setExclusionRules] = useState<ExclusionRule[]>([])
  const [settings, setSettings] = useState<ExclusionSettings>({
    excludeCancelledProducts: true,
    excludeLowValueProducts: false,
    lowValueThreshold: 100,
    autoRenewalExclusions: false,
    notificationPreferences: {
      renewalAlerts: true,
      priceHikeAlerts: true,
      comparisonAlerts: true,
    },
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'excluded' | 'included'>('all')
  const [showExcludedOnly, setShowExcludedOnly] = useState(false)
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set())
  const [showAddRule, setShowAddRule] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [productsRes, rulesRes, settingsRes] = await Promise.all([
        api.get('/products'),
        api.get('/products/exclusion-rules'),
        api.get('/products/exclusion-settings'),
      ])

      setProducts(productsRes.data)
      setExclusionRules(rulesRes.data)
      if (settingsRes.data) {
        setSettings(settingsRes.data)
      }

    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const toggleProductExclusion = async (recordId: string, reason?: string) => {
    try {
      const product = products.find(p => p.recordId === recordId)
      if (!product) return

      const newExclusionState = !product.isExcluded
      
      if (newExclusionState && !reason) {
        // Show reason dialog
        const reason = prompt('Please provide a reason for exclusion:')
        if (!reason) return
      }

      await api.post(`/products/${recordId}/exclusion`, {
        isExcluded: newExclusionState,
        reason: newExclusionState ? reason : undefined,
      })

      // Update local state
      setProducts(products.map(p => 
        p.recordId === recordId 
          ? { 
              ...p, 
              isExcluded: newExclusionState,
              exclusionReason: newExclusionState ? reason : undefined,
              exclusionDate: newExclusionState ? new Date().toISOString() : undefined
            }
          : p
      ))

    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update exclusion')
    }
  }

  const createExclusionRule = async (rule: Omit<ExclusionRule, 'id' | 'createdAt' | 'affectedProducts'>) => {
    try {
      const response = await api.post('/products/exclusion-rules', rule)
      setExclusionRules([...exclusionRules, response.data])
      setShowAddRule(false)
      await fetchData() // Refresh products to apply rule
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create exclusion rule')
    }
  }

  const updateExclusionRule = async (ruleId: string, updates: Partial<ExclusionRule>) => {
    try {
      await api.put(`/products/exclusion-rules/${ruleId}`, updates)
      setExclusionRules(exclusionRules.map(r => 
        r.id === ruleId ? { ...r, ...updates } : r
      ))
      await fetchData() // Refresh products to apply rule
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update exclusion rule')
    }
  }

  const deleteExclusionRule = async (ruleId: string) => {
    try {
      await api.delete(`/products/exclusion-rules/${ruleId}`)
      setExclusionRules(exclusionRules.filter(r => r.id !== ruleId))
      await fetchData() // Refresh products to apply rule
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete exclusion rule')
    }
  }

  const updateSettings = async (newSettings: ExclusionSettings) => {
    try {
      await api.put('/products/exclusion-settings', newSettings)
      setSettings(newSettings)
      setShowSettings(false)
      await fetchData() // Refresh products to apply settings
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update settings')
    }
  }

  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.providerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.productType.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter = filterStatus === 'all' || 
                           (filterStatus === 'excluded' && product.isExcluded) ||
                           (filterStatus === 'included' && !product.isExcluded)
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      // Sort by exclusion status first, then by provider name
      if (a.isExcluded !== b.isExcluded) {
        return a.isExcluded ? 1 : -1
      }
      return a.providerName.localeCompare(b.providerName)
    })

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100'
      case 'cancelled': return 'text-red-600 bg-red-100'
      case 'switched': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getRuleTypeIcon = (ruleType: string) => {
    switch (ruleType) {
      case 'provider': return <Settings className="h-4 w-4" />
      case 'product_type': return <Filter className="h-4 w-4" />
      case 'cost_range': return <DollarSign className="h-4 w-4" />
      case 'custom': return <Shield className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exclusion settings...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Product Exclusions</h1>
              <p className="text-gray-600 mt-1">Manage which products to include in monitoring and recommendations</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </button>
              <button
                onClick={() => setShowAddRule(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Shield className="h-4 w-4 mr-2" />
                Add Rule
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Settings className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{products.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Eye className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Included</p>
                <p className="text-2xl font-bold text-gray-900">
                  {products.filter(p => !p.isExcluded).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <EyeOff className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Excluded</p>
                <p className="text-2xl font-bold text-gray-900">
                  {products.filter(p => p.isExcluded).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Active Rules</p>
                <p className="text-2xl font-bold text-gray-900">
                  {exclusionRules.filter(r => r.isActive).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Exclusion Rules */}
        {exclusionRules.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Active Exclusion Rules</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {exclusionRules.map(rule => (
                <div key={rule.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start">
                      <div className="p-2 bg-gray-100 rounded-lg mr-3">
                        {getRuleTypeIcon(rule.ruleType)}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{rule.description}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Type: {rule.ruleType} | Value: {rule.ruleValue}
                        </p>
                        <p className="text-sm text-gray-500">
                          Affects {rule.affectedProducts} products | Created {formatDate(rule.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateExclusionRule(rule.id, { isActive: !rule.isActive })}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          rule.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        onClick={() => deleteExclusionRule(rule.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
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
                <option value="all">All Products</option>
                <option value="included">Included Only</option>
                <option value="excluded">Excluded Only</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>{filteredProducts.length} products</span>
              <span>•</span>
              <span>{filteredProducts.filter(p => p.isExcluded).length} excluded</span>
            </div>
          </div>
        </div>

        {/* Products List */}
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
                    Exclusion
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map(product => (
                  <tr key={product.recordId} className={`hover:bg-gray-50 ${product.isExcluded ? 'bg-red-50' : ''}`}>
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
                      {product.isExcluded ? (
                        <div>
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Excluded
                          </span>
                          {product.exclusionReason && (
                            <div className="text-xs text-gray-600 mt-1">{product.exclusionReason}</div>
                          )}
                          {product.exclusionDate && (
                            <div className="text-xs text-gray-500">Since {formatDate(product.exclusionDate)}</div>
                          )}
                        </div>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Included
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => toggleProductExclusion(product.recordId)}
                        className={`flex items-center px-3 py-1 rounded-md text-xs font-medium ${
                          product.isExcluded
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-red-600 text-white hover:bg-red-700'
                        }`}
                      >
                        {product.isExcluded ? (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            Include
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3 mr-1" />
                            Exclude
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Empty State */}
        {filteredProducts.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>

      {/* Add Rule Modal */}
      {showAddRule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Exclusion Rule</h3>
            <AddRuleForm
              onSubmit={createExclusionRule}
              onCancel={() => setShowAddRule(false)}
            />
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Exclusion Settings</h3>
            <SettingsForm
              settings={settings}
              onSubmit={updateSettings}
              onCancel={() => setShowSettings(false)}
            />
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-4 text-red-500 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Add Rule Form Component
const AddRuleForm: React.FC<{
  onSubmit: (rule: Omit<ExclusionRule, 'id' | 'createdAt' | 'affectedProducts'>) => void
  onCancel: () => void
}> = ({ onSubmit, onCancel }) => {
  const [ruleType, setRuleType] = useState<'provider' | 'product_type' | 'cost_range' | 'custom'>('provider')
  const [ruleValue, setRuleValue] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!ruleValue || !description) return

    onSubmit({
      ruleType,
      ruleValue,
      description,
      isActive,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rule Type
          </label>
          <select
            value={ruleType}
            onChange={(e) => setRuleType(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="provider">Provider</option>
            <option value="product_type">Product Type</option>
            <option value="cost_range">Cost Range</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rule Value
          </label>
          <input
            type="text"
            value={ruleValue}
            onChange={(e) => setRuleValue(e.target.value)}
            placeholder="e.g., BT, broadband, >1000, custom_rule"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this rule does..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
            Active
          </label>
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Add Rule
        </button>
      </div>
    </form>
  )
}

// Settings Form Component
const SettingsForm: React.FC<{
  settings: ExclusionSettings
  onSubmit: (settings: ExclusionSettings) => void
  onCancel: () => void
}> = ({ settings, onSubmit, onCancel }) => {
  const [localSettings, setLocalSettings] = useState(settings)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(localSettings)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="excludeCancelledProducts"
            checked={localSettings.excludeCancelledProducts}
            onChange={(e) => setLocalSettings({
              ...localSettings,
              excludeCancelledProducts: e.target.checked
            })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="excludeCancelledProducts" className="ml-2 block text-sm text-gray-900">
            Exclude cancelled products
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="excludeLowValueProducts"
            checked={localSettings.excludeLowValueProducts}
            onChange={(e) => setLocalSettings({
              ...localSettings,
              excludeLowValueProducts: e.target.checked
            })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="excludeLowValueProducts" className="ml-2 block text-sm text-gray-900">
            Exclude low value products
          </label>
        </div>

        {localSettings.excludeLowValueProducts && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Low Value Threshold (£/year)
            </label>
            <input
              type="number"
              value={localSettings.lowValueThreshold}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                lowValueThreshold: parseFloat(e.target.value)
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        <div className="flex items-center">
          <input
            type="checkbox"
            id="autoRenewalExclusions"
            checked={localSettings.autoRenewalExclusions}
            onChange={(e) => setLocalSettings({
              ...localSettings,
              autoRenewalExclusions: e.target.checked
            })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="autoRenewalExclusions" className="ml-2 block text-sm text-gray-900">
            Auto-renewal exclusions
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notification Preferences
          </label>
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="renewalAlerts"
                checked={localSettings.notificationPreferences.renewalAlerts}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  notificationPreferences: {
                    ...localSettings.notificationPreferences,
                    renewalAlerts: e.target.checked
                  }
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="renewalAlerts" className="ml-2 block text-sm text-gray-900">
                Renewal alerts
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="priceHikeAlerts"
                checked={localSettings.notificationPreferences.priceHikeAlerts}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  notificationPreferences: {
                    ...localSettings.notificationPreferences,
                    priceHikeAlerts: e.target.checked
                  }
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="priceHikeAlerts" className="ml-2 block text-sm text-gray-900">
                Price hike alerts
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="comparisonAlerts"
                checked={localSettings.notificationPreferences.comparisonAlerts}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  notificationPreferences: {
                    ...localSettings.notificationPreferences,
                    comparisonAlerts: e.target.checked
                  }
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="comparisonAlerts" className="ml-2 block text-sm text-gray-900">
                Comparison alerts
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Save Settings
        </button>
      </div>
    </form>
  )
}

export default ProductExclusion
