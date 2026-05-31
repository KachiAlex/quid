import { pool } from '../db'
import { generateTokenPair, storeRefreshToken } from './auth'
import { logger } from '../config/logger'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

export function getGoogleAuthUrl(): string {
  const scope = encodeURIComponent('openid email profile')
  const state = Buffer.from(JSON.stringify({ nonce: crypto.randomUUID() })).toString('base64')
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', GOOGLE_CLIENT_ID!)
  url.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', scope)
  url.searchParams.set('state', state)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  return url.toString()
}

interface GoogleTokenResponse {
  access_token: string
  id_token: string
}

interface GoogleUserInfo {
  sub: string
  email: string
  email_verified: boolean
  given_name?: string
  family_name?: string
  picture?: string
}

async function getGoogleTokens(code: string): Promise<GoogleTokenResponse> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google token exchange failed: ${text}`)
  }
  return res.json()
}

async function getGoogleUserInfo(idToken: string): Promise<GoogleUserInfo> {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google userinfo failed: ${text}`)
  }
  return res.json()
}

export async function handleGoogleCallback(code: string): Promise<{
  accessToken: string
  refreshToken: string
  redirectUrl: string
}> {
  const tokens = await getGoogleTokens(code)
  const googleUser = await getGoogleUserInfo(tokens.id_token)

  if (!googleUser.email_verified) {
    throw new Error('Google email not verified')
  }

  let result = await pool.query(
    'SELECT user_id, email_verified_at FROM users WHERE email = $1 AND deleted_at IS NULL',
    [googleUser.email.toLowerCase()]
  )

  let userId: string

  if (result.rows.length === 0) {
    const insert = await pool.query(
      `INSERT INTO users (email, email_verified_at, first_name, last_name, password_hash)
       VALUES ($1, NOW(), $2, $3, NULL)
       RETURNING user_id`,
      [googleUser.email.toLowerCase(), googleUser.given_name || null, googleUser.family_name || null]
    )
    userId = insert.rows[0].user_id
    logger.info('New user registered via Google', { userId, email: googleUser.email })
  } else {
    userId = result.rows[0].user_id
    if (!result.rows[0].email_verified_at) {
      await pool.query('UPDATE users SET email_verified_at = NOW() WHERE user_id = $1', [userId])
    }
  }

  const jwtPair = generateTokenPair(userId)
  await storeRefreshToken(userId, jwtPair.refreshToken)

  return {
    accessToken: jwtPair.accessToken,
    refreshToken: jwtPair.refreshToken,
    redirectUrl: `${FRONTEND_URL}/dashboard?google=success`,
  }
}
