/**
 * CSRF Protection Middleware
 * Implements double-submit cookie pattern for state-changing requests
 */

import { Request, Response, NextFunction } from 'express'
import { randomBytes, createHmac } from 'crypto'
import { logger } from '../config/logger'

const CSRF_COOKIE_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'
const CSRF_SECRET = process.env.CSRF_SECRET || process.env.JWT_SECRET || 'default-csrf-secret-change-in-production'

// Methods that don't require CSRF protection (safe methods)
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']

/**
 * Generate a CSRF token
 * Combines a random nonce with a HMAC signature
 */
function generateToken(): string {
  const nonce = randomBytes(32).toString('base64')
  const signature = createHmac('sha256', CSRF_SECRET)
    .update(nonce)
    .digest('base64')
  return `${nonce}.${signature}`
}

/**
 * Verify a CSRF token
 */
function verifyToken(token: string): boolean {
  if (!token || !token.includes('.')) return false

  const [nonce, signature] = token.split('.')
  if (!nonce || !signature) return false

  const expectedSignature = createHmac('sha256', CSRF_SECRET)
    .update(nonce)
    .digest('base64')

  return signature === expectedSignature
}

/**
 * CSRF protection middleware
 * - Generates a new token for GET requests and stores it in a cookie
 * - Validates the token for all state-changing requests
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF check for safe methods
  if (SAFE_METHODS.includes(req.method)) {
    // Generate and set a new token for GET requests
    const token = generateToken()
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Must be accessible by JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    })
    // Also set it in a custom header for the frontend to read
    res.setHeader('X-CSRF-Token', token)
    next()
    return
  }

  // For state-changing methods, validate the token
  const token = req.headers[CSRF_HEADER_NAME.toLowerCase()] as string || req.body?._csrf

  if (!token) {
    logger.warn('CSRF token missing', {
      method: req.method,
      path: req.path,
      ip: req.ip,
    })
    res.status(403).json({ error: 'CSRF token missing' })
    return
  }

  if (!verifyToken(token)) {
    logger.warn('CSRF token invalid', {
      method: req.method,
      path: req.path,
      ip: req.ip,
    })
    res.status(403).json({ error: 'CSRF token invalid' })
    return
  }

  // Generate a new token after successful validation
  const newToken = generateToken()
  res.cookie(CSRF_COOKIE_NAME, newToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
  })
  res.setHeader('X-CSRF-Token', newToken)

  next()
}

/**
 * CSRF token endpoint
 * GET /api/csrf-token
 * Returns a fresh CSRF token for the frontend to use
 */
export function getCsrfToken(req: Request, res: Response): void {
  const token = generateToken()
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
  })
  res.json({ csrfToken: token })
}
