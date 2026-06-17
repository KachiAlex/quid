/**
 * Cost Change Tracking Service
 * Tracks and analyzes subscription cost changes over time
 */

import { pool } from '../db'
import { logger } from '../config/logger'

interface CostChange {
  id: string
  userId: string
  recordId: string
  providerName: string
  productType: string
  oldCost: number
  newCost: number
  changeAmount: number
  changePercentage: number
  changeType: 'increase' | 'decrease' | 'no_change'
  changeDate: Date
  detectedAt: Date
  source: 'manual' | 'automatic' | 'import' | 'user_reported'
  notes?: string
  isSignificant: boolean
  impactLevel: 'low' | 'medium' | 'high'
}

interface CostChangeSummary {
  totalChanges: number
  increases: number
  decreases: number
  totalIncreaseAmount: number
  totalDecreaseAmount: number
  netChange: number
  averageChangePercentage: number
  mostChangedProduct?: {
    providerName: string
    productType: string
    changePercentage: number
    changeAmount: number
  }
  monthlyTrends: Array<{
    month: string
    changeCount: number
    totalChange: number
  }>
}

interface CostChangeAlert {
  id: string
  userId: string
  recordId: string
  alertType: 'significant_increase' | 'unusual_change' | 'trend_alert'
  threshold: number
  currentValue: number
  thresholdValue: number
  isActive: boolean
  createdAt: Date
  lastTriggered?: Date
  triggerCount: number
}

class CostChangeTrackingService {
  /**
   * Record a cost change for a product
   */
  async recordCostChange(
    userId: string,
    recordId: string,
    oldCost: number,
    newCost: number,
    source: 'manual' | 'automatic' | 'import' | 'user_reported' = 'manual',
    notes?: string
  ): Promise<CostChange> {
    try {
      // Get product details
      const productQuery = `
        SELECT provider_name, product_type 
        FROM product_records 
        WHERE record_id = $1 AND user_id = $2
      `
      
      const productResult = await pool.query(productQuery, [recordId, userId])
      if (productResult.rows.length === 0) {
        throw new Error('Product not found')
      }

      const product = productResult.rows[0]
      
      // Calculate change metrics
      const changeAmount = newCost - oldCost
      const changePercentage = oldCost > 0 ? (changeAmount / oldCost) * 100 : 0
      const changeType = changeAmount > 0 ? 'increase' : changeAmount < 0 ? 'decrease' : 'no_change'
      
      // Determine significance and impact
      const isSignificant = Math.abs(changePercentage) >= 5 // 5% threshold
      let impactLevel: 'low' | 'medium' | 'high' = 'low'
      
      if (Math.abs(changePercentage) >= 20) {
        impactLevel = 'high'
      } else if (Math.abs(changePercentage) >= 10) {
        impactLevel = 'medium'
      }

      // Insert cost change record
      const insertQuery = `
        INSERT INTO cost_changes (
          user_id, record_id, provider_name, product_type, old_cost, new_cost,
          change_amount, change_percentage, change_type, change_date, detected_at,
          source, notes, is_significant, impact_level
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `

      const result = await pool.query(insertQuery, [
        userId,
        recordId,
        product.provider_name,
        product.product_type,
        oldCost,
        newCost,
        changeAmount,
        changePercentage,
        changeType,
        new Date(),
        new Date(),
        source,
        notes,
        isSignificant,
        impactLevel,
      ])

      const costChange = result.rows[0]

      // Update product cost history
      await this.updateCostHistory(userId, recordId, newCost, source)

      // Check for alerts
      await this.checkCostChangeAlerts(userId, recordId, costChange)

      logger.info('Cost change recorded', {
        userId,
        recordId,
        oldCost,
        newCost,
        changePercentage,
        changeType,
      })

      return {
        id: costChange.id,
        userId: costChange.user_id,
        recordId: costChange.record_id,
        providerName: costChange.provider_name,
        productType: costChange.product_type,
        oldCost: parseFloat(costChange.old_cost),
        newCost: parseFloat(costChange.new_cost),
        changeAmount: parseFloat(costChange.change_amount),
        changePercentage: parseFloat(costChange.change_percentage),
        changeType: costChange.change_type,
        changeDate: costChange.change_date,
        detectedAt: costChange.detected_at,
        source: costChange.source,
        notes: costChange.notes,
        isSignificant: costChange.is_significant,
        impactLevel: costChange.impact_level,
      }

    } catch (error) {
      logger.error('Failed to record cost change', error)
      throw error
    }
  }

  /**
   * Get cost changes for a user
   */
  async getCostChanges(
    userId: string,
    options: {
      limit?: number
      offset?: number
      fromDate?: Date
      toDate?: Date
      changeType?: 'increase' | 'decrease' | 'no_change'
      impactLevel?: 'low' | 'medium' | 'high'
      recordId?: string
    } = {}
  ): Promise<CostChange[]> {
    try {
      let query = `
        SELECT * FROM cost_changes 
        WHERE user_id = $1
      `
      
      const params: any[] = [userId]
      let paramIndex = 2

      if (options.fromDate) {
        query += ` AND change_date >= $${paramIndex++}`
        params.push(options.fromDate)
      }

      if (options.toDate) {
        query += ` AND change_date <= $${paramIndex++}`
        params.push(options.toDate)
      }

      if (options.changeType) {
        query += ` AND change_type = $${paramIndex++}`
        params.push(options.changeType)
      }

      if (options.impactLevel) {
        query += ` AND impact_level = $${paramIndex++}`
        params.push(options.impactLevel)
      }

      if (options.recordId) {
        query += ` AND record_id = $${paramIndex++}`
        params.push(options.recordId)
      }

      query += ` ORDER BY change_date DESC, detected_at DESC`

      if (options.limit) {
        query += ` LIMIT $${paramIndex++}`
        params.push(options.limit)
      }

      if (options.offset) {
        query += ` OFFSET $${paramIndex++}`
        params.push(options.offset)
      }

      const result = await pool.query(query, params)

      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        recordId: row.record_id,
        providerName: row.provider_name,
        productType: row.product_type,
        oldCost: parseFloat(row.old_cost),
        newCost: parseFloat(row.new_cost),
        changeAmount: parseFloat(row.change_amount),
        changePercentage: parseFloat(row.change_percentage),
        changeType: row.change_type,
        changeDate: row.change_date,
        detectedAt: row.detected_at,
        source: row.source,
        notes: row.notes,
        isSignificant: row.is_significant,
        impactLevel: row.impact_level,
      }))

    } catch (error) {
      logger.error('Failed to get cost changes', error)
      throw error
    }
  }

  /**
   * Get cost change summary for a user
   */
  async getCostChangeSummary(
    userId: string,
    options: {
      fromDate?: Date
      toDate?: Date
    } = {}
  ): Promise<CostChangeSummary> {
    try {
      let whereClause = 'WHERE user_id = $1'
      const params: any[] = [userId]
      let paramIndex = 2

      if (options.fromDate) {
        whereClause += ` AND change_date >= $${paramIndex++}`
        params.push(options.fromDate)
      }

      if (options.toDate) {
        whereClause += ` AND change_date <= $${paramIndex++}`
        params.push(options.toDate)
      }

      // Get summary statistics
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_changes,
          COUNT(CASE WHEN change_type = 'increase' THEN 1 END) as increases,
          COUNT(CASE WHEN change_type = 'decrease' THEN 1 END) as decreases,
          COALESCE(SUM(CASE WHEN change_type = 'increase' THEN change_amount ELSE 0 END), 0) as total_increase_amount,
          COALESCE(SUM(CASE WHEN change_type = 'decrease' THEN ABS(change_amount) ELSE 0 END), 0) as total_decrease_amount,
          COALESCE(SUM(change_amount), 0) as net_change,
          COALESCE(AVG(ABS(change_percentage)), 0) as average_change_percentage
        FROM cost_changes 
        ${whereClause}
      `

      const summaryResult = await pool.query(summaryQuery, params)

      // Get most changed product
      const mostChangedQuery = `
        SELECT 
          provider_name,
          product_type,
          change_percentage,
          change_amount
        FROM cost_changes 
        ${whereClause}
        ORDER BY ABS(change_percentage) DESC
        LIMIT 1
      `

      const mostChangedResult = await pool.query(mostChangedQuery, params)

      // Get monthly trends
      const trendsQuery = `
        SELECT 
          DATE_TRUNC('month', change_date) as month,
          COUNT(*) as change_count,
          COALESCE(SUM(change_amount), 0) as total_change
        FROM cost_changes 
        ${whereClause}
        GROUP BY DATE_TRUNC('month', change_date)
        ORDER BY month DESC
        LIMIT 12
      `

      const trendsResult = await pool.query(trendsQuery, params)

      const summary = summaryResult.rows[0]
      const mostChanged = mostChangedResult.rows[0]

      return {
        totalChanges: parseInt(summary.total_changes),
        increases: parseInt(summary.increases),
        decreases: parseInt(summary.decreases),
        totalIncreaseAmount: parseFloat(summary.total_increase_amount),
        totalDecreaseAmount: parseFloat(summary.total_decrease_amount),
        netChange: parseFloat(summary.net_change),
        averageChangePercentage: parseFloat(summary.average_change_percentage),
        mostChangedProduct: mostChanged ? {
          providerName: mostChanged.provider_name,
          productType: mostChanged.product_type,
          changePercentage: parseFloat(mostChanged.change_percentage),
          changeAmount: parseFloat(mostChanged.change_amount),
        } : undefined,
        monthlyTrends: trendsResult.rows.map(row => ({
          month: row.month,
          changeCount: parseInt(row.change_count),
          totalChange: parseFloat(row.total_change),
        })),
      }

    } catch (error) {
      logger.error('Failed to get cost change summary', error)
      throw error
    }
  }

  /**
   * Update product cost history
   */
  private async updateCostHistory(
    userId: string,
    recordId: string,
    newCost: number,
    source: 'manual' | 'automatic' | 'import' | 'user_reported'
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO product_cost_history (user_id, record_id, annual_cost, source, recorded_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (user_id, record_id, recorded_at) 
        DO UPDATE SET
          annual_cost = EXCLUDED.annual_cost,
          source = EXCLUDED.source
      `

      await pool.query(query, [userId, recordId, newCost, source])

      // Update current product cost
      await pool.query(
        'UPDATE product_records SET annual_cost = $1, last_updated = NOW() WHERE record_id = $2 AND user_id = $3',
        [newCost, recordId, userId]
      )

    } catch (error) {
      logger.error('Failed to update cost history', error)
      throw error
    }
  }

  /**
   * Check for cost change alerts
   */
  private async checkCostChangeAlerts(
    userId: string,
    recordId: string,
    costChange: any
  ): Promise<void> {
    try {
      // Get active alerts for this product
      const alertsQuery = `
        SELECT * FROM cost_change_alerts 
        WHERE user_id = $1 AND record_id = $2 AND is_active = true
      `

      const alertsResult = await pool.query(alertsQuery, [userId, recordId])

      for (const alert of alertsResult.rows) {
        let shouldTrigger = false

        switch (alert.alert_type) {
          case 'significant_increase':
            shouldTrigger = costChange.change_type === 'increase' && 
                           Math.abs(costChange.change_percentage) >= alert.threshold
            break
          case 'unusual_change':
            shouldTrigger = Math.abs(costChange.change_percentage) >= alert.threshold
            break
          case 'trend_alert':
            // Check for multiple changes in short period
            shouldTrigger = await this.checkTrendAlert(userId, recordId, alert.threshold)
            break
        }

        if (shouldTrigger) {
          await this.triggerCostChangeAlert(alert.id, costChange)
        }
      }

    } catch (error) {
      logger.error('Failed to check cost change alerts', error)
    }
  }

  /**
   * Check for trend alerts (multiple changes)
   */
  private async checkTrendAlert(userId: string, recordId: string, threshold: number): Promise<boolean> {
    try {
      const query = `
        SELECT COUNT(*) as change_count
        FROM cost_changes 
        WHERE user_id = $1 AND record_id = $2 
          AND change_date >= NOW() - INTERVAL '30 days'
      `

      const result = await pool.query(query, [userId, recordId])
      const changeCount = parseInt(result.rows[0].change_count)

      return changeCount >= threshold

    } catch (error) {
      logger.error('Failed to check trend alert', error)
      return false
    }
  }

  /**
   * Trigger a cost change alert
   */
  private async triggerCostChangeAlert(alertId: string, costChange: any): Promise<void> {
    try {
      await pool.query(
        `UPDATE cost_change_alerts 
         SET last_triggered = NOW(), trigger_count = trigger_count + 1 
         WHERE id = $1`,
        [alertId]
      )

      // Here you could send email notifications, push notifications, etc.
      logger.info('Cost change alert triggered', {
        alertId,
        recordId: costChange.record_id,
        changePercentage: costChange.change_percentage,
      })

    } catch (error) {
      logger.error('Failed to trigger cost change alert', error)
    }
  }

  /**
   * Create cost change alert
   */
  async createCostChangeAlert(
    userId: string,
    recordId: string,
    alertType: 'significant_increase' | 'unusual_change' | 'trend_alert',
    threshold: number
  ): Promise<CostChangeAlert> {
    try {
      const query = `
        INSERT INTO cost_change_alerts (
          user_id, record_id, alert_type, threshold, current_value, 
          threshold_value, is_active, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
        RETURNING *
      `

      // Get current product cost
      const productQuery = `
        SELECT annual_cost FROM product_records 
        WHERE record_id = $1 AND user_id = $2
      `
      
      const productResult = await pool.query(productQuery, [recordId, userId])
      if (productResult.rows.length === 0) {
        throw new Error('Product not found')
      }

      const currentCost = parseFloat(productResult.rows[0].annual_cost)
      const thresholdValue = alertType === 'significant_increase' 
        ? currentCost * (1 + threshold / 100)
        : threshold

      const result = await pool.query(query, [
        userId,
        recordId,
        alertType,
        threshold,
        currentCost,
        thresholdValue,
      ])

      const alert = result.rows[0]

      return {
        id: alert.id,
        userId: alert.user_id,
        recordId: alert.record_id,
        alertType: alert.alert_type,
        threshold: parseFloat(alert.threshold),
        currentValue: parseFloat(alert.current_value),
        thresholdValue: parseFloat(alert.threshold_value),
        isActive: alert.is_active,
        createdAt: alert.created_at,
        lastTriggered: alert.last_triggered,
        triggerCount: alert.trigger_count,
      }

    } catch (error) {
      logger.error('Failed to create cost change alert', error)
      throw error
    }
  }

  /**
   * Get cost change alerts for a user
   */
  async getCostChangeAlerts(userId: string): Promise<CostChangeAlert[]> {
    try {
      const query = `
        SELECT 
          cca.*,
          pr.provider_name,
          pr.product_type
        FROM cost_change_alerts cca
        JOIN product_records pr ON cca.record_id = pr.record_id
        WHERE cca.user_id = $1
        ORDER BY cca.created_at DESC
      `

      const result = await pool.query(query, [userId])

      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        recordId: row.record_id,
        alertType: row.alert_type,
        threshold: parseFloat(row.threshold),
        currentValue: parseFloat(row.current_value),
        thresholdValue: parseFloat(row.threshold_value),
        isActive: row.is_active,
        createdAt: row.created_at,
        lastTriggered: row.last_triggered,
        triggerCount: row.trigger_count,
      }))

    } catch (error) {
      logger.error('Failed to get cost change alerts', error)
      throw error
    }
  }

  /**
   * Analyze cost trends for a user
   */
  async analyzeCostTrends(
    userId: string,
    options: {
      period: '3m' | '6m' | '12m' | 'all'
      recordId?: string
    } = { period: '6m' }
  ): Promise<{
    trend: 'increasing' | 'decreasing' | 'stable'
    trendPercentage: number
    monthlyAverage: number
    volatility: number
    predictions: Array<{
      month: string
      predictedCost: number
      confidence: number
    }>
  }> {
    try {
      let whereClause = 'WHERE user_id = $1'
      const params: any[] = [userId]
      let paramIndex = 2

      if (options.recordId) {
        whereClause += ` AND record_id = $${paramIndex++}`
        params.push(options.recordId)
      }

      // Add date filter based on period
      const periodMap = {
        '3m': "NOW() - INTERVAL '3 months'",
        '6m': "NOW() - INTERVAL '6 months'",
        '12m': "NOW() - INTERVAL '12 months'",
        'all': '1970-01-01'
      }

      whereClause += ` AND change_date >= ${periodMap[options.period]}`

      // Get cost changes for trend analysis
      const trendsQuery = `
        SELECT 
          change_date,
          new_cost,
          change_percentage,
          change_type
        FROM cost_changes 
        ${whereClause}
        ORDER BY change_date ASC
      `

      const result = await pool.query(trendsQuery, params)

      if (result.rows.length < 2) {
        return {
          trend: 'stable',
          trendPercentage: 0,
          monthlyAverage: 0,
          volatility: 0,
          predictions: [],
        }
      }

      // Calculate trend
      const firstCost = parseFloat(result.rows[0].new_cost)
      const lastCost = parseFloat(result.rows[result.rows.length - 1].new_cost)
      const trendPercentage = ((lastCost - firstCost) / firstCost) * 100

      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
      if (trendPercentage > 5) {
        trend = 'increasing'
      } else if (trendPercentage < -5) {
        trend = 'decreasing'
      }

      // Calculate monthly average and volatility
      const totalChange = result.rows.reduce((sum, row) => sum + parseFloat(row.change_percentage), 0)
      const monthlyAverage = totalChange / result.rows.length

      const variance = result.rows.reduce((sum, row) => {
        const diff = parseFloat(row.change_percentage) - monthlyAverage
        return sum + (diff * diff)
      }, 0) / result.rows.length

      const volatility = Math.sqrt(variance)

      // Simple predictions (linear extrapolation)
      const predictions = []
      const monthlyChange = monthlyAverage
      let currentCost = lastCost

      for (let i = 1; i <= 3; i++) {
        const futureDate = new Date()
        futureDate.setMonth(futureDate.getMonth() + i)
        
        currentCost = currentCost * (1 + monthlyChange / 100)
        const confidence = Math.max(0.1, 1 - (volatility / 100) - (i * 0.2))

        predictions.push({
          month: futureDate.toISOString(),
          predictedCost: currentCost,
          confidence,
        })
      }

      return {
        trend,
        trendPercentage,
        monthlyAverage,
        volatility,
        predictions,
      }

    } catch (error) {
      logger.error('Failed to analyze cost trends', error)
      throw error
    }
  }

  /**
   * Get cost change statistics for admin
   */
  async getCostChangeStatistics(): Promise<{
    totalChanges: number
    totalUsers: number
    totalAmount: number
    averageChange: number
    topProviders: Array<{
      providerName: string
      changeCount: number
      totalChange: number
    }>
    monthlyTrends: Array<{
      month: string
      changeCount: number
      totalChange: number
    }>
  }> {
    try {
      const [statsResult, providersResult, trendsResult] = await Promise.all([
        pool.query(`
          SELECT 
            COUNT(*) as total_changes,
            COUNT(DISTINCT user_id) as total_users,
            COALESCE(SUM(ABS(change_amount)), 0) as total_amount,
            COALESCE(AVG(change_amount), 0) as average_change
          FROM cost_changes
        `),
        pool.query(`
          SELECT 
            provider_name,
            COUNT(*) as change_count,
            COALESCE(SUM(ABS(change_amount)), 0) as total_change
          FROM cost_changes
          GROUP BY provider_name
          ORDER BY change_count DESC
          LIMIT 10
        `),
        pool.query(`
          SELECT 
            DATE_TRUNC('month', change_date) as month,
            COUNT(*) as change_count,
            COALESCE(SUM(ABS(change_amount)), 0) as total_change
          FROM cost_changes
          WHERE change_date >= NOW() - INTERVAL '12 months'
          GROUP BY DATE_TRUNC('month', change_date)
          ORDER BY month DESC
        `),
      ])

      const stats = statsResult.rows[0]

      return {
        totalChanges: parseInt(stats.total_changes),
        totalUsers: parseInt(stats.total_users),
        totalAmount: parseFloat(stats.total_amount),
        averageChange: parseFloat(stats.average_change),
        topProviders: providersResult.rows.map(row => ({
          providerName: row.provider_name,
          changeCount: parseInt(row.change_count),
          totalChange: parseFloat(row.total_change),
        })),
        monthlyTrends: trendsResult.rows.map(row => ({
          month: row.month,
          changeCount: parseInt(row.change_count),
          totalChange: parseFloat(row.total_change),
        })),
      }

    } catch (error) {
      logger.error('Failed to get cost change statistics', error)
      throw error
    }
  }
}

// Export singleton instance
export const costChangeTrackingService = new CostChangeTrackingService()

// Export types for use in other modules
export type {
  CostChange,
  CostChangeSummary,
  CostChangeAlert,
}
