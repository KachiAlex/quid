import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { startRegistration } from '@simplewebauthn/browser'
import api from '../lib/api'

export default function Settings() {
  const [exportLoading, setExportLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [message, setMessage] = useState('')
  const [mfaQr, setMfaQr] = useState('')
  const [mfaToken, setMfaToken] = useState('')
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [biometricRegistered, setBiometricRegistered] = useState(false)
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const handleRegisterBiometric = async () => {
    try {
      const { data: options } = await api.get('/auth/webauthn/register')
      const attestation = await startRegistration({ optionsJSON: options })
      await api.post('/auth/webauthn/register', attestation)
      setBiometricRegistered(true)
      setMessage('Biometric authentication registered.')
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setMessage('Biometric registration cancelled.')
      } else {
        setMessage('Failed to register biometric authentication.')
      }
    }
  }

  const handleSetupMfa = async () => {
    try {
      const res = await api.post('/auth/mfa/setup')
      setMfaQr(res.data.qrUrl)
      setMessage('')
    } catch {
      setMessage('Failed to start MFA setup.')
    }
  }

  const handleVerifyMfa = async () => {
    try {
      await api.post('/auth/mfa/verify', { token: mfaToken })
      setMfaEnabled(true)
      setMfaQr('')
      setMfaToken('')
      setMessage('MFA enabled.')
    } catch {
      setMessage('Invalid code.')
    }
  }

  const handleDisableMfa = async () => {
    try {
      await api.delete('/auth/mfa')
      setMfaEnabled(false)
      setMessage('MFA disabled.')
    } catch {
      setMessage('Failed to disable MFA.')
    }
  }

  const handleExport = async () => {
    setExportLoading(true)
    setMessage('')
    try {
      const res = await api.get('/users/export-data')
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'quid-data-export.json'
      a.click()
      window.URL.revokeObjectURL(url)
      setMessage('Data export downloaded.')
    } catch {
      setMessage('Failed to export data.')
    } finally {
      setExportLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }
    try {
      await api.delete('/auth/account')
      clearAuth()
      navigate('/')
    } catch {
      setMessage('Failed to delete account.')
    }
  }

  return (
    <main className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Account Settings</h1>
      {message && <p className="text-sm text-emerald-700 mb-4">{message}</p>}
      <div className="space-y-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Open Banking</h2>
          <p className="text-sm text-slate-600 mb-4">Manage your connected bank accounts and consent.</p>
          <button className="text-sm text-red-600 font-medium hover:underline">
            Revoke all consents
          </button>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Security</h2>
          {mfaEnabled ? (
            <div>
              <p className="text-sm text-emerald-700 mb-2">Authenticator app is enabled.</p>
              <button
                onClick={handleDisableMfa}
                className="text-sm text-red-600 font-medium hover:underline"
              >
                Disable MFA
              </button>
            </div>
          ) : mfaQr ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Scan the QR code with your authenticator app, then enter the 6-digit code.</p>
              <img src={mfaQr} alt="MFA QR Code" className="w-40 h-40" />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={mfaToken}
                  onChange={(e) => setMfaToken(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="px-3 py-2 border border-slate-300 rounded-lg w-32 text-center tracking-widest"
                />
                <button
                  onClick={handleVerifyMfa}
                  className="px-4 py-2 bg-quid-600 text-white rounded-lg text-sm font-medium hover:bg-quid-700"
                >
                  Verify
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleSetupMfa}
              className="text-sm text-quid-600 font-medium hover:underline"
            >
              Set up authenticator app
            </button>
          )}
          <div className="mt-3 border-t border-slate-100 pt-3">
            {biometricRegistered ? (
              <p className="text-sm text-emerald-700">Biometric authentication is registered.</p>
            ) : (
              <button
                onClick={handleRegisterBiometric}
                className="text-sm text-quid-600 font-medium hover:underline"
              >
                Register biometric sign-in
              </button>
            )}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Data & Privacy</h2>
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="text-sm text-quid-600 font-medium hover:underline disabled:opacity-50"
          >
            {exportLoading ? 'Preparing export...' : 'Export my data (JSON)'}
          </button>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Danger Zone</h2>
          <p className="text-sm text-slate-600 mb-3">
            {deleteConfirm
              ? 'Are you sure? This will schedule your account for deletion.'
              : 'Deleting your account will remove all personal data within 30 days.'}
          </p>
          <button
            onClick={handleDelete}
            className={`text-sm font-medium hover:underline ${
              deleteConfirm ? 'text-red-700 font-bold' : 'text-red-600'
            }`}
          >
            {deleteConfirm ? 'Yes, delete my account' : 'Delete my account'}
          </button>
          {deleteConfirm && (
            <button
              onClick={() => setDeleteConfirm(false)}
              className="text-sm text-slate-500 ml-4 hover:underline"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
