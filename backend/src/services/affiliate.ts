import { pool } from '../db'
import { logger } from '../config/logger'

interface AffiliateConfig {
  publisherId: string
  apiKey: string
  baseUrl: string
}

const AWIN_CONFIG: AffiliateConfig = {
  publisherId: process.env.AWIN_PUBLISHER_ID || '',
  apiKey: process.env.AWIN_API_KEY || '',
  baseUrl: 'https://api.awin.com',
}

async function getMerchantId(providerName: string): Promise<string | null> {
  try {
    const result = await pool.query(
      'SELECT awin_merchant_id FROM affiliate_merchants WHERE provider_name = $1 AND active = true',
      [providerName]
    )
    return result.rows[0]?.awin_merchant_id || null
  } catch (err) {
    logger.error('Failed to fetch merchant ID', err)
    return null
  }
}

export async function generateAffiliateLink(
  providerName: string,
  productType: string,
  trackingRef: string
): Promise<string> {
  const merchantId = await getMerchantId(providerName)

  if (!merchantId) {
    logger.warn(`No merchant ID found for provider: ${providerName}`)
    return `https://www.google.com/search?q=${encodeURIComponent(providerName + ' ' + productType)}`
  }

  const baseUrl = 'https://www.awin1.com/cread.php'
  const params = new URLSearchParams({
    s: AWIN_CONFIG.publisherId,
    m: merchantId,
    u: trackingRef,
    p: productType,
  })

  return `${baseUrl}?${params.toString()}`
}

export async function verifyCommission(
  affiliateRef: string,
  commissionData: {
    amount: number
    currency: string
    merchantId: string
  }
): Promise<boolean> {
  if (!AWIN_CONFIG.apiKey) {
    logger.warn('AWIN_API_KEY not configured — skipping commission verification')
    return false
  }
  try {
    const response = await fetch(
      `${AWIN_CONFIG.baseUrl}/publishers/${AWIN_CONFIG.publisherId}/transactions/?accessToken=${AWIN_CONFIG.apiKey}&reference=${affiliateRef}`,
      { headers: { 'Authorization': `Bearer ${AWIN_CONFIG.apiKey}` } }
    )
    if (!response.ok) return false
    const data = await response.json()
    return Array.isArray(data) && data.some((tx: any) => tx.advertiserId === commissionData.merchantId)
  } catch (err) {
    logger.error('Commission verification failed', err)
    return false
  }
}

export async function getCommissionRate(providerName: string, productType: string): Promise<number> {
  try {
    const result = await pool.query(
      `SELECT rate_percent FROM commission_rates
       WHERE provider_name = $1 AND product_type = $2 AND active = true
       ORDER BY effective_from DESC
       LIMIT 1`,
      [providerName, productType]
    )
    if (result.rows.length > 0) {
      return parseFloat(result.rows[0].rate_percent)
    }
  } catch (err) {
    logger.error('Failed to fetch commission rate', err)
  }
  return 10
}

/**
 * Calculate gross and net commission
 * @param savingAmount - The amount the user saves
 * @param commissionRate - Commission rate as percentage
 * @returns Object with gross and net commission
 */
export function calculateCommission(
  savingAmount: number,
  commissionRate: number
): { gross: number; net: number } {
  const gross = savingAmount * (commissionRate / 100)
  // Awin typically takes 30% of commission as their fee
  const net = gross * 0.7
  return { gross, net }
}
