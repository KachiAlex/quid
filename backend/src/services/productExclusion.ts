/**
 * Product Exclusion Service
 * Manages product exclusions and exclusion rules
 */

import { pool } from '../db'
import { logger } from '../config/logger'

interface ProductExclusion {
  recordId: string
  userId: string
  isExcluded: boolean
  exclusionReason?: string
  exclusionDate?: Date
}

interface ExclusionRule {
  id: string
  userId: string
  ruleType: 'provider' | 'product_type' | 'cost_range' | 'custom'
  ruleValue: string
  description: string
  isActive: boolean
  createdAt: Date
  affectedProducts: number
}

interface ExclusionSettings {
  userId: string
  excludeCancelledProducts: boolean
  excludeLowValueProducts: boolean
  lowValueThreshold: number
  autoRenewalExclusions: boolean
  notificationPreferences: {
    renewalAlerts: boolean
    priceHikeAlerts: boolean
    comparisonAlerts: boolean
  }
}

class ProductExclusionService {
  /**
   * Toggle product exclusion
   */
  async toggleProductExclusion(
    userId: string,
    recordId: string,
    isExcluded: boolean,
    exclusionReason?: string
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO product_exclusions (user_id, record_id, is_excluded, exclusion_reason, exclusion_date)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, record_id) 
        DO UPDATE SET
          is_excluded = EXCLUDED.is_excluded,
          exclusion_reason = EXCLUDED.exclusion_reason,
          exclusion_date = EXCLUDED.exclusion_date,
          updated_at = NOW()
      `

      await pool.query(query, [
        userId,
        recordId,
        isExcluded,
        isExcluded ? exclusionReason : null,
        isExcluded ? new Date() : null,
      ])

      logger.info('Product exclusion updated', {
        userId,
        recordId,
        isExcluded,
        exclusionReason,
      })

    } catch (error) {
      logger.error('Failed to toggle product exclusion', error)
      throw error
    }
  }

  /**
   * Get product exclusions for a user
   */
  async getProductExclusions(userId: string): Promise<ProductExclusion[]> {
    try {
      const query = `
        SELECT 
          pe.*,
          pr.provider_name,
          pr.product_type,
          pr.annual_cost,
          pr.status
        FROM product_exclusions pe
        JOIN product_records pr ON pe.record_id = pr.record_id
        WHERE pe.user_id = $1
        ORDER BY pe.updated_at DESC
      `

      const result = await pool.query(query, [userId])

      return result.rows.map(row => ({
        recordId: row.record_id,
        userId: row.user_id,
        isExcluded: row.is_excluded,
        exclusionReason: row.exclusion_reason,
        exclusionDate: row.exclusion_date,
      }))

    } catch (error) {
      logger.error('Failed to get product exclusions', error)
      throw error
    }
  }

  /**
   * Create exclusion rule
   */
  async createExclusionRule(
    userId: string,
    rule: Omit<ExclusionRule, 'id' | 'userId' | 'createdAt' | 'affectedProducts'>
  ): Promise<ExclusionRule> {
    try {
      const query = `
        INSERT INTO exclusion_rules (user_id, rule_type, rule_value, description, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *
      `

      const result = await pool.query(query, [
        userId,
        rule.ruleType,
        rule.ruleValue,
        rule.description,
        rule.isActive,
      ])

      const createdRule = result.rows[0]

      // Apply rule to existing products
      await this.applyExclusionRule(userId, createdRule.id)

      // Get affected products count
      const affectedCount = await this.getAffectedProductsCount(userId, createdRule.id)

      const responseRule: ExclusionRule = {
        id: createdRule.id,
        userId: createdRule.user_id,
        ruleType: createdRule.rule_type,
        ruleValue: createdRule.rule_value,
        description: createdRule.description,
        isActive: createdRule.is_active,
        createdAt: createdRule.created_at,
        affectedProducts: affectedCount,
      }

      logger.info('Exclusion rule created', {
        userId,
        ruleId: createdRule.id,
        ruleType: rule.ruleType,
        ruleValue: rule.ruleValue,
      })

      return responseRule

    } catch (error) {
      logger.error('Failed to create exclusion rule', error)
      throw error
    }
  }

  /**
   * Get exclusion rules for a user
   */
  async getExclusionRules(userId: string): Promise<ExclusionRule[]> {
    try {
      const query = `
        SELECT 
          er.*,
          COUNT(pe.record_id) as affected_products
        FROM exclusion_rules er
        LEFT JOIN product_exclusions pe ON er.id = pe.rule_id
        WHERE er.user_id = $1
        GROUP BY er.id
        ORDER BY er.created_at DESC
      `

      const result = await pool.query(query, [userId])

      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        ruleType: row.rule_type,
        ruleValue: row.rule_value,
        description: row.description,
        isActive: row.is_active,
        createdAt: row.created_at,
        affectedProducts: parseInt(row.affected_products) || 0,
      }))

    } catch (error) {
      logger.error('Failed to get exclusion rules', error)
      throw error
    }
  }

  /**
   * Update exclusion rule
   */
  async updateExclusionRule(
    userId: string,
    ruleId: string,
    updates: Partial<ExclusionRule>
  ): Promise<void> {
    try {
      const setClause = []
      const values = []
      let paramIndex = 1

      if (updates.ruleType !== undefined) {
        setClause.push(`rule_type = $${paramIndex++}`)
        values.push(updates.ruleType)
      }
      if (updates.ruleValue !== undefined) {
        setClause.push(`rule_value = $${paramIndex++}`)
        values.push(updates.ruleValue)
      }
      if (updates.description !== undefined) {
        setClause.push(`description = $${paramIndex++}`)
        values.push(updates.description)
      }
      if (updates.isActive !== undefined) {
        setClause.push(`is_active = $${paramIndex++}`)
        values.push(updates.isActive)
      }

      if (setClause.length === 0) return

      setClause.push(`updated_at = NOW()`)

      const query = `
        UPDATE exclusion_rules 
        SET ${setClause.join(', ')}
        WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
      `

      values.push(ruleId, userId)

      await pool.query(query, values)

      // Re-apply rule if it was updated
      if (updates.ruleType !== undefined || updates.ruleValue !== undefined || updates.isActive !== undefined) {
        await this.applyExclusionRule(userId, ruleId)
      }

      logger.info('Exclusion rule updated', {
        userId,
        ruleId,
        updates,
      })

    } catch (error) {
      logger.error('Failed to update exclusion rule', error)
      throw error
    }
  }

  /**
   * Delete exclusion rule
   */
  async deleteExclusionRule(userId: string, ruleId: string): Promise<void> {
    try {
      await pool.query('BEGIN')

      // Remove exclusions created by this rule
      await pool.query(
        'DELETE FROM product_exclusions WHERE rule_id = $1 AND user_id = $2',
        [ruleId, userId]
      )

      // Delete the rule
      await pool.query(
        'DELETE FROM exclusion_rules WHERE id = $1 AND user_id = $2',
        [ruleId, userId]
      )

      await pool.query('COMMIT')

      logger.info('Exclusion rule deleted', {
        userId,
        ruleId,
      })

    } catch (error) {
      await pool.query('ROLLBACK')
      logger.error('Failed to delete exclusion rule', error)
      throw error
    }
  }

  /**
   * Apply exclusion rule to products
   */
  private async applyExclusionRule(userId: string, ruleId: string): Promise<void> {
    try {
      // Get rule details
      const ruleQuery = `
        SELECT rule_type, rule_value, is_active
        FROM exclusion_rules
        WHERE id = $1 AND user_id = $2
      `

      const ruleResult = await pool.query(ruleQuery, [ruleId, userId])
      if (ruleResult.rows.length === 0) return

      const rule = ruleResult.rows[0]

      // Remove existing exclusions from this rule
      await pool.query(
        'DELETE FROM product_exclusions WHERE rule_id = $1 AND user_id = $2',
        [ruleId, userId]
      )

      if (!rule.is_active) return

      // Build WHERE clause based on rule type
      let whereClause = ''
      let params: any[] = [userId]

      switch (rule.rule_type) {
        case 'provider':
          whereClause = 'AND pr.provider_name = $2'
          params.push(rule.rule_value)
          break
        case 'product_type':
          whereClause = 'AND pr.product_type = $2'
          params.push(rule.rule_value)
          break
        case 'cost_range':
          if (rule.rule_value.startsWith('>')) {
            const threshold = parseFloat(rule.rule_value.substring(1))
            whereClause = 'AND pr.annual_cost > $2'
            params.push(threshold)
          } else if (rule.rule_value.startsWith('<')) {
            const threshold = parseFloat(rule.rule_value.substring(1))
            whereClause = 'AND pr.annual_cost < $2'
            params.push(threshold)
          }
          break
        case 'custom':
          // Custom rules would need more complex logic
          break
      }

      // Apply rule to matching products
      const applyQuery = `
        INSERT INTO product_exclusions (user_id, record_id, is_excluded, exclusion_reason, exclusion_date, rule_id)
        SELECT 
          $1,
          pr.record_id,
          true,
          $3,
          NOW(),
          $4
        FROM product_records pr
        WHERE pr.user_id = $1
          AND pr.status = 'active'
          ${whereClause}
        ON CONFLICT (user_id, record_id) 
        DO UPDATE SET
          is_excluded = EXCLUDED.is_excluded,
          exclusion_reason = EXCLUDED.exclusion_reason,
          exclusion_date = EXCLUDED.exclusion_date,
          rule_id = EXCLUDED.rule_id,
          updated_at = NOW()
      `

      await pool.query(applyQuery, [
        params[0], // userId
        ruleId,
        `Applied by rule: ${rule.description}`,
        ruleId,
      ])

    } catch (error) {
      logger.error('Failed to apply exclusion rule', error)
      throw error
    }
  }

  /**
   * Get affected products count for a rule
   */
  private async getAffectedProductsCount(userId: string, ruleId: string): Promise<number> {
    try {
      const result = await pool.query(
        'SELECT COUNT(*) as count FROM product_exclusions WHERE rule_id = $1 AND user_id = $2',
        [ruleId, userId]
      )

      return parseInt(result.rows[0].count)

    } catch (error) {
      logger.error('Failed to get affected products count', error)
      return 0
    }
  }

  /**
   * Get exclusion settings for a user
   */
  async getExclusionSettings(userId: string): Promise<ExclusionSettings | null> {
    try {
      const query = `
        SELECT * FROM exclusion_settings
        WHERE user_id = $1
      `

      const result = await pool.query(query, [userId])

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]

      return {
        userId: row.user_id,
        excludeCancelledProducts: row.exclude_cancelled_products,
        excludeLowValueProducts: row.exclude_low_value_products,
        lowValueThreshold: row.low_value_threshold,
        autoRenewalExclusions: row.auto_renewal_exclusions,
        notificationPreferences: {
          renewalAlerts: row.notification_preferences.renewal_alerts,
          priceHikeAlerts: row.notification_preferences.price_hike_alerts,
          comparisonAlerts: row.notification_preferences.comparison_alerts,
        },
      }

    } catch (error) {
      logger.error('Failed to get exclusion settings', error)
      throw error
    }
  }

  /**
   * Update exclusion settings for a user
   */
  async updateExclusionSettings(userId: string, settings: ExclusionSettings): Promise<void> {
    try {
      const query = `
        INSERT INTO exclusion_settings (
          user_id, exclude_cancelled_products, exclude_low_value_products,
          low_value_threshold, auto_renewal_exclusions, notification_preferences,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET
          exclude_cancelled_products = EXCLUDED.exclude_cancelled_products,
          exclude_low_value_products = EXCLUDED.exclude_low_value_products,
          low_value_threshold = EXCLUDED.low_value_threshold,
          auto_renewal_exclusions = EXCLUDED.auto_renewal_exclusions,
          notification_preferences = EXCLUDED.notification_preferences,
          updated_at = NOW()
      `

      await pool.query(query, [
        userId,
        settings.excludeCancelledProducts,
        settings.excludeLowValueProducts,
        settings.lowValueThreshold,
        settings.autoRenewalExclusions,
        JSON.stringify(settings.notificationPreferences),
      ])

      // Apply settings to existing products
      await this.applyExclusionSettings(userId)

      logger.info('Exclusion settings updated', {
        userId,
        settings,
      })

    } catch (error) {
      logger.error('Failed to update exclusion settings', error)
      throw error
    }
  }

  /**
   * Apply exclusion settings to products
   */
  private async applyExclusionSettings(userId: string): Promise<void> {
    try {
      const settings = await this.getExclusionSettings(userId)
      if (!settings) return

      // Exclude cancelled products
      if (settings.excludeCancelledProducts) {
        await pool.query(`
          INSERT INTO product_exclusions (user_id, record_id, is_excluded, exclusion_reason, exclusion_date)
          SELECT 
            user_id,
            record_id,
            true,
            'Automatically excluded: Cancelled product',
            NOW()
          FROM product_records
          WHERE user_id = $1 AND status = 'cancelled' AND record_id NOT IN (
            SELECT record_id FROM product_exclusions WHERE user_id = $1
          )
          ON CONFLICT (user_id, record_id) 
          DO UPDATE SET
            is_excluded = EXCLUDED.is_excluded,
            exclusion_reason = EXCLUDED.exclusion_reason,
            exclusion_date = EXCLUDED.exclusion_date,
            updated_at = NOW()
        `, [userId])
      }

      // Exclude low value products
      if (settings.excludeLowValueProducts) {
        await pool.query(`
          INSERT INTO product_exclusions (user_id, record_id, is_excluded, exclusion_reason, exclusion_date)
          SELECT 
            user_id,
            record_id,
            true,
            'Automatically excluded: Low value product',
            NOW()
          FROM product_records
          WHERE user_id = $1 
            AND annual_cost < $2 
            AND status = 'active'
            AND record_id NOT IN (
              SELECT record_id FROM product_exclusions WHERE user_id = $1
            )
          ON CONFLICT (user_id, record_id) 
          DO UPDATE SET
            is_excluded = EXCLUDED.is_excluded,
            exclusion_reason = EXCLUDED.exclusion_reason,
            exclusion_date = EXCLUDED.exclusion_date,
            updated_at = NOW()
        `, [userId, settings.lowValueThreshold])
      }

    } catch (error) {
      logger.error('Failed to apply exclusion settings', error)
      throw error
    }
  }

  /**
   * Check if a product is excluded
   */
  async isProductExcluded(userId: string, recordId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        'SELECT is_excluded FROM product_exclusions WHERE user_id = $1 AND record_id = $2',
        [userId, recordId]
      )

      return result.rows.length > 0 && result.rows[0].is_excluded

    } catch (error) {
      logger.error('Failed to check product exclusion', error)
      return false
    }
  }

  /**
   * Get products with exclusion status
   */
  async getProductsWithExclusionStatus(userId: string): Promise<any[]> {
    try {
      const query = `
        SELECT 
          pr.*,
          pe.is_excluded,
          pe.exclusion_reason,
          pe.exclusion_date,
          pe.rule_id
        FROM product_records pr
        LEFT JOIN product_exclusions pe ON pr.record_id = pe.record_id AND pe.user_id = pr.user_id
        WHERE pr.user_id = $1
        ORDER BY pr.provider_name, pr.product_type
      `

      const result = await pool.query(query, [userId])

      return result.rows.map(row => ({
        recordId: row.record_id,
        userId: row.user_id,
        providerName: row.provider_name,
        productType: row.product_type,
        annualCost: parseFloat(row.annual_cost),
        status: row.status,
        contractEndDate: row.contract_end_date,
        tariffName: row.tariff_name,
        lastUpdated: row.last_updated,
        createdAt: row.created_at,
        isExcluded: row.is_excluded || false,
        exclusionReason: row.exclusion_reason,
        exclusionDate: row.exclusion_date,
      }))

    } catch (error) {
      logger.error('Failed to get products with exclusion status', error)
      throw error
    }
  }

  /**
   * Get exclusion statistics
   */
  async getExclusionStatistics(userId: string): Promise<{
    totalProducts: number
    excludedProducts: number
    includedProducts: number
    activeRules: number
    exclusionRate: number
  }> {
    try {
      const [productsResult, rulesResult] = await Promise.all([
        pool.query('SELECT COUNT(*) as total FROM product_records WHERE user_id = $1', [userId]),
        pool.query('SELECT COUNT(*) as total FROM exclusion_rules WHERE user_id = $1 AND is_active = true', [userId]),
      ])

      const totalProducts = parseInt(productsResult.rows[0].total)
      const activeRules = parseInt(rulesResult.rows[0].total)

      const excludedResult = await pool.query(
        'SELECT COUNT(*) as total FROM product_exclusions WHERE user_id = $1 AND is_excluded = true',
        [userId]
      )

      const excludedProducts = parseInt(excludedResult.rows[0].total)
      const includedProducts = totalProducts - excludedProducts
      const exclusionRate = totalProducts > 0 ? (excludedProducts / totalProducts) * 100 : 0

      return {
        totalProducts,
        excludedProducts,
        includedProducts,
        activeRules,
        exclusionRate,
      }

    } catch (error) {
      logger.error('Failed to get exclusion statistics', error)
      throw error
    }
  }
}

// Export singleton instance
export const productExclusionService = new ProductExclusionService()

// Export types for use in other modules
export type {
  ProductExclusion,
  ExclusionRule,
  ExclusionSettings,
}
