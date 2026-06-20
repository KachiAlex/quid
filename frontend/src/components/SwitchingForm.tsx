import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Home, Phone, Mail, Calendar, CreditCard, FileText,
  CheckCircle, AlertCircle, Info, ArrowRight, ArrowLeft,
  Building, MapPin, Shield, Zap, Clock
} from 'lucide-react'
import { UserIcon } from './Icons'
import api from '../lib/api'

interface UserFormData {
  title: string
  firstName: string
  lastName: string
  dateOfBirth: string
  email: string
  phoneNumber: string
}

interface AddressFormData {
  addressLine1: string
  addressLine2: string
  city: string
  postcode: string
  country: string
  moveInDate: string
}

interface ProductFormData {
  currentProvider: string
  currentTariff: string
  currentContractEnd: string
  paymentMethod: string
  accountNumber: string
  meterNumber?: string
  mpan?: string
  mprn?: string
}

interface SwitchingFormData {
  user: UserFormData
  address: AddressFormData
  product: ProductFormData
  newProvider: string
  newTariff: string
  estimatedSavings: number
  switchDate: string
  specialRequirements: string
  agreeToTerms: boolean
  agreeToMarketing: boolean
}

interface SwitchingFormProps {
  recordId: string
  providerName: string
  productType: string
  estimatedSavings: number
  onSwitchComplete?: (switchId: string) => void
  onCancel?: () => void
}

const SwitchingForm: React.FC<SwitchingFormProps> = ({
  recordId,
  providerName,
  productType,
  estimatedSavings,
  onSwitchComplete,
  onCancel
}) => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [affiliateUrl, setAffiliateUrl] = useState<string | null>(null)

  const [formData, setFormData] = useState<SwitchingFormData>({
    user: {
      title: '',
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      email: '',
      phoneNumber: '',
    },
    address: {
      addressLine1: '',
      addressLine2: '',
      city: '',
      postcode: '',
      country: 'United Kingdom',
      moveInDate: '',
    },
    product: {
      currentProvider: '',
      currentTariff: '',
      currentContractEnd: '',
      paymentMethod: 'direct_debit',
      accountNumber: '',
      meterNumber: '',
      mpan: '',
      mprn: '',
    },
    newProvider: providerName,
    newTariff: '',
    estimatedSavings,
    switchDate: '',
    specialRequirements: '',
    agreeToTerms: false,
    agreeToMarketing: false,
  })

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      const [userResponse, productResponse] = await Promise.all([
        api.get('/auth/profile'),
        api.get(`/products/${recordId}`)
      ])

      const userData = userResponse.data
      const productData = productResponse.data

      setFormData(prev => ({
        ...prev,
        user: {
          title: userData.title || '',
          firstName: userData.first_name || '',
          lastName: userData.last_name || '',
          dateOfBirth: userData.date_of_birth || '',
          email: userData.email || '',
          phoneNumber: userData.phone_number || '',
        },
        address: {
          ...prev.address,
          addressLine1: userData.address_line_1 || '',
          addressLine2: userData.address_line_2 || '',
          city: userData.city || '',
          postcode: userData.postcode || '',
          country: userData.country || 'United Kingdom',
        },
        product: {
          ...prev.product,
          currentProvider: productData.provider_name || '',
          currentTariff: productData.tariff_name || '',
          currentContractEnd: productData.contract_end_date || '',
          accountNumber: productData.account_number || '',
          meterNumber: productData.meter_number || '',
          mpan: productData.mpan || '',
          mprn: productData.mprn || '',
        },
      }))

      // Generate affiliate URL
      await generateAffiliateUrl()

    } catch (error) {
      console.error('Failed to fetch user data:', error)
    }
  }

  const generateAffiliateUrl = async () => {
    try {
      const response = await api.post('/products/affiliate-link', {
        merchantId: '1234', // This would be dynamically determined
        productType,
        destinationUrl: `https://www.${providerName.toLowerCase().replace(/\s+/g, '')}.com/switch`,
        campaignId: 'quid_switch',
        subId: recordId,
      })
      setAffiliateUrl(response.data.affiliateUrl)
    } catch (error) {
      console.error('Failed to generate affiliate URL:', error)
    }
  }

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 1) {
      if (!formData.user.firstName) newErrors['user.firstName'] = 'First name is required'
      if (!formData.user.lastName) newErrors['user.lastName'] = 'Last name is required'
      if (!formData.user.dateOfBirth) newErrors['user.dateOfBirth'] = 'Date of birth is required'
      if (!formData.user.email) newErrors['user.email'] = 'Email is required'
      if (!formData.user.phoneNumber) newErrors['user.phoneNumber'] = 'Phone number is required'
    }

    if (step === 2) {
      if (!formData.address.addressLine1) newErrors['address.addressLine1'] = 'Address line 1 is required'
      if (!formData.address.city) newErrors['address.city'] = 'City is required'
      if (!formData.address.postcode) newErrors['address.postcode'] = 'Postcode is required'
    }

    if (step === 3) {
      if (!formData.product.currentProvider) newErrors['product.currentProvider'] = 'Current provider is required'
      if (!formData.product.paymentMethod) newErrors['product.paymentMethod'] = 'Payment method is required'
      if (productType === 'energy' && !formData.product.mpan) {
        newErrors['product.mpan'] = 'MPAN is required for energy switches'
      }
      if (productType === 'energy' && !formData.product.mprn) {
        newErrors['product.mprn'] = 'MPRN is required for gas switches'
      }
    }

    if (step === 4) {
      if (!formData.switchDate) newErrors['switchDate'] = 'Switch date is required'
      if (!formData.agreeToTerms) newErrors['agreeToTerms'] = 'You must agree to the terms and conditions'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1)
      }
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep(4)) return

    try {
      setLoading(true)

      const response = await api.post('/products/switch-intent', {
        recordId,
        switchData: formData,
        affiliateTrackingId: affiliateUrl ? new URL(affiliateUrl).searchParams.get('clickref') : null,
      })

      const switchId = response.data.switchId

      if (onSwitchComplete) {
        onSwitchComplete(switchId)
      } else {
        navigate(`/switch-confirmation/${switchId}`)
      }

    } catch (error) {
      console.error('Failed to submit switch:', error)
      setErrors({ submit: 'Failed to submit switch request. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const updateFormData = (section: keyof SwitchingFormData, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }))
    // Clear error for this field
    if (errors[`${section}.${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[`${section}.${field}`]
        return newErrors
      })
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <UserIcon className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <select
                  value={formData.user.title}
                  onChange={(e) => updateFormData('user', 'title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select title</option>
                  <option value="Mr">Mr</option>
                  <option value="Mrs">Mrs</option>
                  <option value="Miss">Miss</option>
                  <option value="Ms">Ms</option>
                  <option value="Dr">Dr</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                <input
                  type="text"
                  value={formData.user.firstName}
                  onChange={(e) => updateFormData('user', 'firstName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors['user.firstName'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors['user.firstName'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['user.firstName']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                <input
                  type="text"
                  value={formData.user.lastName}
                  onChange={(e) => updateFormData('user', 'lastName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors['user.lastName'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors['user.lastName'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['user.lastName']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
                <input
                  type="date"
                  value={formData.user.dateOfBirth}
                  onChange={(e) => updateFormData('user', 'dateOfBirth', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors['user.dateOfBirth'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors['user.dateOfBirth'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['user.dateOfBirth']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  value={formData.user.email}
                  onChange={(e) => updateFormData('user', 'email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors['user.email'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors['user.email'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['user.email']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                <input
                  type="tel"
                  value={formData.user.phoneNumber}
                  onChange={(e) => updateFormData('user', 'phoneNumber', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors['user.phoneNumber'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors['user.phoneNumber'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['user.phoneNumber']}</p>
                )}
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <Home className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Address Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1 *</label>
                <input
                  type="text"
                  value={formData.address.addressLine1}
                  onChange={(e) => updateFormData('address', 'addressLine1', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors['address.addressLine1'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors['address.addressLine1'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['address.addressLine1']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
                <input
                  type="text"
                  value={formData.address.addressLine2}
                  onChange={(e) => updateFormData('address', 'addressLine2', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => updateFormData('address', 'city', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors['address.city'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors['address.city'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['address.city']}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Postcode *</label>
                  <input
                    type="text"
                    value={formData.address.postcode}
                    onChange={(e) => updateFormData('address', 'postcode', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors['address.postcode'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors['address.postcode'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['address.postcode']}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <select
                  value={formData.address.country}
                  onChange={(e) => updateFormData('address', 'country', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="United Kingdom">United Kingdom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Move-in Date (if applicable)</label>
                <input
                  type="date"
                  value={formData.address.moveInDate}
                  onChange={(e) => updateFormData('address', 'moveInDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <Zap className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Product Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Provider *</label>
                <input
                  type="text"
                  value={formData.product.currentProvider}
                  onChange={(e) => updateFormData('product', 'currentProvider', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors['product.currentProvider'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors['product.currentProvider'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['product.currentProvider']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Tariff</label>
                <input
                  type="text"
                  value={formData.product.currentTariff}
                  onChange={(e) => updateFormData('product', 'currentTariff', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contract End Date</label>
                <input
                  type="date"
                  value={formData.product.currentContractEnd}
                  onChange={(e) => updateFormData('product', 'currentContractEnd', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                <select
                  value={formData.product.paymentMethod}
                  onChange={(e) => updateFormData('product', 'paymentMethod', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors['product.paymentMethod'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="direct_debit">Direct Debit</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="debit_card">Debit Card</option>
                  <option value="cash">Cash</option>
                </select>
                {errors['product.paymentMethod'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['product.paymentMethod']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                <input
                  type="text"
                  value={formData.product.accountNumber}
                  onChange={(e) => updateFormData('product', 'accountNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {productType === 'energy' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">MPAN (Electricity) *</label>
                    <input
                      type="text"
                      value={formData.product.mpan}
                      onChange={(e) => updateFormData('product', 'mpan', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors['product.mpan'] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="21-digit MPAN number"
                    />
                    {errors['product.mpan'] && (
                      <p className="text-red-500 text-sm mt-1">{errors['product.mpan']}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">MPRN (Gas) *</label>
                    <input
                      type="text"
                      value={formData.product.mprn}
                      onChange={(e) => updateFormData('product', 'mprn', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors['product.mprn'] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="6-10 digit MPRN number"
                    />
                    {errors['product.mprn'] && (
                      <p className="text-red-500 text-sm mt-1">{errors['product.mprn']}</p>
                    )}
                  </div>
                </>
              )}

              {productType === 'broadband' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Speed</label>
                  <select
                    value={formData.product.meterNumber || ''}
                    onChange={(e) => updateFormData('product', 'meterNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select speed</option>
                    <option value="standard">Standard (up to 11Mbps)</option>
                    <option value="fast">Fast (up to 38Mbps)</option>
                    <option value="superfast">Superfast (up to 76Mbps)</option>
                    <option value="ultrafast">Ultrafast (100Mbps+)</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <CheckCircle className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Review & Confirm</h2>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Switch Summary</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="text-sm text-gray-600">From:</span>
                  <p className="font-medium">{formData.product.currentProvider}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">To:</span>
                  <p className="font-medium">{providerName}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Product Type:</span>
                  <p className="font-medium">{productType}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Estimated Savings:</span>
                  <p className="font-medium text-green-600">£{estimatedSavings.toFixed(2)}/year</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Switch Date *</label>
                <input
                  type="date"
                  value={formData.switchDate}
                  onChange={(e) => updateFormData('switchDate', 'switchDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors['switchDate'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  min={new Date().toISOString().split('T')[0]}
                />
                {errors['switchDate'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['switchDate']}</p>
                )}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Special Requirements</label>
                <textarea
                  value={formData.specialRequirements}
                  onChange={(e) => updateFormData('specialRequirements', 'specialRequirements', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any special requirements or notes..."
                />
              </div>

              <div className="mt-6 space-y-3">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={formData.agreeToTerms}
                    onChange={(e) => updateFormData('agreeToTerms', 'agreeToTerms', e.target.checked)}
                    className={`mt-1 mr-3 ${
                      errors['agreeToTerms'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <span className="text-sm text-gray-700">
                    I agree to the terms and conditions and understand that this switch will be processed through the provider's systems. *
                  </span>
                </label>
                {errors['agreeToTerms'] && (
                  <p className="text-red-500 text-sm">{errors['agreeToTerms']}</p>
                )}

                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={formData.agreeToMarketing}
                    onChange={(e) => updateFormData('agreeToMarketing', 'agreeToMarketing', e.target.checked)}
                    className="mt-1 mr-3 border-gray-300"
                  />
                  <span className="text-sm text-gray-700">
                    I agree to receive marketing communications about this switch and related services.
                  </span>
                </label>
              </div>
            </div>

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                  <p className="text-red-800">{errors.submit}</p>
                </div>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
      {/* Progress Steps */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step}
              </div>
              {step < 4 && (
                <div
                  className={`w-full h-1 mx-2 ${
                    currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-gray-600">Personal Info</span>
          <span className="text-xs text-gray-600">Address</span>
          <span className="text-xs text-gray-600">Product Info</span>
          <span className="text-xs text-gray-600">Review</span>
        </div>
      </div>

      {/* Form Content */}
      <div className="p-6">
        {renderStepContent()}
      </div>

      {/* Navigation Buttons */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex justify-between">
          <button
            onClick={onCancel || (() => navigate(-1))}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>

          <div className="flex space-x-3">
            {currentStep > 1 && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </button>
            )}

            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center disabled:opacity-50"
              >
                {loading ? (
                  'Processing...'
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submit Switch
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SwitchingForm
