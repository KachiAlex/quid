/**
 * Rate Update Background Job
 * Runs daily to update market rates from external sources
 */

import { pool } from '../db'
import { logger } from '../config/logger'

interface RateData {
  product_type: string
  provider: string
  annual_cost: number
  effective_from: string
  source: string
}

/**
 * Fetch rates from external sources
 * TODO: Integrate with actual provider APIs or comparison services
 */
async function fetchRatesFromSources(): Promise<RateData[]> {
  // TODO: Implement actual API calls to:
  // - Comparison websites (MoneySupermarket, Compare the Market, etc.)
  // - Direct provider APIs where available
  // - Third-party data providers
  
  // For now, return empty array - this would be replaced with real data fetching
  logger.info('Fetching rates from external sources...')
  
  // Placeholder: In production, this would make API calls to various sources
  // and aggregate the data
  return []
}

/**
 * Update rates in the database
 */
async function updateRatesInDatabase(rates: RateData[]): Promise<void> {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    for (const rate of rates) {
      // Upsert rate (update if exists, insert if new)
      await client.query(
        `INSERT INTO rate_records (product_type, provider, annual_cost, effective_from, source, last_updated)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (product_type, provider)
         DO UPDATE SET 
           annual_cost = EXCLUDED.annual_cost,
           effective_from = EXCLUDED.effective_from,
           source = EXCLUDED.source,
           last_updated = NOW()`,
        [rate.product_type, rate.provider, rate.annual_cost, rate.effective_from, rate.source]
      )
    }
    
    await client.query('COMMIT')
    logger.info(`Updated ${rates.length} rate records`)
  } catch (err) {
    await client.query('ROLLBACK')
    logger.error('Failed to update rates in database', err)
    throw err
  } finally {
    client.release()
  }
}

/**
 * Check for stale rates and log warnings
 */
async function checkStaleRates(): Promise<void> {
  const result = await pool.query(
    `SELECT product_type, provider, last_updated 
     FROM rate_records 
     WHERE last_updated < NOW() - INTERVAL '7 days'`
  )
  
  if (result.rows.length > 0) {
    logger.warn(`Found ${result.rows.length} stale rate records (older than 7 days)`, {
      staleRates: result.rows,
    })
  }
}

/**
 * Main rate update job
 */
export async function runRateUpdateJob(): Promise<void> {
  try {
    logger.info('Starting rate update job')
    
    // Check for stale rates before update
    await checkStaleRates()
    
    // Fetch new rates
    const rates = await fetchRatesFromSources()
    
    if (rates.length === 0) {
      logger.warn('No rates fetched from external sources')
      return
    }
    
    // Update database
    await updateRatesInDatabase(rates)
    
    logger.info('Rate update job completed successfully')
  } catch (err) {
    logger.error('Rate update job failed', err)
    throw err
  }
}

/**
 * Manual trigger for rate update (for testing or on-demand updates)
 */
export async function triggerManualRateUpdate(): Promise<{ success: boolean; message: string; updatedCount: number }> {
  try {
    await runRateUpdateJob()
    
    // Get count of recently updated rates
    const result = await pool.query(
      `SELECT COUNT(*) as count 
       FROM rate_records 
       WHERE last_updated > NOW() - INTERVAL '5 minutes'`
    )
    
    return {
      success: true,
      message: 'Rate update completed successfully',
      updatedCount: parseInt(result.rows[0].count),
    }
  } catch (err) {
    return {
      success: false,
      message: 'Rate update failed',
      updatedCount: 0,
    }
  }
}

/**
 * Get rate statistics
 */
export async function getRateStatistics(): Promise<{
  totalRates: number
  byProductType: Record<string, number>
  lastUpdated: string | null
  staleCount: number
}> {
  const totalResult = await pool.query('SELECT COUNT(*) as count FROM rate_records')
  const byTypeResult = await pool.query(
    `SELECT product_type, COUNT(*) as count 
     FROM rate_records 
     GROUP BY product_type`
  )
  const lastUpdatedResult = await pool.query(
    'SELECT MAX(last_updated) as last_updated FROM rate_records'
  )
  const staleResult = await pool.query(
    `SELECT COUNT(*) as count 
     FROM rate_records 
     WHERE last_updated < NOW() - INTERVAL '7 days'`
  )
  
  const byProductType: Record<string, number> = {}
  byTypeResult.rows.forEach((row) => {
    byProductType[row.product_type] = parseInt(row.count)
  })
  
  return {
    totalRates: parseInt(totalResult.rows[0].count),
    byProductType,
    lastUpdated: lastUpdatedResult.rows[0].last_updated,
    staleCount: parseInt(staleResult.rows[0].count),
  }
}
