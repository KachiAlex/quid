/**
 * Inactivity Timeout Middleware
 * Automatically logs out users after 30 minutes of inactivity
 */

import { Request, Response, NextFunction } from 'express'
import { pool } from '../db'
import { logger } from '../config/logger'

interface UserActivity {
  userId: string
  lastActivity: Date
  sessionId: string
}

// In-memory store for user activity (in production, use Redis)
const userActivity = new Map<string, UserActivity>()

const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes in milliseconds
const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes cleanup interval

/**
 * Update user's last activity timestamp
 */
export function updateUserActivity(userId: string, sessionId: string): void {
  userActivity.set(userId, {
    userId,
    lastActivity: new Date(),
    sessionId,
  })
}

/**
 * Check if user session is still valid based on activity
 */
export function isUserSessionActive(userId: string): boolean {
  const activity = userActivity.get(userId)
  if (!activity) {
    return false
  }

  const now = new Date()
  const timeSinceLastActivity = now.getTime() - activity.lastActivity.getTime()
  
  return timeSinceLastActivity < INACTIVITY_TIMEOUT
}

/**
 * Clean up expired sessions
 */
function cleanupExpiredSessions(): void {
  const now = new Date()
  let cleanedCount = 0

  for (const [userId, activity] of userActivity.entries()) {
    const timeSinceLastActivity = now.getTime() - activity.lastActivity.getTime()
    
    if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
      userActivity.delete(userId)
      cleanedCount++
      
      // Log the timeout for audit purposes
      logger.info('User session expired due to inactivity', {
        userId,
        sessionId: activity.sessionId,
        lastActivity: activity.lastActivity,
        inactiveMinutes: Math.floor(timeSinceLastActivity / (60 * 1000)),
      })
    }
  }

  if (cleanedCount > 0) {
    logger.info(`Cleaned up ${cleanedCount} expired user sessions`)
  }
}

/**
 * Start the cleanup interval
 */
function startCleanupInterval(): void {
  setInterval(cleanupExpiredSessions, CLEANUP_INTERVAL)
  logger.info('Inactivity timeout cleanup interval started')
}

/**
 * Middleware to check and update user activity
 */
export function inactivityTimeoutMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip for non-authenticated routes
  if (!req.user) {
    next()
    return
  }

  const userId = req.user.user_id
  const sessionId = req.headers['x-session-id'] as string || 'unknown'

  // Check if user session is still active
  if (!isUserSessionActive(userId)) {
    logger.warn('User access denied due to inactivity timeout', {
      userId,
      sessionId,
    })

    // Clear the refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    })

    // Return 401 Unauthorized with specific error code
    res.status(401).json({ 
      error: 'Session expired due to inactivity',
      code: 'INACTIVITY_TIMEOUT'
    })
    return
  }

  // Update user's last activity
  updateUserActivity(userId, sessionId)

  next()
}

/**
 * Manual logout function to clean up user activity
 */
export function logoutUser(userId: string): void {
  userActivity.delete(userId)
  logger.info('User logged out, activity cleared', { userId })
}

/**
 * Get user's current activity status
 */
export function getUserActivityStatus(userId: string): {
  isActive: boolean
  lastActivity?: Date
  timeUntilTimeout?: number
} | null {
  const activity = userActivity.get(userId)
  
  if (!activity) {
    return null
  }

  const now = new Date()
  const timeSinceLastActivity = now.getTime() - activity.lastActivity.getTime()
  const timeUntilTimeout = Math.max(0, INACTIVITY_TIMEOUT - timeSinceLastActivity)

  return {
    isActive: timeSinceLastActivity < INACTIVITY_TIMEOUT,
    lastActivity: activity.lastActivity,
    timeUntilTimeout,
  }
}

/**
 * Initialize the inactivity timeout system
 */
export function initializeInactivityTimeout(): void {
  startCleanupInterval()
  logger.info('Inactivity timeout system initialized', {
    timeoutMinutes: INACTIVITY_TIMEOUT / (60 * 1000),
    cleanupIntervalMinutes: CLEANUP_INTERVAL / (60 * 1000),
  })
}

// Auto-initialize when module is imported
initializeInactivityTimeout()
