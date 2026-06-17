/**
 * Switch Recording Service
 * Manages the complete switch lifecycle from intent to confirmation
 */

import { pool } from '../db'
import { logger } from '../config/logger'
import { awinIntegration } from './awinIntegration'
import { affiliateLinkRouting } from './affiliateLinkRouting'

interface SwitchIntent {
  userId: string
  recordId: string
  oldProvider: string
  newProvider: string
  productType: string
  estimatedSavings: number
  switchDate: string
  formData: any
  affiliateTrackingId?: string
}

interface SwitchConfirmation {
  switchId: string
  confirmationDate: Date
  actualSavings?: number
  commissionEarned?: number
  orderId?: string
  notes?: string
}

interface SwitchRecord {
  switchId: string
  userId: string
  recordId: string
  oldProvider: string
  newProvider: string
  productType: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'failed'
  switchIntentDate: Date
  confirmationDate?: Date
  estimatedSavings: number
  actualSavings?: number
  commissionEarned: number
  affiliateTrackingId?: string
  notes?: string
  formData: any
}

class SwitchRecording {
  /**
   * Record switch intent
   */
  async recordSwitchIntent(intent: SwitchIntent): Promise<string> {
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // Validate user owns the product record
      const productResult = await client.query(
        'SELECT provider_name, product_type FROM product_records WHERE record_id = $1 AND user_id = $2',
        [intent.recordId, intent.userId]
      )

      if (productResult.rows.length === 0) {
        throw new Error('Product record not found or access denied')
      }

      // Create switch record
      const switchResult = await client.query(
        `INSERT INTO user_switches 
         (user_id, product_record_id, old_provider, new_provider, product_type, estimated_savings, affiliate_tracking_id, status, switch_intent_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())
         RETURNING id`,
        [
          intent.userId,
          intent.recordId,
          intent.oldProvider,
          intent.newProvider,
          intent.productType,
          intent.estimatedSavings,
          intent.affiliateTrackingId,
        ]
      )

      const switchId = switchResult.rows[0].id

      // Store form data
      await client.query(
        `INSERT INTO switch_form_data 
         (switch_id, form_data, created_at)
         VALUES ($1, $2, NOW())`,
        [switchId, JSON.stringify(intent.formData)]
      )

      // Update product record status
      await client.query(
        `UPDATE product_records 
         SET status = 'switching_pending', updated_at = NOW()
         WHERE record_id = $1`,
        [intent.recordId]
      )

      // Create switch notification
      await this.createSwitchNotification(client, switchId, intent.userId, 'intent')

      await client.query('COMMIT')

      logger.info('Switch intent recorded', {
        switchId,
        userId: intent.userId,
        recordId: intent.recordId,
        oldProvider: intent.oldProvider,
        newProvider: intent.newProvider,
      })

      return switchId

    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('Failed to record switch intent', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Confirm switch
   */
  async confirmSwitch(confirmation: SwitchConfirmation): Promise<void> {
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // Get switch details
      const switchResult = await client.query(
        `SELECT us.*, pr.record_id, pr.provider_name as current_provider
         FROM user_switches us
         JOIN product_records pr ON us.product_record_id = pr.record_id
         WHERE us.id = $1`,
        [confirmation.switchId]
      )

      if (switchResult.rows.length === 0) {
        throw new Error('Switch not found')
      }

      const switchRecord = switchResult.rows[0]

      // Update switch status
      await client.query(
        `UPDATE user_switches 
         SET status = 'confirmed', 
             confirmation_date = $1,
             actual_savings = COALESCE($2, estimated_savings),
             commission_earned = COALESCE($3, commission_earned),
             notes = COALESCE($4, notes),
             updated_at = NOW()
         WHERE id = $5`,
        [
          confirmation.confirmationDate,
          confirmation.actualSavings,
          confirmation.commissionEarned,
          confirmation.notes,
          confirmation.switchId,
        ]
      )

      // Update product record
      await client.query(
        `UPDATE product_records 
         SET provider_name = $1,
             status = 'active',
             updated_at = NOW()
         WHERE record_id = $2`,
        [switchRecord.new_provider, switchRecord.record_id]
      )

      // Create switch notification
      await this.createSwitchNotification(
        client, 
        confirmation.switchId, 
        switchRecord.user_id, 
        'confirmed'
      )

      // Update affiliate conversion if tracking ID exists
      if (switchRecord.affiliate_tracking_id) {
        await this.updateAffiliateConversion(
          switchRecord.affiliate_tracking_id,
          confirmation.switchId,
          confirmation.commissionEarned
        )
      }

      await client.query('COMMIT')

      logger.info('Switch confirmed', {
        switchId: confirmation.switchId,
        confirmationDate: confirmation.confirmationDate,
        commissionEarned: confirmation.commissionEarned,
      })

    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('Failed to confirm switch', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Cancel switch
   */
  async cancelSwitch(switchId: string, userId: string, reason?: string): Promise<void> {
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // Get switch details
      const switchResult = await client.query(
        `SELECT us.*, pr.record_id
         FROM user_switches us
         JOIN product_records pr ON us.product_record_id = pr.record_id
         WHERE us.id = $1 AND us.user_id = $2`,
        [switchId, userId]
      )

      if (switchResult.rows.length === 0) {
        throw new Error('Switch not found or access denied')
      }

      const switchRecord = switchResult.rows[0]

      // Update switch status
      await client.query(
        `UPDATE user_switches 
         SET status = 'cancelled', 
             notes = COALESCE($1, notes),
             updated_at = NOW()
         WHERE id = $2`,
        [reason, switchId]
      )

      // Update product record status
      await client.query(
        `UPDATE product_records 
         SET status = 'active', updated_at = NOW()
         WHERE record_id = $1`,
        [switchRecord.record_id]
      )

      // Create switch notification
      await this.createSwitchNotification(client, switchId, userId, 'cancelled')

      await client.query('COMMIT')

      logger.info('Switch cancelled', {
        switchId,
        userId,
        reason,
      })

    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('Failed to cancel switch', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Get switch record
   */
  async getSwitchRecord(switchId: string, userId?: string): Promise<SwitchRecord | null> {
    let query = `
      SELECT 
        us.id as switch_id,
        us.user_id,
        us.product_record_id as record_id,
        us.old_provider,
        us.new_provider,
        us.product_type,
        us.status,
        us.switch_intent_date,
        us.confirmation_date,
        us.estimated_savings,
        us.actual_savings,
        us.commission_earned,
        us.affiliate_tracking_id,
        us.notes,
        sfd.form_data
      FROM user_switches us
      LEFT JOIN switch_form_data sfd ON us.id = sfd.switch_id
      WHERE us.id = $1
    `
    
    const params = [switchId]
    
    if (userId) {
      query += ' AND us.user_id = $2'
      params.push(userId)
    }

    const result = await pool.query(query, params)

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]

    return {
      switchId: row.switch_id,
      userId: row.user_id,
      recordId: row.record_id,
      oldProvider: row.old_provider,
      newProvider: row.new_provider,
      productType: row.product_type,
      status: row.status,
      switchIntentDate: row.switch_intent_date,
      confirmationDate: row.confirmation_date,
      estimatedSavings: parseFloat(row.estimated_savings),
      actualSavings: row.actual_savings ? parseFloat(row.actual_savings) : undefined,
      commissionEarned: parseFloat(row.commission_earned),
      affiliateTrackingId: row.affiliate_tracking_id,
      notes: row.notes,
      formData: row.form_data,
    }
  }

  /**
   * Get user switch history
   */
  async getUserSwitchHistory(userId: string, limit: number = 50): Promise<SwitchRecord[]> {
    const result = await pool.query(
      `SELECT 
        us.id as switch_id,
        us.user_id,
        us.product_record_id as record_id,
        us.old_provider,
        us.new_provider,
        us.product_type,
        us.status,
        us.switch_intent_date,
        us.confirmation_date,
        us.estimated_savings,
        us.actual_savings,
        us.commission_earned,
        us.affiliate_tracking_id,
        us.notes,
        sfd.form_data
      FROM user_switches us
      LEFT JOIN switch_form_data sfd ON us.id = sfd.switch_id
      WHERE us.user_id = $1
      ORDER BY us.switch_intent_date DESC
      LIMIT $2`,
      [userId, limit]
    )

    return result.rows.map(row => ({
      switchId: row.switch_id,
      userId: row.user_id,
      recordId: row.record_id,
      oldProvider: row.old_provider,
      newProvider: row.new_provider,
      productType: row.product_type,
      status: row.status,
      switchIntentDate: row.switch_intent_date,
      confirmationDate: row.confirmation_date,
      estimatedSavings: parseFloat(row.estimated_savings),
      actualSavings: row.actual_savings ? parseFloat(row.actual_savings) : undefined,
      commissionEarned: parseFloat(row.commission_earned),
      affiliateTrackingId: row.affiliate_tracking_id,
      notes: row.notes,
      formData: row.form_data,
    }))
  }

  /**
   * Get switch statistics
   */
  async getSwitchStatistics(userId?: string, dateRange?: { from: Date; to: Date }): Promise<{
    totalSwitches: number
    pendingSwitches: number
    confirmedSwitches: number
    cancelledSwitches: number
    totalEstimatedSavings: number
    totalActualSavings: number
    totalCommissionEarned: number
    averageSavingsPerSwitch: number
    conversionRate: number
  }> {
    let whereClause = 'WHERE 1=1'
    const params: any[] = []
    let paramIndex = 1

    if (userId) {
      whereClause += ` AND user_id = $${paramIndex++}`
      params.push(userId)
    }

    if (dateRange) {
      whereClause += ` AND switch_intent_date >= $${paramIndex++} AND switch_intent_date <= $${paramIndex++}`
      params.push(dateRange.from, dateRange.to)
    }

    const statsQuery = `
      SELECT 
        COUNT(*) as total_switches,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_switches,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_switches,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_switches,
        COALESCE(SUM(estimated_savings), 0) as total_estimated_savings,
        COALESCE(SUM(actual_savings), 0) as total_actual_savings,
        COALESCE(SUM(commission_earned), 0) as total_commission_earned
      FROM user_switches
      ${whereClause}
    `

    const result = await pool.query(statsQuery, params)
    const stats = result.rows[0]

    const totalSwitches = parseInt(stats.total_switches)
    const confirmedSwitches = parseInt(stats.confirmed_switches)
    const totalEstimatedSavings = parseFloat(stats.total_estimated_savings)
    const totalActualSavings = parseFloat(stats.total_actual_savings)

    return {
      totalSwitches,
      pendingSwitches: parseInt(stats.pending_switches),
      confirmedSwitches,
      cancelledSwitches: parseInt(stats.cancelled_switches),
      totalEstimatedSavings,
      totalActualSavings,
      totalCommissionEarned: parseFloat(stats.total_commission_earned),
      averageSavingsPerSwitch: confirmedSwitches > 0 ? totalActualSavings / confirmedSwitches : 0,
      conversionRate: totalSwitches > 0 ? (confirmedSwitches / totalSwitches) * 100 : 0,
    }
  }

  /**
   * Create switch notification
   */
  private async createSwitchNotification(
    client: any,
    switchId: string,
    userId: string,
    type: 'intent' | 'confirmed' | 'cancelled'
  ): Promise<void> {
    const titles = {
      intent: 'Switch Intent Recorded',
      confirmed: 'Switch Confirmed',
      cancelled: 'Switch Cancelled',
    }

    const messages = {
      intent: 'Your switch intent has been recorded successfully.',
      confirmed: 'Your switch has been confirmed and is now active.',
      cancelled: 'Your switch has been cancelled.',
    }

    await client.query(
      `INSERT INTO notifications 
       (user_id, title, message, type, related_id, created_at)
       VALUES ($1, $2, $3, 'switch', $4, NOW())`,
      [userId, titles[type], messages[type], switchId]
    )
  }

  /**
   * Update affiliate conversion
   */
  private async updateAffiliateConversion(
    trackingId: string,
    switchId: string,
    commissionAmount?: number
  ): Promise<void> {
    try {
      // This would typically be handled by the webhook processing
      // But we can update it manually if needed
      if (commissionAmount) {
        await pool.query(
          `UPDATE affiliate_conversions 
           SET commission_amount = $1, updated_at = NOW()
           WHERE tracking_id = $2`,
          [commissionAmount, trackingId]
        )
      }

      logger.info('Affiliate conversion updated', {
        trackingId,
        switchId,
        commissionAmount,
      })

    } catch (error) {
      logger.error('Failed to update affiliate conversion', error)
      // Don't throw here as this is not critical
    }
  }

  /**
   * Get pending switches for follow-up
   */
  async getPendingSwitches(olderThanDays: number = 7): Promise<SwitchRecord[]> {
    const result = await pool.query(
      `SELECT 
        us.id as switch_id,
        us.user_id,
        us.product_record_id as record_id,
        us.old_provider,
        us.new_provider,
        us.product_type,
        us.status,
        us.switch_intent_date,
        us.confirmation_date,
        us.estimated_savings,
        us.actual_savings,
        us.commission_earned,
        us.affiliate_tracking_id,
        us.notes,
        sfd.form_data
      FROM user_switches us
      LEFT JOIN switch_form_data sfd ON us.id = sfd.switch_id
      WHERE us.status = 'pending' 
        AND us.switch_intent_date < NOW() - INTERVAL '${olderThanDays} days'
      ORDER BY us.switch_intent_date ASC`,
      []
    )

    return result.rows.map(row => ({
      switchId: row.switch_id,
      userId: row.user_id,
      recordId: row.record_id,
      oldProvider: row.old_provider,
      newProvider: row.new_provider,
      productType: row.product_type,
      status: row.status,
      switchIntentDate: row.switch_intent_date,
      confirmationDate: row.confirmation_date,
      estimatedSavings: parseFloat(row.estimated_savings),
      actualSavings: row.actual_savings ? parseFloat(row.actual_savings) : undefined,
      commissionEarned: parseFloat(row.commission_earned),
      affiliateTrackingId: row.affiliate_tracking_id,
      notes: row.notes,
      formData: row.form_data,
    }))
  }

  /**
   * Auto-cancel stale pending switches
   */
  async autoCancelStaleSwitches(daysThreshold: number = 30): Promise<number> {
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      const result = await client.query(
        `UPDATE user_switches 
         SET status = 'cancelled', 
             notes = 'Auto-cancelled due to stale pending status',
             updated_at = NOW()
         WHERE status = 'pending' 
           AND switch_intent_date < NOW() - INTERVAL '${daysThreshold} days'
         RETURNING id`,
        []
      )

      const cancelledCount = result.rows.length

      // Update corresponding product records
      for (const row of result.rows) {
        await client.query(
          `UPDATE product_records 
           SET status = 'active', updated_at = NOW()
           WHERE record_id = (
             SELECT product_record_id FROM user_switches WHERE id = $1
           )`,
          [row.id]
        )
      }

      await client.query('COMMIT')

      logger.info('Auto-cancelled stale switches', { cancelledCount })

      return cancelledCount

    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('Failed to auto-cancel stale switches', error)
      throw error
    } finally {
      client.release()
    }
  }
}

// Export singleton instance
export const switchRecording = new SwitchRecording()

// Export types for use in other modules
export type {
  SwitchIntent,
  SwitchConfirmation,
  SwitchRecord,
}
