import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { pool } from '../db'
import {
  hashPassword,
  verifyPassword,
  generateTokenPair,
  storeRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  generateEmailVerificationToken,
  generatePasswordResetToken,
} from '../services/auth'
import { authenticateToken } from '../middleware/auth'
import { sendEmail, getVerificationEmailHtml, getPasswordResetEmailHtml } from '../utils/email'
import { getGoogleAuthUrl, handleGoogleCallback } from '../services/googleAuth'
import { 
  generateTotpSecret, 
  verifyTotp, 
  enableTotp, 
  disableTotp,
  enableSmsMfa,
  confirmSmsMfa,
  switchMfaMethod,
  getMfaMethod,
  verifyMfaForLogin,
  sendMfaCode
} from '../services/mfa'
import { logoutUser, getUserActivityStatus } from '../middleware/inactivityTimeout'
import { generateRegOpts, verifyReg, generateAuthOpts, verifyAuth } from '../services/webauthn'
import { logger } from '../config/logger'

const router = Router()
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

// Register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().toLowerCase(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName').optional().trim().escape(),
    body('lastName').optional().trim().escape(),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() })
      return
    }

    const { email, password, firstName, lastName } = req.body

    try {
      const existing = await pool.query('SELECT user_id FROM users WHERE email = $1 AND deleted_at IS NULL', [email])
      if (existing.rows.length > 0) {
        res.status(409).json({ error: 'Email already registered' })
        return
      }

      const passwordHash = await hashPassword(password)

      const result = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, email_verified_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING user_id, email`,
        [email, passwordHash, firstName || null, lastName || null]
      )

      const user = result.rows[0]

      res.status(201).json({
        message: 'Registration successful.',
        userId: user.user_id,
      })
    } catch (err) {
      logger.error('Registration error', err)
      res.status(500).json({ error: 'Registration failed' })
    }
  }
)

// Verify Email
router.get('/verify-email', async (req, res) => {
  const { token } = req.query
  if (!token || typeof token !== 'string') {
    res.status(400).json({ error: 'Invalid token' })
    return
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET email_verified_at = NOW(), email_verification_token = NULL, email_verification_expires = NULL
       WHERE email_verification_token = $1 AND email_verification_expires > NOW() AND deleted_at IS NULL
       RETURNING user_id`,
      [token]
    )

    if (result.rows.length === 0) {
      res.status(400).json({ error: 'Invalid or expired token' })
      return
    }

    res.json({ message: 'Email verified successfully. You can now sign in.' })
  } catch (err) {
    logger.error('Email verification error', err)
    res.status(500).json({ error: 'Verification failed' })
  }
})

// Resend Verification
router.post('/resend-verification', body('email').isEmail().normalizeEmail().toLowerCase(), async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }

  const { email } = req.body

  try {
    const verificationToken = generateEmailVerificationToken()
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const result = await pool.query(
      `UPDATE users SET email_verification_token = $1, email_verification_expires = $2
       WHERE email = $3 AND email_verified_at IS NULL AND deleted_at IS NULL
       RETURNING user_id`,
      [verificationToken, verificationExpires, email]
    )

    if (result.rows.length > 0) {
      await sendEmail({
        to: email,
        subject: 'Verify your Quid account',
        html: getVerificationEmailHtml(verificationToken, FRONTEND_URL),
        text: `Verify your account: ${FRONTEND_URL}/verify-email?token=${verificationToken}`,
      })
    }

    res.json({ message: 'If an account exists, a verification email has been sent.' })
  } catch (err) {
    logger.error('Resend verification error', err)
    res.status(500).json({ error: 'Failed to resend verification' })
  }
})

// Login
router.post(
  '/login',
  [body('email').isEmail().normalizeEmail().toLowerCase(), body('password').notEmpty()],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() })
      return
    }

    const { email, password } = req.body

    try {
      const result = await pool.query(
        `SELECT user_id, email, password_hash, email_verified_at, mfa_enabled, mfa_secret_encrypted
         FROM users WHERE email = $1 AND deleted_at IS NULL`,
        [email]
      )

      if (result.rows.length === 0) {
        res.status(401).json({ error: 'Invalid credentials' })
        return
      }

      const user = result.rows[0]
      const valid = await verifyPassword(password, user.password_hash)
      if (!valid) {
        res.status(401).json({ error: 'Invalid credentials' })
        return
      }

      if (!user.email_verified_at) {
        res.status(403).json({ error: 'Email not verified', code: 'EMAIL_NOT_VERIFIED' })
        return
      }

      if (user.mfa_enabled) {
        res.json({ requireMfa: true, tempToken: generateTokenPair(user.user_id).accessToken })
        return
      }

      const tokens = generateTokenPair(user.user_id)
      await storeRefreshToken(user.user_id, tokens.refreshToken)

      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      })

      res.json({
        accessToken: tokens.accessToken,
        user: {
          userId: user.user_id,
          email: user.email,
          emailVerified: true,
          mfaEnabled: false,
        },
      })
    } catch (err) {
      logger.error('Login error', err)
      res.status(500).json({ error: 'Login failed' })
    }
  }
)

// Refresh Token
router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken
  if (!refreshToken) {
    res.status(401).json({ error: 'Refresh token required' })
    return
  }

  const userId = await verifyRefreshToken(refreshToken)
  if (!userId) {
    res.status(403).json({ error: 'Invalid refresh token' })
    return
  }

  const tokens = generateTokenPair(userId)
  await storeRefreshToken(userId, tokens.refreshToken)

  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  })

  res.json({ accessToken: tokens.accessToken })
})

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  if (req.user) {
    await revokeRefreshToken(req.user.user_id)
    // Clean up user activity tracking
    logoutUser(req.user.user_id)
  }
  res.clearCookie('refreshToken')
  res.json({ message: 'Logged out successfully' })
})

// Check activity status
router.get('/activity-status', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const activityStatus = getUserActivityStatus(req.user.user_id)
    
    if (!activityStatus) {
      res.json({
        isActive: false,
        message: 'No activity recorded'
      })
      return
    }

    res.json({
      isActive: activityStatus.isActive,
      lastActivity: activityStatus.lastActivity,
      timeUntilTimeout: activityStatus.timeUntilTimeout,
      timeoutMinutes: Math.floor((activityStatus.timeUntilTimeout || 0) / (60 * 1000))
    })
  } catch (err) {
    logger.error('Failed to get activity status', err)
    res.status(500).json({ error: 'Failed to get activity status' })
  }
})

// Forgot Password
router.post('/forgot-password', body('email').isEmail().normalizeEmail().toLowerCase(), async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }

  const { email } = req.body
  const resetToken = generatePasswordResetToken()
  const resetExpires = new Date(Date.now() + 60 * 60 * 1000)

  try {
    const result = await pool.query(
      `UPDATE users SET password_reset_token = $1, password_reset_expires = $2
       WHERE email = $3 AND deleted_at IS NULL
       RETURNING user_id`,
      [resetToken, resetExpires, email]
    )

    if (result.rows.length > 0) {
      if (process.env.NODE_ENV === 'development' || !process.env.RESEND_API_KEY) {
        res.json({
          message: 'Password reset token generated (dev mode)',
          token: resetToken,
          resetUrl: `${FRONTEND_URL}/reset-password?token=${resetToken}`
        })
        return
      }

      await sendEmail({
        to: email,
        subject: 'Reset your Quid password',
        html: getPasswordResetEmailHtml(resetToken, FRONTEND_URL),
        text: `Reset your password: ${FRONTEND_URL}/reset-password?token=${resetToken}`,
      })
    }

    res.json({ message: 'If an account exists, a password reset email has been sent.' })
  } catch (err) {
    logger.error('Forgot password error', err)
    res.status(500).json({ error: 'Failed to process request' })
  }
})

// Reset Password
router.post(
  '/reset-password',
  [
    body('token').notEmpty(),
    body('password').isLength({ min: 8 }),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() })
      return
    }

    const { token, password } = req.body
    const passwordHash = await hashPassword(password)

    try {
      const result = await pool.query(
        `UPDATE users
         SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL
         WHERE password_reset_token = $2 AND password_reset_expires > NOW() AND deleted_at IS NULL
         RETURNING user_id`,
        [passwordHash, token]
      )

      if (result.rows.length === 0) {
        res.status(400).json({ error: 'Invalid or expired token' })
        return
      }

      res.json({ message: 'Password reset successfully. You can now sign in.' })
    } catch (err) {
      logger.error('Reset password error', err)
      res.status(500).json({ error: 'Failed to reset password' })
    }
  }
)

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const result = await pool.query(
      'SELECT user_id, email, first_name, last_name, subscription_tier FROM users WHERE user_id = $1 AND deleted_at IS NULL',
      [req.user.user_id]
    )
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    const user = result.rows[0]
    res.json({
      userId: user.user_id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      subscriptionTier: user.subscription_tier,
    })
  } catch (err) {
    logger.error('Get me error', err)
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

// Google OAuth
router.get('/google', (_req, res) => {
  const url = getGoogleAuthUrl()
  res.redirect(url)
})

router.get('/google/callback', async (req, res) => {
  const { code, error } = req.query
  if (error || !code || typeof code !== 'string') {
    res.redirect(`${FRONTEND_URL}/login?error=google_auth_failed`)
    return
  }
  try {
    const result = await handleGoogleCallback(code)
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    })
    res.redirect(`${result.redirectUrl}&token=${result.accessToken}`)
  } catch (err) {
    logger.error('Google OAuth callback error', err)
    res.redirect(`${FRONTEND_URL}/login?error=google_auth_failed`)
  }
})

// MFA Setup
router.post('/mfa/setup', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const { secret, qrUrl } = await generateTotpSecret(req.user.user_id)
    res.json({ secret, qrUrl })
  } catch (err) {
    logger.error('MFA setup error', err)
    res.status(500).json({ error: 'Failed to generate MFA secret' })
  }
})

router.post('/mfa/verify', authenticateToken, body('token').isLength({ min: 6, max: 6 }), async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const valid = await verifyMfaForLogin(req.user.user_id, req.body.token)
    if (!valid) {
      res.status(400).json({ error: 'Invalid code' })
      return
    }
    await enableTotp(req.user.user_id)
    res.json({ message: 'MFA enabled successfully' })
  } catch (err) {
    logger.error('MFA verify error', err)
    res.status(500).json({ error: 'Failed to verify MFA' })
  }
})

router.delete('/mfa', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    await disableTotp(req.user.user_id)
    res.json({ message: 'MFA disabled' })
  } catch (err) {
    logger.error('MFA disable error', err)
    res.status(500).json({ error: 'Failed to disable MFA' })
  }
})

// MFA Login Verification
router.post('/mfa/login-verify', authenticateToken, body('token').isLength({ min: 6, max: 6 }), async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const valid = await verifyMfaForLogin(req.user.user_id, req.body.token)
    if (!valid) {
      res.status(400).json({ error: 'Invalid code' })
      return
    }

    // Generate final tokens after successful MFA
    const tokens = generateTokenPair(req.user.user_id)
    await storeRefreshToken(req.user.user_id, tokens.refreshToken)

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    })

    // Get user info
    const userResult = await pool.query(
      'SELECT email, email_verified_at FROM users WHERE user_id = $1',
      [req.user.user_id]
    )
    const user = userResult.rows[0]

    res.json({
      accessToken: tokens.accessToken,
      user: {
        userId: req.user.user_id,
        email: user.email,
        emailVerified: !!user.email_verified_at,
        mfaEnabled: true,
      },
    })
  } catch (err) {
    logger.error('MFA login verify error', err)
    res.status(500).json({ error: 'Failed to verify MFA' })
  }
})

// SMS MFA Setup
router.post('/mfa/sms/setup', authenticateToken, [
  body('phoneNumber').isMobilePhone('any').withMessage('Invalid phone number format')
], async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }

  const { phoneNumber } = req.body

  try {
    await enableSmsMfa(req.user.user_id, phoneNumber)
    res.json({ message: 'SMS verification code sent' })
  } catch (err: any) {
    logger.error('SMS MFA setup error', err)
    if (err.message === 'SMS MFA not configured') {
      res.status(503).json({ error: 'SMS MFA service not available' })
    } else {
      res.status(500).json({ error: 'Failed to setup SMS MFA' })
    }
  }
})

router.post('/mfa/sms/verify', authenticateToken, [
  body('code').isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits')
], async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }

  const { code } = req.body

  try {
    const isValid = await confirmSmsMfa(req.user.user_id, code)
    if (!isValid) {
      res.status(400).json({ error: 'Invalid verification code' })
      return
    }
    res.json({ message: 'SMS MFA enabled successfully' })
  } catch (err) {
    logger.error('SMS MFA verify error', err)
    res.status(500).json({ error: 'Failed to verify SMS MFA' })
  }
})

// MFA Method Management
router.get('/mfa/method', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const method = await getMfaMethod(req.user.user_id)
    res.json({ method })
  } catch (err) {
    logger.error('Get MFA method error', err)
    res.status(500).json({ error: 'Failed to get MFA method' })
  }
})

router.post('/mfa/switch', authenticateToken, [
  body('method').isIn(['totp', 'sms']).withMessage('Method must be totp or sms')
], async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }

  const { method } = req.body

  try {
    await switchMfaMethod(req.user.user_id, method)
    res.json({ message: `Switched to ${method.toUpperCase()} MFA` })
  } catch (err: any) {
    logger.error('Switch MFA method error', err)
    if (err.message.includes('Phone number must be verified')) {
      res.status(400).json({ error: 'Phone number must be verified before switching to SMS MFA' })
    } else {
      res.status(500).json({ error: 'Failed to switch MFA method' })
    }
  }
})

// Send MFA Code (for SMS)
router.post('/mfa/send-code', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    await sendMfaCode(req.user.user_id)
    res.json({ message: 'MFA code sent' })
  } catch (err: any) {
    logger.error('Send MFA code error', err)
    if (err.message.includes('Cannot send code for TOTP')) {
      res.status(400).json({ error: 'Cannot send code for TOTP MFA method' })
    } else if (err.message.includes('Phone number not configured')) {
      res.status(400).json({ error: 'Phone number not configured for SMS MFA' })
    } else if (err.message === 'SMS MFA not configured') {
      res.status(503).json({ error: 'SMS MFA service not available' })
    } else {
      res.status(500).json({ error: 'Failed to send MFA code' })
    }
  }
})

// WebAuthn (Biometric)
router.get('/webauthn/register', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const result = await pool.query('SELECT email FROM users WHERE user_id = $1', [req.user.user_id])
    const email = result.rows[0]?.email || ''
    const options = await generateRegOpts(req.user.user_id, email)
    res.json(options)
  } catch (err) {
    logger.error('WebAuthn register error', err)
    res.status(500).json({ error: 'Failed to generate registration options' })
  }
})

router.post('/webauthn/register', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    await verifyReg(req.user.user_id, req.body)
    res.json({ message: 'Biometric authentication registered' })
  } catch (err) {
    logger.error('WebAuthn register verify error', err)
    res.status(400).json({ error: 'Registration verification failed' })
  }
})

router.post('/webauthn/authenticate', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const options = await generateAuthOpts(req.user.user_id)
    res.json(options)
  } catch (err) {
    logger.error('WebAuthn auth error', err)
    res.status(500).json({ error: 'Failed to generate authentication options' })
  }
})

router.post('/webauthn/verify', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    await verifyAuth(req.user.user_id, req.body)
    res.json({ message: 'Biometric authentication verified' })
  } catch (err) {
    logger.error('WebAuthn verify error', err)
    res.status(400).json({ error: 'Authentication verification failed' })
  }
})

// Delete Account (GDPR)
router.delete('/account', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    await pool.query('UPDATE users SET deleted_at = NOW() WHERE user_id = $1', [req.user.user_id])
    await revokeRefreshToken(req.user.user_id)
    res.clearCookie('refreshToken')
    res.json({ message: 'Account scheduled for deletion. All data will be purged within 30 days.' })
  } catch (err) {
    logger.error('Account deletion error', err)
    res.status(500).json({ error: 'Failed to delete account' })
  }
})

export default router
