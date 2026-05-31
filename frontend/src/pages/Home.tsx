import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4">
      <h1 className="text-4xl font-bold text-slate-900 mb-4">
        Stop Overpaying on Your Bills
      </h1>
      <p className="text-lg text-slate-600 mb-8 text-center max-w-xl">
        Quid connects to your bank account, finds what you're overpaying for,
        and helps you switch to a better deal in minutes.
      </p>
      <div className="flex gap-4">
        <Link
          to="/register"
          className="px-6 py-3 bg-quid-600 text-white rounded-lg font-medium hover:bg-quid-700 transition-colors"
        >
          Connect My Bank
        </Link>
        <Link
          to="/login"
          className="px-6 py-3 bg-white text-quid-700 border border-quid-200 rounded-lg font-medium hover:bg-quid-50 transition-colors"
        >
          Sign In
        </Link>
      </div>
    </main>
  )
}
