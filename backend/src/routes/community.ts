import { Router } from 'express'
import { authenticateToken } from '../middleware/auth'
import { logger } from '../config/logger'
import { pool } from '../db'

const router = Router()

/* GET /api/community/stats */
router.get('/stats', authenticateToken, async (_req, res) => {
  try {
    const [membersResult, savedResult, tipsResult] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count FROM users WHERE deleted_at IS NULL`),
      pool.query(`SELECT COALESCE(SUM(saving), 0)::float AS total FROM switch_events WHERE status = 'completed'`),
      pool.query(`SELECT COUNT(*)::int AS count FROM community_discussions`),
    ])

    res.json({
      activeMembers: membersResult.rows[0].count,
      totalSaved: savedResult.rows[0].total,
      tipsShared: tipsResult.rows[0].count,
    })
  } catch (err) {
    logger.error('Community stats failed', { err })
    res.status(500).json({ error: 'Failed to fetch community stats' })
  }
})

/* GET /api/community/leaderboard */
router.get('/leaderboard', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.first_name, u.last_name, COALESCE(SUM(se.saving), 0)::float AS total_saved
       FROM users u
       LEFT JOIN switch_events se ON se.user_id = u.user_id AND se.status = 'completed'
       WHERE u.deleted_at IS NULL
       GROUP BY u.user_id, u.first_name, u.last_name
       ORDER BY total_saved DESC
       LIMIT 20`
    )
    res.json({ leaders: result.rows })
  } catch (err) {
    logger.error('Leaderboard failed', { err })
    res.status(500).json({ error: 'Failed to fetch leaderboard' })
  }
})

/* GET /api/community/discussions */
router.get('/discussions', authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         d.discussion_id,
         d.title,
         d.author_name,
         d.icon_category,
         d.created_at,
         COUNT(p.post_id)::int AS replies
       FROM community_discussions d
       LEFT JOIN community_posts p ON p.discussion_id = d.discussion_id
       GROUP BY d.discussion_id
       ORDER BY d.created_at DESC
       LIMIT 20`
    )
    res.json({ discussions: result.rows })
  } catch (err) {
    logger.error('Discussions failed', { err })
    res.status(500).json({ error: 'Failed to fetch discussions' })
  }
})

export default router
