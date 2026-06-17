import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'

type Product = {
  record_id: string
  product_type: string
  provider_name: string
  annual_cost: number
  frequency: string
  confidence_score: number
}

type Comparison = {
  best_provider: string
  best_cost: number
  saving: number
}

type UserData = {
  firstName: string
  lastName: string
  email: string
  address: string
  postcode: string
}

export default function Switch() {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [comparison, setComparison] = useState<Comparison | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [showDisclosure, setShowDisclosure] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!productId) {
      setError('No product selected')
      setLoading(false)
      return
    }
    const fetchData = async () => {
      setLoading(true)
      setError('')
      try {
        const [productRes, comparisonRes, meRes] = await Promise.all([
          api.get(`/analysis/products/${productId}`),
          api.get(`/analysis/comparisons/${productId}`),
          api.get('/auth/me'),
        ])
        setProduct(productRes.data.product)
        setComparison({
          best_provider: comparisonRes.data.comparison.best_provider,
          best_cost: parseFloat(comparisonRes.data.comparison.best_cost),
          saving: parseFloat(comparisonRes.data.comparison.saving),
        })
        setUserData({
          firstName: meRes.data.firstName || '',
          lastName: meRes.data.lastName || '',
          email: meRes.data.email || '',
          address: '',
          postcode: '',
        })
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load switch data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [productId])

  const handleInitiateSwitch = () => {
    setShowDisclosure(true)
  }

  const handleConfirmSwitch = async () => {
    setShowDisclosure(false)
    setShowForm(true)
  }

  const handleSubmitForm = async (formData: UserData) => {
    setSwitching(true)
    setError('')
    try {
      const res = await api.post('/switches/intent', {
        productRecordId: productId,
        fromProvider: product?.provider_name,
        toProvider: comparison?.best_provider,
        saving: comparison?.saving,
        userData: formData,
      })

      // Redirect to provider via affiliate link
      window.location.href = res.data.affiliateLink
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initiate switch')
      setSwitching(false)
    }
  }

  const handleCancel = () => {
    setShowDisclosure(false)
  }

  const handleBackToDisclosure = () => {
    setShowForm(false)
    setShowDisclosure(true)
  }

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-slate-600">Loading...</p>
      </main>
    )
  }

  if (!product || !comparison) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-red-600">Product not found</p>
      </main>
    )
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Switch Your {product.product_type.replace('_', ' ')}</h1>

      {!showDisclosure && !showForm ? (
        <div className="space-y-6">
          {/* Current Product Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Current Provider</h2>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xl font-bold text-slate-900">{product.provider_name}</p>
                <p className="text-sm text-slate-500">Annual cost: £{product.annual_cost.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Confidence</p>
                <p className="text-lg font-semibold text-slate-900">{(product.confidence_score * 100).toFixed(0)}%</p>
              </div>
            </div>
          </div>

          {/* Best Alternative Card */}
          <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 shadow-sm">
            <h2 className="text-lg font-semibold text-emerald-900 mb-4">Best Available Alternative</h2>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xl font-bold text-emerald-900">{comparison.best_provider}</p>
                <p className="text-sm text-emerald-700">Annual cost: £{comparison.best_cost.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-emerald-700">You could save</p>
                <p className="text-2xl font-bold text-emerald-600">£{comparison.saving.toFixed(2)}/year</p>
              </div>
            </div>
          </div>

          {/* Initiate Switch Button */}
          <button
            onClick={handleInitiateSwitch}
            className="w-full px-6 py-4 bg-quid-600 text-white rounded-xl font-semibold text-lg hover:bg-quid-700 transition-colors"
          >
            Switch to {comparison.best_provider}
          </button>

          <button
            onClick={() => navigate(-1)}
            className="w-full px-6 py-3 text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : showDisclosure ? (
        /* Commission Disclosure */
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl">
            <h2 className="text-lg font-semibold text-amber-900 mb-4">Important Information</h2>
            <div className="space-y-3 text-sm text-amber-800">
              <p className="font-medium">Commission Disclosure</p>
              <p>
                Quid earns a commission from {comparison.best_provider} when you switch. 
                This does not affect which products we show you — we always rank by savings, not commission.
              </p>
              <p className="text-xs text-amber-700">
                By proceeding, you agree to be redirected to {comparison.best_provider} to complete your switch.
              </p>
            </div>
          </div>

          {/* Switch Summary */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-4">Switch Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">From:</span>
                <span className="font-medium">{product.provider_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">To:</span>
                <span className="font-medium">{comparison.best_provider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Annual saving:</span>
                <span className="font-bold text-emerald-600">£{comparison.saving.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={handleConfirmSwitch}
              disabled={switching}
              className="flex-1 px-6 py-4 bg-quid-600 text-white rounded-xl font-semibold hover:bg-quid-700 transition-colors disabled:opacity-50"
            >
              {switching ? 'Processing...' : 'Confirm & Continue'}
            </button>
            <button
              onClick={handleCancel}
              disabled={switching}
              className="px-6 py-4 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* Pre-filled Form */
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Complete Your Details</h2>
            <p className="text-sm text-slate-600 mb-6">
              We've pre-filled your details from your account. Please verify and update if needed.
            </p>

            <form onSubmit={(e) => {
              e.preventDefault()
              if (userData) handleSubmitForm(userData)
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">First name</label>
                  <input
                    type="text"
                    value={userData?.firstName || ''}
                    onChange={(e) => setUserData(prev => prev ? { ...prev, firstName: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-quid-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last name</label>
                  <input
                    type="text"
                    value={userData?.lastName || ''}
                    onChange={(e) => setUserData(prev => prev ? { ...prev, lastName: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-quid-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={userData?.email || ''}
                  onChange={(e) => setUserData(prev => prev ? { ...prev, email: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-quid-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={userData?.address || ''}
                  onChange={(e) => setUserData(prev => prev ? { ...prev, address: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-quid-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Postcode</label>
                <input
                  type="text"
                  value={userData?.postcode || ''}
                  onChange={(e) => setUserData(prev => prev ? { ...prev, postcode: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-quid-500"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={switching}
                  className="flex-1 px-6 py-4 bg-quid-600 text-white rounded-xl font-semibold hover:bg-quid-700 transition-colors disabled:opacity-50"
                >
                  {switching ? 'Processing...' : 'Continue to Provider'}
                </button>
                <button
                  type="button"
                  onClick={handleBackToDisclosure}
                  disabled={switching}
                  className="px-6 py-4 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Back
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
