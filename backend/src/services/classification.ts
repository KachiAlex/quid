import { pool } from '../db'
import { logger } from '../config/logger'

const FREQUENCY_MULTIPLIERS: Record<string, number> = {
  monthly: 12,
  quarterly: 4,
  annual: 1,
  weekly: 52,
}

type CategoryDefinition = {
  productType: string
  frequency: 'monthly' | 'quarterly' | 'annual' | 'weekly'
  confidence: number
  keywords: string[]
}

const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    productType: 'energy',
    frequency: 'monthly',
    confidence: 0.85,
    keywords: ['electric', 'gas', 'octopus', 'british gas', 'edf', 'npower', 'utility'],
  },
  {
    productType: 'broadband',
    frequency: 'monthly',
    confidence: 0.8,
    keywords: ['broadband', 'sky', 'vodafone', 'talktalk', 'bt', 'virgin'],
  },
  {
    productType: 'car_insurance',
    frequency: 'annual',
    confidence: 0.9,
    keywords: ['car insurance', 'lease', 'motoring', 'vehicle'],
  },
  {
    productType: 'home_insurance',
    frequency: 'annual',
    confidence: 0.9,
    keywords: ['home insurance', 'house insurance', 'buildings'],
  },
  {
    productType: 'life_insurance',
    frequency: 'annual',
    confidence: 0.9,
    keywords: ['life insurance', 'protection', 'life cover'],
  },
  {
    productType: 'pet_insurance',
    frequency: 'annual',
    confidence: 0.9,
    keywords: ['pet insurance', 'pet plan', 'tailwaggers'],
  },
  {
    productType: 'subscription',
    frequency: 'monthly',
    confidence: 0.7,
    keywords: ['netflix', 'spotify', 'prime', 'membership', 'subscription'],
  },
]

function normalizeText(input?: string) {
  return (input ?? '').toLowerCase()
}

function detectCategory(description?: string, merchant?: string) {
  const text = `${normalizeText(description)} ${normalizeText(merchant)}`
  for (const rule of CATEGORY_DEFINITIONS) {
    for (const keyword of rule.keywords) {
      if (text.includes(keyword)) {
        return rule
      }
    }
  }
  return null
}

function toProviderName(tx: any) {
  if (tx.merchant_name) return tx.merchant_name
  if (tx.meta?.provider_reference_number) return tx.meta.provider_reference_number
  if (tx.description) return tx.description.split('\n')[0]
  return 'Unknown Provider'
}

type AggregateKey = string

type AggregateValue = {
  productType: string
  providerName: string
  confidence: number
  frequency: string
  annualCostSum: number
  count: number
}

export async function classifyConnection(userId: string, connectionId: string) {
  try {
    const { rows: rawTx } = await pool.query(
      `SELECT * FROM raw_transactions WHERE user_id = $1 AND connection_id = $2 ORDER BY transaction_date DESC`,
      [userId, connectionId]
    )

    if (rawTx.length === 0) {
      logger.debug('No raw transactions found for classification', { connectionId })
      return
    }

    await pool.query('DELETE FROM product_records WHERE connection_id = $1', [connectionId])

    const aggregated = new Map<AggregateKey, AggregateValue>()

    for (const tx of rawTx) {
      const rule = detectCategory(tx.description, tx.merchant_name)
      if (!rule) continue

      const amount = Math.abs(Number(tx.amount))
      if (Number.isNaN(amount) || amount === 0) continue

      const multiplier = FREQUENCY_MULTIPLIERS[rule.frequency] ?? 12
      const annualCost = amount * multiplier
      const provider = toProviderName(tx)
      const key = `${rule.productType}:${provider}`

      const existing = aggregated.get(key)
      if (existing) {
        existing.annualCostSum += annualCost
        existing.count += 1
      } else {
        aggregated.set(key, {
          productType: rule.productType,
          providerName: provider,
          confidence: rule.confidence,
          frequency: rule.frequency,
          annualCostSum: annualCost,
          count: 1,
        })
      }
    }

    for (const entry of aggregated.values()) {
      const averageAnnual = entry.annualCostSum / entry.count
      const insertRes = await pool.query(
        `INSERT INTO product_records
         (user_id, connection_id, product_type, provider_name, annual_cost, frequency, confidence_score)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING record_id`,
        [userId, connectionId, entry.productType, entry.providerName, averageAnnual, entry.frequency, entry.confidence]
      )
      const recordId = insertRes.rows[0].record_id

      const rateRow = await pool.query(
        `SELECT provider, annual_cost FROM rate_records WHERE product_type = $1 ORDER BY annual_cost ASC LIMIT 1`,
        [entry.productType]
      )
      const bestRow = rateRow.rows[0]
      const bestProvider = bestRow?.provider || entry.providerName
      const bestCost = Number(bestRow?.annual_cost ?? averageAnnual)
      const saving = Math.max(0, averageAnnual - bestCost)

      await pool.query(
        `INSERT INTO comparison_results
         (user_id, product_record_id, best_provider, best_cost, saving, compared_at, rate_source_timestamp)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [userId, recordId, bestProvider, bestCost, saving]
      )
    }
  } catch (err) {
    logger.error('Classification job failed', err)
    throw err
  }
}
