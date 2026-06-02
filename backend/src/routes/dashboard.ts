import { Router } from 'express'
import { authenticateToken } from '../middleware/auth'
import { logger } from '../config/logger'
import { pool } from '../db'
import { withCache, dashboardCacheKey, invalidateDashboardCache } from '../services/cache'

const router = Router()

interface ProductSummary {
  record_id: string
  product_type: string
  provider_name: string
  annual_cost: number
  best_provider: string
  best_cost: number
  saving: number
}

/**
 * GET /api/dashboard/summary
 * Returns dashboard summary with total overpayment and product comparisons.
 * Uses a single LATERAL JOIN to avoid N+1 queries.
 */
router.get('/summary', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const userId = req.user.user_id

  try {
    const data = await withCache(
      dashboardCacheKey(userId),
      300, // 5 minutes
      async () => {
    // Single query: fetch all user products + best rate for each via LATERAL
    const productsResult = await pool.query(
      `SELECT
         pr.record_id,
         pr.product_type,
         pr.provider_name,
         pr.annual_cost AS current_cost,
         COALESCE(rr.provider, 'Unknown') AS best_provider,
         COALESCE(rr.annual_cost, 0) AS best_cost,
         GREATEST(pr.annual_cost - COALESCE(rr.annual_cost, 0), 0) AS saving
       FROM product_records pr
       LEFT JOIN LATERAL (
         SELECT provider, annual_cost
         FROM rate_records
         WHERE product_type = pr.product_type
         ORDER BY annual_cost ASC
         LIMIT 1
       ) rr ON true
       WHERE pr.user_id = $1
         AND pr.excluded = false
       ORDER BY saving DESC`,
      [userId]
    )

    const productSummaries: ProductSummary[] = productsResult.rows.map((row) => ({
      record_id: row.record_id,
      product_type: row.product_type,
      provider_name: row.provider_name,
      annual_cost: parseFloat(row.current_cost),
      best_provider: row.best_provider,
      best_cost: parseFloat(row.best_cost),
      saving: parseFloat(row.saving),
    }))

    const totalSavings = productSummaries.reduce(
      (sum, p) => sum + p.saving, 0
    )

    // Switched savings (single query)
    const switchesResult = await pool.query(
      `SELECT COUNT(*) AS switch_count,
              COALESCE(SUM(saving), 0) AS total_switched_savings
       FROM switch_events
       WHERE user_id = $1 AND status = 'confirmed'`,
      [userId]
    )

    const switchCount = parseInt(switchesResult.rows[0].switch_count) || 0
    const switchedSavings = parseFloat(
      switchesResult.rows[0].total_switched_savings
    ) || 0

    // Product counts by type
    const typeResult = await pool.query(
      `SELECT product_type, COUNT(*) AS count
       FROM product_records
       WHERE user_id = $1 AND excluded = false
       GROUP BY product_type`,
      [userId]
    )

    const productCounts: Record<string, number> = {}
    typeResult.rows.forEach((row) => {
      productCounts[row.product_type] = parseInt(row.count)
    })

    logger.info('Dashboard summary generated', {
      userId,
      productCount: productSummaries.length,
      totalSavings,
      queryCount: 3,
      cached: false,
    })

    return {
      totalSavings,
      switchedSavings,
      switchCount,
      productCounts,
      products: productSummaries,
      lastUpdated: new Date().toISOString(),
    }
      } // end withCache fetcher
    )

    res.json(data)
  } catch (err) {
    logger.error('Dashboard summary generation failed', { userId, err })
    res.status(500).json({ error: 'Failed to generate dashboard summary' })
  }
})

export default router
