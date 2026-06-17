/**
 * Price Hike Monitoring Service
 * Monitors price increases greater than 10% and provides alerts
 */

import { pool } from '../db'
import { logger } from '../config/logger'
import { emailAlertService } from './emailAlertService'

interface PriceHikeAlert {
  id: string
  userId: string
  recordId: string
  providerName: string
  productType: string
  oldCost: number
  newCost: number
  percentageIncrease: number
  actualIncrease: number
  detectedAt: Date
  alertSent: boolean
  userNotified: boolean
}

interface PriceHikeStatistics {
  totalPriceHikes: number
  averageIncrease: number
  totalIncrease: number
  hikesByProvider: Record<string, number>
  hikesByProductType: Record<string, number>
  monthlyTrend: Array<{
    month: string
    count: number
    averageIncrease: number
  }>
}

class PriceHikeMonitoring {
  /**
   * Detect price hikes across all products
   */
  async detectPriceHikes(): Promise<PriceHikeAlert[]> {
    try {
      const query = `
        SELECT 
          pr.record_id,
          pr.user_id,
          pr.provider_name,
          pr.product_type,
          pr.annual_cost,
          pr.last_updated,
          u.email,
          u.first_name,
          u.email_preferences
        FROM product_records pr
        JOIN users u ON pr.user_id = u.user_id
        WHERE pr.status = 'active'
          AND pr.annual_cost IS NOT NULL
      `

      const result = await pool.query(query)
      const priceHikes: PriceHikeAlert[] = []

      for (const record of result.rows) {
        const hike = await this.detectPriceHikeForProduct(record)
        if (hike) {
          priceHikes.push(hike)
        }
      }

      logger.info('Price hike detection completed', {
        totalProducts: result.rows.length,
        priceHikesDetected: priceHikes.length,
      })

      return priceHikes

    } catch (error) {
      logger.error('Failed to detect price hikes', error)
      throw error
    }
  }

  /**
   * Detect price hike for a specific product
   */
  private async detectPriceHikeForProduct(product: any): Promise<PriceHikeAlert | null> {
    try {
      // Get historical cost data
      const historyQuery = `
        SELECT annual_cost, recorded_at
        FROM product_cost_history
        WHERE record_id = $1
        ORDER BY recorded_at DESC
        LIMIT 2
      `

      const historyResult = await pool.query(historyQuery, [product.record_id])

      if (historyResult.rows.length < 2) {
        return null // Not enough historical data
      }

      const currentCost = parseFloat(product.annual_cost)
      const previousCost = parseFloat(historyResult.rows[1].annual_cost)

      if (previousCost === 0) {
        return null // Invalid previous cost
      }

      const percentageIncrease = ((currentCost - previousCost) / previousCost) * 100
      const actualIncrease = currentCost - previousCost

      // Only alert for increases greater than 10%
      if (percentageIncrease <= 10) {
        return null
      }

      // Check if we've already alerted about this price hike
      const existingAlertQuery = `
        SELECT id FROM price_hike_alerts
        WHERE record_id = $1
          AND old_cost = $2
          AND new_cost = $3
          AND detected_at > NOW() - INTERVAL '7 days'
      `

      const existingAlertResult = await pool.query(existingAlertQuery, [
        product.record_id,
        previousCost,
        currentCost,
      ])

      if (existingAlertResult.rows.length > 0) {
        return null // Already alerted about this price hike
      }

      return {
        id: '', // Will be set when stored
        userId: product.user_id,
        recordId: product.record_id,
        providerName: product.provider_name,
        productType: product.product_type,
        oldCost: previousCost,
        newCost: currentCost,
        percentageIncrease,
        actualIncrease,
        detectedAt: new Date(),
        alertSent: false,
        userNotified: false,
      }

    } catch (error) {
      logger.error('Failed to detect price hike for product', error)
      return null
    }
  }

  /**
   * Store price hike alerts in database
   */
  async storePriceHikeAlerts(alerts: PriceHikeAlert[]): Promise<void> {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      for (const alert of alerts) {
        const result = await client.query(
          `INSERT INTO price_hike_alerts 
           (user_id, record_id, provider_name, product_type, old_cost, new_cost, 
            percentage_increase, actual_increase, detected_at, alert_sent, user_notified)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING id`,
          [
            alert.userId,
            alert.recordId,
            alert.providerName,
            alert.productType,
            alert.oldCost,
            alert.newCost,
            alert.percentageIncrease,
            alert.actualIncrease,
            alert.detectedAt,
            alert.alertSent,
            alert.userNotified,
          ]
        )

        alert.id = result.rows[0].id
      }

      await client.query('COMMIT')

      logger.info('Price hike alerts stored', {
        alertCount: alerts.length,
      })

    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('Failed to store price hike alerts', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Send price hike alert emails
   */
  async sendPriceHikeAlerts(): Promise<{
    sent: number
    failed: number
    skipped: number
  }> {
    try {
      // Get unsent price hike alerts
      const query = `
        SELECT 
          pha.*,
          u.email,
          u.first_name,
          u.email_preferences
        FROM price_hike_alerts pha
        JOIN users u ON pha.user_id = u.user_id
        WHERE pha.alert_sent = false
        ORDER BY pha.detected_at ASC
      `

      const result = await pool.query(query)
      const alerts = result.rows

      let sent = 0
      let failed = 0
      let skipped = 0

      for (const alert of alerts) {
        try {
          // Check email preferences
          const emailPrefs = alert.email_preferences || {}
          if (!emailPrefs.price_hike_alerts) {
            logger.info('User has opted out of price hike alerts', { userId: alert.user_id })
            skipped++
            continue
          }

          // Send price hike email
          await this.sendPriceHikeEmail(alert)
          sent++

          // Mark alert as sent
          await this.markAlertAsSent(alert.id)

        } catch (error) {
          logger.error('Failed to send price hike alert', {
            alertId: alert.id,
            error: error.message
          })
          failed++
        }
      }

      logger.info('Price hike alert sending completed', {
        total: alerts.length,
        sent,
        failed,
        skipped,
      })

      return { sent, failed, skipped }

    } catch (error) {
      logger.error('Failed to send price hike alerts', error)
      throw error
    }
  }

  /**
   * Send price hike email
   */
  private async sendPriceHikeEmail(alert: any): Promise<void> {
    try {
      const subject = `🚨 Price Alert: ${alert.provider_name} increased prices by ${alert.percentage_increase.toFixed(1)}%`
      
      const htmlBody = this.generatePriceHikeEmailHtml(alert)
      const textBody = this.generatePriceHikeEmailText(alert)

      // In a real implementation, this would use an email service
      logger.info('Sending price hike email', {
        to: alert.email,
        subject,
        percentageIncrease: alert.percentage_increase,
      })

      // Simulate email sending
      await this.simulateEmailSend(alert.email, { subject, htmlBody, textBody })

    } catch (error) {
      logger.error('Failed to send price hike email', error)
      throw error
    }
  }

  /**
   * Generate HTML email for price hike
   */
  private generatePriceHikeEmailHtml(alert: any): string {
    const increaseAmount = alert.actual_increase.toFixed(2)
    const increasePercentage = alert.percentage_increase.toFixed(1)
    const oldCost = alert.old_cost.toFixed(2)
    const newCost = alert.new_cost.toFixed(2)

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${alert.provider_name} Price Increase Alert</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <!-- Header -->
          <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; color: #1e293b;">Quid</h1>
            <p style="margin: 8px 0 0 0; color: #64748b; font-size: 14px;">Your Subscription Management Assistant</p>
          </div>

          <!-- Alert Banner -->
          <div style="background: #dc2626; color: white; padding: 16px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
            <div style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">🚨 Price Increase Detected</div>
            <div style="opacity: 0.9;">${alert.product_type} • ${alert.provider_name}</div>
          </div>

          <!-- Main Content -->
          <div style="background: white; padding: 24px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
            <h2 style="margin: 0 0 16px 0; color: #1e293b;">Your ${alert.product_type} price has increased!</h2>
            
            <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div>
                  <div style="color: #7f1d1d; font-size: 14px; margin-bottom: 4px;">Previous Cost</div>
                  <div style="font-weight: 600; color: #1e293b;">£${oldCost}/year</div>
                </div>
                <div>
                  <div style="color: #7f1d1d; font-size: 14px; margin-bottom: 4px;">New Cost</div>
                  <div style="font-weight: 600; color: #dc2626;">£${newCost}/year</div>
                </div>
                <div>
                  <div style="color: #7f1d1d; font-size: 14px; margin-bottom: 4px;">Increase Amount</div>
                  <div style="font-weight: 600; color: #dc2626;">£${increaseAmount}/year</div>
                </div>
                <div>
                  <div style="color: #7f1d1d; font-size: 14px; margin-bottom: 4px;">Increase Percentage</div>
                  <div style="font-weight: 600; color: #dc2626;">+${increasePercentage}%</div>
                </div>
              </div>
            </div>

            <div style="margin-bottom: 20px;">
              <h3 style="margin: 0 0 12px 0; color: #1e293b;">💡 What can you do?</h3>
              <ul style="color: #475569; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Compare prices from other providers</li>
                <li style="margin-bottom: 8px;">Check if you're still getting value for money</li>
                <li style="margin-bottom: 8px;">Consider switching to a better deal</li>
                <li>Contact your current provider to discuss the increase</li>
              </ul>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.BASE_URL || 'https://quid.app'}/compare/${alert.record_id}" 
                 style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Compare Better Deals
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align: center; color: #64748b; font-size: 12px; margin-top: 24px;">
            <p>This is an automated message from Quid. You can manage your email preferences in your account settings.</p>
            <p style="margin-top: 8px;">© 2024 Quid. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Generate text email for price hike
   */
  private generatePriceHikeEmailText(alert: any): string {
    const increaseAmount = alert.actual_increase.toFixed(2)
    const increasePercentage = alert.percentage_increase.toFixed(1)
    const oldCost = alert.old_cost.toFixed(2)
    const newCost = alert.new_cost.toFixed(2)

    return `
🚨 Price Increase Alert - ${alert.provider_name}

Your ${alert.product_type} price has increased!

Previous Cost: £${oldCost}/year
New Cost: £${newCost}/year
Increase Amount: £${increaseAmount}/year
Increase Percentage: +${increasePercentage}%

What can you do?
• Compare prices from other providers
• Check if you're still getting value for money
• Consider switching to a better deal
• Contact your current provider to discuss the increase

Compare better deals: ${process.env.BASE_URL || 'https://quid.app'}/compare/${alert.record_id}

This is an automated message from Quid. You can manage your email preferences in your account settings.
© 2024 Quid. All rights reserved.
    `
  }

  /**
   * Simulate email sending (for development)
   */
  private async simulateEmailSend(to: string, template: any): Promise<void> {
    logger.info('Price hike email sent (simulated)', {
      to,
      subject: template.subject,
      bodyLength: template.htmlBody.length,
    })

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  /**
   * Mark alert as sent
   */
  private async markAlertAsSent(alertId: string): Promise<void> {
    await pool.query(
      'UPDATE price_hike_alerts SET alert_sent = true, sent_at = NOW() WHERE id = $1',
      [alertId]
    )
  }

  /**
   * Get price hike statistics
   */
  async getPriceHikeStatistics(dateRange?: { from: Date; to: Date }): Promise<PriceHikeStatistics> {
    try {
      let whereClause = 'WHERE 1=1'
      const params: any[] = []

      if (dateRange) {
        whereClause += ' AND detected_at >= $1 AND detected_at <= $2'
        params.push(dateRange.from, dateRange.to)
      }

      const query = `
        SELECT 
          COUNT(*) as total_price_hikes,
          AVG(percentage_increase) as average_increase,
          SUM(actual_increase) as total_increase
        FROM price_hike_alerts
        ${whereClause}
      `

      const result = await pool.query(query, params)
      const stats = result.rows[0]

      // Get breakdown by provider
      const providerQuery = `
        SELECT provider_name, COUNT(*) as count
        FROM price_hike_alerts
        ${whereClause}
        GROUP BY provider_name
        ORDER BY count DESC
      `

      const providerResult = await pool.query(providerQuery, params)
      const hikesByProvider = providerResult.rows.reduce((acc, row) => {
        acc[row.provider_name] = parseInt(row.count)
        return acc
      }, {} as Record<string, number>)

      // Get breakdown by product type
      const productTypeQuery = `
        SELECT product_type, COUNT(*) as count
        FROM price_hike_alerts
        ${whereClause}
        GROUP BY product_type
        ORDER BY count DESC
      `

      const productTypeResult = await pool.query(productTypeQuery, params)
      const hikesByProductType = productTypeResult.rows.reduce((acc, row) => {
        acc[row.product_type] = parseInt(row.count)
        return acc
      }, {} as Record<string, number>)

      // Get monthly trend
      const trendQuery = `
        SELECT 
          DATE_TRUNC('month', detected_at) as month,
          COUNT(*) as count,
          AVG(percentage_increase) as average_increase
        FROM price_hike_alerts
        ${whereClause}
        GROUP BY DATE_TRUNC('month', detected_at)
        ORDER BY month DESC
        LIMIT 12
      `

      const trendResult = await pool.query(trendQuery, params)
      const monthlyTrend = trendResult.rows.map(row => ({
        month: row.month.toISOString().split('T')[0],
        count: parseInt(row.count),
        averageIncrease: parseFloat(row.average_increase),
      }))

      return {
        totalPriceHikes: parseInt(stats.total_price_hikes),
        averageIncrease: parseFloat(stats.average_increase) || 0,
        totalIncrease: parseFloat(stats.total_increase) || 0,
        hikesByProvider,
        hikesByProductType,
        monthlyTrend,
      }

    } catch (error) {
      logger.error('Failed to get price hike statistics', error)
      throw error
    }
  }

  /**
   * Get user price hike alerts
   */
  async getUserPriceHikeAlerts(userId: string): Promise<PriceHikeAlert[]> {
    try {
      const query = `
        SELECT 
          id,
          user_id,
          record_id,
          provider_name,
          product_type,
          old_cost,
          new_cost,
          percentage_increase,
          actual_increase,
          detected_at,
          alert_sent,
          user_notified
        FROM price_hike_alerts
        WHERE user_id = $1
        ORDER BY detected_at DESC
      `

      const result = await pool.query(query, [userId])

      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        recordId: row.record_id,
        providerName: row.provider_name,
        productType: row.product_type,
        oldCost: parseFloat(row.old_cost),
        newCost: parseFloat(row.new_cost),
        percentageIncrease: parseFloat(row.percentage_increase),
        actualIncrease: parseFloat(row.actual_increase),
        detectedAt: row.detected_at,
        alertSent: row.alert_sent,
        userNotified: row.user_notified,
      }))

    } catch (error) {
      logger.error('Failed to get user price hike alerts', error)
      throw error
    }
  }

  /**
   * Cleanup old price hike alerts
   */
  async cleanupOldAlerts(daysToKeep: number = 365): Promise<number> {
    try {
      const result = await pool.query(
        `DELETE FROM price_hike_alerts 
         WHERE detected_at < NOW() - INTERVAL '${daysToKeep} days'
         RETURNING id`,
        []
      )

      const deletedCount = result.rows.length

      logger.info('Cleaned up old price hike alerts', {
        deletedCount,
        daysToKeep
      })

      return deletedCount

    } catch (error) {
      logger.error('Failed to cleanup old price hike alerts', error)
      throw error
    }
  }
}

// Export singleton instance
export const priceHikeMonitoring = new PriceHikeMonitoring()

// Export types for use in other modules
export type {
  PriceHikeAlert,
  PriceHikeStatistics,
}
