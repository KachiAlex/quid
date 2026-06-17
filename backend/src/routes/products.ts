import { Router } from 'express'
import { authenticateToken } from '../middleware/auth'
import { pool } from '../db'
import { logger } from '../config/logger'
import { z } from 'zod'
import { body, validationResult } from 'express-validator'
import { 
  runAutomaticReclassificationJob, 
  triggerManualReclassification, 
  getReclassificationStatistics 
} from '../jobs/reclassificationJob'
import { 
  getDuplicateChargesForUser, 
  updateDuplicateChargeStatus,
  runDuplicateDetectionJob 
} from '../jobs/duplicateDetection'
import { 
  getDormantSubscriptionsForUser, 
  updateDormantSubscriptionStatus,
  runDormantSubscriptionDetectionJob 
} from '../jobs/dormantSubscriptionDetection'
import { 
  rankProductsForComparison,
  getTopRankedProducts 
} from '../services/comparisonRanking'
import { 
  calculateTotalOverpayment,
  getOverpaymentTrends,
  getOverpaymentInsights
} from '../services/overpaymentCalculator'
import { awinIntegration } from '../services/awinIntegration'
import { affiliateLinkRouting } from '../services/affiliateLinkRouting'
import { switchRecording } from '../services/switchRecording'
import { renewalDetection } from '../services/renewalDetection'
import { priceHikeMonitoring } from '../services/priceHikeMonitoring'
import { cancellationGuidanceService } from '../services/cancellationGuidance'
import { productExclusionService } from '../services/productExclusion'
import { costChangeTrackingService } from '../services/costChangeTracking'
import { financialHealthScoringService } from '../services/financialHealthScoring'
import { aiRecommendationService } from '../services/aiRecommendationService'
import { contextualGuidanceService } from '../services/contextualGuidanceService'

const router = Router()

const confirmProductSchema = z.object({
  recordId: z.string().uuid(),
  confirmed: z.boolean(),
  correctedProductType: z.string().optional(),
  correctedProviderName: z.string().optional(),
  correctedAnnualCost: z.number().optional(),
})

// Get products that need confirmation (low confidence)
router.get('/pending-confirmation', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const result = await pool.query(
      `SELECT record_id, product_type, provider_name, annual_cost, frequency, confidence_score
       FROM product_records
       WHERE user_id = $1 AND confidence_score < 0.8
       ORDER BY confidence_score ASC`,
      [req.user.user_id]
    )
    
    res.json({ products: result.rows })
  } catch (err) {
    logger.error('Failed to fetch pending confirmations', err)
    res.status(500).json({ error: 'Failed to fetch pending confirmations' })
  }
})

// Confirm or correct a product
router.post('/confirm', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const validated = confirmProductSchema.parse(req.body)
    const { recordId, confirmed, correctedProductType, correctedProviderName, correctedAnnualCost } = validated

    // Check if product belongs to user
    const existingResult = await pool.query(
      `SELECT record_id FROM product_records WHERE record_id = $1 AND user_id = $2`,
      [recordId, req.user.user_id]
    )

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' })
    }

    if (confirmed) {
      // User confirmed the product is correct - update confidence to 1.0
      await pool.query(
        `UPDATE product_records 
         SET confidence_score = 1.0, last_verified = NOW()
         WHERE record_id = $1`,
        [recordId]
      )

      logger.info('Product confirmed by user', { recordId, userId: req.user.user_id })
      res.json({ message: 'Product confirmed successfully' })
    } else {
      // User corrected the product - update with provided values
      const updates: string[] = []
      const values: (string | number)[] = []
      let paramIndex = 1

      if (correctedProductType) {
        updates.push(`product_type = $${paramIndex++}`)
        values.push(correctedProductType)
      }
      if (correctedProviderName) {
        updates.push(`provider_name = $${paramIndex++}`)
        values.push(correctedProviderName)
      }
      if (correctedAnnualCost) {
        updates.push(`annual_cost = $${paramIndex++}`)
        values.push(correctedAnnualCost)
      }

      updates.push(`confidence_score = 1.0`)
      updates.push(`last_verified = NOW()`)

      values.push(recordId)

      await pool.query(
        `UPDATE product_records 
         SET ${updates.join(', ')}
         WHERE record_id = $${paramIndex}`,
        values
      )

      logger.info('Product corrected by user', { 
        recordId, 
        userId: req.user.user_id, 
        corrections: { correctedProductType, correctedProviderName, correctedAnnualCost }
      })

      res.json({ message: 'Product corrected successfully' })
    }
  } catch (err) {
    logger.error('Failed to confirm/correct product', err)
    res.status(500).json({ error: 'Failed to confirm/correct product' })
  }
})

// Manual reclassification trigger (admin only or for testing)
router.post('/reclassify', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    // For now, allow any user to trigger reclassification for their own connections
    // In production, this might be admin-only
    const result = await triggerManualReclassification(req.user.user_id)
    
    res.json({
      success: result.success,
      message: result.message,
      reclassifiedConnections: result.reclassifiedConnections,
    })
  } catch (err: any) {
    logger.error('Manual reclassification failed', err)
    res.status(500).json({ error: 'Failed to trigger reclassification' })
  }
})

// Get reclassification statistics
router.get('/reclassification-stats', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const stats = await getReclassificationStatistics()
    res.json(stats)
  } catch (err: any) {
    logger.error('Failed to get reclassification statistics', err)
    res.status(500).json({ error: 'Failed to get statistics' })
  }
})

// Admin endpoint to run automatic reclassification job
router.post('/admin/run-reclassification', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  // In production, check if user is admin
  // if (req.user.role !== 'admin') {
  //   return res.status(403).json({ error: 'Admin access required' })
  // }

  try {
    const result = await runAutomaticReclassificationJob()
    
    res.json({
      success: true,
      message: 'Reclassification job completed',
      summary: {
        totalConnections: result.totalConnections,
        successfulReclassifications: result.successfulReclassifications,
        failedReclassifications: result.failedReclassifications,
        totalProductsReclassified: result.results.reduce((sum, r) => sum + r.productsReclassified, 0),
      }
    })
  } catch (err: any) {
    logger.error('Admin reclassification job failed', err)
    res.status(500).json({ error: 'Failed to run reclassification job' })
  }
})

// Get duplicate charges for the current user
router.get('/duplicates', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const duplicates = await getDuplicateChargesForUser(req.user.user_id)
    res.json({ duplicates })
  } catch (err: any) {
    logger.error('Failed to get duplicate charges', err)
    res.status(500).json({ error: 'Failed to fetch duplicate charges' })
  }
})

// Update duplicate charge status
router.patch('/duplicates/:duplicateId/status', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const statusSchema = z.object({
    status: z.enum(['pending_review', 'confirmed_duplicate', 'false_positive', 'resolved'])
  })

  try {
    const { status } = statusSchema.parse(req.body)
    const { duplicateId } = req.params

    await updateDuplicateChargeStatus(duplicateId, status, req.user.user_id)
    
    res.json({ message: 'Duplicate charge status updated successfully' })
  } catch (err: any) {
    logger.error('Failed to update duplicate charge status', err)
    res.status(500).json({ error: 'Failed to update duplicate charge status' })
  }
})

// Manual duplicate detection trigger (admin only or for testing)
router.post('/duplicates/detect', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    // For now, allow any user to trigger duplicate detection for their own data
    // In production, this might be admin-only
    const result = await runDuplicateDetectionJob()
    
    res.json({
      success: true,
      message: 'Duplicate detection completed',
      summary: {
        totalUsers: result.totalUsers,
        usersWithDuplicates: result.usersWithDuplicates,
        totalDuplicates: result.totalDuplicates,
      }
    })
  } catch (err: any) {
    logger.error('Manual duplicate detection failed', err)
    res.status(500).json({ error: 'Failed to trigger duplicate detection' })
  }
})

// Get dormant subscriptions for the current user
router.get('/dormant', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const dormantSubs = await getDormantSubscriptionsForUser(req.user.user_id)
    res.json({ dormantSubscriptions: dormantSubs })
  } catch (err: any) {
    logger.error('Failed to get dormant subscriptions', err)
    res.status(500).json({ error: 'Failed to fetch dormant subscriptions' })
  }
})

// Update dormant subscription status
router.patch('/dormant/:dormantId/status', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const statusSchema = z.object({
    status: z.enum(['pending_review', 'confirmed_dormant', 'false_positive', 'cancelled'])
  })

  try {
    const { status } = statusSchema.parse(req.body)
    const { dormantId } = req.params

    await updateDormantSubscriptionStatus(dormantId, status, req.user.user_id)
    
    res.json({ message: 'Dormant subscription status updated successfully' })
  } catch (err: any) {
    logger.error('Failed to update dormant subscription status', err)
    res.status(500).json({ error: 'Failed to update dormant subscription status' })
  }
})

// Manual dormant subscription detection trigger (admin only or for testing)
router.post('/dormant/detect', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    // For now, allow any user to trigger dormant detection for their own data
    // In production, this might be admin-only
    const result = await runDormantSubscriptionDetectionJob()
    
    res.json({
      success: true,
      message: 'Dormant subscription detection completed',
      summary: {
        totalUsers: result.totalUsers,
        usersWithDormantSubs: result.usersWithDormantSubs,
        totalDormantSubscriptions: result.totalDormantSubscriptions,
        totalPotentialSavings: result.totalPotentialSavings,
      }
    })
  } catch (err: any) {
    logger.error('Manual dormant subscription detection failed', err)
    res.status(500).json({ error: 'Failed to trigger dormant subscription detection' })
  }
})

// Compare product with market alternatives
router.post('/compare', authenticateToken, [
  body('recordId').isUUID().withMessage('Valid product record ID required')
], async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }

  const { recordId } = req.body

  try {
    const comparison = await rankProductsForComparison(req.user.user_id, recordId)
    res.json(comparison)
  } catch (err: any) {
    logger.error('Failed to compare products', err)
    if (err.message === 'Product not found') {
      res.status(404).json({ error: 'Product not found' })
    } else {
      res.status(500).json({ error: 'Failed to compare products' })
    }
  }
})

// Get top ranked products for a product type
router.get('/top-ranked/:productType', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const { productType } = req.params
  const limit = parseInt(req.query.limit as string) || 5

  try {
    const topProducts = await getTopRankedProducts(productType, limit)
    res.json({ products: topProducts })
  } catch (err: any) {
    logger.error('Failed to get top ranked products', err)
    res.status(500).json({ error: 'Failed to get top ranked products' })
  }
})

// Get total overpayment summary
router.get('/overpayment', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const summary = await calculateTotalOverpayment(req.user.user_id)
    res.json(summary)
  } catch (err: any) {
    logger.error('Failed to calculate overpayment', err)
    res.status(500).json({ error: 'Failed to calculate overpayment' })
  }
})

// Get overpayment trends
router.get('/overpayment/trends', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const trends = await getOverpaymentTrends(req.user.user_id)
    res.json({ trends })
  } catch (err: any) {
    logger.error('Failed to get overpayment trends', err)
    res.status(500).json({ error: 'Failed to get overpayment trends' })
  }
})

// Get overpayment insights
router.get('/overpayment/insights', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const insights = await getOverpaymentInsights(req.user.user_id)
    res.json(insights)
  } catch (err: any) {
    logger.error('Failed to get overpayment insights', err)
    res.status(500).json({ error: 'Failed to get overpayment insights' })
  }
})

// Generate affiliate link
router.post('/affiliate-link', authenticateToken, [
  body('merchantId').isString().withMessage('Merchant ID required'),
  body('productType').isString().withMessage('Product type required'),
  body('destinationUrl').isURL().withMessage('Valid destination URL required'),
], async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }

  const { merchantId, productType, destinationUrl, campaignId, subId } = req.body

  try {
    const affiliateLink = await awinIntegration.generateAffiliateLink({
      userId: req.user.user_id,
      merchantId,
      productType,
      destinationUrl,
      campaignId,
      subId,
    })

    logger.info('Affiliate link generated', { 
      userId: req.user.user_id, 
      merchantId, 
      trackingId: affiliateLink.trackingId 
    })

    res.json(affiliateLink)
  } catch (err: any) {
    logger.error('Failed to generate affiliate link', err)
    res.status(500).json({ error: 'Failed to generate affiliate link' })
  }
})

// Get affiliate performance stats
router.get('/affiliate-stats', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const stats = await awinIntegration.getPerformanceStats(req.user.user_id)
    res.json(stats)
  } catch (err: any) {
    logger.error('Failed to get affiliate stats', err)
    res.status(500).json({ error: 'Failed to get affiliate stats' })
  }
})

// Process Awin webhook (no authentication required)
router.post('/awin-webhook', async (req, res) => {
  try {
    await awinIntegration.processWebhook(req.body)
    res.status(200).json({ success: true })
  } catch (err: any) {
    logger.error('Failed to process Awin webhook', err)
    res.status(500).json({ error: 'Failed to process webhook' })
  }
})

// Record switch intent
router.post('/switch-intent', authenticateToken, [
  body('recordId').isUUID().withMessage('Valid record ID required'),
  body('switchData').isObject().withMessage('Switch data is required'),
], async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }

  const { recordId, switchData, affiliateTrackingId } = req.body

  try {
    // Get product details
    const productResult = await pool.query(
      'SELECT provider_name, product_type, annual_cost FROM product_records WHERE record_id = $1 AND user_id = $2',
      [recordId, req.user.user_id]
    )

    if (productResult.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' })
      return
    }

    const product = productResult.rows[0]

    // Use switch recording service
    const switchId = await switchRecording.recordSwitchIntent({
      userId: req.user.user_id,
      recordId,
      oldProvider: product.provider_name,
      newProvider: switchData.newProvider,
      productType: product.product_type,
      estimatedSavings: switchData.estimatedSavings,
      switchDate: switchData.switchDate,
      formData: switchData,
      affiliateTrackingId,
    })

    res.json({
      success: true,
      switchId,
      message: 'Switch intent recorded successfully',
    })

  } catch (err: any) {
    logger.error('Failed to record switch intent', err)
    res.status(500).json({ error: 'Failed to record switch intent' })
  }
})

// Get switch details
router.get('/switch/:switchId', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const { switchId } = req.params

  try {
    const switchResult = await pool.query(
      `SELECT us.*, sfd.form_data, pr.provider_name as current_provider_name
       FROM user_switches us
       LEFT JOIN switch_form_data sfd ON us.id = sfd.switch_id
       LEFT JOIN product_records pr ON us.product_record_id = pr.record_id
       WHERE us.id = $1 AND us.user_id = $2`,
      [switchId, req.user.user_id]
    )

    if (switchResult.rows.length === 0) {
      res.status(404).json({ error: 'Switch not found' })
      return
    }

    const switchData = switchResult.rows[0]

    res.json({
      switchId: switchData.id,
      status: switchData.status,
      oldProvider: switchData.old_provider,
      newProvider: switchData.new_provider,
      productType: switchData.product_type,
      estimatedSavings: switchData.estimated_savings,
      switchIntentDate: switchData.switch_intent_date,
      confirmationDate: switchData.confirmation_date,
      commissionEarned: switchData.commission_earned,
      formData: switchData.form_data,
    })

  } catch (err: any) {
    logger.error('Failed to get switch details', err)
    res.status(500).json({ error: 'Failed to get switch details' })
  }
})

// Confirm switch
router.post('/switch/:switchId/confirm', authenticateToken, [
  body('actualSavings').optional().isNumeric().withMessage('Actual savings must be a number'),
  body('commissionEarned').optional().isNumeric().withMessage('Commission earned must be a number'),
  body('orderId').optional().isString().withMessage('Order ID must be a string'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
], async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }

  const { switchId } = req.params
  const { actualSavings, commissionEarned, orderId, notes } = req.body

  try {
    await switchRecording.confirmSwitch({
      switchId,
      confirmationDate: new Date(),
      actualSavings: actualSavings ? parseFloat(actualSavings) : undefined,
      commissionEarned: commissionEarned ? parseFloat(commissionEarned) : undefined,
      orderId,
      notes,
    })

    res.json({
      success: true,
      message: 'Switch confirmed successfully',
    })

  } catch (err: any) {
    logger.error('Failed to confirm switch', err)
    res.status(500).json({ error: 'Failed to confirm switch' })
  }
})

// Cancel switch
router.post('/switch/:switchId/cancel', authenticateToken, [
  body('reason').optional().isString().withMessage('Reason must be a string'),
], async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }

  const { switchId } = req.params
  const { reason } = req.body

  try {
    await switchRecording.cancelSwitch(switchId, req.user.user_id, reason)

    res.json({
      success: true,
      message: 'Switch cancelled successfully',
    })

  } catch (err: any) {
    logger.error('Failed to cancel switch', err)
    res.status(500).json({ error: 'Failed to cancel switch' })
  }
})

// Get switch history
router.get('/switches/history', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const limit = parseInt(req.query.limit as string) || 50

  try {
    const history = await switchRecording.getUserSwitchHistory(req.user.user_id, limit)
    res.json(history)

  } catch (err: any) {
    logger.error('Failed to get switch history', err)
    res.status(500).json({ error: 'Failed to get switch history' })
  }
})

// Get switch statistics
router.get('/switches/statistics', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const { from, to } = req.query

  try {
    let dateRange
    if (from && to) {
      dateRange = {
        from: new Date(from as string),
        to: new Date(to as string),
      }
    }

    const stats = await switchRecording.getSwitchStatistics(req.user.user_id, dateRange)
    res.json(stats)

  } catch (err: any) {
    logger.error('Failed to get switch statistics', err)
    res.status(500).json({ error: 'Failed to get switch statistics' })
  }
})

// Update switch status (legacy endpoint)
router.put('/switch/:switchId/status', authenticateToken, [
  body('status').isIn(['pending', 'confirmed', 'cancelled', 'failed']).withMessage('Valid status required'),
], async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const { switchId } = req.params
  const { status, notes } = req.body

  try {
    const updateResult = await pool.query(
      `UPDATE user_switches 
       SET status = $1, updated_at = NOW(), notes = COALESCE($2, notes)
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [status, notes, switchId, req.user.user_id]
    )

    if (updateResult.rows.length === 0) {
      res.status(404).json({ error: 'Switch not found' })
      return
    }

    logger.info('Switch status updated', {
      switchId,
      userId: req.user.user_id,
      newStatus: status,
    })

    res.json({
      success: true,
      message: 'Switch status updated successfully',
      switch: updateResult.rows[0],
    })

  } catch (err: any) {
    logger.error('Failed to update switch status', err)
    res.status(500).json({ error: 'Failed to update switch status' })
  }
})

// Process affiliate link click (public endpoint)
router.post('/affiliate/click', async (req, res) => {
  const { trackingId } = req.body

  if (!trackingId) {
    res.status(400).json({ error: 'Tracking ID is required' })
    return
  }

  try {
    const result = await affiliateLinkRouting.processLinkClick({
      trackingId,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
      referrer: req.get('Referer'),
    })

    res.json(result)

  } catch (err: any) {
    logger.error('Failed to process affiliate click', err)
    res.status(500).json({ error: 'Failed to process affiliate click' })
  }
})

// Redirect affiliate link (public endpoint)
router.get('/go/:shortCode', async (req, res) => {
  const { shortCode } = req.params

  try {
    // Resolve short URL to tracking ID
    const trackingId = await affiliateLinkRouting.resolveShortUrl(shortCode)
    
    if (!trackingId) {
      res.status(404).json({ error: 'Short URL not found or expired' })
      return
    }

    // Process the click and get redirect URL
    const result = await affiliateLinkRouting.processLinkClick({
      trackingId,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
      referrer: req.get('Referer'),
    })

    // Redirect to affiliate URL
    res.redirect(302, result.redirectUrl)

  } catch (err: any) {
    logger.error('Failed to redirect affiliate link', err)
    res.status(500).json({ error: 'Failed to redirect affiliate link' })
  }
})

// Get click analytics (authenticated)
router.get('/affiliate/analytics/:trackingId', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const { trackingId } = req.params

  try {
    const analytics = await affiliateLinkRouting.getClickAnalytics(trackingId)
    
    // Verify user owns this tracking ID
    const userClick = analytics.find(click => click.userId === req.user?.user_id)
    if (!userClick) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    res.json(analytics)

  } catch (err: any) {
    logger.error('Failed to get click analytics', err)
    res.status(500).json({ error: 'Failed to get click analytics' })
  }
})

// Get user click history (authenticated)
router.get('/affiliate/click-history', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const limit = parseInt(req.query.limit as string) || 50

  try {
    const history = await affiliateLinkRouting.getUserClickHistory(req.user.user_id, limit)
    res.json(history)

  } catch (err: any) {
    logger.error('Failed to get user click history', err)
    res.status(500).json({ error: 'Failed to get user click history' })
  }
})

// Generate short URL (authenticated)
router.post('/affiliate/short-url', authenticateToken, [
  body('trackingId').isString().withMessage('Tracking ID is required'),
], async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }

  const { trackingId } = req.body

  try {
    // Verify user owns this tracking ID
    const clickResult = await pool.query(
      'SELECT user_id FROM affiliate_clicks WHERE tracking_id = $1',
      [trackingId]
    )

    if (clickResult.rows.length === 0 || clickResult.rows[0].user_id !== req.user.user_id) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    const shortUrl = await affiliateLinkRouting.generateShortUrl(trackingId)
    res.json({ shortUrl, trackingId })

  } catch (err: any) {
    logger.error('Failed to generate short URL', err)
    res.status(500).json({ error: 'Failed to generate short URL' })
  }
})

// Get merchant performance (authenticated)
router.get('/affiliate/performance', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const { merchantId, from, to } = req.query

  try {
    let dateRange
    if (from && to) {
      dateRange = {
        from: new Date(from as string),
        to: new Date(to as string),
      }
    }

    const performance = await affiliateLinkRouting.getMerchantPerformance(
      merchantId as string,
      dateRange
    )

    res.json(performance)

  } catch (err: any) {
    logger.error('Failed to get merchant performance', err)
    res.status(500).json({ error: 'Failed to get merchant performance' })
  }
})

// Get renewal alerts (authenticated)
router.get('/renewals/alerts', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const alerts = await renewalDetection.getUserRenewalAlerts(req.user.user_id)
    res.json(alerts)

  } catch (err: any) {
    logger.error('Failed to get renewal alerts', err)
    res.status(500).json({ error: 'Failed to get renewal alerts' })
  }
})

// Get renewal statistics (authenticated)
router.get('/renewals/statistics', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const { from, to } = req.query

  try {
    let dateRange
    if (from && to) {
      dateRange = {
        from: new Date(from as string),
        to: new Date(to as string),
      }
    }

    const stats = await renewalDetection.getRenewalStatistics(dateRange)
    res.json(stats)

  } catch (err: any) {
    logger.error('Failed to get renewal statistics', err)
    res.status(500).json({ error: 'Failed to get renewal statistics' })
  }
})

// Trigger renewal detection (admin only)
router.post('/renewals/detect', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  // Check if user is admin
  const userResult = await pool.query(
    'SELECT role FROM users WHERE user_id = $1',
    [req.user.user_id]
  )

  if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' })
    return
  }

  try {
    const alerts = await renewalDetection.detectUpcomingRenewals()
    await renewalDetection.storeRenewalAlerts(alerts)

    res.json({
      success: true,
      message: 'Renewal detection completed',
      alertsDetected: alerts.length,
    })

  } catch (err: any) {
    logger.error('Failed to trigger renewal detection', err)
    res.status(500).json({ error: 'Failed to trigger renewal detection' })
  }
})

// Get unsent renewal alerts for notification (admin only)
router.get('/renewals/unsent', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  // Check if user is admin
  const userResult = await pool.query(
    'SELECT role FROM users WHERE user_id = $1',
    [req.user.user_id]
  )

  if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' })
    return
  }

  try {
    const alerts = await renewalDetection.getUnsentAlerts()
    res.json(alerts)

  } catch (err: any) {
    logger.error('Failed to get unsent renewal alerts', err)
    res.status(500).json({ error: 'Failed to get unsent renewal alerts' })
  }
})

// Mark renewal alerts as sent (admin only)
router.post('/renewals/mark-sent', authenticateToken, [
  body('alertIds').isArray().withMessage('Alert IDs array is required'),
], async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  // Check if user is admin
  const userResult = await pool.query(
    'SELECT role FROM users WHERE user_id = $1',
    [req.user.user_id]
  )

  if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' })
    return
  }

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }

  const { alertIds } = req.body

  try {
    await renewalDetection.markAlertsAsSent(alertIds)

    res.json({
      success: true,
      message: 'Alerts marked as sent',
      alertCount: alertIds.length,
    })

  } catch (err: any) {
    logger.error('Failed to mark alerts as sent', err)
    res.status(500).json({ error: 'Failed to mark alerts as sent' })
  }
})

// Get price hike alerts (authenticated)
router.get('/price-hikes/alerts', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const alerts = await priceHikeMonitoring.getUserPriceHikeAlerts(req.user.user_id)
    res.json(alerts)

  } catch (err: any) {
    logger.error('Failed to get price hike alerts', err)
    res.status(500).json({ error: 'Failed to get price hike alerts' })
  }
})

// Get price hike statistics (authenticated)
router.get('/price-hikes/statistics', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const { from, to } = req.query

  try {
    let dateRange
    if (from && to) {
      dateRange = {
        from: new Date(from as string),
        to: new Date(to as string),
      }
    }

    const stats = await priceHikeMonitoring.getPriceHikeStatistics(dateRange)
    res.json(stats)

  } catch (err: any) {
    logger.error('Failed to get price hike statistics', err)
    res.status(500).json({ error: 'Failed to get price hike statistics' })
  }
})

// Trigger price hike detection (admin only)
router.post('/price-hikes/detect', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  // Check if user is admin
  const userResult = await pool.query(
    'SELECT role FROM users WHERE user_id = $1',
    [req.user.user_id]
  )

  if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' })
    return
  }

  try {
    const alerts = await priceHikeMonitoring.detectPriceHikes()
    await priceHikeMonitoring.storePriceHikeAlerts(alerts)

    res.json({
      success: true,
      message: 'Price hike detection completed',
      priceHikesDetected: alerts.length,
    })

  } catch (err: any) {
    logger.error('Failed to trigger price hike detection', err)
    res.status(500).json({ error: 'Failed to trigger price hike detection' })
  }
})

// Send price hike alerts (admin only)
router.post('/price-hikes/send-alerts', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  // Check if user is admin
  const userResult = await pool.query(
    'SELECT role FROM users WHERE user_id = $1',
    [req.user.user_id]
  )

  if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' })
    return
  }

  try {
    const results = await priceHikeMonitoring.sendPriceHikeAlerts()

    res.json({
      success: true,
      message: 'Price hike alerts sent successfully',
      results
    })

  } catch (err: any) {
    logger.error('Failed to send price hike alerts', err)
    res.status(500).json({ error: 'Failed to send price hike alerts' })
  }
})

// Get cancellation guidance (authenticated)
router.get('/cancellation-guidance/:providerName/:productType', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const { providerName, productType } = req.params

  try {
    // Record search for analytics
    await cancellationGuidanceService.recordSearch(providerName, req.user.user_id)

    const guidance = await cancellationGuidanceService.getCancellationGuidance(
      decodeURIComponent(providerName),
      decodeURIComponent(productType)
    )

    if (!guidance) {
      res.status(404).json({ error: 'Cancellation guidance not found' })
      return
    }

    res.json(guidance)

  } catch (err: any) {
    logger.error('Failed to get cancellation guidance', err)
    res.status(500).json({ error: 'Failed to get cancellation guidance' })
  }
})

// Search cancellation guidance (authenticated)
router.get('/cancellation-guidance/search/:searchTerm', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const { searchTerm } = req.params

  try {
    const results = await cancellationGuidanceService.searchProviderGuidance(
      decodeURIComponent(searchTerm)
    )

    res.json(results)

  } catch (err: any) {
    logger.error('Failed to search cancellation guidance', err)
    res.status(500).json({ error: 'Failed to search cancellation guidance' })
  }
})

// Get all providers with guidance (authenticated)
router.get('/cancellation-guidance/providers', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const providers = await cancellationGuidanceService.getAllProviders()
    res.json(providers)

  } catch (err: any) {
    logger.error('Failed to get providers', err)
    res.status(500).json({ error: 'Failed to get providers' })
  }
})

// Get popular providers (authenticated)
router.get('/cancellation-guidance/popular', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const popularProviders = await cancellationGuidanceService.getPopularProviders()
    res.json(popularProviders)

  } catch (err: any) {
    logger.error('Failed to get popular providers', err)
    res.status(500).json({ error: 'Failed to get popular providers' })
  }
})

// Get cancellation guidance statistics (admin only)
router.get('/cancellation-guidance/statistics', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  // Check if user is admin
  const userResult = await pool.query(
    'SELECT role FROM users WHERE user_id = $1',
    [req.user.user_id]
  )

  if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' })
    return
  }

  try {
    const stats = await cancellationGuidanceService.getStatistics()
    res.json(stats)

  } catch (err: any) {
    logger.error('Failed to get cancellation guidance statistics', err)
    res.status(500).json({ error: 'Failed to get cancellation guidance statistics' })
  }
})

// Update cancellation guidance (admin only)
router.put('/cancellation-guidance', authenticateToken, [
  body('providerName').notEmpty().withMessage('Provider name is required'),
  body('productType').notEmpty().withMessage('Product type is required'),
  body('methods').isArray().withMessage('Methods must be an array'),
  body('generalTips').isArray().withMessage('General tips must be an array'),
  body('importantNotes').isArray().withMessage('Important notes must be an array'),
], async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  // Check if user is admin
  const userResult = await pool.query(
    'SELECT role FROM users WHERE user_id = $1',
    [req.user.user_id]
  )

  if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' })
    return
  }

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }

  try {
    const guidance = {
      providerName: req.body.providerName,
      productType: req.body.productType,
      methods: req.body.methods,
      generalTips: req.body.generalTips,
      importantNotes: req.body.importantNotes,
      commonIssues: req.body.commonIssues || [],
      alternativeOptions: req.body.alternativeOptions || [],
    }

    // Validate guidance data
    const validation = cancellationGuidanceService.validateGuidance(guidance)
    if (!validation.isValid) {
      res.status(400).json({ error: 'Invalid guidance data', details: validation.errors })
      return
    }

    await cancellationGuidanceService.updateGuidance(guidance)

    res.json({
      success: true,
      message: 'Cancellation guidance updated successfully'
    })

  } catch (err: any) {
    logger.error('Failed to update cancellation guidance', err)
    res.status(500).json({ error: 'Failed to update cancellation guidance' })
  }
})

// Get products with exclusion status (authenticated)
router.get('/exclusions', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const products = await productExclusionService.getProductsWithExclusionStatus(req.user.user_id)
    res.json(products)

  } catch (err: any) {
    logger.error('Failed to get products with exclusion status', err)
    res.status(500).json({ error: 'Failed to get products with exclusion status' })
  }
})

// Toggle product exclusion (authenticated)
router.post('/:recordId/exclusion', authenticateToken, [
  body('isExcluded').isBoolean().withMessage('isExcluded must be a boolean'),
  body('exclusionReason').optional().isString().withMessage('exclusionReason must be a string'),
], async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }

  const { recordId } = req.params
  const { isExcluded, exclusionReason } = req.body

  try {
    await productExclusionService.toggleProductExclusion(
      req.user.user_id,
      recordId,
      isExcluded,
      exclusionReason
    )

    res.json({
      success: true,
      message: `Product ${isExcluded ? 'excluded' : 'included'} successfully`
    })

  } catch (err: any) {
    logger.error('Failed to toggle product exclusion', err)
    res.status(500).json({ error: 'Failed to toggle product exclusion' })
  }
})

// Get exclusion rules (authenticated)
router.get('/exclusion-rules', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const rules = await productExclusionService.getExclusionRules(req.user.user_id)
    res.json(rules)

  } catch (err: any) {
    logger.error('Failed to get exclusion rules', err)
    res.status(500).json({ error: 'Failed to get exclusion rules' })
  }
})

// Create exclusion rule (authenticated)
router.post('/exclusion-rules', authenticateToken, [
  body('ruleType').isIn(['provider', 'product_type', 'cost_range', 'custom']).withMessage('Invalid rule type'),
  body('ruleValue').notEmpty().withMessage('Rule value is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
], async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }

  try {
    const rule = await productExclusionService.createExclusionRule(req.user.user_id, {
      ruleType: req.body.ruleType,
      ruleValue: req.body.ruleValue,
      description: req.body.description,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
    })

    res.json({
      success: true,
      message: 'Exclusion rule created successfully',
      rule
    })

  } catch (err: any) {
    logger.error('Failed to create exclusion rule', err)
    res.status(500).json({ error: 'Failed to create exclusion rule' })
  }
})

// Update exclusion rule (authenticated)
router.put('/exclusion-rules/:ruleId', authenticateToken, [
  body('ruleType').optional().isIn(['provider', 'product_type', 'cost_range', 'custom']).withMessage('Invalid rule type'),
  body('ruleValue').optional().isString().withMessage('Rule value must be a string'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
], async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }

  const { ruleId } = req.params
  const updates = req.body

  try {
    await productExclusionService.updateExclusionRule(req.user.user_id, ruleId, updates)

    res.json({
      success: true,
      message: 'Exclusion rule updated successfully'
    })

  } catch (err: any) {
    logger.error('Failed to update exclusion rule', err)
    res.status(500).json({ error: 'Failed to update exclusion rule' })
  }
})

// Delete exclusion rule (authenticated)
router.delete('/exclusion-rules/:ruleId', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const { ruleId } = req.params

  try {
    await productExclusionService.deleteExclusionRule(req.user.user_id, ruleId)

    res.json({
      success: true,
      message: 'Exclusion rule deleted successfully'
    })

  } catch (err: any) {
    logger.error('Failed to delete exclusion rule', err)
    res.status(500).json({ error: 'Failed to delete exclusion rule' })
  }
})

// Get exclusion settings (authenticated)
router.get('/exclusion-settings', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const settings = await productExclusionService.getExclusionSettings(req.user.user_id)
    
    if (!settings) {
      // Return default settings if none exist
      res.json({
        userId: req.user.user_id,
        excludeCancelledProducts: true,
        excludeLowValueProducts: false,
        lowValueThreshold: 100,
        autoRenewalExclusions: false,
        notificationPreferences: {
          renewalAlerts: true,
          priceHikeAlerts: true,
          comparisonAlerts: true,
        },
      })
    } else {
      res.json(settings)
    }

  } catch (err: any) {
    logger.error('Failed to get exclusion settings', err)
    res.status(500).json({ error: 'Failed to get exclusion settings' })
  }
})

// Update exclusion settings (authenticated)
router.put('/exclusion-settings', authenticateToken, [
  body('excludeCancelledProducts').isBoolean().withMessage('excludeCancelledProducts must be a boolean'),
  body('excludeLowValueProducts').isBoolean().withMessage('excludeLowValueProducts must be a boolean'),
  body('lowValueThreshold').isNumeric().withMessage('lowValueThreshold must be a number'),
  body('autoRenewalExclusions').isBoolean().withMessage('autoRenewalExclusions must be a boolean'),
  body('notificationPreferences').isObject().withMessage('notificationPreferences must be an object'),
], async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }

  try {
    await productExclusionService.updateExclusionSettings(req.user.user_id, {
      userId: req.user.user_id,
      excludeCancelledProducts: req.body.excludeCancelledProducts,
      excludeLowValueProducts: req.body.excludeLowValueProducts,
      lowValueThreshold: req.body.lowValueThreshold,
      autoRenewalExclusions: req.body.autoRenewalExclusions,
      notificationPreferences: req.body.notificationPreferences,
    })

    res.json({
      success: true,
      message: 'Exclusion settings updated successfully'
    })

  } catch (err: any) {
    logger.error('Failed to update exclusion settings', err)
    res.status(500).json({ error: 'Failed to update exclusion settings' })
  }
})

// Get exclusion statistics (authenticated)
router.get('/exclusion-statistics', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const stats = await productExclusionService.getExclusionStatistics(req.user.user_id)
    res.json(stats)

  } catch (err: any) {
    logger.error('Failed to get exclusion statistics', err)
    res.status(500).json({ error: 'Failed to get exclusion statistics' })
  }
})

// Get cost changes (authenticated)
router.get('/cost-changes', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const options = {
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
      toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
      changeType: req.query.changeType as any,
      impactLevel: req.query.impactLevel as any,
      recordId: req.query.recordId as string,
    }

    const changes = await costChangeTrackingService.getCostChanges(req.user.user_id, options)
    res.json(changes)

  } catch (err: any) {
    logger.error('Failed to get cost changes', err)
    res.status(500).json({ error: 'Failed to get cost changes' })
  }
})

// Record cost change (authenticated)
router.post('/cost-changes', authenticateToken, [
  body('recordId').isUUID().withMessage('Valid record ID is required'),
  body('oldCost').isNumeric().withMessage('Old cost must be a number'),
  body('newCost').isNumeric().withMessage('New cost must be a number'),
  body('source').optional().isIn(['manual', 'automatic', 'import', 'user_reported']).withMessage('Invalid source'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
], async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }

  const { recordId, oldCost, newCost, source = 'manual', notes } = req.body

  try {
    const change = await costChangeTrackingService.recordCostChange(
      req.user.user_id,
      recordId,
      parseFloat(oldCost),
      parseFloat(newCost),
      source,
      notes
    )

    res.json({
      success: true,
      message: 'Cost change recorded successfully',
      change
    })

  } catch (err: any) {
    logger.error('Failed to record cost change', err)
    res.status(500).json({ error: 'Failed to record cost change' })
  }
})

// Get cost change summary (authenticated)
router.get('/cost-changes/summary', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const options = {
      fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
      toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
    }

    const summary = await costChangeTrackingService.getCostChangeSummary(req.user.user_id, options)
    res.json(summary)

  } catch (err: any) {
    logger.error('Failed to get cost change summary', err)
    res.status(500).json({ error: 'Failed to get cost change summary' })
  }
})

// Analyze cost trends (authenticated)
router.get('/cost-changes/trends', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const options = {
      period: req.query.period as '3m' | '6m' | '12m' | 'all' || '6m',
      recordId: req.query.recordId as string,
    }

    const trends = await costChangeTrackingService.analyzeCostTrends(req.user.user_id, options)
    res.json(trends)

  } catch (err: any) {
    logger.error('Failed to analyze cost trends', err)
    res.status(500).json({ error: 'Failed to analyze cost trends' })
  }
})

// Get cost change alerts (authenticated)
router.get('/cost-changes/alerts', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const alerts = await costChangeTrackingService.getCostChangeAlerts(req.user.user_id)
    res.json(alerts)

  } catch (err: any) {
    logger.error('Failed to get cost change alerts', err)
    res.status(500).json({ error: 'Failed to get cost change alerts' })
  }
})

// Create cost change alert (authenticated)
router.post('/cost-changes/alerts', authenticateToken, [
  body('recordId').isUUID().withMessage('Valid record ID is required'),
  body('alertType').isIn(['significant_increase', 'unusual_change', 'trend_alert']).withMessage('Invalid alert type'),
  body('threshold').isNumeric().withMessage('Threshold must be a number'),
], async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }

  const { recordId, alertType, threshold } = req.body

  try {
    const alert = await costChangeTrackingService.createCostChangeAlert(
      req.user.user_id,
      recordId,
      alertType,
      parseFloat(threshold)
    )

    res.json({
      success: true,
      message: 'Cost change alert created successfully',
      alert
    })

  } catch (err: any) {
    logger.error('Failed to create cost change alert', err)
    res.status(500).json({ error: 'Failed to create cost change alert' })
  }
})

// Get cost change statistics (admin only)
router.get('/cost-changes/statistics', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  // Check if user is admin
  const userResult = await pool.query(
    'SELECT role FROM users WHERE user_id = $1',
    [req.user.user_id]
  )

  if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' })
    return
  }

  try {
    const stats = await costChangeTrackingService.getCostChangeStatistics()
    res.json(stats)

  } catch (err: any) {
    logger.error('Failed to get cost change statistics', err)
    res.status(500).json({ error: 'Failed to get cost change statistics' })
  }
})

// Calculate financial health score (authenticated)
router.post('/financial-health-score', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const score = await financialHealthScoringService.calculateFinancialHealthScore(req.user.user_id)
    res.json({
      success: true,
      message: 'Financial health score calculated successfully',
      score
    })

  } catch (err: any) {
    logger.error('Failed to calculate financial health score', err)
    res.status(500).json({ error: 'Failed to calculate financial health score' })
  }
})

// Get financial health score (authenticated)
router.get('/financial-health-score', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const result = await pool.query(
      'SELECT * FROM financial_health_scores WHERE user_id = $1 ORDER BY calculated_at DESC LIMIT 1',
      [req.user.user_id]
    )

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'No financial health score found' })
      return
    }

    const score = result.rows[0]
    res.json({
      id: score.id,
      userId: score.user_id,
      overallScore: parseFloat(score.overall_score),
      scoreCategory: score.score_category,
      componentScores: {
        affordability: parseFloat(score.affordability_score),
        optimization: parseFloat(score.optimization_score),
        stability: parseFloat(score.stability_score),
        diversity: parseFloat(score.diversity_score),
        awareness: parseFloat(score.awareness_score),
      },
      factors: {
        totalSubscriptions: parseInt(score.total_subscriptions),
        totalAnnualCost: parseFloat(score.total_annual_cost),
        potentialSavings: parseFloat(score.potential_savings),
      },
      recommendations: JSON.parse(score.recommendations || '[]'),
      calculatedAt: score.calculated_at,
      nextReviewDate: score.next_review_date,
    })

  } catch (err: any) {
    logger.error('Failed to get financial health score', err)
    res.status(500).json({ error: 'Failed to get financial health score' })
  }
})

// Get financial health insights (authenticated)
router.get('/financial-health-insights', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const insights = await financialHealthScoringService.getFinancialHealthInsights(req.user.user_id)
    res.json(insights)

  } catch (err: any) {
    logger.error('Failed to get financial health insights', err)
    res.status(500).json({ error: 'Failed to get financial health insights' })
  }
})

// Get score history (authenticated)
router.get('/financial-health-score/history', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 12
    const history = await financialHealthScoringService.getScoreHistory(req.user.user_id, limit)
    res.json(history)

  } catch (err: any) {
    logger.error('Failed to get score history', err)
    res.status(500).json({ error: 'Failed to get score history' })
  }
})

// Get user financial summary (authenticated)
router.get('/financial-summary', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const result = await pool.query(
      'SELECT * FROM get_user_financial_summary($1)',
      [req.user.user_id]
    )

    if (result.rows.length === 0) {
      res.json({
        totalSubscriptions: 0,
        totalAnnualCost: 0,
        totalPotentialSavings: 0,
        savingsPercentage: 0,
        averageCostPerSubscription: 0,
        mostExpensiveSubscription: null,
        highestPotentialSavings: null,
        activeAlerts: 0,
        lastScore: null,
        scoreCategory: null,
      })
    } else {
      res.json(result.rows[0])
    }

  } catch (err: any) {
    logger.error('Failed to get financial summary', err)
    res.status(500).json({ error: 'Failed to get financial summary' })
  }
})

// Update user profile (authenticated)
router.put('/user-profile', authenticateToken, [
  body('estimatedAnnualIncome').optional().isNumeric().withMessage('Estimated annual income must be a number'),
  body('monthlyBudget').optional().isNumeric().withMessage('Monthly budget must be a number'),
  body('riskTolerance').optional().isIn(['conservative', 'moderate', 'aggressive']).withMessage('Invalid risk tolerance'),
  body('preferredSavingsMethod').optional().isString().withMessage('Preferred savings method must be a string'),
], async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }

  try {
    const {
      estimatedAnnualIncome,
      monthlyBudget,
      riskTolerance,
      preferredSavingsMethod,
    } = req.body

    await pool.query(`
      INSERT INTO user_profiles (
        user_id, estimated_annual_income, monthly_budget, risk_tolerance, preferred_savings_method
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id) 
      DO UPDATE SET
        estimated_annual_income = COALESCE(EXCLUDED.estimated_annual_income, user_profiles.estimated_annual_income),
        monthly_budget = COALESCE(EXCLUDED.monthly_budget, user_profiles.monthly_budget),
        risk_tolerance = COALESCE(EXCLUDED.risk_tolerance, user_profiles.risk_tolerance),
        preferred_savings_method = COALESCE(EXCLUDED.preferred_savings_method, user_profiles.preferred_savings_method),
        updated_at = NOW()
    `, [
      req.user.user_id,
      estimatedAnnualIncome,
      monthlyBudget,
      riskTolerance,
      preferredSavingsMethod,
    ])

    res.json({
      success: true,
      message: 'User profile updated successfully'
    })

  } catch (err: any) {
    logger.error('Failed to update user profile', err)
    res.status(500).json({ error: 'Failed to update user profile' })
  }
})

// Get user profile (authenticated)
router.get('/user-profile', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const result = await pool.query(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [req.user.user_id]
    )

    if (result.rows.length === 0) {
      res.json({
        estimatedAnnualIncome: null,
        monthlyBudget: null,
        riskTolerance: null,
        preferredSavingsMethod: null,
        financialGoals: {},
        notificationPreferences: {
          scoreUpdates: true,
          recommendations: true,
          trendAlerts: true,
          monthlyReports: true,
        },
      })
    } else {
      const profile = result.rows[0]
      res.json({
        estimatedAnnualIncome: profile.estimated_annual_income,
        monthlyBudget: profile.monthly_budget,
        riskTolerance: profile.risk_tolerance,
        preferredSavingsMethod: profile.preferred_savings_method,
        financialGoals: profile.financial_goals,
        notificationPreferences: profile.notification_preferences,
      })
    }

  } catch (err: any) {
    logger.error('Failed to get user profile', err)
    res.status(500).json({ error: 'Failed to get user profile' })
  }
})

// Log user activity (authenticated)
router.post('/activity', authenticateToken, [
  body('activityType').notEmpty().withMessage('Activity type is required'),
  body('activityData').optional().isObject().withMessage('Activity data must be an object'),
], async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }

  try {
    const activityId = await pool.query(
      'SELECT log_user_activity($1, $2, $3, $4, $5)',
      [
        req.user.user_id,
        req.body.activityType,
        JSON.stringify(req.body.activityData || {}),
        req.ip,
        req.get('User-Agent'),
      ]
    )

    res.json({
      success: true,
      message: 'Activity logged successfully',
      activityId: activityId.rows[0].log_user_activity,
    })

  } catch (err: any) {
    logger.error('Failed to log user activity', err)
    res.status(500).json({ error: 'Failed to log user activity' })
  }
})

// Get financial health analytics (admin only)
router.get('/financial-health-analytics', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  // Check if user is admin
  const userResult = await pool.query(
    'SELECT role FROM users WHERE user_id = $1',
    [req.user.user_id]
  )

  if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' })
    return
  }

  try {
    const [analyticsResult, distributionResult] = await Promise.all([
      pool.query('SELECT * FROM financial_health_analytics ORDER BY month DESC, score_category'),
      pool.query('SELECT * FROM score_distribution ORDER BY percentage DESC'),
    ])

    res.json({
      analytics: analyticsResult.rows,
      distribution: distributionResult.rows,
    })

  } catch (err: any) {
    logger.error('Failed to get financial health analytics', err)
    res.status(500).json({ error: 'Failed to get financial health analytics' })
  }
})

// Generate AI recommendations (authenticated)
router.post('/ai-recommendations', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const recommendations = await aiRecommendationService.generateRecommendations(req.user.user_id)
    res.json({
      success: true,
      message: 'AI recommendations generated successfully',
      recommendations,
      count: recommendations.length
    })

  } catch (err: any) {
    logger.error('Failed to generate AI recommendations', err)
    res.status(500).json({ error: 'Failed to generate AI recommendations' })
  }
})

// Get AI recommendations (authenticated)
router.get('/ai-recommendations', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const options = {
      type: req.query.type as string,
      priority: req.query.priority as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    }

    const recommendations = await aiRecommendationService.getRecommendations(req.user.user_id, options)
    res.json({
      recommendations,
      count: recommendations.length
    })

  } catch (err: any) {
    logger.error('Failed to get AI recommendations', err)
    res.status(500).json({ error: 'Failed to get AI recommendations' })
  }
})

// Update AI recommendation status (authenticated)
router.put('/ai-recommendations/:recommendationId/status', authenticateToken, [
  body('status').isIn(['active', 'implemented', 'dismissed', 'expired']).withMessage('Invalid status'),
  body('feedback').optional().isString().withMessage('Feedback must be a string'),
], async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }

  try {
    const { status, feedback } = req.body
    const { recommendationId } = req.params

    await aiRecommendationService.updateRecommendationStatus(recommendationId, status, feedback)
    
    res.json({
      success: true,
      message: 'Recommendation status updated successfully'
    })

  } catch (err: any) {
    logger.error('Failed to update AI recommendation status', err)
    res.status(500).json({ error: 'Failed to update recommendation status' })
  }
})

// Get AI recommendation analytics (authenticated)
router.get('/ai-recommendations/analytics', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const analytics = await aiRecommendationService.getRecommendationAnalytics(req.user.user_id)
    res.json(analytics)

  } catch (err: any) {
    logger.error('Failed to get AI recommendation analytics', err)
    res.status(500).json({ error: 'Failed to get recommendation analytics' })
  }
})

// Get AI recommendation performance metrics (admin only)
router.get('/ai-recommendations/metrics', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  // Check if user is admin
  const userResult = await pool.query(
    'SELECT role FROM users WHERE user_id = $1',
    [req.user.user_id]
  )

  if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' })
    return
  }

  try {
    const userId = req.query.userId as string
    const result = await pool.query(
      'SELECT * FROM get_ai_recommendation_metrics($1)',
      [userId || null]
    )

    res.json(result.rows[0] || {
      totalRecommendations: 0,
      implementedCount: 0,
      dismissedCount: 0,
      implementationRate: 0,
      averageConfidence: 0,
      totalActualSavings: 0,
      averageFeedbackRating: 0,
      topRecommendationType: null,
      bestPerformingType: null,
    })

  } catch (err: any) {
    logger.error('Failed to get AI recommendation metrics', err)
    res.status(500).json({ error: 'Failed to get recommendation metrics' })
  }
})

// Get user behavior patterns (authenticated)
router.get('/user-behavior-patterns', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const result = await pool.query(
      'SELECT * FROM get_user_behavior_patterns($1)',
      [req.user.user_id]
    )

    res.json(result.rows)

  } catch (err: any) {
    logger.error('Failed to get user behavior patterns', err)
    res.status(500).json({ error: 'Failed to get behavior patterns' })
  }
})

// Get market insights for AI (authenticated)
router.get('/market-insights-ai', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const categories = req.query.categories as string
    const result = await pool.query(
      'SELECT * FROM get_market_insights_for_ai($1)',
      [categories || null]
    )

    res.json(result.rows)

  } catch (err: any) {
    logger.error('Failed to get market insights for AI', err)
    res.status(500).json({ error: 'Failed to get market insights' })
  }
})

// Get contextual guidance (authenticated)
router.get('/contextual-guidance', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const options = {
      page: req.query.page as string,
      section: req.query.section as string,
      type: req.query.type as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    }

    const guidance = await contextualGuidanceService.getGuidanceItems(req.user.user_id, options)
    res.json({
      guidance,
      count: guidance.length
    })

  } catch (err: any) {
    logger.error('Failed to get contextual guidance', err)
    res.status(500).json({ error: 'Failed to get contextual guidance' })
  }
})

// Get user guidance state (authenticated)
router.get('/user-guidance-state', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const state = await contextualGuidanceService.getUserGuidanceState(req.user.user_id)
    res.json(state)

  } catch (err: any) {
    logger.error('Failed to get user guidance state', err)
    res.status(500).json({ error: 'Failed to get guidance state' })
  }
})

// Dismiss guidance item (authenticated)
router.post('/contextual-guidance/:itemId/dismiss', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const { itemId } = req.params
    await contextualGuidanceService.dismissGuidanceItem(req.user.user_id, itemId)
    
    res.json({
      success: true,
      message: 'Guidance item dismissed successfully'
    })

  } catch (err: any) {
    logger.error('Failed to dismiss guidance item', err)
    res.status(500).json({ error: 'Failed to dismiss guidance item' })
  }
})

// Complete guidance item (authenticated)
router.post('/contextual-guidance/:itemId/complete', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const { itemId } = req.params
    await contextualGuidanceService.completeGuidanceItem(req.user.user_id, itemId)
    
    res.json({
      success: true,
      message: 'Guidance item completed successfully'
    })

  } catch (err: any) {
    logger.error('Failed to complete guidance item', err)
    res.status(500).json({ error: 'Failed to complete guidance item' })
  }
})

// Handle guidance action (authenticated)
router.post('/contextual-guidance/:itemId/action', authenticateToken, [
  body('action').isString().withMessage('Action is required'),
], async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }

  try {
    const { itemId } = req.params
    const { action } = req.body

    await contextualGuidanceService.handleGuidanceAction(req.user.user_id, itemId, action)
    
    res.json({
      success: true,
      message: 'Guidance action handled successfully'
    })

  } catch (err: any) {
    logger.error('Failed to handle guidance action', err)
    res.status(500).json({ error: 'Failed to handle guidance action' })
  }
})

// Update guidance preferences (authenticated)
router.put('/user-guidance-preferences', authenticateToken, [
  body('showTips').optional().isBoolean().withMessage('showTips must be boolean'),
  body('showTutorials').optional().isBoolean().withMessage('showTutorials must be boolean'),
  body('showRecommendations').optional().isBoolean().withMessage('showRecommendations must be boolean'),
  body('frequency').optional().isIn(['high', 'medium', 'low']).withMessage('Invalid frequency'),
], async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }

  try {
    const preferences = {
      showTips: req.body.showTips,
      showTutorials: req.body.showTutorials,
      showRecommendations: req.body.showRecommendations,
      frequency: req.body.frequency,
    }

    await contextualGuidanceService.updateUserPreferences(req.user.user_id, preferences)
    
    res.json({
      success: true,
      message: 'Guidance preferences updated successfully'
    })

  } catch (err: any) {
    logger.error('Failed to update guidance preferences', err)
    res.status(500).json({ error: 'Failed to update guidance preferences' })
  }
})

// Generate contextual guidance (authenticated)
router.post('/contextual-guidance/generate', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    await contextualGuidanceService.generateContextualGuidance(req.user.user_id)
    
    res.json({
      success: true,
      message: 'Contextual guidance generated successfully'
    })

  } catch (err: any) {
    logger.error('Failed to generate contextual guidance', err)
    res.status(500).json({ error: 'Failed to generate contextual guidance' })
  }
})

// Get guidance analytics (admin only)
router.get('/contextual-guidance/analytics', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  // Check if user is admin
  const userResult = await pool.query(
    'SELECT role FROM users WHERE user_id = $1',
    [req.user.user_id]
  )

  if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' })
    return
  }

  try {
    const options = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      type: req.query.type as string,
    }

    const analytics = await contextualGuidanceService.getGuidanceAnalytics(options)
    res.json(analytics)

  } catch (err: any) {
    logger.error('Failed to get guidance analytics', err)
    res.status(500).json({ error: 'Failed to get guidance analytics' })
  }
})

// Create guidance item (admin only)
router.post('/contextual-guidance', authenticateToken, [
  body('type').isIn(['tip', 'warning', 'success', 'info', 'tutorial', 'recommendation']).withMessage('Invalid type'),
  body('title').isString().min(1).withMessage('Title is required'),
  body('description').isString().min(1).withMessage('Description is required'),
  body('context').isObject().withMessage('Context must be an object'),
  body('priority').isIn(['high', 'medium', 'low']).withMessage('Invalid priority'),
  body('actionable').isBoolean().withMessage('Actionable must be boolean'),
], async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  // Check if user is admin
  const userResult = await pool.query(
    'SELECT role FROM users WHERE user_id = $1',
    [req.user.user_id]
  )

  if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' })
    return
  }

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() })
    return
  }

  try {
    const guidanceItem = {
      type: req.body.type,
      title: req.body.title,
      description: req.body.description,
      context: req.body.context,
      priority: req.body.priority,
      actionable: req.body.actionable,
      actions: req.body.actions || [],
      timing: req.body.timing || { showAfter: 0, cooldown: 0 },
      targeting: req.body.targeting || {},
      content: req.body.content || {},
      status: 'active'
    }

    const id = await contextualGuidanceService.createGuidanceItem(guidanceItem)
    
    res.json({
      success: true,
      message: 'Guidance item created successfully',
      id
    })

  } catch (err: any) {
    logger.error('Failed to create guidance item', err)
    res.status(500).json({ error: 'Failed to create guidance item' })
  }
})

export default router
