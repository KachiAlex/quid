import React, { useState } from 'react'
import {
  AlertTriangle, X, CheckCircle, Clock, ArrowRight, ArrowLeft,
  Home, FileText, Settings, HelpCircle, Info, ExternalLink
} from 'lucide-react'
import api from '../lib/api'

interface SwitchDetails {
  switchId: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'failed'
  oldProvider: string
  newProvider: string
  productType: string
  estimatedSavings: number
  switchIntentDate: string
  confirmationDate?: string
  commissionEarned: number
  formData: any
  notes?: string
}

interface SwitchCancelFlowProps {
  switchId: string
  switchDetails: SwitchDetails
  onCancelComplete?: () => void
  onCancelError?: (error: string) => void
  onCancelBack?: () => void
}

const SwitchCancelFlow: React.FC<SwitchCancelFlowProps> = ({
  switchId,
  switchDetails,
  onCancelComplete,
  onCancelError,
  onCancelBack
}) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [cancelling, setCancelling] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [otherReason, setOtherReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const cancelReasons = [
    {
      id: 'found_better_deal',
      label: 'Found a better deal elsewhere',
      description: 'I found a more competitive offer from another provider'
    },
    {
      id: 'changed_mind',
      label: 'Changed my mind',
      description: 'I no longer want to switch providers'
    },
    {
      id: 'timing_issues',
      label: 'Timing issues',
      description: 'The switch timing doesn\'t work for me'
    },
    {
      id: 'provider_issues',
      label: 'Provider concerns',
      description: 'I have concerns about the new provider'
    },
    {
      id: 'financial_reasons',
      label: 'Financial reasons',
      description: 'The switch is no longer financially beneficial'
    },
    {
      id: 'technical_issues',
      label: 'Technical issues',
      description: 'I encountered technical problems during the process'
    },
    {
      id: 'customer_service',
      label: 'Customer service',
      description: 'Issues with customer service or support'
    },
    {
      id: 'other',
      label: 'Other reason',
      description: 'Please specify your reason below'
    }
  ]

  const handleNext = () => {
    if (currentStep === 1 && cancelReason) {
      setCurrentStep(2)
    } else if (currentStep === 2) {
      handleCancelSwitch()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    } else if (onCancelBack) {
      onCancelBack()
    }
  }

  const handleCancelSwitch = async () => {
    try {
      setCancelling(true)
      setError(null)

      const reason = cancelReason === 'other' ? otherReason : cancelReasons.find(r => r.id === cancelReason)?.label

      await api.post(`/products/switch/${switchId}/cancel`, {
        reason: reason || 'No reason provided'
      })

      setSuccess(true)
      setTimeout(() => {
        if (onCancelComplete) {
          onCancelComplete()
        }
      }, 2000)

    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to cancel switch'
      setError(errorMessage)
      if (onCancelError) {
        onCancelError(errorMessage)
      }
    } finally {
      setCancelling(false)
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Switch Cancelled</h2>
            <p className="text-gray-600 mb-6">
              Your switch has been successfully cancelled. You'll continue with your current provider.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Return to Dashboard
              </button>
              <button
                onClick={() => window.location.href = '/switches/history'}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                View Switch History
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cancel Switch</h1>
          <p className="text-lg text-gray-600">
            {currentStep === 1 ? 'Tell us why you want to cancel this switch' :
             currentStep === 2 ? 'Please review your cancellation details' :
             'Processing your cancellation...'}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= step
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step === 1 ? 'Reason' : step === 2 ? 'Review' : 'Confirm'}
                </div>
                {step < 3 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      currentStep > step ? 'bg-red-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Switch Details Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Switch Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">From</p>
              <p className="font-semibold text-gray-900">{switchDetails.oldProvider}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">To</p>
              <p className="font-semibold text-green-600">{switchDetails.newProvider}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Product Type</p>
              <p className="font-medium text-gray-900">{getProductTypeLabel(switchDetails.productType)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Estimated Savings</p>
              <p className="font-semibold text-green-600">{formatCurrency(switchDetails.estimatedSavings)}/year</p>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          {currentStep === 1 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Why are you cancelling this switch?
              </h3>
              <div className="space-y-3">
                {cancelReasons.map((reason) => (
                  <label
                    key={reason.id}
                    className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                      cancelReason === reason.id
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start">
                      <input
                        type="radio"
                        name="cancelReason"
                        value={reason.id}
                        checked={cancelReason === reason.id}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{reason.label}</p>
                        <p className="text-sm text-gray-600 mt-1">{reason.description}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {cancelReason === 'other' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Please specify your reason
                  </label>
                  <textarea
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Tell us more about why you're cancelling..."
                  />
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Review Cancellation Details
              </h3>
              
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-yellow-900 mb-2">Important Information</h4>
                      <ul className="text-sm text-yellow-800 space-y-1">
                        <li>• You will continue with your current provider ({switchDetails.oldProvider})</li>
                        <li>• You will lose the estimated savings of {formatCurrency(switchDetails.estimatedSavings)}/year</li>
                        <li>• This action cannot be undone</li>
                        <li>• You may need to contact your current provider if you have any questions</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Cancellation Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Switch ID:</span>
                      <span className="font-mono text-sm">{switchDetails.switchId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Product:</span>
                      <span>{getProductTypeLabel(switchDetails.productType)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">From:</span>
                      <span>{switchDetails.oldProvider}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">To:</span>
                      <span className="line-through text-gray-500">{switchDetails.newProvider}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lost Savings:</span>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(switchDetails.estimatedSavings)}/year
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reason:</span>
                      <span>
                        {cancelReason === 'other' ? otherReason :
                         cancelReasons.find(r => r.id === cancelReason)?.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">What Happens Next?</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Your switch request will be cancelled immediately</li>
                    <li>• You'll receive a confirmation email</li>
                    <li>• Your current service will continue uninterrupted</li>
                    <li>• You can always initiate a new switch in the future</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="text-center py-8">
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-red-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Cancelling Your Switch...
              </h3>
              <p className="text-gray-600">
                Please wait while we process your cancellation request.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={cancelling}
            className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors flex items-center disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {currentStep === 1 ? 'Back' : 'Previous'}
          </button>

          <button
            onClick={handleNext}
            disabled={!cancelReason || (currentStep === 2 && cancelling)}
            className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center disabled:opacity-50"
          >
            {cancelling ? (
              'Processing...'
            ) : (
              <>
                {currentStep === 1 ? 'Continue' : 'Confirm Cancellation'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </button>
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center text-sm text-gray-600">
            <HelpCircle className="h-4 w-4 mr-2" />
            Need help?{' '}
            <a href="#" className="text-blue-600 hover:text-blue-800 ml-1">
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SwitchCancelFlow
