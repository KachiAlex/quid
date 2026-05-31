import bcrypt from 'bcryptjs'
import jwt, { type Secret } from 'jsonwebtoken'
import crypto from 'crypto'
import { pool } from '../db'
import { logger } from '../config/logger'

const JWT_SECRET: Secret = process.env.JWT_SECRET!
const JWT_REFRESH_SECRET: Secret = process.env.JWT_REFRESH_SECRET!
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '24h'
const REFRESH_EXPIRY_DAYS = 30

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateTokenPair(userId: string): TokenPair {
  const accessToken = jwt.sign({ userId, type: 'access' }, JWT_SECRET, {
    expiresIn: ACCESS_EXPIRY,
  })
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, JWT_REFRESH_SECRET, {
    expiresIn: `${REFRESH_EXPIRY_DAYS}d`,
  })
  return { accessToken, refreshToken }
}

export async function storeRefreshToken(userId: string, token: string): Promise<void> {
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET token_hash = $2, expires_at = $3, created_at = NOW()`,
    [userId, crypto.createHash('sha256').update(token).digest('hex'), expiresAt]
  )
}

export async function verifyRefreshToken(token: string): Promise<string | null> {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string; type: string }
    if (decoded.type !== 'refresh') return null

    const hash = crypto.createHash('sha256').update(token).digest('hex')
    const result = await pool.query(
      `SELECT user_id FROM refresh_tokens
       WHERE user_id = $1 AND token_hash = $2 AND expires_at > NOW()`,
      [decoded.userId, hash]
    )

    return result.rows.length > 0 ? result.rows[0].user_id : null
  } catch {
    return null
  }
}

export async function revokeRefreshToken(userId: string): Promise<void> {
  await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId])
}

export function generateEmailVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function cleanupExpiredTokens(): Promise<void> {
  try {
    await pool.query('DELETE FROM refresh_tokens WHERE expires_at <= NOW()')
  } catch (err) {
    logger.error('Failed to cleanup expired tokens', err)
  }
}
