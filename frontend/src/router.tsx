import { Routes, Route } from 'react-router-dom'
import { lazy } from 'react'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const BankConnection = lazy(() => import('./pages/BankConnection'))
const Comparison = lazy(() => import('./pages/Comparison'))
const Switch = lazy(() => import('./pages/Switch'))
const Settings = lazy(() => import('./pages/Settings'))

export default function AppRouter() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/connect-bank" element={<ProtectedRoute><BankConnection /></ProtectedRoute>} />
        <Route path="/connect-bank/success" element={<ProtectedRoute><BankConnection /></ProtectedRoute>} />
        <Route path="/comparison/:productId" element={<ProtectedRoute><Comparison /></ProtectedRoute>} />
        <Route path="/switch/:productId" element={<ProtectedRoute><Switch /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      </Routes>
    </Layout>
  )
}
