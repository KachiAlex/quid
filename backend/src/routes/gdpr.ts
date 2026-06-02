import { Router } from 'express'
import { authenticateToken } from '../middleware/auth'
import { logger } from '../config/logger'
import { pool } from '../db'
import { decryptUserPII } from '../services/encryption'

const router = Router()

/**
 * GET /api/gdpr/export
 * GDPR Right to Data Portability
 * Exports all user data in a structured, machine-readable format (JSON)
 */
router.get('/export', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const userId = req.user.user_id
  const exportTimestamp = new Date().toISOString()

  try {
    logger.info('Starting GDPR data export', { userId })

    // User profile data
    const userResult = await pool.query(
      `SELECT user_id, email, first_name, last_name, phone_number,
              address, postcode, city, date_of_birth, gender,
              email_verified, mfa_enabled, biometric_enabled, created_at, updated_at
       FROM users WHERE user_id = $1`,
      [userId]
    )
    const userData = userResult.rows[0] ? decryptUserPII(userResult.rows[0]) : null

    // Bank connections
    const bankConnectionsResult = await pool.query(
      `SELECT connection_id, provider_id, provider_name, status,
              connected_at, last_synced_at, consent_expires_at, created_at
       FROM bank_connections WHERE user_id = $1`,
      [userId]
    )

    // Transactions
    const transactionsResult = await pool.query(
      `SELECT transaction_id, bank_connection_id, external_id,
              description, amount, currency, transaction_date,
              merchant_name, category, created_at
       FROM transactions WHERE user_id = $1
       ORDER BY transaction_date DESC
       LIMIT 10000`,
      [userId]
    )

    // Product records
    const productsResult = await pool.query(
      `SELECT record_id, product_type, provider_name, annual_cost,
              frequency, confidence_score, excluded, created_at, last_detected_at
       FROM product_records WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    )

    // Comparison results
    const comparisonsResult = await pool.query(
      `SELECT cr.comparison_id, cr.product_record_id, cr.best_provider,
              cr.best_cost, cr.saving, cr.created_at, pr.product_type
       FROM comparison_results cr
       JOIN product_records pr ON cr.product_record_id = pr.record_id
       WHERE pr.user_id = $1
       ORDER BY cr.created_at DESC`,
      [userId]
    )

    // Switch events
    const switchesResult = await pool.query(
      `SELECT event_id, product_record_id, from_provider, to_provider,
              saving, commission_gross, commission_net, affiliate_ref,
              status, created_at, confirmed_at
       FROM switch_events WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    )

    // Renewal alerts
    const alertsResult = await pool.query(
      `SELECT alert_id, product_record_id, alert_type, expected_renewal_date,
              current_cost, days_until_renewal, status, created_at
       FROM renewal_alerts WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    )

    // Refresh tokens (metadata only)
    const tokensResult = await pool.query(
      `SELECT token_id, user_agent, ip_address, created_at, expires_at
       FROM refresh_tokens WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    )

    const exportData = {
      export_metadata: {
        exported_at: exportTimestamp,
        user_id: userId,
        format_version: '1.0',
        description: 'Quid GDPR Data Export - Right to Data Portability',
      },
      user_profile: userData,
      bank_connections: bankConnectionsResult.rows,
      transactions: transactionsResult.rows,
      product_records: productsResult.rows,
      comparison_results: comparisonsResult.rows,
      switch_events: switchesResult.rows,
      renewal_alerts: alertsResult.rows,
      refresh_tokens: tokensResult.rows,
    }

    logger.info('GDPR data export completed', { userId })

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="quid-data-export-${userId}-${exportTimestamp.split('T')[0]}.json"`)
    res.json(exportData)
  } catch (err) {
    logger.error('GDPR data export failed', { userId, err })
    res.status(500).json({ error: 'Failed to export data' })
  }
})

/**
 * POST /api/gdpr/request-deletion
 * GDPR Right to Erasure - initiates account deletion process
 */
router.post('/request-deletion', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  res.json({
    message: 'Account deletion request received. Use Settings > Account > Delete Account to complete.',
  })
})

export default router
