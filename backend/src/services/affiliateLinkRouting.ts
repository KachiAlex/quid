/**
 * Affiliate Link Routing Service
 * Handles tracking, redirection, and analytics for affiliate links
 */

import { pool } from '../db'
import { logger } from '../config/logger'
import { awinIntegration } from './awinIntegration'

interface LinkRoutingRequest {
  trackingId: string
  userAgent?: string
  ipAddress?: string
  referrer?: string
}

interface LinkRoutingResponse {
  redirectUrl: string
  trackingId: string
  clickId: string
  metadata: {
    merchantName: string
    productType: string
    originalUrl: string
    userId: string
  }
}

interface ClickAnalytics {
  clickId: string
  trackingId: string
  userId: string
  merchantId: string
  merchantName: string
  productType: string
  clickTimestamp: Date
  ipAddress: string
  userAgent: string
  referrer: string
  destinationUrl: string
  conversionStatus: 'pending' | 'converted' | 'expired'
  conversionTimestamp?: Date
  commissionAmount?: number
}

class AffiliateLinkRouting {
  /**
   * Process affiliate link click and generate redirect
   */
  async processLinkClick(request: LinkRoutingRequest): Promise<LinkRoutingResponse> {
    try {
      // Validate tracking ID
      const clickData = await this.validateTrackingId(request.trackingId)
      
      if (!clickData) {
        throw new Error('Invalid or expired tracking ID')
      }

      // Record click analytics
      const clickId = await this.recordClickAnalytics(request, clickData)

      // Generate redirect URL
      const redirectUrl = await this.generateRedirectUrl(clickData)

      // Update click statistics
      await this.updateClickStatistics(clickData)

      logger.info('Affiliate link processed', {
        trackingId: request.trackingId,
        clickId,
        merchantId: clickData.merchantId,
        userId: clickData.userId,
      })

      return {
        redirectUrl,
        trackingId: request.trackingId,
        clickId,
        metadata: {
          merchantName: clickData.merchantName,
          productType: clickData.productType,
          originalUrl: clickData.destinationUrl,
          userId: clickData.userId,
        },
      }

    } catch (error) {
      logger.error('Failed to process affiliate link click', error)
      throw error
    }
  }

  /**
   * Validate tracking ID and retrieve associated data
   */
  private async validateTrackingId(trackingId: string): Promise<{
    userId: string
    merchantId: string
    merchantName: string
    productType: string
    destinationUrl: string
    campaignId?: string
    subId?: string
    expiresAt?: Date
  } | null> {
    const result = await pool.query(
      `SELECT 
         ac.user_id,
         ac.merchant_id,
         am.provider_name as merchant_name,
         ac.product_type,
         ac.destination_url,
         ac.campaign_id,
         ac.sub_id,
         ac.click_timestamp,
         CASE 
           WHEN ac.click_timestamp < NOW() - INTERVAL '30 days' THEN true
           ELSE false
         END as expired
       FROM affiliate_clicks ac
       JOIN affiliate_merchants am ON ac.merchant_id = am.awin_merchant_id
       WHERE ac.tracking_id = $1`,
      [trackingId]
    )

    if (result.rows.length === 0) {
      return null
    }

    const clickData = result.rows[0]

    if (clickData.expired) {
      logger.warn('Tracking ID expired', { trackingId })
      return null
    }

    return {
      userId: clickData.user_id,
      merchantId: clickData.merchant_id,
      merchantName: clickData.merchant_name,
      productType: clickData.product_type,
      destinationUrl: clickData.destination_url,
      campaignId: clickData.campaign_id,
      subId: clickData.sub_id,
    }
  }

  /**
   * Record detailed click analytics
   */
  private async recordClickAnalytics(
    request: LinkRoutingRequest,
    clickData: any
  ): Promise<string> {
    const result = await pool.query(
      `INSERT INTO affiliate_click_analytics 
       (tracking_id, click_timestamp, ip_address, user_agent, referrer, user_id, merchant_id, product_type, destination_url)
       VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        request.trackingId,
        request.ipAddress || '0.0.0.0',
        request.userAgent || 'Unknown',
        request.referrer || 'Direct',
        clickData.userId,
        clickData.merchantId,
        clickData.productType,
        clickData.destinationUrl,
      ]
    )

    return result.rows[0].id.toString()
  }

  /**
   * Generate redirect URL with enhanced tracking
   */
  private async generateRedirectUrl(clickData: any): Promise<string> {
    // Use Awin integration to generate affiliate URL
    const affiliateLink = await awinIntegration.generateAffiliateLink({
      userId: clickData.userId,
      merchantId: clickData.merchantId,
      productType: clickData.productType,
      destinationUrl: clickData.destinationUrl,
      campaignId: clickData.campaignId,
      subId: clickData.subId,
    })

    return affiliateLink.affiliateUrl
  }

  /**
   * Update click statistics for analytics
   */
  private async updateClickStatistics(clickData: any): Promise<void> {
    await pool.query(
      `INSERT INTO affiliate_click_statistics 
       (date, merchant_id, product_type, click_count)
       VALUES (CURRENT_DATE, $1, $2, 1)
       ON CONFLICT (date, merchant_id, product_type)
       DO UPDATE SET click_count = affiliate_click_statistics.click_count + 1`,
      [clickData.merchantId, clickData.productType]
    )
  }

  /**
   * Get click analytics for a tracking ID
   */
  async getClickAnalytics(trackingId: string): Promise<ClickAnalytics[]> {
    const result = await pool.query(
      `SELECT 
         aca.id as click_id,
         aca.tracking_id,
         aca.user_id,
         aca.merchant_id,
         am.provider_name as merchant_name,
         aca.product_type,
         aca.click_timestamp,
         aca.ip_address,
         aca.user_agent,
         aca.referrer,
         aca.destination_url,
         COALESCE(afc.conversion_type, 'pending') as conversion_status,
         afc.conversion_timestamp,
         afc.commission_amount
       FROM affiliate_click_analytics aca
       JOIN affiliate_merchants am ON aca.merchant_id = am.awin_merchant_id
       LEFT JOIN affiliate_conversions afc ON aca.tracking_id = afc.tracking_id
       WHERE aca.tracking_id = $1
       ORDER BY aca.click_timestamp DESC`,
      [trackingId]
    )

    return result.rows.map(row => ({
      clickId: row.click_id,
      trackingId: row.tracking_id,
      userId: row.user_id,
      merchantId: row.merchant_id,
      merchantName: row.merchant_name,
      productType: row.product_type,
      clickTimestamp: row.click_timestamp,
      ipAddress: row.ip_address,
      userAgent: row.userAgent,
      referrer: row.referrer,
      destinationUrl: row.destination_url,
      conversionStatus: row.conversion_status,
      conversionTimestamp: row.conversion_timestamp,
      commissionAmount: row.commission_amount ? parseFloat(row.commission_amount) : undefined,
    }))
  }

  /**
   * Get user's click history
   */
  async getUserClickHistory(userId: string, limit: number = 50): Promise<ClickAnalytics[]> {
    const result = await pool.query(
      `SELECT 
         aca.id as click_id,
         aca.tracking_id,
         aca.user_id,
         aca.merchant_id,
         am.provider_name as merchant_name,
         aca.product_type,
         aca.click_timestamp,
         aca.ip_address,
         aca.user_agent,
         aca.referrer,
         aca.destination_url,
         COALESCE(afc.conversion_type, 'pending') as conversion_status,
         afc.conversion_timestamp,
         afc.commission_amount
       FROM affiliate_click_analytics aca
       JOIN affiliate_merchants am ON aca.merchant_id = am.awin_merchant_id
       LEFT JOIN affiliate_conversions afc ON aca.tracking_id = afc.tracking_id
       WHERE aca.user_id = $1
       ORDER BY aca.click_timestamp DESC
       LIMIT $2`,
      [userId, limit]
    )

    return result.rows.map(row => ({
      clickId: row.click_id,
      trackingId: row.tracking_id,
      userId: row.user_id,
      merchantId: row.merchant_id,
      merchantName: row.merchant_name,
      productType: row.product_type,
      clickTimestamp: row.click_timestamp,
      ipAddress: row.ip_address,
      userAgent: row.userAgent,
      referrer: row.referrer,
      destinationUrl: row.destinationUrl,
      conversionStatus: row.conversion_status,
      conversionTimestamp: row.conversion_timestamp,
      commissionAmount: row.commission_amount ? parseFloat(row.commission_amount) : undefined,
    }))
  }

  /**
   * Get merchant performance analytics
   */
  async getMerchantPerformance(
    merchantId?: string,
    dateRange?: { from: Date; to: Date }
  ): Promise<{
    merchantId: string
    merchantName: string
    totalClicks: number
    totalConversions: number
    conversionRate: number
    totalCommission: number
    averageCommission: number
  }[]> {
    let whereClause = 'WHERE 1=1'
    const params: any[] = []
    let paramIndex = 1

    if (merchantId) {
      whereClause += ` AND aca.merchant_id = $${paramIndex++}`
      params.push(merchantId)
    }

    if (dateRange) {
      whereClause += ` AND aca.click_timestamp >= $${paramIndex++} AND aca.click_timestamp <= $${paramIndex++}`
      params.push(dateRange.from, dateRange.to)
    }

    const query = `
      SELECT 
        aca.merchant_id,
        am.provider_name as merchant_name,
        COUNT(DISTINCT aca.id) as total_clicks,
        COUNT(DISTINCT afc.tracking_id) as total_conversions,
        COALESCE(SUM(afc.commission_amount), 0) as total_commission
      FROM affiliate_click_analytics aca
      JOIN affiliate_merchants am ON aca.merchant_id = am.awin_merchant_id
      LEFT JOIN affiliate_conversions afc ON aca.tracking_id = afc.tracking_id
      ${whereClause}
      GROUP BY aca.merchant_id, am.provider_name
      ORDER BY total_commission DESC
    `

    const result = await pool.query(query, params)

    return result.rows.map(row => ({
      merchantId: row.merchant_id,
      merchantName: row.merchant_name,
      totalClicks: parseInt(row.total_clicks),
      totalConversions: parseInt(row.total_conversions),
      conversionRate: row.total_clicks > 0 ? (row.total_conversions / row.total_clicks) * 100 : 0,
      totalCommission: parseFloat(row.total_commission),
      averageCommission: row.total_conversions > 0 ? row.total_commission / row.total_conversions : 0,
    }))
  }

  /**
   * Generate short URL for tracking
   */
  async generateShortUrl(trackingId: string): Promise<string> {
    const shortCode = this.generateShortCode(trackingId)
    
    await pool.query(
      `INSERT INTO affiliate_short_urls 
       (tracking_id, short_code, created_at, expires_at)
       VALUES ($1, $2, NOW(), NOW() + INTERVAL '30 days')
       ON CONFLICT (tracking_id) DO UPDATE SET 
         short_code = EXCLUDED.short_code,
         expires_at = EXCLUDED.expires_at`,
      [trackingId, shortCode]
    )

    return `${process.env.BASE_URL || 'https://quid.app'}/go/${shortCode}`
  }

  /**
   * Resolve short URL to tracking ID
   */
  async resolveShortUrl(shortCode: string): Promise<string | null> {
    const result = await pool.query(
      `SELECT tracking_id 
       FROM affiliate_short_urls 
       WHERE short_code = $1 AND expires_at > NOW()`,
      [shortCode]
    )

    return result.rows.length > 0 ? result.rows[0].tracking_id : null
  }

  /**
   * Generate short code from tracking ID
   */
  private generateShortCode(trackingId: string): string {
    // Create a short, URL-safe code
    const hash = require('crypto').createHash('md5').update(trackingId).digest('hex')
    return hash.substring(0, 8)
  }

  /**
   * Cleanup expired tracking data
   */
  async cleanupExpiredData(): Promise<number> {
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // Delete expired short URLs
      const shortUrlResult = await client.query(
        'DELETE FROM affiliate_short_urls WHERE expires_at < NOW() RETURNING id'
      )

      // Archive old click analytics (older than 1 year)
      const analyticsResult = await client.query(
        `DELETE FROM affiliate_click_analytics 
         WHERE click_timestamp < NOW() - INTERVAL '1 year'
         RETURNING id`
      )

      await client.query('COMMIT')

      const totalDeleted = shortUrlResult.rows.length + analyticsResult.rows.length
      logger.info('Cleaned up expired affiliate data', { totalDeleted })

      return totalDeleted

    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('Failed to cleanup expired affiliate data', error)
      throw error
    } finally {
      client.release()
    }
  }
}

// Export singleton instance
export const affiliateLinkRouting = new AffiliateLinkRouting()

// Export types for use in other modules
export type {
  LinkRoutingRequest,
  LinkRoutingResponse,
  ClickAnalytics,
}
