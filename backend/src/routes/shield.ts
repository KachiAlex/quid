import { Router } from 'express'
import { authenticateToken } from '../middleware/auth'
import { logger } from '../config/logger'
import { pool } from '../db'

const router = Router()

/* GET /api/shield/status — Quid Shield overview stats */
router.get('/status', authenticateToken, async (req, res) => {
  if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return }
  const userId = req.user.user_id

  try {
    const [monitorsResult, alertsResult, savingsResult, renewalsResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS count FROM product_records
         WHERE user_id = $1 AND excluded_by_user = false`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM user_alerts
         WHERE user_id = $1 AND is_dismissed = false`,
        [userId]
      ),
      pool.query(
        `SELECT COALESCE(SUM(saving), 0)::float AS total FROM switch_events
         WHERE user_id = $1 AND status = 'completed'`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM renewal_alerts
         WHERE user_id = $1 AND user_actioned = false
           AND renewal_date_estimated <= CURRENT_DATE + INTERVAL '90 days'`,
        [userId]
      ),
    ])

    res.json({
      activeMonitors: monitorsResult.rows[0].count,
      alertsSent: alertsResult.rows[0].count,
      savingsSecured: savingsResult.rows[0].total,
      upcomingRenewals: renewalsResult.rows[0].count,
      lastScan: new Date().toISOString(),
    })
  } catch (err) {
    logger.error('Shield status failed', { userId, err })
    res.status(500).json({ error: 'Failed to fetch shield status' })
  }
})

/* GET /api/shield/monitors — monitored services with renewal info */
router.get('/monitors', authenticateToken, async (req, res) => {
  if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return }

  try {
    const result = await pool.query(
      `SELECT
         pr.record_id,
         pr.product_type AS category,
         pr.provider_name,
         COALESCE(ra.renewal_date_estimated, CURRENT_DATE + INTERVAL '180 days') AS renewal_date,
         CASE WHEN ra.alert_sent_at_14d IS NOT NULL THEN 'Alert triggered'
              ELSE 'Monitoring' END AS status,
         CASE WHEN ra.alert_sent_at_14d IS NOT NULL THEN 'Price hike detected'
              WHEN ra.renewal_date_estimated <= CURRENT_DATE + INTERVAL '30 days' THEN 'Renewal due soon'
              ELSE 'Monitoring renewals' END AS next_action
       FROM product_records pr
       LEFT JOIN renewal_alerts ra ON ra.product_record_id = pr.record_id
       WHERE pr.user_id = $1 AND pr.excluded_by_user = false
       ORDER BY COALESCE(ra.renewal_date_estimated, CURRENT_DATE + INTERVAL '180 days') ASC`,
      [req.user.user_id]
    )

    res.json({ monitors: result.rows })
  } catch (err) {
    logger.error('Shield monitors fetch failed', { err })
    res.status(500).json({ error: 'Failed to fetch monitors' })
  }
})

export default router
