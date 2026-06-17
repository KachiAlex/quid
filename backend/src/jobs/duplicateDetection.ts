/**
 * Duplicate Charge Detection Algorithm
 * Analyzes transactions to identify potential duplicate charges that should be refunded
 */

import { pool } from '../db'
import { logger } from '../config/logger'

interface DuplicateCharge {
  transactionId: string
  userId: string
  connectionId: string
  amount: number
  merchantName: string
  description: string
  transactionDate: Date
  duplicateTransactionId: string
  duplicateTransactionDate: Date
  timeDifferenceHours: number
  confidence: number
  reason: string
}

interface DuplicateDetectionConfig {
  sameMerchantThreshold: number // hours
  similarAmountThreshold: number // percentage difference
  sameDayThreshold: number // hours
  maxDuplicateAge: number // days
}

const DEFAULT_CONFIG: DuplicateDetectionConfig = {
  sameMerchantThreshold: 24, // Same merchant within 24 hours
  similarAmountThreshold: 0.01, // 1% difference or less
  sameDayThreshold: 2, // Same day within 2 hours
  maxDuplicateAge: 30, // Only check last 30 days
}

/**
 * Find potential duplicate charges for a user
 */
async function findDuplicateChargesForUser(
  userId: string, 
  config: DuplicateDetectionConfig = DEFAULT_CONFIG
): Promise<DuplicateCharge[]> {
  const client = await pool.connect()
  const duplicates: DuplicateCharge[] = []

  try {
    // Get recent debit transactions (last 30 days)
    const transactionsResult = await client.query(
      `SELECT 
         rt.transaction_id,
         rt.connection_id,
         rt.amount,
         rt.currency,
         rt.description,
         rt.merchant_name,
         rt.transaction_date,
         rt.transaction_type,
         rt.created_at
       FROM raw_transactions rt
       WHERE rt.user_id = $1
         AND rt.transaction_type = 'DEBIT'
         AND rt.amount > 0
         AND rt.transaction_date >= CURRENT_DATE - INTERVAL '${config.maxDuplicateAge} days'
         AND rt.created_at >= NOW() - INTERVAL '${config.maxDuplicateAge} days'
       ORDER BY rt.transaction_date DESC, rt.amount DESC`,
      [userId]
    )

    const transactions = transactionsResult.rows

    // Compare each transaction with others to find duplicates
    for (let i = 0; i < transactions.length; i++) {
      for (let j = i + 1; j < transactions.length; j++) {
        const tx1 = transactions[i]
        const tx2 = transactions[j]

        const duplicate = await analyzeTransactionPair(tx1, tx2, config)
        if (duplicate) {
          duplicates.push(duplicate)
        }
      }
    }

    // Remove duplicates (pairs that are essentially the same)
    const uniqueDuplicates = removeDuplicatePairs(duplicates)

    logger.info(`Found ${uniqueDuplicates.length} potential duplicate charges for user ${userId}`, {
      userId,
      totalTransactions: transactions.length,
      potentialDuplicates: uniqueDuplicates.length,
    })

    return uniqueDuplicates
  } catch (error) {
    logger.error('Failed to find duplicate charges for user', { userId, error })
    throw error
  } finally {
    client.release()
  }
}

/**
 * Analyze a pair of transactions to determine if they are duplicates
 */
async function analyzeTransactionPair(
  tx1: any, 
  tx2: any, 
  config: DuplicateDetectionConfig
): Promise<DuplicateCharge | null> {
  // Skip if same transaction
  if (tx1.transaction_id === tx2.transaction_id) {
    return null
  }

  // Calculate time difference
  const date1 = new Date(tx1.transaction_date)
  const date2 = new Date(tx2.transaction_date)
  const timeDifferenceHours = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60)

  // Calculate amount difference percentage
  const amountDifference = Math.abs(parseFloat(tx1.amount) - parseFloat(tx2.amount))
  const avgAmount = (parseFloat(tx1.amount) + parseFloat(tx2.amount)) / 2
  const amountDifferencePercent = avgAmount > 0 ? amountDifference / avgAmount : 1

  let confidence = 0
  let reason = ''

  // Rule 1: Same merchant, same amount, within threshold time
  if (tx1.merchant_name && tx2.merchant_name && 
      tx1.merchant_name.toLowerCase() === tx2.merchant_name.toLowerCase()) {
    
    if (amountDifferencePercent <= config.similarAmountThreshold && 
        timeDifferenceHours <= config.sameMerchantThreshold) {
      confidence = 0.9
      reason = 'Same merchant, identical amount, within time threshold'
    }
  }

  // Rule 2: Same description, similar amount, same day
  if (tx1.description && tx2.description && 
      tx1.description.toLowerCase() === tx2.description.toLowerCase()) {
    
    if (amountDifferencePercent <= config.similarAmountThreshold && 
        timeDifferenceHours <= config.sameDayThreshold &&
        date1.toDateString() === date2.toDateString()) {
      confidence = Math.max(confidence, 0.8)
      reason = 'Same description, similar amount, same day'
    }
  }

  // Rule 3: Similar merchant name, identical amount, very close time
  if (tx1.merchant_name && tx2.merchant_name) {
    const merchantSimilarity = calculateStringSimilarity(
      tx1.merchant_name.toLowerCase(), 
      tx2.merchant_name.toLowerCase()
    )
    
    if (merchantSimilarity > 0.8 && 
        amountDifferencePercent <= config.similarAmountThreshold && 
        timeDifferenceHours <= config.sameDayThreshold) {
      confidence = Math.max(confidence, 0.7)
      reason = 'Similar merchant name, identical amount, close time'
    }
  }

  // Rule 4: Round amount (e.g., £50.00) with same merchant, same day
  const isRoundAmount1 = parseFloat(tx1.amount) % 1 === 0
  const isRoundAmount2 = parseFloat(tx2.amount) % 1 === 0
  
  if (isRoundAmount1 && isRoundAmount2 && 
      tx1.merchant_name && tx2.merchant_name && 
      tx1.merchant_name.toLowerCase() === tx2.merchant_name.toLowerCase() &&
      parseFloat(tx1.amount) === parseFloat(tx2.amount) &&
      date1.toDateString() === date2.toDateString()) {
    confidence = Math.max(confidence, 0.6)
    reason = 'Round amount, same merchant, same day'
  }

  // Only return if confidence is high enough
  if (confidence >= 0.6) {
    return {
      transactionId: tx1.transaction_id,
      userId: tx1.user_id,
      connectionId: tx1.connection_id,
      amount: parseFloat(tx1.amount),
      merchantName: tx1.merchant_name || 'Unknown',
      description: tx1.description,
      transactionDate: date1,
      duplicateTransactionId: tx2.transaction_id,
      duplicateTransactionDate: date2,
      timeDifferenceHours,
      confidence,
      reason,
    }
  }

  return null
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  const distance = levenshteinDistance(longer, shorter)
  return (longer.length - distance) / longer.length
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}

/**
 * Remove duplicate pairs (keep only the highest confidence version)
 */
function removeDuplicatePairs(duplicates: DuplicateCharge[]): DuplicateCharge[] {
  const seen = new Set<string>()
  const unique: DuplicateCharge[] = []

  for (const dup of duplicates) {
    const key1 = `${dup.transactionId}-${dup.duplicateTransactionId}`
    const key2 = `${dup.duplicateTransactionId}-${dup.transactionId}`
    
    if (!seen.has(key1) && !seen.has(key2)) {
      seen.add(key1)
      unique.push(dup)
    } else {
      // If we already have this pair, keep the one with higher confidence
      const existingIndex = unique.findIndex(u => 
        (u.transactionId === dup.transactionId && u.duplicateTransactionId === dup.duplicateTransactionId) ||
        (u.transactionId === dup.duplicateTransactionId && u.duplicateTransactionId === dup.transactionId)
      )
      
      if (existingIndex >= 0 && dup.confidence > unique[existingIndex].confidence) {
        unique[existingIndex] = dup
      }
    }
  }

  return unique.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Store duplicate charges in database for user review
 */
async function storeDuplicateCharges(duplicates: DuplicateCharge[]): Promise<void> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    for (const dup of duplicates) {
      // Check if this duplicate pair already exists
      const existing = await client.query(
        `SELECT duplicate_id FROM duplicate_charges 
         WHERE ((transaction_id = $1 AND duplicate_transaction_id = $2) OR 
                (transaction_id = $2 AND duplicate_transaction_id = $1))
           AND created_at > NOW() - INTERVAL '7 days'`,
        [dup.transactionId, dup.duplicateTransactionId]
      )

      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO duplicate_charges 
           (user_id, connection_id, transaction_id, duplicate_transaction_id, 
            amount, merchant_name, description, transaction_date, 
            duplicate_transaction_date, time_difference_hours, confidence, 
            reason, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
          [
            dup.userId,
            dup.connectionId,
            dup.transactionId,
            dup.duplicateTransactionId,
            dup.amount,
            dup.merchantName,
            dup.description,
            dup.transactionDate,
            dup.duplicateTransactionDate,
            dup.timeDifferenceHours,
            dup.confidence,
            dup.reason,
            'pending_review',
          ]
        )
      }
    }

    await client.query('COMMIT')
    logger.info(`Stored ${duplicates.length} duplicate charges in database`)
  } catch (error) {
    await client.query('ROLLBACK')
    logger.error('Failed to store duplicate charges', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Main duplicate detection job - runs for all users
 */
export async function runDuplicateDetectionJob(): Promise<{
  totalUsers: number
  usersWithDuplicates: number
  totalDuplicates: number
}> {
  logger.info('Starting duplicate charge detection job')

  const client = await pool.connect()
  let totalUsers = 0
  let usersWithDuplicates = 0
  let totalDuplicates = 0

  try {
    // Get all active users with bank connections
    const usersResult = await client.query(
      `SELECT DISTINCT bc.user_id 
       FROM bank_connections bc 
       WHERE bc.status = 'active'
         AND bc.last_sync_at > NOW() - INTERVAL '7 days'`
    )

    totalUsers = usersResult.rows.length

    for (const userRow of usersResult.rows) {
      try {
        const duplicates = await findDuplicateChargesForUser(userRow.user_id)
        
        if (duplicates.length > 0) {
          await storeDuplicateCharges(duplicates)
          usersWithDuplicates++
          totalDuplicates += duplicates.length
        }

        // Add small delay between users to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        logger.error(`Failed to process duplicates for user ${userRow.user_id}`, error)
      }
    }

    logger.info('Duplicate detection job completed', {
      totalUsers,
      usersWithDuplicates,
      totalDuplicates,
    })

    return {
      totalUsers,
      usersWithDuplicates,
      totalDuplicates,
    }
  } catch (error) {
    logger.error('Duplicate detection job failed', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Get duplicate charges for a specific user
 */
export async function getDuplicateChargesForUser(userId: string): Promise<DuplicateCharge[]> {
  const result = await pool.query(
    `SELECT 
       duplicate_id,
       transaction_id,
       duplicate_transaction_id,
       amount,
       merchant_name,
       description,
       transaction_date,
       duplicate_transaction_date,
       time_difference_hours,
       confidence,
       reason,
       status,
       created_at
     FROM duplicate_charges
     WHERE user_id = $1
       AND created_at > NOW() - INTERVAL '30 days'
     ORDER BY confidence DESC, created_at DESC`,
    [userId]
  )

  return result.rows.map((row: any) => ({
    transactionId: row.transaction_id,
    userId,
    connectionId: '', // Not stored in duplicates table
    amount: parseFloat(row.amount),
    merchantName: row.merchant_name,
    description: row.description,
    transactionDate: new Date(row.transaction_date),
    duplicateTransactionId: row.duplicate_transaction_id,
    duplicateTransactionDate: new Date(row.duplicate_transaction_date),
    timeDifferenceHours: parseFloat(row.time_difference_hours),
    confidence: parseFloat(row.confidence),
    reason: row.reason,
  }))
}

/**
 * Update duplicate charge status
 */
export async function updateDuplicateChargeStatus(
  duplicateId: string, 
  status: 'pending_review' | 'confirmed_duplicate' | 'false_positive' | 'resolved',
  userId: string
): Promise<void> {
  await pool.query(
    `UPDATE duplicate_charges 
     SET status = $1, updated_at = NOW()
     WHERE duplicate_id = $2 AND user_id = $3`,
    [status, duplicateId, userId]
  )

  logger.info('Duplicate charge status updated', { duplicateId, status, userId })
}
