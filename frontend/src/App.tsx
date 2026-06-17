import { Suspense } from 'react'
import AppRouter from './router'

function App() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-quid-600" />
      </div>
    }>
      <AppRouter />
    </Suspense>
  )
}

export default App
