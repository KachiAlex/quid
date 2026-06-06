import { Router } from 'express'
import { authenticateToken } from '../middleware/auth'
import { logger } from '../config/logger'
import { pool } from '../db'

const router = Router()

/* GET /api/alerts — list user alerts */
router.get('/', authenticateToken, async (req, res) => {
  if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return }
  const userId = req.user.user_id
  const filter = (req.query.filter as string) || 'All'

  try {
    let where = 'WHERE user_id = $1 AND is_dismissed = false'
    const params: (string | boolean)[] = [userId]

    if (filter !== 'All') {
      where += ` AND alert_type = $${params.length + 1}`
      params.push(filter)
    }

    const result = await pool.query(
      `SELECT alert_id, alert_type, title, detail, icon_category, is_read, urgency, action_url, action_label, created_at
       FROM user_alerts
       ${where}
       ORDER BY is_read ASC, created_at DESC`,
      params
    )

    res.json({ alerts: result.rows })
  } catch (err) {
    logger.error('Alerts fetch failed', { userId, err })
    res.status(500).json({ error: 'Failed to fetch alerts' })
  }
})

/* PATCH /api/alerts/:id/read — mark as read */
router.patch('/:id/read', authenticateToken, async (req, res) => {
  if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return }
  try {
    await pool.query(
      'UPDATE user_alerts SET is_read = true WHERE alert_id = $1 AND user_id = $2',
      [req.params.id, req.user.user_id]
    )
    res.json({ message: 'Marked as read' })
  } catch (err) {
    logger.error('Alert mark-read failed', { err })
    res.status(500).json({ error: 'Failed to mark alert as read' })
  }
})

/* PATCH /api/alerts/read-all — mark all as read */
router.patch('/read-all', authenticateToken, async (req, res) => {
  if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return }
  try {
    await pool.query(
      'UPDATE user_alerts SET is_read = true WHERE user_id = $1 AND is_dismissed = false',
      [req.user.user_id]
    )
    res.json({ message: 'All alerts marked as read' })
  } catch (err) {
    logger.error('Alerts read-all failed', { err })
    res.status(500).json({ error: 'Failed to mark all as read' })
  }
})

/* DELETE /api/alerts/:id — dismiss alert */
router.delete('/:id', authenticateToken, async (req, res) => {
  if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return }
  try {
    await pool.query(
      'UPDATE user_alerts SET is_dismissed = true WHERE alert_id = $1 AND user_id = $2',
      [req.params.id, req.user.user_id]
    )
    res.json({ message: 'Alert dismissed' })
  } catch (err) {
    logger.error('Alert dismiss failed', { err })
    res.status(500).json({ error: 'Failed to dismiss alert' })
  }
})

/* GET /api/alerts/count — unread count */
router.get('/count', authenticateToken, async (req, res) => {
  if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return }
  try {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS unread FROM user_alerts WHERE user_id = $1 AND is_read = false AND is_dismissed = false`,
      [req.user.user_id]
    )
    res.json({ unread: result.rows[0].unread })
  } catch (err) {
    logger.error('Alert count failed', { err })
    res.status(500).json({ error: 'Failed to get alert count' })
  }
})

export default router
