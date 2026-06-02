import { Router } from 'express'
import { authenticateToken } from '../middleware/auth'
import { logger } from '../config/logger'
import { triggerManualRateUpdate, getRateStatistics } from '../jobs/rateUpdater'

const router = Router()

/**
 * Manual rate update trigger
 * POST /api/admin/rates/update
 */
router.post('/rates/update', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const result = await triggerManualRateUpdate()
    
    if (result.success) {
      logger.info('Manual rate update triggered', { userId: req.user.user_id })
      res.json(result)
    } else {
      res.status(500).json(result)
    }
  } catch (err) {
    logger.error('Manual rate update failed', err)
    res.status(500).json({ error: 'Failed to trigger rate update' })
  }
})

/**
 * Get rate statistics
 * GET /api/admin/rates/stats
 */
router.get('/rates/stats', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const stats = await getRateStatistics()
    res.json(stats)
  } catch (err) {
    logger.error('Failed to fetch rate statistics', err)
    res.status(500).json({ error: 'Failed to fetch rate statistics' })
  }
})

export default router
