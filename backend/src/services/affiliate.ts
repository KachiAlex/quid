/**
 * Affiliate Network Integration Service
 * Currently supports Awin network for UK insurance and energy providers
 */

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

/**
 * Generate an affiliate tracking link for a provider
 * @param providerName - The name of the provider (e.g., "Aviva", "Admiral")
 * @param productType - The product category (e.g., "car_insurance", "energy")
 * @param trackingRef - Unique reference for this switch
 * @returns The affiliate URL with tracking parameters
 */
export function generateAffiliateLink(
  providerName: string,
  productType: string,
  trackingRef: string
): string {
  // Map providers to their Awin merchant IDs
  // TODO: This should be populated from a database or config file
  const merchantMap: Record<string, string> = {
    // Car Insurance
    'Aviva': '12345',
    'Admiral': '12346',
    'Direct Line': '12347',
    'Churchill': '12348',
    'LV': '12349',
    // Home Insurance
    'Hiscox': '12350',
    // Energy
    'British Gas': '22345',
    'Octopus Energy': '22346',
    'EDF Energy': '22347',
    'E.ON': '22348',
    'ScottishPower': '22349',
  }

  const merchantId = merchantMap[providerName]

  if (!merchantId) {
    // Fallback: return a generic URL if merchant not found
    // In production, this should log an error and alert the team
    console.warn(`No merchant ID found for provider: ${providerName}`)
    return `https://www.google.com/search?q=${encodeURIComponent(providerName + ' ' + productType)}`
  }

  // Generate Awin deep link
  // Format: https://www.awin1.com/cread.php?s=XXXXX&m=XXXXX&u=YYYYY&p=ZZZZZ
  const baseUrl = 'https://www.awin1.com/cread.php'
  const params = new URLSearchParams({
    s: AWIN_CONFIG.publisherId,
    m: merchantId,
    u: trackingRef,
    p: productType,
  })

  return `${baseUrl}?${params.toString()}`
}

/**
 * Verify a commission report from Awin
 * This would be called by a webhook when Awin reports a conversion
 * @param affiliateRef - The tracking reference from the switch intent
 * @param commissionData - Commission data from Awin
 */
export async function verifyCommission(
  affiliateRef: string,
  commissionData: {
    amount: number
    currency: string
    merchantId: string
  }
): Promise<boolean> {
  // TODO: Implement Awin API verification
  // This would call Awin's API to verify the commission report
  // For now, return true for testing
  return true
}

/**
 * Get commission rate for a provider and product type
 * @param providerName - The provider name
 * @param productType - The product category
 * @returns Commission rate as a percentage (e.g., 15 for 15%)
 */
export function getCommissionRate(providerName: string, productType: string): number {
  // TODO: This should be fetched from a database
  // Default commission rates for testing
  const defaultRates: Record<string, number> = {
    car_insurance: 15,
    home_insurance: 12,
    life_insurance: 20,
    pet_insurance: 18,
    energy: 8,
    broadband: 10,
  }

  return defaultRates[productType] || 10
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
