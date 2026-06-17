/**
 * Dormant Subscription Detection Algorithm
 * Identifies subscriptions that haven't been used or charged recently but may still be active
 */

import { pool } from '../db'
import { logger } from '../config/logger'

interface DormantSubscription {
  productRecordId: string
  userId: string
  productType: string
  providerName: string
  annualCost: number
  frequency: string
  lastChargeDate: Date | null
  lastActivityDate: Date | null
  daysSinceLastCharge: number
  daysSinceLastActivity: number
  estimatedMonthlyCost: number
  potentialSavings: number
  dormantReason: string
  confidence: number
}

interface DormantDetectionConfig {
  minDormantDays: number // Minimum days to consider dormant
  maxDormantDays: number // Maximum days to flag as potentially forgotten
  minAnnualCost: number // Minimum annual cost to flag
  activityLookbackDays: number // Days to look back for activity
}

const DEFAULT_CONFIG: DormantDetectionConfig = {
  minDormantDays: 90, // 3 months without charges
  maxDormantDays: 365, // 1 year (likely forgotten)
  minAnnualCost: 50, // £50 minimum annual cost
  activityLookbackDays: 180, // 6 months activity lookback
}

/**
 * Find dormant subscriptions for a user
 */
async function findDormantSubscriptionsForUser(
  userId: string, 
  config: DormantDetectionConfig = DEFAULT_CONFIG
): Promise<DormantSubscription[]> {
  const client = await pool.connect()
  const dormantSubs: DormantSubscription[] = []

  try {
    // Get all subscription-type products for the user
    const productsResult = await client.query(
      `SELECT 
         pr.record_id,
         pr.product_type,
         pr.provider_name,
         pr.annual_cost,
         pr.frequency,
         pr.created_at,
         pr.last_detected_at,
         pr.excluded
       FROM product_records pr
       WHERE pr.user_id = $1
         AND pr.excluded = false
         AND pr.product_type IN ('subscription', 'streaming', 'software', 'gaming', 'fitness', 'news')
         AND pr.annual_cost >= $2
       ORDER BY pr.annual_cost DESC`,
      [userId, config.minAnnualCost]
    )

    for (const product of productsResult.rows) {
      const dormant = await analyzeSubscriptionForDormancy(product, userId, config, client)
      if (dormant) {
        dormantSubs.push(dormant)
      }
    }

    logger.info(`Found ${dormantSubs.length} dormant subscriptions for user ${userId}`, {
      userId,
      totalProducts: productsResult.rows.length,
      dormantCount: dormantSubs.length,
    })

    return dormantSubs.sort((a, b) => b.potentialSavings - a.potentialSavings)
  } catch (error) {
    logger.error('Failed to find dormant subscriptions for user', { userId, error })
    throw error
  } finally {
    client.release()
  }
}

/**
 * Analyze a specific subscription for dormancy
 */
async function analyzeSubscriptionForDormancy(
  product: any,
  userId: string,
  config: DormantDetectionConfig,
  client: any
): Promise<DormantSubscription | null> {
  // Get the most recent transaction for this subscription
  const recentTransactionResult = await client.query(
    `SELECT 
       rt.transaction_date,
       rt.amount,
       rt.description,
       rt.merchant_name
     FROM raw_transactions rt
     WHERE rt.user_id = $1
       AND rt.merchant_name ILIKE $2
       AND rt.transaction_type = 'DEBIT'
       AND rt.amount > 0
     ORDER BY rt.transaction_date DESC
     LIMIT 1`,
    [userId, `%${product.provider_name}%`]
  )

  const lastTransaction = recentTransactionResult.rows[0]
  const lastChargeDate = lastTransaction ? new Date(lastTransaction.transaction_date) : null

  // Check for any activity (even credits, which might indicate cancellations)
  const activityResult = await client.query(
    `SELECT MAX(transaction_date) as last_activity
     FROM raw_transactions rt
     WHERE rt.user_id = $1
       AND rt.merchant_name ILIKE $2
       AND rt.transaction_date >= CURRENT_DATE - INTERVAL '${config.activityLookbackDays} days'`,
    [userId, `%${product.provider_name}%`]
  )

  const lastActivityDate = activityResult.rows[0].last_activity 
    ? new Date(activityResult.rows[0].last_activity) 
    : null

  const now = new Date()
  const daysSinceLastCharge = lastChargeDate 
    ? Math.floor((now.getTime() - lastChargeDate.getTime()) / (1000 * 60 * 60 * 24))
    : 999

  const daysSinceLastActivity = lastActivityDate 
    ? Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24))
    : 999

  // Determine if this subscription is dormant
  let isDormant = false
  let dormantReason = ''
  let confidence = 0

  // Rule 1: No charges for more than minDormantDays
  if (daysSinceLastCharge >= config.minDormantDays) {
    isDormant = true
    dormantReason = `No charges detected for ${daysSinceLastCharge} days`
    confidence = 0.7
  }

  // Rule 2: No charges for more than maxDormantDays (likely forgotten)
  if (daysSinceLastCharge >= config.maxDormantDays) {
    isDormant = true
    dormantReason = `No charges for ${daysSinceLastCharge} days (likely forgotten)`
    confidence = 0.9
  }

  // Rule 3: Recent credit/refund but no new charges (possible cancellation)
  const recentCreditsResult = await client.query(
    `SELECT COUNT(*) as credit_count
     FROM raw_transactions rt
     WHERE rt.user_id = $1
       AND rt.merchant_name ILIKE $2
       AND rt.transaction_type = 'CREDIT'
       AND rt.transaction_date >= CURRENT_DATE - INTERVAL '90 days'`,
    [userId, `%${product.provider_name}%`]
  )

  const recentCredits = parseInt(recentCreditsResult.rows[0].credit_count)
  if (recentCredits > 0 && daysSinceLastCharge >= config.minDormantDays) {
    isDormant = true
    dormantReason = `Recent refunds/credits but no new charges for ${daysSinceLastCharge} days`
    confidence = Math.max(confidence, 0.8)
  }

  // Rule 4: Subscription pattern broken (irregular charging)
  const chargePatternResult = await client.query(
    `SELECT 
       transaction_date,
       amount
     FROM raw_transactions rt
     WHERE rt.user_id = $1
       AND rt.merchant_name ILIKE $2
       AND rt.transaction_type = 'DEBIT'
       AND rt.amount > 0
       AND rt.transaction_date >= CURRENT_DATE - INTERVAL '180 days'
     ORDER BY rt.transaction_date DESC
     LIMIT 6`,
    [userId, `%${product.provider_name}%`]
  )

  if (chargePatternResult.rows.length >= 3) {
    const charges = chargePatternResult.rows
    const intervals = []
    
    for (let i = 0; i < charges.length - 1; i++) {
      const date1 = new Date(charges[i].transaction_date)
      const date2 = new Date(charges[i + 1].transaction_date)
      intervals.push(Math.floor((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24)))
    }

    // Check if intervals are highly irregular (more than 50% variation)
    if (intervals.length >= 2) {
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const variance = intervals.reduce((sum, interval) => {
        return sum + Math.pow(interval - avgInterval, 2)
      }, 0) / intervals.length
      const stdDev = Math.sqrt(variance)
      const coefficientOfVariation = stdDev / avgInterval

      if (coefficientOfVariation > 0.5 && daysSinceLastCharge >= config.minDormantDays) {
        isDormant = true
        dormantReason = `Irregular charging pattern detected, last charge ${daysSinceLastCharge} days ago`
        confidence = Math.max(confidence, 0.6)
      }
    }
  }

  if (!isDormant) {
    return null
  }

  // Calculate estimated monthly cost and potential savings
  const estimatedMonthlyCost = parseFloat(product.annual_cost) / 12
  const potentialSavings = estimatedMonthlyCost * Math.min(daysSinceLastCharge / 30, 12) // Max 12 months

  return {
    productRecordId: product.record_id,
    userId,
    productType: product.product_type,
    providerName: product.provider_name,
    annualCost: parseFloat(product.annual_cost),
    frequency: product.frequency,
    lastChargeDate,
    lastActivityDate,
    daysSinceLastCharge,
    daysSinceLastActivity,
    estimatedMonthlyCost,
    potentialSavings,
    dormantReason,
    confidence,
  }
}

/**
 * Store dormant subscriptions in database for user review
 */
async function storeDormantSubscriptions(dormantSubs: DormantSubscription[]): Promise<void> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    for (const sub of dormantSubs) {
      // Check if this dormant subscription already exists
      const existing = await client.query(
        `SELECT dormant_id FROM dormant_subscriptions 
         WHERE product_record_id = $1
           AND created_at > NOW() - INTERVAL '7 days'`,
        [sub.productRecordId]
      )

      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO dormant_subscriptions 
           (user_id, product_record_id, product_type, provider_name, 
            annual_cost, frequency, last_charge_date, last_activity_date,
            days_since_last_charge, days_since_last_activity, estimated_monthly_cost,
            potential_savings, dormant_reason, confidence, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())`,
          [
            sub.userId,
            sub.productRecordId,
            sub.productType,
            sub.providerName,
            sub.annualCost,
            sub.frequency,
            sub.lastChargeDate,
            sub.lastActivityDate,
            sub.daysSinceLastCharge,
            sub.daysSinceLastActivity,
            sub.estimatedMonthlyCost,
            sub.potentialSavings,
            sub.dormantReason,
            sub.confidence,
            'pending_review',
          ]
        )
      }
    }

    await client.query('COMMIT')
    logger.info(`Stored ${dormantSubs.length} dormant subscriptions in database`)
  } catch (error) {
    await client.query('ROLLBACK')
    logger.error('Failed to store dormant subscriptions', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Main dormant subscription detection job - runs for all users
 */
export async function runDormantSubscriptionDetectionJob(): Promise<{
  totalUsers: number
  usersWithDormantSubs: number
  totalDormantSubscriptions: number
  totalPotentialSavings: number
}> {
  logger.info('Starting dormant subscription detection job')

  const client = await pool.connect()
  let totalUsers = 0
  let usersWithDormantSubs = 0
  let totalDormantSubscriptions = 0
  let totalPotentialSavings = 0

  try {
    // Get all active users with subscription products
    const usersResult = await client.query(
      `SELECT DISTINCT bc.user_id 
       FROM bank_connections bc 
       INNER JOIN product_records pr ON bc.connection_id = pr.connection_id
       WHERE bc.status = 'active'
         AND bc.last_sync_at > NOW() - INTERVAL '7 days'
         AND pr.product_type IN ('subscription', 'streaming', 'software', 'gaming', 'fitness', 'news')
         AND pr.excluded = false`
    )

    totalUsers = usersResult.rows.length

    for (const userRow of usersResult.rows) {
      try {
        const dormantSubs = await findDormantSubscriptionsForUser(userRow.user_id)
        
        if (dormantSubs.length > 0) {
          await storeDormantSubscriptions(dormantSubs)
          usersWithDormantSubs++
          totalDormantSubscriptions += dormantSubs.length
          totalPotentialSavings += dormantSubs.reduce((sum, sub) => sum + sub.potentialSavings, 0)
        }

        // Add small delay between users to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        logger.error(`Failed to process dormant subscriptions for user ${userRow.user_id}`, error)
      }
    }

    logger.info('Dormant subscription detection job completed', {
      totalUsers,
      usersWithDormantSubs,
      totalDormantSubscriptions,
      totalPotentialSavings,
    })

    return {
      totalUsers,
      usersWithDormantSubs,
      totalDormantSubscriptions,
      totalPotentialSavings,
    }
  } catch (error) {
    logger.error('Dormant subscription detection job failed', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Get dormant subscriptions for a specific user
 */
export async function getDormantSubscriptionsForUser(userId: string): Promise<DormantSubscription[]> {
  const result = await pool.query(
    `SELECT 
       dormant_id,
       product_record_id,
       product_type,
       provider_name,
       annual_cost,
       frequency,
       last_charge_date,
       last_activity_date,
       days_since_last_charge,
       days_since_last_activity,
       estimated_monthly_cost,
       potential_savings,
       dormant_reason,
       confidence,
       status,
       created_at
     FROM dormant_subscriptions
     WHERE user_id = $1
       AND created_at > NOW() - INTERVAL '30 days'
     ORDER BY potential_savings DESC, confidence DESC`,
    [userId]
  )

  return result.rows.map((row: any) => ({
    productRecordId: row.product_record_id,
    userId,
    productType: row.product_type,
    providerName: row.provider_name,
    annualCost: parseFloat(row.annual_cost),
    frequency: row.frequency,
    lastChargeDate: row.last_charge_date ? new Date(row.last_charge_date) : null,
    lastActivityDate: row.last_activity_date ? new Date(row.last_activity_date) : null,
    daysSinceLastCharge: parseInt(row.days_since_last_charge),
    daysSinceLastActivity: parseInt(row.days_since_last_activity),
    estimatedMonthlyCost: parseFloat(row.estimated_monthly_cost),
    potentialSavings: parseFloat(row.potential_savings),
    dormantReason: row.dormant_reason,
    confidence: parseFloat(row.confidence),
  }))
}

/**
 * Update dormant subscription status
 */
export async function updateDormantSubscriptionStatus(
  dormantId: string, 
  status: 'pending_review' | 'confirmed_dormant' | 'false_positive' | 'cancelled',
  userId: string
): Promise<void> {
  await pool.query(
    `UPDATE dormant_subscriptions 
     SET status = $1, updated_at = NOW()
     WHERE dormant_id = $2 AND user_id = $3`,
    [status, dormantId, userId]
  )

  logger.info('Dormant subscription status updated', { dormantId, status, userId })
}
