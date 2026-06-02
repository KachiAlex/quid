import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { pool } from '../db'
import { authenticateToken } from '../middleware/auth'
import { logger } from '../config/logger'
import { generateAffiliateLink, calculateCommission, getCommissionRate } from '../services/affiliate'

const router = Router()

// Record switch intent
router.post(
  '/intent',
  authenticateToken,
  [
    body('productRecordId').isUUID(),
    body('fromProvider').notEmpty(),
    body('toProvider').notEmpty(),
    body('saving').isNumeric(),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() })
      return
    }

    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const { productRecordId, fromProvider, toProvider, saving } = req.body

    try {
      // Verify product record belongs to user and get product type
      const productCheck = await pool.query(
        'SELECT record_id, product_type FROM product_records WHERE record_id = $1 AND user_id = $2',
        [productRecordId, req.user.user_id]
      )

      if (productCheck.rows.length === 0) {
        res.status(404).json({ error: 'Product record not found' })
        return
      }

      const productType = productCheck.rows[0].product_type

      // Generate unique tracking ID
      const affiliateRef = `quid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Calculate commission
      const commissionRate = await getCommissionRate(toProvider, productType)
      const commission = calculateCommission(Number(saving), commissionRate)

      // Generate affiliate link
      const affiliateLink = await generateAffiliateLink(toProvider, productType, affiliateRef)

      // Record switch intent
      const result = await pool.query(
        `INSERT INTO switch_events
         (user_id, product_record_id, from_provider, to_provider, saving,
          commission_gross, commission_net, affiliate_ref, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'initiated', NOW())
         RETURNING event_id, affiliate_ref`,
        [
          req.user.user_id,
          productRecordId,
          fromProvider,
          toProvider,
          saving,
          commission.gross,
          commission.net,
          affiliateRef,
        ]
      )

      logger.info('Switch intent recorded', {
        userId: req.user.user_id,
        event_id: result.rows[0].event_id,
        affiliateRef: result.rows[0].affiliate_ref,
        commissionGross: commission.gross,
        commissionNet: commission.net,
      })

      res.json({
        eventId: result.rows[0].event_id,
        affiliateRef: result.rows[0].affiliate_ref,
        affiliateLink,
        commissionRate,
        estimatedCommission: commission.gross,
      })
    } catch (err) {
      logger.error('Switch intent recording failed', err)
      res.status(500).json({ error: 'Failed to record switch intent' })
    }
  }
)

// Confirm switch (called by affiliate webhook)
router.post('/confirm', async (req, res) => {
  const { affiliateRef, commissionGross, commissionNet } = req.body

  try {
    const result = await pool.query(
      `UPDATE switch_events 
       SET status = 'confirmed', 
           commission_gross = $1,
           commission_net = $2,
           confirmed_at = NOW()
       WHERE affiliate_ref = $3 AND status = 'initiated'
       RETURNING event_id, user_id`,
      [commissionGross, commissionNet, affiliateRef]
    )

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Switch intent not found or already confirmed' })
      return
    }

    logger.info('Switch confirmed', {
      eventId: result.rows[0].event_id,
      affiliateRef,
      commissionGross,
    })

    res.json({ message: 'Switch confirmed', eventId: result.rows[0].event_id })
  } catch (err) {
    logger.error('Switch confirmation failed', err)
    res.status(500).json({ error: 'Failed to confirm switch' })
  }
})

// Get user's switch history
router.get('/history', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const result = await pool.query(
      `SELECT event_id, from_provider, to_provider, saving, 
              commission_gross, commission_net, status, created_at, confirmed_at
       FROM switch_events 
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.user_id]
    )

    res.json({ switches: result.rows })
  } catch (err) {
    logger.error('Switch history fetch failed', err)
    res.status(500).json({ error: 'Failed to fetch switch history' })
  }
})

export default router
