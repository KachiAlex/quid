import { Router } from 'express'
import { authenticateToken } from '../middleware/auth'
import { pool } from '../db'
import { logger } from '../config/logger'
import { triggerManualRateUpdate, getRateStatistics } from '../jobs/rateUpdater'
import { runRateSeeding, getRateDatabaseStats } from '../scripts/seedRates'
import { runDailyRateUpdateJob, getRateUpdateStatistics } from '../jobs/dailyRateUpdate'
import { emailAlertService } from '../services/emailAlertService'
import { renewalAlertJob } from '../jobs/renewalAlertJob'
import scheduler from '../services/scheduler'

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

/**
 * Get scheduler status
 * GET /api/admin/scheduler/status
 */
router.get('/scheduler/status', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const status = scheduler.getJobStatus()
    res.json({
      scheduler: {
        isRunning: true, // We can track this in the scheduler if needed
        jobs: status,
      }
    })
  } catch (err) {
    logger.error('Failed to get scheduler status', err)
    res.status(500).json({ error: 'Failed to get scheduler status' })
  }
})

/**
 * Run a specific job now
 * POST /api/admin/scheduler/run/:jobName
 */
router.post('/scheduler/run/:jobName', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const { jobName } = req.params

  try {
    await scheduler.runJobNow(jobName)
    logger.info(`Job '${jobName}' triggered manually by admin`, { userId: req.user.user_id })
    res.json({
      success: true,
      message: `Job '${jobName}' started successfully`,
    })
  } catch (err) {
    logger.error(`Failed to run job '${jobName}'`, err)
    res.status(500).json({ error: `Failed to run job '${jobName}'` })
  }
})

/**
 * Seed rate database with market data
 * POST /api/admin/rates/seed
 */
router.post('/rates/seed', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const result = await runRateSeeding()
    logger.info('Rate database seeded by admin', { userId: req.user.user_id })
    res.json({
      success: true,
      message: 'Rate database seeded successfully',
      result,
    })
  } catch (err) {
    logger.error('Failed to seed rate database', err)
    res.status(500).json({ error: 'Failed to seed rate database' })
  }
})

/**
 * Get rate database statistics
 * GET /api/admin/rates/stats
 */
router.get('/rates/database-stats', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const stats = await getRateDatabaseStats()
    res.json(stats)
  } catch (err) {
    logger.error('Failed to get rate database stats', err)
    res.status(500).json({ error: 'Failed to get rate database stats' })
  }
})

/**
 * Trigger daily rate update job
 * POST /api/admin/rates/daily-update
 */
router.post('/rates/daily-update', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const result = await runDailyRateUpdateJob()
    logger.info('Daily rate update triggered by admin', { userId: req.user.user_id })
    res.json({
      success: true,
      message: 'Daily rate update completed successfully',
      result,
    })
  } catch (err) {
    logger.error('Failed to trigger daily rate update', err)
    res.status(500).json({ error: 'Failed to trigger daily rate update' })
  }
})

/**
 * Get rate update statistics
 * GET /api/admin/rates/update-stats
 */
router.get('/rates/update-stats', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const stats = await getRateUpdateStatistics()
    res.json(stats)
  } catch (err) {
    logger.error('Failed to get rate update stats', err)
    res.status(500).json({ error: 'Failed to get rate update stats' })
  }
})

/**
 * Get commission rates for disclosure
 * GET /api/admin/commission-rates
 */
router.get('/commission-rates', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const { providerName, productType } = req.query
    
    let query = `
      SELECT provider_name, product_type, rate_percent, commission_type, effective_from
      FROM commission_rates
      WHERE effective_from <= CURRENT_DATE
    `
    const params: any[] = []
    
    if (providerName) {
      query += ` AND provider_name = $${params.length + 1}`
      params.push(providerName)
    }
    
    if (productType) {
      query += ` AND product_type = $${params.length + 1}`
      params.push(productType)
    }
    
    query += ` ORDER BY provider_name, product_type`
    
    const result = await pool.query(query, params)
    
    const commissionRates = result.rows.map(row => ({
      providerName: row.provider_name,
      productType: row.product_type,
      commissionRate: parseFloat(row.rate_percent),
      commissionType: row.commission_type,
      effectiveFrom: row.effective_from
    }))
    
    res.json(commissionRates)
  } catch (err) {
    logger.error('Failed to get commission rates', err)
    res.status(500).json({ error: 'Failed to get commission rates' })
  }
})

/**
 * Send renewal alerts manually
 * POST /api/admin/renewals/send-alerts
 */
router.post('/renewals/send-alerts', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const results = await emailAlertService.sendRenewalAlerts()
    
    logger.info('Manual renewal alerts sent', { 
      userId: req.user.user_id,
      results 
    })
    
    res.json({
      success: true,
      message: 'Renewal alerts sent successfully',
      results
    })
  } catch (err) {
    logger.error('Failed to send renewal alerts', err)
    res.status(500).json({ error: 'Failed to send renewal alerts' })
  }
})

/**
 * Send test renewal email
 * POST /api/admin/renewals/send-test-email
 */
router.post('/renewals/send-test-email', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const { userId, alertType } = req.body

  if (!userId || !alertType) {
    res.status(400).json({ error: 'userId and alertType are required' })
    return
  }

  try {
    await emailAlertService.sendTestEmail(userId, alertType)
    
    logger.info('Test renewal email sent', { 
      userId: req.user.user_id,
      testUserId: userId,
      alertType
    })
    
    res.json({
      success: true,
      message: 'Test email sent successfully'
    })
  } catch (err) {
    logger.error('Failed to send test renewal email', err)
    res.status(500).json({ error: 'Failed to send test renewal email' })
  }
})

/**
 * Get email statistics
 * GET /api/admin/renewals/email-stats
 */
router.get('/renewals/email-stats', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const { from, to } = req.query

  try {
    let dateRange
    if (from && to) {
      dateRange = {
        from: new Date(from as string),
        to: new Date(to as string),
      }
    }

    const stats = await emailAlertService.getEmailStatistics(dateRange)
    
    res.json(stats)
  } catch (err) {
    logger.error('Failed to get email statistics', err)
    res.status(500).json({ error: 'Failed to get email statistics' })
  }
})

/**
 * Get renewal alert job status
 * GET /api/admin/renewals/job-status
 */
router.get('/renewals/job-status', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const status = renewalAlertJob.getStatus()
    
    res.json(status)
  } catch (err) {
    logger.error('Failed to get renewal alert job status', err)
    res.status(500).json({ error: 'Failed to get renewal alert job status' })
  }
})

/**
 * Force run renewal alert job
 * POST /api/admin/renewals/force-run
 */
router.post('/renewals/force-run', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    await renewalAlertJob.forceRun()
    
    logger.info('Renewal alert job force run', { 
      userId: req.user.user_id
    })
    
    res.json({
      success: true,
      message: 'Renewal alert job force run completed'
    })
  } catch (err) {
    logger.error('Failed to force run renewal alert job', err)
    res.status(500).json({ error: 'Failed to force run renewal alert job' })
  }
})

export default router
