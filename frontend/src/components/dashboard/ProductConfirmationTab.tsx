import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Edit2, Save, X } from 'lucide-react'
import api from '../../lib/api'

interface Product {
  record_id: string
  product_type: string
  provider_name: string
  annual_cost: number
  frequency: string
  confidence_score: number
}

interface CorrectionForm {
  product_type: string
  provider_name: string
  annual_cost: string
}

const PRODUCT_TYPES = [
  'car_insurance',
  'home_insurance', 
  'life_insurance',
  'pet_insurance',
  'energy',
  'broadband',
  'subscription'
]

export default function ProductConfirmationTab() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [correctionForm, setCorrectionForm] = useState<CorrectionForm>({
    product_type: '',
    provider_name: '',
    annual_cost: ''
  })

  useEffect(() => {
    fetchPendingConfirmations()
  }, [])

  const fetchPendingConfirmations = async () => {
    try {
      const res = await api.get('/products/pending-confirmation')
      setProducts(res.data.products || [])
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch pending confirmations')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (recordId: string) => {
    setConfirming(recordId)
    setError('')
    
    try {
      await api.post('/products/confirm', {
        recordId,
        confirmed: true
      })
      
      // Remove confirmed product from list
      setProducts(prev => prev.filter(p => p.record_id !== recordId))
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to confirm product')
    } finally {
      setConfirming(null)
    }
  }

  const handleStartEdit = (product: Product) => {
    setEditingId(product.record_id)
    setCorrectionForm({
      product_type: product.product_type,
      provider_name: product.provider_name,
      annual_cost: product.annual_cost.toString()
    })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setCorrectionForm({
      product_type: '',
      provider_name: '',
      annual_cost: ''
    })
  }

  const handleSaveCorrection = async (recordId: string) => {
    setConfirming(recordId)
    setError('')

    try {
      await api.post('/products/confirm', {
        recordId,
        confirmed: false,
        correctedProductType: correctionForm.product_type !== products.find(p => p.record_id === recordId)?.product_type 
          ? correctionForm.product_type 
          : undefined,
        correctedProviderName: correctionForm.provider_name !== products.find(p => p.record_id === recordId)?.provider_name
          ? correctionForm.provider_name
          : undefined,
        correctedAnnualCost: parseFloat(correctionForm.annual_cost) !== products.find(p => p.record_id === recordId)?.annual_cost
          ? parseFloat(correctionForm.annual_cost)
          : undefined
      })
      
      // Remove corrected product from list
      setProducts(prev => prev.filter(p => p.record_id !== recordId))
      setEditingId(null)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to correct product')
    } finally {
      setConfirming(null)
    }
  }

  const getConfidenceColor = (score: number) => {
    if (score < 0.6) return 'text-red-500'
    if (score < 0.8) return 'text-amber-500'
    return 'text-green-500'
  }

  const getConfidenceBg = (score: number) => {
    if (score < 0.6) return 'bg-red-500/10'
    if (score < 0.8) return 'bg-amber-500/10'
    return 'bg-green-500/10'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#7c3aed]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Product Confirmation</h1>
          <p className="mt-1 text-sm text-white/50">Help us improve accuracy by confirming your detected products.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {products.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-8 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-400 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">All Caught Up!</h3>
          <p className="text-sm text-white/50">No products need confirmation at this time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product) => (
            <div 
              key={product.record_id}
              className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#12122a] to-[#0a0a1a] p-4 sm:p-6"
            >
              {/* Product Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${getConfidenceBg(product.confidence_score)}`}>
                    <AlertTriangle className={`h-5 w-5 ${getConfidenceColor(product.confidence_score)}`} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      {product.product_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h3>
                    <p className="text-sm text-white/70">{product.provider_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/50">Confidence</p>
                  <p className={`text-lg font-semibold ${getConfidenceColor(product.confidence_score)}`}>
                    {(product.confidence_score * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Product Details */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs text-white/50">Annual Cost</p>
                  <p className="text-sm font-semibold text-white">£{product.annual_cost.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50">Frequency</p>
                  <p className="text-sm font-semibold text-white capitalize">{product.frequency}</p>
                </div>
              </div>

              {/* Edit Form */}
              {editingId === product.record_id ? (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">Product Type</label>
                    <select
                      value={correctionForm.product_type}
                      onChange={(e) => setCorrectionForm(prev => ({ ...prev, product_type: e.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#7c3aed] focus:outline-none"
                    >
                      {PRODUCT_TYPES.map(type => (
                        <option key={type} value={type}>
                          {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">Provider Name</label>
                    <input
                      type="text"
                      value={correctionForm.provider_name}
                      onChange={(e) => setCorrectionForm(prev => ({ ...prev, provider_name: e.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#7c3aed] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">Annual Cost</label>
                    <input
                      type="number"
                      step="0.01"
                      value={correctionForm.annual_cost}
                      onChange={(e) => setCorrectionForm(prev => ({ ...prev, annual_cost: e.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#7c3aed] focus:outline-none"
                    />
                  </div>
                </div>
              ) : null}

              {/* Actions */}
              <div className="flex gap-3">
                {editingId === product.record_id ? (
                  <>
                    <button
                      onClick={() => handleSaveCorrection(product.record_id)}
                      disabled={confirming === product.record_id}
                      className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {confirming === product.record_id ? 'Saving...' : 'Save Correction'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={confirming === product.record_id}
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleConfirm(product.record_id)}
                      disabled={confirming === product.record_id}
                      className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" />
                      {confirming === product.record_id ? 'Confirming...' : 'This is Correct'}
                    </button>
                    <button
                      onClick={() => handleStartEdit(product)}
                      disabled={confirming === product.record_id}
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                    >
                      <Edit2 className="h-4 w-4" />
                      Needs Correction
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
