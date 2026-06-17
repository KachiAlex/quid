/**
 * Daily Rate Update Background Job
 * Fetches fresh market data from external APIs and updates the rate database
 */

import { pool } from '../db'
import { logger } from '../config/logger'

interface RateUpdateConfig {
  enableExternalApis: boolean
  apiTimeoutMs: number
  maxRetries: number
  updateThreshold: number // Minimum percentage change to trigger update
}

interface ExternalRateData {
  productType: string
  provider: string
  annualCost: number
  source: string
  lastUpdated: Date
}

interface UpdateResult {
  totalProducts: number
  updatedProducts: number
  newProducts: number
  failedProducts: number
  sources: string[]
  errors: string[]
}

const DEFAULT_CONFIG: RateUpdateConfig = {
  enableExternalApis: process.env.ENABLE_EXTERNAL_RATE_APIS === 'true',
  apiTimeoutMs: 10000,
  maxRetries: 3,
  updateThreshold: 2.0, // 2% minimum change to trigger update
}

// Mock external API data (in production, these would be real API calls)
const MOCK_EXTERNAL_APIS = {
  energy: async (): Promise<ExternalRateData[]> => {
    // Simulate API call to Ofgem or energy comparison service
    return [
      { productType: 'energy', provider: 'Octopus Energy', annualCost: 1180, source: 'Ofgem API', lastUpdated: new Date() },
      { productType: 'energy', provider: 'British Gas', annualCost: 1340, source: 'Ofgem API', lastUpdated: new Date() },
      { productType: 'energy', provider: 'EDF Energy', annualCost: 1270, source: 'Ofgem API', lastUpdated: new Date() },
      { productType: 'energy', provider: 'E.ON Next', annualCost: 1310, source: 'Ofgem API', lastUpdated: new Date() },
      { productType: 'energy', provider: 'ScottishPower', annualCost: 1280, source: 'Ofgem API', lastUpdated: new Date() },
      { productType: 'energy', provider: 'OVO Energy', annualCost: 1250, source: 'Ofgem API', lastUpdated: new Date() },
      { productType: 'energy', provider: 'Utilita Energy', annualCost: 1370, source: 'Ofgem API', lastUpdated: new Date() },
      { productType: 'energy', provider: 'So Energy', annualCost: 1210, source: 'Ofgem API', lastUpdated: new Date() },
    ]
  },
  broadband: async (): Promise<ExternalRateData[]> => {
    // Simulate API call to Ofcom or broadband comparison service
    return [
      { productType: 'broadband', provider: 'Sky Broadband', annualCost: 355, source: 'Ofcom API', lastUpdated: new Date() },
      { productType: 'broadband', provider: 'BT Broadband', annualCost: 415, source: 'Ofcom API', lastUpdated: new Date() },
      { productType: 'broadband', provider: 'Virgin Media', annualCost: 475, source: 'Ofcom API', lastUpdated: new Date() },
      { productType: 'broadband', provider: 'TalkTalk', annualCost: 295, source: 'Ofcom API', lastUpdated: new Date() },
      { productType: 'broadband', provider: 'Vodafone', annualCost: 380, source: 'Ofcom API', lastUpdated: new Date() },
      { productType: 'broadband', provider: 'Plusnet', annualCost: 320, source: 'Ofcom API', lastUpdated: new Date() },
      { productType: 'broadband', provider: 'EE Broadband', annualCost: 405, source: 'Ofcom API', lastUpdated: new Date() },
      { productType: 'broadband', provider: 'Now Broadband', annualCost: 270, source: 'Ofcom API', lastUpdated: new Date() },
    ]
  },
  insurance: async (): Promise<ExternalRateData[]> => {
    // Simulate API call to ABI or insurance comparison service
    return [
      { productType: 'car_insurance', provider: 'Admiral', annualCost: 645, source: 'ABI API', lastUpdated: new Date() },
      { productType: 'car_insurance', provider: 'Direct Line', annualCost: 715, source: 'ABI API', lastUpdated: new Date() },
      { productType: 'car_insurance', provider: 'Aviva', annualCost: 675, source: 'ABI API', lastUpdated: new Date() },
      { productType: 'car_insurance', provider: 'Churchill', annualCost: 685, source: 'ABI API', lastUpdated: new Date() },
      { productType: 'home_insurance', provider: 'Aviva', annualCost: 275, source: 'ABI API', lastUpdated: new Date() },
      { productType: 'home_insurance', provider: 'Direct Line', annualCost: 315, source: 'ABI API', lastUpdated: new Date() },
      { productType: 'home_insurance', provider: 'Churchill', annualCost: 305, source: 'ABI API', lastUpdated: new Date() },
      { productType: 'home_insurance', provider: 'Admiral', annualCost: 285, source: 'ABI API', lastUpdated: new Date() },
    ]
  },
}

/**
 * Fetch rates from external APIs with retry logic
 */
async function fetchExternalRates(productType: string): Promise<ExternalRateData[]> {
  const config = DEFAULT_CONFIG
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      logger.info(`Fetching external rates for ${productType}`, { attempt, maxRetries: config.maxRetries })

      let rates: ExternalRateData[] = []

      if (productType === 'energy' && MOCK_EXTERNAL_APIS.energy) {
        rates = await MOCK_EXTERNAL_APIS.energy()
      } else if (productType === 'broadband' && MOCK_EXTERNAL_APIS.broadband) {
        rates = await MOCK_EXTERNAL_APIS.broadband()
      } else if ((productType === 'car_insurance' || productType === 'home_insurance') && MOCK_EXTERNAL_APIS.insurance) {
        const insuranceRates = await MOCK_EXTERNAL_APIS.insurance()
        rates = insuranceRates.filter(r => r.productType === productType)
      } else {
        logger.warn(`No external API configured for product type: ${productType}`)
        return []
      }

      logger.info(`Successfully fetched ${rates.length} rates for ${productType}`, { source: rates[0]?.source })
      return rates

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      logger.warn(`Failed to fetch external rates for ${productType} (attempt ${attempt})`, { error: lastError.message })
      
      if (attempt < config.maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  logger.error(`Failed to fetch external rates for ${productType} after ${config.maxRetries} attempts`, { error: lastError?.message })
  throw lastError || new Error(`Failed to fetch external rates for ${productType}`)
}

/**
 * Calculate percentage change between two values
 */
function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0
  return ((newValue - oldValue) / oldValue) * 100
}

/**
 * Update rates in the database with new external data
 */
async function updateRatesInDatabase(
  externalRates: ExternalRateData[],
  config: RateUpdateConfig
): Promise<{ updated: number; new: number; failed: number }> {
  const client = await pool.connect()
  let updated = 0
  let added = 0
  let failed = 0

  try {
    await client.query('BEGIN')

    for (const externalRate of externalRates) {
      try {
        // Check if rate already exists
        const existing = await client.query(
          'SELECT annual_cost FROM rate_records WHERE product_type = $1 AND provider = $2',
          [externalRate.productType, externalRate.provider]
        )

        if (existing.rows.length > 0) {
          // Update existing rate if change is significant
          const currentCost = parseFloat(existing.rows[0].annual_cost)
          const percentChange = calculatePercentageChange(currentCost, externalRate.annualCost)

          if (Math.abs(percentChange) >= config.updateThreshold) {
            await client.query(
              `UPDATE rate_records 
               SET annual_cost = $1, last_updated = NOW(), source = $2, effective_from = CURRENT_DATE
               WHERE product_type = $3 AND provider = $4`,
              [externalRate.annualCost, externalRate.source, externalRate.productType, externalRate.provider]
            )
            updated++
            logger.info(`Updated rate for ${externalRate.provider} ${externalRate.productType}`, {
              oldCost: currentCost,
              newCost: externalRate.annualCost,
              percentChange: percentChange.toFixed(2)
            })
          }
        } else {
          // Insert new rate
          await client.query(
            `INSERT INTO rate_records 
             (product_type, provider, annual_cost, effective_from, last_updated, source)
             VALUES ($1, $2, $3, CURRENT_DATE, NOW(), $4)`,
            [externalRate.productType, externalRate.provider, externalRate.annualCost, externalRate.source]
          )
          added++
          logger.info(`Added new rate for ${externalRate.provider} ${externalRate.productType}`, {
            cost: externalRate.annualCost
          })
        }
      } catch (error) {
        failed++
        logger.error(`Failed to update rate for ${externalRate.provider} ${externalRate.productType}`, error)
      }
    }

    await client.query('COMMIT')
    return { updated, new: added, failed }

  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Clean up old rate records (keep only last 30 days)
 */
async function cleanupOldRates(): Promise<number> {
  const client = await pool.connect()
  
  try {
    const result = await client.query(
      `DELETE FROM rate_records 
       WHERE effective_from < CURRENT_DATE - INTERVAL '30 days'
       RETURNING rate_id`
    )
    
    const deletedCount = result.rows.length
    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} old rate records`)
    }
    
    return deletedCount
  } catch (error) {
    logger.error('Failed to cleanup old rates', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Generate update summary report
 */
function generateUpdateReport(results: Record<string, { updated: number; new: number; failed: number }>): {
  totalProducts: number
  updatedProducts: number
  newProducts: number
  failedProducts: number
  sources: string[]
  errors: string[]
} {
  let totalProducts = 0
  let updatedProducts = 0
  let newProducts = 0
  let failedProducts = 0
  const sources = new Set<string>()
  const errors: string[] = []

  for (const [productType, result] of Object.entries(results)) {
    totalProducts += result.updated + result.new + result.failed
    updatedProducts += result.updated
    newProducts += result.new
    failedProducts += result.failed

    if (result.failed > 0) {
      errors.push(`${productType}: ${result.failed} products failed`)
    }
  }

  // Add mock sources (in production, these would come from actual API responses)
  sources.add('Ofgem API')
  sources.add('Ofcom API')
  sources.add('ABI API')

  return {
    totalProducts,
    updatedProducts,
    newProducts,
    failedProducts,
    sources: Array.from(sources),
    errors
  }
}

/**
 * Main daily rate update job
 */
export async function runDailyRateUpdateJob(): Promise<UpdateResult> {
  logger.info('Starting daily rate update job')
  
  const config = DEFAULT_CONFIG
  const productTypes = ['energy', 'broadband', 'car_insurance', 'home_insurance']
  const results: Record<string, { updated: number; new: number; failed: number }> = {}

  try {
    // Clean up old rates first
    await cleanupOldRates()

    // Process each product type
    for (const productType of productTypes) {
      try {
        if (config.enableExternalApis) {
          // Fetch fresh data from external APIs
          const externalRates = await fetchExternalRates(productType)
          
          if (externalRates.length > 0) {
            const updateResult = await updateRatesInDatabase(externalRates, config)
            results[productType] = updateResult
            
            logger.info(`Completed rate update for ${productType}`, updateResult)
          } else {
            results[productType] = { updated: 0, new: 0, failed: 0 }
            logger.info(`No external rates available for ${productType}`)
          }
        } else {
          // External APIs disabled, skip update
          results[productType] = { updated: 0, new: 0, failed: 0 }
          logger.info(`External APIs disabled, skipping ${productType} update`)
        }
      } catch (error) {
        results[productType] = { updated: 0, new: 0, failed: 1 }
        logger.error(`Failed to update rates for ${productType}`, error)
      }
    }

    // Generate summary report
    const report = generateUpdateReport(results)
    
    logger.info('Daily rate update job completed', {
      totalProducts: report.totalProducts,
      updatedProducts: report.updatedProducts,
      newProducts: report.newProducts,
      failedProducts: report.failedProducts,
      sources: report.sources,
      errors: report.errors
    })

    return report

  } catch (error) {
    logger.error('Daily rate update job failed', error)
    throw error
  }
}

/**
 * Get rate update statistics
 */
export async function getRateUpdateStatistics(): Promise<{
  lastUpdate: Date | null
  totalRecords: number
  recordsBySource: Record<string, number>
  recordsByType: Record<string, number>
  averageAge: number
}> {
  const client = await pool.connect()
  
  try {
    // Get last update timestamp
    const lastUpdateResult = await client.query(
      'SELECT MAX(last_updated) as last_update FROM rate_records'
    )
    
    // Get records by source
    const sourceResult = await client.query(
      'SELECT source, COUNT(*) as count FROM rate_records GROUP BY source'
    )
    
    // Get records by type
    const typeResult = await client.query(
      'SELECT product_type, COUNT(*) as count FROM rate_records GROUP BY product_type'
    )
    
    // Get average age of records
    const ageResult = await client.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (NOW() - last_updated)) / 86400) as avg_age
       FROM rate_records`
    )

    const recordsBySource: Record<string, number> = {}
    for (const row of sourceResult.rows) {
      recordsBySource[row.source] = parseInt(row.count)
    }

    const recordsByType: Record<string, number> = {}
    for (const row of typeResult.rows) {
      recordsByType[row.product_type] = parseInt(row.count)
    }

    return {
      lastUpdate: lastUpdateResult.rows[0]?.last_update,
      totalRecords: Object.values(recordsByType).reduce((sum, count) => sum + count, 0),
      recordsBySource,
      recordsByType,
      averageAge: parseFloat(ageResult.rows[0]?.avg_age || '0')
    }
  } catch (error) {
    logger.error('Failed to get rate update statistics', error)
    throw error
  } finally {
    client.release()
  }
}
