import { Router } from 'express'
import { authenticateToken } from '../middleware/auth'
import { logger } from '../config/logger'
import { pool } from '../db'

const router = Router()

/* GET /api/insights — personalised insights */
router.get('/', authenticateToken, async (req, res) => {
  if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return }

  try {
    const result = await pool.query(
      `SELECT insight_id, insight_type, title, detail, impact, icon_category, is_actioned, created_at
       FROM user_insights
       WHERE user_id = $1
       ORDER BY is_actioned ASC, created_at DESC`,
      [req.user.user_id]
    )
    res.json({ insights: result.rows })
  } catch (err) {
    logger.error('Insights fetch failed', { userId: req.user.user_id, err })
    res.status(500).json({ error: 'Failed to fetch insights' })
  }
})

/* GET /api/insights/spending — category breakdown */
router.get('/spending', authenticateToken, async (req, res) => {
  if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return }

  try {
    const result = await pool.query(
      `SELECT category, SUM(ABS(amount))::float AS total
       FROM transactions
       WHERE user_id = $1 AND amount < 0
         AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE)
       GROUP BY category
       ORDER BY total DESC`,
      [req.user.user_id]
    )
    res.json({ categories: result.rows })
  } catch (err) {
    logger.error('Spending insights failed', { err })
    res.status(500).json({ error: 'Failed to fetch spending insights' })
  }
})

/* GET /api/insights/comparison — peer comparison stats */
router.get('/comparison', authenticateToken, async (req, res) => {
  if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return }

  try {
    const [userSavings, avgSavings, userRank] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(saving), 0)::float AS total FROM switch_events WHERE user_id = $1`,
        [req.user.user_id]
      ),
      pool.query(
        `SELECT COALESCE(AVG(saving), 0)::float AS avg FROM switch_events WHERE status = 'completed'`
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total_users FROM users WHERE deleted_at IS NULL`
      ),
    ])

    res.json({
      userSavings: userSavings.rows[0].total,
      averageSavings: avgSavings.rows[0].avg,
      totalSavers: userRank.rows[0].total_users,
    })
  } catch (err) {
    logger.error('Comparison insights failed', { err })
    res.status(500).json({ error: 'Failed to fetch comparison' })
  }
})

export default router
