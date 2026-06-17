/**
 * Overpayment Calculator Service
 * Calculates total overpayment across all user products by comparing to best available rates
 */

import { pool } from '../db'
import { logger } from '../config/logger'

interface ProductOverpayment {
  recordId: string
  productType: string
  providerName: string
  currentCost: number
  bestCost: number
  overpaymentAmount: number
  overpaymentPercent: number
  bestProvider: string
  potentialSavings: number
  lastUpdated: Date
}

interface OverpaymentSummary {
  totalOverpayment: number
  totalAnnualCost: number
  totalPotentialSavings: number
  overpaymentByProductType: Record<string, {
    totalOverpayment: number
    productCount: number
    averageOverpaymentPercent: number
  }>
  topOverpayments: ProductOverpayment[]
  productCount: number
  lastCalculated: Date
}

/**
 * Get the best available rate for a specific product type
 */
async function getBestRateForProductType(productType: string): Promise<{
  provider: string
  annualCost: number
  lastUpdated: Date
} | null> {
  const result = await pool.query(
    `SELECT provider, annual_cost, last_updated
     FROM rate_records
     WHERE product_type = $1
     ORDER BY annual_cost ASC
     LIMIT 1`,
    [productType]
  )

  if (result.rows.length === 0) {
    return null
  }

  return {
    provider: result.rows[0].provider,
    annualCost: parseFloat(result.rows[0].annual_cost),
    lastUpdated: result.rows[0].last_updated,
  }
}

/**
 * Calculate overpayment for a single product
 */
async function calculateProductOverpayment(
  userId: string,
  productRecord: any
): Promise<ProductOverpayment | null> {
  try {
    // Get best available rate for this product type
    const bestRate = await getBestRateForProductType(productRecord.product_type)
    
    if (!bestRate) {
      logger.warn(`No rate data available for product type: ${productRecord.product_type}`)
      return null
    }

    const currentCost = parseFloat(productRecord.annual_cost)
    const overpaymentAmount = Math.max(0, currentCost - bestRate.annualCost)
    const overpaymentPercent = currentCost > 0 ? (overpaymentAmount / currentCost) * 100 : 0

    return {
      recordId: productRecord.record_id,
      productType: productRecord.product_type,
      providerName: productRecord.provider_name,
      currentCost,
      bestCost: bestRate.annualCost,
      overpaymentAmount,
      overpaymentPercent,
      bestProvider: bestRate.provider,
      potentialSavings: overpaymentAmount,
      lastUpdated: bestRate.lastUpdated,
    }
  } catch (error) {
    logger.error(`Failed to calculate overpayment for product ${productRecord.record_id}`, error)
    return null
  }
}

/**
 * Calculate total overpayment for all user products
 */
export async function calculateTotalOverpayment(userId: string): Promise<OverpaymentSummary> {
  const client = await pool.connect()
  
  try {
    // Get all active user products (excluding excluded and dormant ones)
    const productsResult = await client.query(
      `SELECT record_id, product_type, provider_name, annual_cost, frequency
       FROM product_records
       WHERE user_id = $1 
         AND excluded = false 
         AND record_id NOT IN (
           SELECT product_record_id FROM dormant_subscriptions 
           WHERE status = 'confirmed_dormant'
         )
       ORDER BY annual_cost DESC`,
      [userId]
    )

    const products = productsResult.rows
    const overpayments: ProductOverpayment[] = []
    const overpaymentByProductType: Record<string, {
      totalOverpayment: number
      productCount: number
      averageOverpaymentPercent: number
    }> = {}

    let totalOverpayment = 0
    let totalAnnualCost = 0
    let totalPotentialSavings = 0

    // Calculate overpayment for each product
    for (const product of products) {
      const overpayment = await calculateProductOverpayment(userId, product)
      
      if (overpayment) {
        overpayments.push(overpayment)
        totalOverpayment += overpayment.overpaymentAmount
        totalAnnualCost += overpayment.currentCost
        totalPotentialSavings += overpayment.potentialSavings

        // Aggregate by product type
        if (!overpaymentByProductType[overpayment.productType]) {
          overpaymentByProductType[overpayment.productType] = {
            totalOverpayment: 0,
            productCount: 0,
            averageOverpaymentPercent: 0,
          }
        }

        overpaymentByProductType[overpayment.productType].totalOverpayment += overpayment.overpaymentAmount
        overpaymentByProductType[overpayment.productType].productCount += 1
      }
    }

    // Calculate average overpayment percentages by product type
    for (const productType in overpaymentByProductType) {
      const typeOverpayments = overpayments.filter(o => o.productType === productType)
      const avgPercent = typeOverpayments.length > 0 
        ? typeOverpayments.reduce((sum, o) => sum + o.overpaymentPercent, 0) / typeOverpayments.length
        : 0
      
      overpaymentByProductType[productType].averageOverpaymentPercent = avgPercent
    }

    // Sort top overpayments (highest overpayment amounts)
    const topOverpayments = overpayments
      .sort((a, b) => b.overpaymentAmount - a.overpaymentAmount)
      .slice(0, 10)

    const summary: OverpaymentSummary = {
      totalOverpayment,
      totalAnnualCost,
      totalPotentialSavings,
      overpaymentByProductType,
      topOverpayments,
      productCount: products.length,
      lastCalculated: new Date(),
    }

    logger.info('Calculated total overpayment for user', {
      userId,
      totalOverpayment,
      totalAnnualCost,
      productCount: products.length,
    })

    return summary

  } catch (error) {
    logger.error('Failed to calculate total overpayment', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Get overpayment trends over time (last 12 months)
 */
export async function getOverpaymentTrends(userId: string): Promise<{
  month: string
  overpayment: number
  savings: number
}[]> {
  const client = await pool.connect()
  
  try {
    // This would ideally use historical data, but for now we'll simulate trends
    // In a real implementation, you'd store historical overpayment calculations
    
    const trends = []
    const now = new Date()
    
    for (let i = 11; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = month.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
      
      // Simulate trend data (in production, this would come from historical calculations)
      const baseOverpayment = Math.random() * 500 + 200
      const trend = baseOverpayment * (1 + (11 - i) * 0.05) // Simulate increasing trend
      
      trends.push({
        month: monthName,
        overpayment: Math.round(trend),
        savings: Math.round(trend * 0.8),
      })
    }

    return trends

  } catch (error) {
    logger.error('Failed to get overpayment trends', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Get overpayment insights and recommendations
 */
export async function getOverpaymentInsights(userId: string): Promise<{
  totalInsights: number
  highOverpaymentProducts: number
  recommendedActions: string[]
  potentialMonthlySavings: number
}> {
  try {
    const summary = await calculateTotalOverpayment(userId)
    
    const highOverpaymentProducts = summary.topOverpayments.filter(
      p => p.overpaymentPercent > 20
    ).length

    const recommendedActions = []
    
    if (summary.totalOverpayment > 1000) {
      recommendedActions.push('Consider switching high-cost providers to save over £1000 annually')
    }
    
    if (highOverpaymentProducts > 2) {
      recommendedActions.push(`You have ${highOverpaymentProducts} products with over 20% overpayment - prioritize these for switching`)
    }
    
    if (summary.overpaymentByProductType.energy?.totalOverpayment > 500) {
      recommendedActions.push('Energy bills show significant overpayment - compare tariffs now')
    }
    
    if (summary.overpaymentByProductType.broadband?.totalOverpayment > 200) {
      recommendedActions.push('Broadband costs are above market rate - check for better deals')
    }

    return {
      totalInsights: recommendedActions.length,
      highOverpaymentProducts,
      recommendedActions,
      potentialMonthlySavings: Math.round(summary.totalPotentialSavings / 12),
    }

  } catch (error) {
    logger.error('Failed to get overpayment insights', error)
    throw error
  }
}

/**
 * Update overpayment calculation (can be called periodically)
 */
export async function updateOverpaymentCalculation(userId: string): Promise<void> {
  try {
    await calculateTotalOverpayment(userId)
    logger.info('Updated overpayment calculation for user', { userId })
  } catch (error) {
    logger.error('Failed to update overpayment calculation', error)
    throw error
  }
}
