/**
 * Renewal Detection Service
 * Identifies upcoming renewals and provides timely alerts
 */

import { pool } from '../db'
import { logger } from '../config/logger'

interface RenewalAlert {
  userId: string
  recordId: string
  providerName: string
  productType: string
  renewalDate: Date
  daysUntilRenewal: number
  annualCost: number
  alertType: '60_day' | '14_day' | 'imminent' | 'overdue'
  currentTariff?: string
  bestAlternatives?: Array<{
    providerName: string
    annualCost: number
    potentialSavings: number
    savingsPercentage: number
    rating?: number
    features?: string[]
    affiliateUrl?: string
  }>
  priceHikeDetected?: boolean
  priceHikePercentage?: number
}

interface RenewalStatistics {
  totalRenewals: number
  upcomingRenewals: number
  overdueRenewals: number
  totalPotentialSavings: number
  averagePriceHike: number
  productTypeBreakdown: Record<string, number>
}

class RenewalDetection {
  /**
   * Detect upcoming renewals for all users
   */
  async detectUpcomingRenewals(): Promise<RenewalAlert[]> {
    try {
      const query = `
        SELECT 
          pr.record_id,
          pr.user_id,
          pr.provider_name,
          pr.product_type,
          pr.annual_cost,
          pr.tariff_name,
          pr.contract_end_date,
          pr.last_updated,
          pr.status,
          u.email,
          u.first_name,
          u.last_name
        FROM product_records pr
        JOIN users u ON pr.user_id = u.user_id
        WHERE pr.status = 'active'
          AND pr.contract_end_date IS NOT NULL
          AND pr.contract_end_date <= NOW() + INTERVAL '60 days'
        ORDER BY pr.contract_end_date ASC
      `

      const result = await pool.query(query)
      const alerts: RenewalAlert[] = []

      for (const record of result.rows) {
        const alert = await this.createRenewalAlert(record)
        if (alert) {
          alerts.push(alert)
        }
      }

      logger.info('Renewal detection completed', {
        totalAlerts: alerts.length,
        dateRange: 'Next 60 days'
      })

      return alerts

    } catch (error) {
      logger.error('Failed to detect upcoming renewals', error)
      throw error
    }
  }

  /**
   * Detect renewals for a specific user
   */
  async detectUserRenewals(userId: string): Promise<RenewalAlert[]> {
    try {
      const query = `
        SELECT 
          pr.record_id,
          pr.user_id,
          pr.provider_name,
          pr.product_type,
          pr.annual_cost,
          pr.tariff_name,
          pr.contract_end_date,
          pr.last_updated,
          pr.status,
          u.email,
          u.first_name,
          u.last_name
        FROM product_records pr
        JOIN users u ON pr.user_id = u.user_id
        WHERE pr.user_id = $1
          AND pr.status = 'active'
          AND pr.contract_end_date IS NOT NULL
          AND pr.contract_end_date <= NOW() + INTERVAL '60 days'
        ORDER BY pr.contract_end_date ASC
      `

      const result = await pool.query(query, [userId])
      const alerts: RenewalAlert[] = []

      for (const record of result.rows) {
        const alert = await this.createRenewalAlert(record)
        if (alert) {
          alerts.push(alert)
        }
      }

      return alerts

    } catch (error) {
      logger.error('Failed to detect user renewals', error)
      throw error
    }
  }

  /**
   * Create renewal alert for a product record
   */
  private async createRenewalAlert(record: any): Promise<RenewalAlert | null> {
    try {
      const renewalDate = new Date(record.contract_end_date)
      const today = new Date()
      const daysUntilRenewal = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      let alertType: '60_day' | '14_day' | 'imminent' | 'overdue'

      if (daysUntilRenewal < 0) {
        alertType = 'overdue'
      } else if (daysUntilRenewal <= 3) {
        alertType = 'imminent'
      } else if (daysUntilRenewal <= 14) {
        alertType = '14_day'
      } else if (daysUntilRenewal <= 60) {
        alertType = '60_day'
      } else {
        return null // Not within alert range
      }

      // Check for price hikes
      const priceHikeInfo = await this.detectPriceHike(record.record_id)
      
      // Get best alternatives
      const bestAlternatives = await this.getBestAlternatives(
        record.product_type,
        record.annual_cost
      )

      return {
        userId: record.user_id,
        recordId: record.record_id,
        providerName: record.provider_name,
        productType: record.product_type,
        renewalDate,
        daysUntilRenewal,
        annualCost: parseFloat(record.annual_cost),
        alertType,
        currentTariff: record.tariff_name,
        bestAlternatives,
        priceHikeDetected: priceHikeInfo.detected,
        priceHikePercentage: priceHikeInfo.percentage,
      }

    } catch (error) {
      logger.error('Failed to create renewal alert', error)
      return null
    }
  }

  /**
   * Detect price hikes for a product
   */
  private async detectPriceHike(recordId: string): Promise<{
    detected: boolean
    percentage?: number
  }> {
    try {
      // Get historical cost data for this product
      const historyQuery = `
        SELECT 
          annual_cost,
          recorded_at
        FROM product_cost_history
        WHERE record_id = $1
        ORDER BY recorded_at DESC
        LIMIT 2
      `

      const historyResult = await pool.query(historyQuery, [recordId])

      if (historyResult.rows.length < 2) {
        return { detected: false }
      }

      const currentCost = parseFloat(historyResult.rows[0].annual_cost)
      const previousCost = parseFloat(historyResult.rows[1].annual_cost)

      if (previousCost === 0) {
        return { detected: false }
      }

      const percentageChange = ((currentCost - previousCost) / previousCost) * 100

      return {
        detected: percentageChange > 10, // More than 10% increase
        percentage: percentageChange
      }

    } catch (error) {
      logger.error('Failed to detect price hike', error)
      return { detected: false }
    }
  }

  /**
   * Get best alternatives for a product type
   */
  private async getBestAlternatives(
    productType: string,
    currentCost: number
  ): Promise<Array<{
    providerName: string
    annualCost: number
    potentialSavings: number
    savingsPercentage: number
    rating?: number
    features?: string[]
    affiliateUrl?: string
  }>> {
    try {
      const query = `
        SELECT 
          rr.provider_name,
          rr.annual_cost,
          COALESCE(rr.rating, 0) as rating,
          rr.features,
          COALESCE(cm.commission_rate, 0) as commission_rate
        FROM rate_records rr
        LEFT JOIN commission_rates cm ON rr.provider_name = cm.provider_name 
          AND rr.product_type = cm.product_type
          AND cm.effective_from <= NOW()
          AND (cm.effective_to IS NULL OR cm.effective_to > NOW())
        WHERE rr.product_type = $1
          AND rr.annual_cost < $2
          AND rr.effective_from <= NOW()
          AND (rr.last_updated IS NULL OR rr.last_updated >= NOW() - INTERVAL '30 days')
        ORDER BY rr.annual_cost ASC, COALESCE(rr.rating, 0) DESC
        LIMIT 5
      `

      const result = await pool.query(query, [productType, currentCost])

      return result.rows.map(row => {
        const annualCost = parseFloat(row.annual_cost)
        const potentialSavings = currentCost - annualCost
        const savingsPercentage = (potentialSavings / currentCost) * 100

        return {
          providerName: row.provider_name,
          annualCost,
          potentialSavings,
          savingsPercentage,
          rating: row.rating ? parseFloat(row.rating) : undefined,
          features: row.features ? row.features.split(',').map((f: string) => f.trim()) : undefined,
        }
      })

    } catch (error) {
      logger.error('Failed to get best alternatives', error)
      return []
    }
  }

  /**
   * Store renewal alerts in database
   */
  async storeRenewalAlerts(alerts: RenewalAlert[]): Promise<void> {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      // Clear existing alerts for these records
      const recordIds = alerts.map(alert => alert.recordId)
      if (recordIds.length > 0) {
        await client.query(
          'DELETE FROM renewal_alerts WHERE record_id = ANY($1)',
          [recordIds]
        )
      }

      // Insert new alerts
      for (const alert of alerts) {
        await client.query(
          `INSERT INTO renewal_alerts 
           (user_id, record_id, provider_name, product_type, renewal_date, days_until_renewal, 
            annual_cost, alert_type, current_tariff, best_alternatives, price_hike_detected, 
            price_hike_percentage, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
          [
            alert.userId,
            alert.recordId,
            alert.providerName,
            alert.productType,
            alert.renewalDate,
            alert.daysUntilRenewal,
            alert.annualCost,
            alert.alertType,
            alert.currentTariff,
            JSON.stringify(alert.bestAlternatives),
            alert.priceHikeDetected,
            alert.priceHikePercentage,
          ]
        )
      }

      await client.query('COMMIT')

      logger.info('Renewal alerts stored', {
        alertCount: alerts.length,
        alertTypes: alerts.reduce((acc, alert) => {
          acc[alert.alertType] = (acc[alert.alertType] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      })

    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('Failed to store renewal alerts', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Get renewal alerts for a user
   */
  async getUserRenewalAlerts(userId: string): Promise<RenewalAlert[]> {
    try {
      const query = `
        SELECT 
          user_id,
          record_id,
          provider_name,
          product_type,
          renewal_date,
          days_until_renewal,
          annual_cost,
          alert_type,
          current_tariff,
          best_alternatives,
          price_hike_detected,
          price_hike_percentage,
          created_at
        FROM renewal_alerts
        WHERE user_id = $1
        ORDER BY renewal_date ASC
      `

      const result = await pool.query(query, [userId])

      return result.rows.map(row => ({
        userId: row.user_id,
        recordId: row.record_id,
        providerName: row.provider_name,
        productType: row.product_type,
        renewalDate: row.renewal_date,
        daysUntilRenewal: row.days_until_renewal,
        annualCost: parseFloat(row.annual_cost),
        alertType: row.alert_type,
        currentTariff: row.current_tariff,
        bestAlternatives: row.best_alternatives ? JSON.parse(row.best_alternatives) : undefined,
        priceHikeDetected: row.price_hike_detected,
        priceHikePercentage: row.price_hike_percentage ? parseFloat(row.price_hike_percentage) : undefined,
      }))

    } catch (error) {
      logger.error('Failed to get user renewal alerts', error)
      throw error
    }
  }

  /**
   * Get renewal statistics
   */
  async getRenewalStatistics(dateRange?: { from: Date; to: Date }): Promise<RenewalStatistics> {
    try {
      let whereClause = 'WHERE 1=1'
      const params: any[] = []

      if (dateRange) {
        whereClause += ' AND renewal_date >= $1 AND renewal_date <= $2'
        params.push(dateRange.from, dateRange.to)
      }

      const query = `
        SELECT 
          COUNT(*) as total_renewals,
          COUNT(CASE WHEN days_until_renewal >= 0 THEN 1 END) as upcoming_renewals,
          COUNT(CASE WHEN days_until_renewal < 0 THEN 1 END) as overdue_renewals,
          COALESCE(SUM(CASE WHEN best_alternatives IS NOT NULL THEN 
            (SELECT COALESCE(MAX((annual_cost::decimal - alt.cost::decimal)), 0) 
             FROM json_array_elements(best_alternatives) as alt(cost decimal)) 
            ELSE 0 END), 0) as total_potential_savings,
          COALESCE(AVG(CASE WHEN price_hike_detected THEN price_hike_percentage ELSE 0 END), 0) as average_price_hike
        FROM renewal_alerts
        ${whereClause}
      `

      const result = await pool.query(query, params)
      const stats = result.rows[0]

      // Get product type breakdown
      const breakdownQuery = `
        SELECT product_type, COUNT(*) as count
        FROM renewal_alerts
        ${whereClause}
        GROUP BY product_type
      `

      const breakdownResult = await pool.query(breakdownQuery, params)
      const productTypeBreakdown = breakdownResult.rows.reduce((acc, row) => {
        acc[row.product_type] = parseInt(row.count)
        return acc
      }, {} as Record<string, number>)

      return {
        totalRenewals: parseInt(stats.total_renewals),
        upcomingRenewals: parseInt(stats.upcoming_renewals),
        overdueRenewals: parseInt(stats.overdue_renewals),
        totalPotentialSavings: parseFloat(stats.total_potential_savings),
        averagePriceHike: parseFloat(stats.average_price_hike),
        productTypeBreakdown,
      }

    } catch (error) {
      logger.error('Failed to get renewal statistics', error)
      throw error
    }
  }

  /**
   * Cleanup old renewal alerts
   */
  async cleanupOldAlerts(daysToKeep: number = 90): Promise<number> {
    try {
      const result = await pool.query(
        `DELETE FROM renewal_alerts 
         WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
         RETURNING id`,
        []
      )

      const deletedCount = result.rows.length

      logger.info('Cleaned up old renewal alerts', {
        deletedCount,
        daysToKeep
      })

      return deletedCount

    } catch (error) {
      logger.error('Failed to cleanup old renewal alerts', error)
      throw error
    }
  }

  /**
   * Mark alerts as sent
   */
  async markAlertsAsSent(alertIds: string[]): Promise<void> {
    try {
      await pool.query(
        `UPDATE renewal_alerts 
         SET sent_at = NOW(), updated_at = NOW()
         WHERE id = ANY($1)`,
        [alertIds]
      )

      logger.info('Marked renewal alerts as sent', {
        alertCount: alertIds.length
      })

    } catch (error) {
      logger.error('Failed to mark alerts as sent', error)
      throw error
    }
  }

  /**
   * Get unsent alerts for notification
   */
  async getUnsentAlerts(): Promise<RenewalAlert[]> {
    try {
      const query = `
        SELECT 
          user_id,
          record_id,
          provider_name,
          product_type,
          renewal_date,
          days_until_renewal,
          annual_cost,
          alert_type,
          current_tariff,
          best_alternatives,
          price_hike_detected,
          price_hike_percentage,
          created_at,
          id
        FROM renewal_alerts
        WHERE sent_at IS NULL
        ORDER BY renewal_date ASC
      `

      const result = await pool.query(query)

      return result.rows.map(row => ({
        userId: row.user_id,
        recordId: row.record_id,
        providerName: row.provider_name,
        productType: row.product_type,
        renewalDate: row.renewal_date,
        daysUntilRenewal: row.days_until_renewal,
        annualCost: parseFloat(row.annual_cost),
        alertType: row.alert_type,
        currentTariff: row.current_tariff,
        bestAlternatives: row.best_alternatives ? JSON.parse(row.best_alternatives) : undefined,
        priceHikeDetected: row.price_hike_detected,
        priceHikePercentage: row.price_hike_percentage ? parseFloat(row.price_hike_percentage) : undefined,
      }))

    } catch (error) {
      logger.error('Failed to get unsent alerts', error)
      throw error
    }
  }
}

// Export singleton instance
export const renewalDetection = new RenewalDetection()

// Export types for use in other modules
export type {
  RenewalAlert,
  RenewalStatistics,
}
