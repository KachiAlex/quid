/**
 * Awin Affiliate Network Integration Service
 * Handles affiliate link generation, tracking, and commission management
 */

import { pool } from '../db'
import { logger } from '../config/logger'

interface AwinMerchant {
  merchantId: string
  merchantName: string
  productTypes: string[]
  commissionRate: number
  deepLinkSupported: boolean
  trackingCode: string
}

interface AffiliateLinkRequest {
  userId: string
  merchantId: string
  productType: string
  destinationUrl: string
  campaignId?: string
  subId?: string
}

interface AffiliateLinkResponse {
  affiliateUrl: string
  trackingId: string
  merchantId: string
  expiresAt?: Date
}

interface ClickTracking {
  trackingId: string
  userId: string
  merchantId: string
  productType: string
  clickTimestamp: Date
  ipAddress: string
  userAgent: string
  destinationUrl: string
}

interface ConversionTracking {
  trackingId: string
  userId: string
  merchantId: string
  productType: string
  conversionType: 'lead' | 'sale'
  conversionValue: number
  commissionAmount: number
  conversionTimestamp: Date
  orderId?: string
  currency?: string
}

class AwinIntegration {
  private apiKey: string
  private publisherId: string
  private baseUrl: string

  constructor() {
    this.apiKey = process.env.AWIN_API_KEY || ''
    this.publisherId = process.env.AWIN_PUBLISHER_ID || ''
    this.baseUrl = 'https://api.awin.com'
  }

  /**
   * Get all active Awin merchants from database
   */
  async getActiveMerchants(): Promise<AwinMerchant[]> {
    const result = await pool.query(
      `SELECT 
         awin_merchant_id,
         provider_name,
         product_types,
         active,
         created_at
       FROM affiliate_merchants
       WHERE active = true
       ORDER BY provider_name`
    )

    // Get commission rates for each merchant
    const merchants: AwinMerchant[] = []
    for (const row of result.rows) {
      const commissionResult = await pool.query(
        `SELECT rate_percent 
         FROM commission_rates 
         WHERE provider_name = $1 
         ORDER BY effective_from DESC 
         LIMIT 1`,
        [row.provider_name]
      )

      merchants.push({
        merchantId: row.awin_merchant_id,
        merchantName: row.provider_name,
        productTypes: row.product_types,
        commissionRate: parseFloat(commissionResult.rows[0]?.rate_percent || '0'),
        deepLinkSupported: true, // Assume all support deep linking
        trackingCode: `quid_${row.provider_name.toLowerCase().replace(/\s+/g, '_')}`,
      })
    }

    return merchants
  }

  /**
   * Generate affiliate link using Awin API
   */
  async generateAffiliateLink(request: AffiliateLinkRequest): Promise<AffiliateLinkResponse> {
    try {
      // Validate merchant exists and supports requested product type
      const merchant = await this.validateMerchant(request.merchantId, request.productType)
      if (!merchant) {
        throw new Error(`Merchant ${request.merchantId} not found or doesn't support ${request.productType}`)
      }

      // Generate tracking ID
      const trackingId = this.generateTrackingId(request.userId, request.merchantId)

      // Build affiliate URL
      const affiliateUrl = this.buildAffiliateUrl(request, trackingId, merchant)

      // Store click tracking record
      await this.storeClickTracking({
        trackingId,
        userId: request.userId,
        merchantId: request.merchantId,
        productType: request.productType,
        clickTimestamp: new Date(),
        ipAddress: '0.0.0.0', // Would be extracted from request
        userAgent: 'Mozilla/5.0...', // Would be extracted from request
        destinationUrl: request.destinationUrl,
      })

      // Log affiliate link generation
      logger.info('Generated affiliate link', {
        trackingId,
        userId: request.userId,
        merchantId: request.merchantId,
        productType: request.productType,
      })

      return {
        affiliateUrl,
        trackingId,
        merchantId: request.merchantId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      }

    } catch (error) {
      logger.error('Failed to generate affiliate link', error)
      throw error
    }
  }

  /**
   * Validate merchant exists and supports product type
   */
  private async validateMerchant(merchantId: string, productType: string): Promise<AwinMerchant | null> {
    const merchants = await this.getActiveMerchants()
    return merchants.find(m => 
      m.merchantId === merchantId && 
      m.productTypes.includes(productType)
    ) || null
  }

  /**
   * Generate unique tracking ID
   */
  private generateTrackingId(userId: string, merchantId: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `${userId}_${merchantId}_${timestamp}_${random}`
  }

  /**
   * Build affiliate URL with tracking parameters
   */
  private buildAffiliateUrl(request: AffiliateLinkRequest, trackingId: string, merchant: AwinMerchant): string {
    const baseUrl = `https://www.awin1.com/cread.php?awinmid=${merchant.merchantId}&awinaffid=${this.publisherId}`
    
    const params = new URLSearchParams({
     ued: request.destinationUrl,
      p: merchant.productTypes[0], // Primary product type
      clickref: trackingId,
    })

    // Add optional parameters
    if (request.campaignId) {
      params.append('campaign', request.campaignId)
    }
    
    if (request.subId) {
      params.append('subid', request.subId)
    }

    return `${baseUrl}&${params.toString()}`
  }

  /**
   * Store click tracking record
   */
  private async storeClickTracking(clickData: ClickTracking): Promise<void> {
    await pool.query(
      `INSERT INTO affiliate_clicks 
       (tracking_id, user_id, merchant_id, product_type, click_timestamp, ip_address, user_agent, destination_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        clickData.trackingId,
        clickData.userId,
        clickData.merchantId,
        clickData.productType,
        clickData.clickTimestamp,
        clickData.ipAddress,
        clickData.userAgent,
        clickData.destinationUrl,
      ]
    )
  }

  /**
   * Track conversion (called by webhook from Awin)
   */
  async trackConversion(conversionData: ConversionTracking): Promise<void> {
    try {
      // Validate tracking ID exists
      const clickResult = await pool.query(
        'SELECT user_id, merchant_id, product_type FROM affiliate_clicks WHERE tracking_id = $1',
        [conversionData.trackingId]
      )

      if (clickResult.rows.length === 0) {
        logger.warn('Conversion tracking failed - tracking ID not found', {
          trackingId: conversionData.trackingId,
        })
        return
      }

      // Store conversion record
      await pool.query(
        `INSERT INTO affiliate_conversions 
         (tracking_id, user_id, merchant_id, product_type, conversion_type, conversion_value, commission_amount, conversion_timestamp, order_id, currency)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          conversionData.trackingId,
          conversionData.userId,
          conversionData.merchantId,
          conversionData.productType,
          conversionData.conversionType,
          conversionData.conversionValue,
          conversionData.commissionAmount,
          conversionData.conversionTimestamp,
          conversionData.orderId,
          conversionData.currency || 'GBP',
        ]
      )

      // Update user's switch history
      await this.updateSwitchHistory(conversionData)

      logger.info('Conversion tracked successfully', {
        trackingId: conversionData.trackingId,
        userId: conversionData.userId,
        merchantId: conversionData.merchantId,
        commissionAmount: conversionData.commissionAmount,
      })

    } catch (error) {
      logger.error('Failed to track conversion', error)
      throw error
    }
  }

  /**
   * Update user's switch history when conversion occurs
   */
  private async updateSwitchHistory(conversionData: ConversionTracking): Promise<void> {
    await pool.query(
      `UPDATE user_switches 
       SET status = 'confirmed', 
           confirmation_date = NOW(),
           commission_earned = $1
       WHERE user_id = $2 
         AND new_provider = (SELECT provider_name FROM affiliate_merchants WHERE awin_merchant_id = $3)
         AND status = 'pending'`,
      [conversionData.commissionAmount, conversionData.userId, conversionData.merchantId]
    )
  }

  /**
   * Get affiliate performance statistics
   */
  async getPerformanceStats(userId?: string, dateRange?: { from: Date; to: Date }): Promise<{
    totalClicks: number
    totalConversions: number
    totalCommission: number
    conversionRate: number
    averageCommission: number
    topMerchants: Array<{
      merchantId: string
      merchantName: string
      clicks: number
      conversions: number
      commission: number
    }>
  }> {
    let whereClause = 'WHERE 1=1'
    const params: any[] = []
    let paramIndex = 1

    if (userId) {
      whereClause += ` AND ac.user_id = $${paramIndex++}`
      params.push(userId)
    }

    if (dateRange) {
      whereClause += ` AND ac.click_timestamp >= $${paramIndex++} AND ac.click_timestamp <= $${paramIndex++}`
      params.push(dateRange.from, dateRange.to)
    }

    const statsQuery = `
      SELECT 
        COUNT(DISTINCT ac.tracking_id) as total_clicks,
        COUNT(DISTINCT conv.tracking_id) as total_conversions,
        COALESCE(SUM(conv.commission_amount), 0) as total_commission
      FROM affiliate_clicks ac
      LEFT JOIN affiliate_conversions conv ON ac.tracking_id = conv.tracking_id
      ${whereClause}
    `

    const statsResult = await pool.query(statsQuery, params)
    const stats = statsResult.rows[0]

    const totalClicks = parseInt(stats.total_clicks)
    const totalConversions = parseInt(stats.total_conversions)
    const totalCommission = parseFloat(stats.total_commission)
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0
    const averageCommission = totalConversions > 0 ? totalCommission / totalConversions : 0

    // Get top merchants
    const merchantsQuery = `
      SELECT 
        am.awin_merchant_id,
        am.provider_name,
        COUNT(DISTINCT ac.tracking_id) as clicks,
        COUNT(DISTINCT conv.tracking_id) as conversions,
        COALESCE(SUM(conv.commission_amount), 0) as commission
      FROM affiliate_clicks ac
      JOIN affiliate_merchants am ON ac.merchant_id = am.awin_merchant_id
      LEFT JOIN affiliate_conversions conv ON ac.tracking_id = conv.tracking_id
      ${whereClause}
      GROUP BY am.awin_merchant_id, am.provider_name
      ORDER BY commission DESC
      LIMIT 10
    `

    const merchantsResult = await pool.query(merchantsQuery, params)
    const topMerchants = merchantsResult.rows.map(row => ({
      merchantId: row.awin_merchant_id,
      merchantName: row.provider_name,
      clicks: parseInt(row.clicks),
      conversions: parseInt(row.conversions),
      commission: parseFloat(row.commission),
    }))

    return {
      totalClicks,
      totalConversions,
      totalCommission,
      conversionRate,
      averageCommission,
      topMerchants,
    }
  }

  /**
   * Process Awin webhook for conversion tracking
   */
  async processWebhook(webhookData: any): Promise<void> {
    try {
      // Validate webhook signature (in production)
      // if (!this.validateWebhookSignature(webhookData)) {
      //   throw new Error('Invalid webhook signature')
      // }

      const conversionData: ConversionTracking = {
        trackingId: webhookData.clickref,
        userId: webhookData.subid || '', // Extract from subid if available
        merchantId: webhookData.awinmid.toString(),
        productType: webhookData.category || 'unknown',
        conversionType: webhookData.type === 'sale' ? 'sale' : 'lead',
        conversionValue: parseFloat(webhookData.amount || '0'),
        commissionAmount: parseFloat(webhookData.commission || '0'),
        conversionTimestamp: new Date(webhookData.timestamp),
        orderId: webhookData.order_id,
        currency: webhookData.currency,
      }

      await this.trackConversion(conversionData)

    } catch (error) {
      logger.error('Failed to process Awin webhook', error)
      throw error
    }
  }
}

// Export singleton instance
export const awinIntegration = new AwinIntegration()

// Export types for use in other modules
export type {
  AwinMerchant,
  AffiliateLinkRequest,
  AffiliateLinkResponse,
  ClickTracking,
  ConversionTracking,
}
