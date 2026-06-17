import { Router } from 'express'
import { authenticateToken } from '../middleware/auth'
import { logger } from '../config/logger'
import { pool } from '../db'

const router = Router()

/* GET /api/activity — recent activity feed */
router.get('/', authenticateToken, async (req, res) => {
  if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return }
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)

  try {
    const result = await pool.query(
      `SELECT activity_id, activity_type, title, detail, icon_category, created_at
       FROM activity_log
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [req.user.user_id, limit]
    )
    res.json({ activities: result.rows })
  } catch (err) {
    logger.error('Activity fetch failed', { userId: req.user.user_id, err })
    res.status(500).json({ error: 'Failed to fetch activity' })
  }
})

export default router
