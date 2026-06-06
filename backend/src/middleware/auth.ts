import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { pool } from '../db'

interface JwtPayload {
  userId: string
  type: 'access' | 'refresh'
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        user_id: string
        email: string
        email_verified_at: Date | null
        subscription_tier: string
        mfa_enabled: boolean
      }
    }
  }
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization
  const token = authHeader?.split(' ')[1]

  if (!token) {
    res.status(401).json({ error: 'Access token required' })
    return
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload

    if (decoded.type !== 'access') {
      res.status(401).json({ error: 'Invalid token type' })
      return
    }

    const result = await pool.query(
      `SELECT user_id, email, email_verified_at, subscription_tier, mfa_enabled
       FROM users WHERE user_id = $1 AND deleted_at IS NULL`,
      [decoded.userId]
    )

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'User not found' })
      return
    }

    req.user = result.rows[0]
    next()
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireVerifiedEmail(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user?.email_verified_at) {
    res.status(403).json({ error: 'Email verification required' })
    return
  }
  next()
}
