/**
 * Renewal Detection Algorithm
 * Analyzes product records and transaction patterns to detect upcoming renewals
 */

import { pool } from '../db'
import { logger } from '../config/logger'

interface RenewalAlert {
  productRecordId: string
  userId: string
  productType: string
  providerName: string
  expectedRenewalDate: Date
  currentCost: number
  daysUntilRenewal: number
  alertType: '60_day' | '14_day' | 'price_hike'
}

/**
 * Detect upcoming renewals for all active products
 * This should be run daily to check for products approaching renewal
 */
export async function detectUpcomingRenewals(): Promise<RenewalAlert[]> {
  const client = await pool.connect()
  const alerts: RenewalAlert[] = []

  try {
    await client.query('BEGIN')

    // Get all active products with their transaction history
    const productsResult = await client.query(
      `SELECT 
        pr.record_id,
        pr.user_id,
        pr.product_type,
        pr.provider_name,
        pr.annual_cost,
        pr.frequency,
        pr.created_at,
        pr.last_detected_at
       FROM product_records pr
       WHERE pr.excluded = false
       ORDER BY pr.user_id, pr.created_at DESC`
    )

    for (const product of productsResult.rows) {
      const renewalDate = calculateRenewalDate(
        product.created_at,
        product.last_detected_at,
        product.frequency
      )

      if (!renewalDate) {
        continue
      }

      const daysUntilRenewal = Math.ceil(
        (renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )

      // Check if we need to create an alert
      let alertType: RenewalAlert['alertType'] | null = null

      if (daysUntilRenewal === 60 || (daysUntilRenewal <= 60 && daysUntilRenewal > 14)) {
        alertType = '60_day'
      } else if (daysUntilRenewal === 14 || (daysUntilRenewal <= 14 && daysUntilRenewal > 0)) {
        alertType = '14_day'
      }

      if (alertType) {
        // Check if we already have an alert for this product and type
        const existingAlert = await client.query(
          `SELECT alert_id FROM renewal_alerts
           WHERE product_record_id = $1 AND alert_type = $2
           AND created_at > NOW() - INTERVAL '30 days'`,
          [product.record_id, alertType]
        )

        if (existingAlert.rows.length === 0) {
          const alert: RenewalAlert = {
            productRecordId: product.record_id,
            userId: product.user_id,
            productType: product.product_type,
            providerName: product.provider_name,
            expectedRenewalDate: renewalDate,
            currentCost: parseFloat(product.annual_cost),
            daysUntilRenewal,
            alertType,
          }

          alerts.push(alert)

          // Insert alert into database
          await client.query(
            `INSERT INTO renewal_alerts 
             (product_record_id, user_id, alert_type, expected_renewal_date, 
              current_cost, days_until_renewal, status, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())`,
            [
              alert.productRecordId,
              alert.userId,
              alert.alertType,
              alert.expectedRenewalDate,
              alert.currentCost,
              alert.daysUntilRenewal,
            ]
          )
        }
      }
    }

    await client.query('COMMIT')

    logger.info(`Renewal detection completed. Found ${alerts.length} new alerts.`, {
      alertCount: alerts.length,
    })

    return alerts
  } catch (err) {
    await client.query('ROLLBACK')
    logger.error('Renewal detection failed', err)
    throw err
  } finally {
    client.release()
  }
}

/**
 * Calculate the next renewal date based on product detection date and frequency
 */
function calculateRenewalDate(
  createdAt: Date,
  lastDetectedAt: Date | null,
  frequency: string
): Date | null {
  const startDate = new Date(lastDetectedAt || createdAt)
  const now = new Date()

  switch (frequency.toLowerCase()) {
    case 'annual':
    case 'yearly':
      // Renewal is 1 year from start date
      const annualRenewal = new Date(startDate)
      annualRenewal.setFullYear(annualRenewal.getFullYear() + 1)
      return annualRenewal

    case 'monthly':
      // For monthly, we check if there's a pattern of same-day payments
      // For now, assume renewal is 1 year from first detection
      const monthlyRenewal = new Date(startDate)
      monthlyRenewal.setFullYear(monthlyRenewal.getFullYear() + 1)
      return monthlyRenewal

    case 'quarterly':
      const quarterlyRenewal = new Date(startDate)
      quarterlyRenewal.setMonth(quarterlyRenewal.getMonth() + 3)
      return quarterlyRenewal

    case 'weekly':
      // Weekly subscriptions usually don't have formal renewals
      // But we can flag them at 1 year
      const weeklyRenewal = new Date(startDate)
      weeklyRenewal.setFullYear(weeklyRenewal.getFullYear() + 1)
      return weeklyRenewal

    default:
      // Default to annual
      const defaultRenewal = new Date(startDate)
      defaultRenewal.setFullYear(defaultRenewal.getFullYear() + 1)
      return defaultRenewal
  }
}

/**
 * Detect price hikes by comparing current cost with previous costs
 */
export async function detectPriceHikes(): Promise<RenewalAlert[]> {
  const client = await pool.connect()
  const alerts: RenewalAlert[] = []

  try {
    await client.query('BEGIN')

    // Find products where the cost has increased by more than 10%
    const priceHikesResult = await client.query(
      `SELECT 
        pr.record_id,
        pr.user_id,
        pr.product_type,
        pr.provider_name,
        pr.annual_cost as current_cost,
        cr.annual_cost as previous_cost,
        ((pr.annual_cost - cr.annual_cost) / cr.annual_cost * 100) as increase_percent
       FROM product_records pr
       JOIN comparison_results cr ON pr.record_id = cr.product_record_id
       WHERE pr.excluded = false
       AND cr.annual_cost > 0
       AND ((pr.annual_cost - cr.annual_cost) / cr.annual_cost * 100) > 10
       AND pr.last_detected_at > cr.created_at`
    )

    for (const hike of priceHikesResult.rows) {
      const existingAlert = await client.query(
        `SELECT alert_id FROM renewal_alerts
         WHERE product_record_id = $1 AND alert_type = 'price_hike'
         AND created_at > NOW() - INTERVAL '30 days'`,
        [hike.record_id]
      )

      if (existingAlert.rows.length === 0) {
        const alert: RenewalAlert = {
          productRecordId: hike.record_id,
          userId: hike.user_id,
          productType: hike.product_type,
          providerName: hike.provider_name,
          expectedRenewalDate: new Date(),
          currentCost: parseFloat(hike.current_cost),
          daysUntilRenewal: 0,
          alertType: 'price_hike',
        }

        alerts.push(alert)

        await client.query(
          `INSERT INTO renewal_alerts 
           (product_record_id, user_id, alert_type, expected_renewal_date, 
            current_cost, days_until_renewal, status, created_at)
           VALUES ($1, $2, 'price_hike', NOW(), $3, 0, 'pending', NOW())`,
          [alert.productRecordId, alert.userId, alert.currentCost]
        )
      }
    }

    await client.query('COMMIT')

    logger.info(`Price hike detection completed. Found ${alerts.length} new alerts.`, {
      alertCount: alerts.length,
    })

    return alerts
  } catch (err) {
    await client.query('ROLLBACK')
    logger.error('Price hike detection failed', err)
    throw err
  } finally {
    client.release()
  }
}

/**
 * Main renewal detection job
 * Should be run daily
 */
export async function runRenewalDetectionJob(): Promise<void> {
  logger.info('Starting renewal detection job')

  try {
    // Detect upcoming renewals
    const renewalAlerts = await detectUpcomingRenewals()

    // Detect price hikes
    const priceHikeAlerts = await detectPriceHikes()

    const totalAlerts = renewalAlerts.length + priceHikeAlerts.length

    logger.info('Renewal detection job completed', {
      renewalAlerts: renewalAlerts.length,
      priceHikeAlerts: priceHikeAlerts.length,
      totalAlerts,
    })
  } catch (err) {
    logger.error('Renewal detection job failed', err)
    throw err
  }
}
