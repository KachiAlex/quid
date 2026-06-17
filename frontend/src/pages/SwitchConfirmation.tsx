import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CheckCircle, Clock, AlertCircle, ArrowRight, Home, User,
  FileText, CreditCard, Calendar, Info, ExternalLink, Download,
  Bell, Settings, HelpCircle, TrendingUp, Shield, Zap, X
} from 'lucide-react'
import api from '../lib/api'
import SwitchCancelFlow from '../components/SwitchCancelFlow'

interface SwitchDetails {
  switchId: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'failed'
  oldProvider: string
  newProvider: string
  productType: string
  estimatedSavings: number
  actualSavings?: number
  switchIntentDate: string
  confirmationDate?: string
  commissionEarned: number
  formData: any
  notes?: string
}

interface SwitchConfirmationProps {
  switchId?: string
}

const SwitchConfirmation: React.FC<SwitchConfirmationProps> = ({ switchId: propSwitchId }) => {
  const { switchId: paramSwitchId } = useParams()
  const navigate = useNavigate()
  const [switchId] = useState(propSwitchId || paramSwitchId || '')
  
  const [switchDetails, setSwitchDetails] = useState<SwitchDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notifications, setNotifications] = useState(true)
  const [showCancelFlow, setShowCancelFlow] = useState(false)

  useEffect(() => {
    if (switchId) {
      fetchSwitchDetails()
    } else {
      setError('No switch ID provided')
      setLoading(false)
    }
  }, [switchId])

  const fetchSwitchDetails = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/products/switch/${switchId}`)
      setSwitchDetails(response.data)
    } catch (err: any) {
      console.error('Failed to fetch switch details:', err)
      setError(err.response?.data?.error || 'Failed to load switch details')
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationToggle = async () => {
    try {
      setNotifications(!notifications)
      // In a real implementation, this would update user preferences
      await api.put('/user/preferences', {
        switchNotifications: !notifications
      })
    } catch (err) {
      console.error('Failed to update notification preferences:', err)
    }
  }

  const handleCancelComplete = () => {
    setShowCancelFlow(false)
    fetchSwitchDetails() // Refresh the switch details
  }

  const handleCancelError = (error: string) => {
    setError(error)
    setShowCancelFlow(false)
  }

  const handleCancelBack = () => {
    setShowCancelFlow(false)
  }

  const handleDownloadConfirmation = () => {
    if (switchDetails) {
      const confirmationData = {
        switchId: switchDetails.switchId,
        confirmationDate: new Date().toISOString(),
        details: switchDetails
      }
      
      const blob = new Blob([JSON.stringify(confirmationData, null, 2)], {
        type: 'application/json'
      })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `switch-confirmation-${switchDetails.switchId}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-600 bg-green-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'cancelled': return 'text-red-600 bg-red-100'
      case 'failed': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return CheckCircle
      case 'pending': return Clock
      case 'cancelled': return AlertCircle
      case 'failed': return AlertCircle
      default: return Info
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading switch details...</p>
        </div>
      </div>
    )
  }

  if (error || !switchDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Switch</h2>
          <p className="text-gray-600 mb-6">{error || 'Switch details not found'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const StatusIcon = getStatusIcon(switchDetails.status)
  const statusColor = getStatusColor(switchDetails.status)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${statusColor.split(' ')[1]} mb-4`}>
            <StatusIcon className={`h-8 w-8 ${statusColor.split(' ')[0]}`} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {switchDetails.status === 'confirmed' ? 'Switch Confirmed!' : 
             switchDetails.status === 'pending' ? 'Switch in Progress' :
             switchDetails.status === 'cancelled' ? 'Switch Cancelled' :
             'Switch Failed'}
          </h1>
          <p className="text-lg text-gray-600">
            {switchDetails.status === 'confirmed' ? 'Your switch has been successfully completed.' :
             switchDetails.status === 'pending' ? 'Your switch is being processed by the provider.' :
             switchDetails.status === 'cancelled' ? 'Your switch has been cancelled.' :
             'There was an issue with your switch.'}
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Switch Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Switch Summary Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                Switch Summary
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-1">From</p>
                    <p className="font-semibold text-gray-900">{switchDetails.oldProvider}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">To</p>
                    <p className="font-semibold text-green-600">{switchDetails.newProvider}</p>
                  </div>
                </div>
                
                <div>
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-1">Product Type</p>
                    <p className="font-semibold text-gray-900">{getProductTypeLabel(switchDetails.productType)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Switch ID</p>
                    <p className="font-mono text-sm text-gray-600">{switchDetails.switchId}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Intent Date</p>
                    <p className="font-medium text-gray-900">{formatDate(switchDetails.switchIntentDate)}</p>
                  </div>
                  {switchDetails.confirmationDate && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Confirmation Date</p>
                      <p className="font-medium text-gray-900">{formatDate(switchDetails.confirmationDate)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Impact Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                Financial Impact
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Estimated Annual Savings</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(switchDetails.estimatedSavings)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatCurrency(switchDetails.estimatedSavings / 12)} per month
                  </p>
                </div>
                
                {switchDetails.actualSavings && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Actual Annual Savings</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(switchDetails.actualSavings)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(switchDetails.actualSavings / 12)} per month
                    </p>
                  </div>
                )}
              </div>

              {switchDetails.commissionEarned > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Commission Earned</span>
                    <span className="font-semibold text-blue-600">
                      {formatCurrency(switchDetails.commissionEarned)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Timeline Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-blue-600" />
                Timeline
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="font-medium text-gray-900">Switch Intent Recorded</p>
                    <p className="text-sm text-gray-500">{formatDate(switchDetails.switchIntentDate)}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Your switch request was submitted and is being processed.
                    </p>
                  </div>
                </div>

                {switchDetails.status === 'pending' && (
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Clock className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="font-medium text-gray-900">Processing</p>
                      <p className="text-sm text-gray-500">In progress</p>
                      <p className="text-sm text-gray-600 mt-1">
                        The provider is processing your switch request.
                      </p>
                    </div>
                  </div>
                )}

                {switchDetails.status === 'confirmed' && (
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="font-medium text-gray-900">Switch Confirmed</p>
                      <p className="text-sm text-gray-500">
                        {switchDetails.confirmationDate ? formatDate(switchDetails.confirmationDate) : 'Recently'}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Your switch has been completed successfully.
                      </p>
                    </div>
                  </div>
                )}

                {(switchDetails.status === 'cancelled' || switchDetails.status === 'failed') && (
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="font-medium text-gray-900">
                        {switchDetails.status === 'cancelled' ? 'Switch Cancelled' : 'Switch Failed'}
                      </p>
                      <p className="text-sm text-gray-500">Recently</p>
                      {switchDetails.notes && (
                        <p className="text-sm text-gray-600 mt-1">{switchDetails.notes}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Next Steps */}
            {switchDetails.status === 'pending' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                  <Info className="h-5 w-5 mr-2" />
                  What Happens Next?
                </h3>
                <div className="space-y-2 text-sm text-blue-800">
                  <p>• The provider will process your switch request within 3-5 business days</p>
                  <p>• You'll receive a confirmation email when the switch is complete</p>
                  <p>• Your old service will be cancelled automatically</p>
                  <p>• You'll start receiving bills from your new provider</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={handleDownloadConfirmation}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Confirmation
                </button>
                
                {switchDetails.status === 'pending' && (
                  <button
                    onClick={() => setShowCancelFlow(true)}
                    className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel Switch
                  </button>
                )}
                
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </button>
                
                <button
                  onClick={() => navigate('/switches/history')}
                  className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Switch History
                </button>
              </div>
            </div>

            {/* Notifications Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notifications
              </h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notifications}
                    onChange={handleNotificationToggle}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Email updates for this switch
                  </span>
                </label>
                
                <div className="text-xs text-gray-500">
                  You'll receive notifications about important updates to your switch status.
                </div>
              </div>
            </div>

            {/* Support Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <HelpCircle className="h-5 w-5 mr-2" />
                Need Help?
              </h3>
              <div className="space-y-3">
                <a
                  href="#"
                  className="block text-sm text-blue-600 hover:text-blue-800"
                >
                  View Switch Guide
                </a>
                <a
                  href="#"
                  className="block text-sm text-blue-600 hover:text-blue-800"
                >
                  Contact Support
                </a>
                <a
                  href="#"
                  className="block text-sm text-blue-600 hover:text-blue-800"
                >
                  FAQ
                </a>
              </div>
            </div>

            {/* Provider Links */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ExternalLink className="h-5 w-5 mr-2" />
                Provider Links
              </h3>
              <div className="space-y-2">
                <a
                  href="#"
                  className="block text-sm text-blue-600 hover:text-blue-800"
                >
                  {switchDetails.newProvider} Account
                </a>
                <a
                  href="#"
                  className="block text-sm text-blue-600 hover:text-blue-800"
                >
                  Billing Portal
                </a>
                <a
                  href="#"
                  className="block text-sm text-blue-600 hover:text-blue-800"
                >
                  Customer Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Flow Modal */}
      {showCancelFlow && switchDetails && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black opacity-25" onClick={() => setShowCancelFlow(false)}></div>
            <div className="relative max-w-4xl w-full">
              <SwitchCancelFlow
                switchId={switchDetails.switchId}
                switchDetails={switchDetails}
                onCancelComplete={handleCancelComplete}
                onCancelError={handleCancelError}
                onCancelBack={handleCancelBack}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SwitchConfirmation
