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
  product_type: string
  current_provider: string
  current_cost: number
  best_provider: string
  best_cost: number
  saving: number
  alternatives: Array<{
    provider: string
    cost: number
    saving: number
  }>
  last_updated: string
}

export default function Comparison() {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [comparison, setComparison] = useState<Comparison | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // TODO: Fetch product and comparison data from API
  // For now, using mock data
  useEffect(() => {
    setLoading(false)
    setProduct({
      record_id: productId || '',
      product_type: 'car_insurance',
      provider_name: 'Admiral',
      annual_cost: 450,
      frequency: 'annual',
      confidence_score: 0.9,
    })
    setComparison({
      product_type: 'car_insurance',
      current_provider: 'Admiral',
      current_cost: 450,
      best_provider: 'Aviva',
      best_cost: 420,
      saving: 30,
      alternatives: [
        { provider: 'Aviva', cost: 420, saving: 30 },
        { provider: 'LV', cost: 425, saving: 25 },
        { provider: 'Direct Line', cost: 435, saving: 15 },
        { provider: 'Churchill', cost: 445, saving: 5 },
      ],
      last_updated: new Date().toISOString(),
    })
  }, [productId])

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-slate-600">Loading comparison...</p>
      </main>
    )
  }

  if (!product || !comparison) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-red-600">Product not found</p>
      </main>
    )
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← Back
        </button>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-2">
        {product.product_type.replace('_', ' ')} Comparison
      </h1>
      <p className="text-sm text-slate-500 mb-6">
        Last updated: {new Date(comparison.last_updated).toLocaleDateString()}
      </p>

      {/* Summary Card */}
      <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-emerald-700 font-medium">Your best alternative</p>
            <p className="text-2xl font-bold text-emerald-900">{comparison.best_provider}</p>
            <p className="text-sm text-emerald-700">£{comparison.best_cost.toFixed(2)}/year</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-emerald-700">You could save</p>
            <p className="text-3xl font-bold text-emerald-600">£{comparison.saving.toFixed(2)}</p>
            <p className="text-sm text-emerald-700">per year</p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/switch/${productId}`)}
          className="mt-4 w-full px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
        >
          Switch to {comparison.best_provider}
        </button>
      </div>

      {/* Current vs Best Comparison */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Current Provider</h2>
          <p className="text-xl font-bold text-slate-900 mb-2">{comparison.current_provider}</p>
          <p className="text-2xl font-bold text-slate-900">£{comparison.current_cost.toFixed(2)}</p>
          <p className="text-sm text-slate-500">per year</p>
        </div>
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 shadow-sm">
          <h2 className="text-lg font-semibold text-emerald-900 mb-4">Best Available</h2>
          <p className="text-xl font-bold text-emerald-900 mb-2">{comparison.best_provider}</p>
          <p className="text-2xl font-bold text-emerald-600">£{comparison.best_cost.toFixed(2)}</p>
          <p className="text-sm text-emerald-700">per year</p>
        </div>
      </div>

      {/* All Alternatives */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">All Available Providers</h2>
        <div className="space-y-3">
          {comparison.alternatives.map((alt, index) => (
            <div
              key={alt.provider}
              className={`flex items-center justify-between p-4 rounded-xl border ${
                index === 0
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-4">
                {index === 0 && (
                  <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded">
                    BEST
                  </span>
                )}
                <div>
                  <p className="font-semibold text-slate-900">{alt.provider}</p>
                  <p className="text-sm text-slate-500">£{alt.cost.toFixed(2)}/year</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold ${index === 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                  {alt.saving > 0 ? `Save £${alt.saving.toFixed(2)}` : 'No saving'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
    </main>
  )
}
