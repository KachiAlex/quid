import { useParams } from 'react-router-dom'

export default function Comparison() {
  const { productId } = useParams<{ productId: string }>()

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Comparison</h1>
      <p className="text-slate-600">Product ID: {productId}</p>
    </main>
  )
}
