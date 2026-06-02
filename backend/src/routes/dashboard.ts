import { Router } from 'express'
import { authenticateToken } from '../middleware/auth'
import { logger } from '../config/logger'
import { pool } from '../db'

const router = Router()

/**
 * GET /api/dashboard/summary
 * Returns dashboard summary with total overpayment and product comparisons
 */
router.get('/summary', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    // Get user's products with their current costs
    const productsResult = await pool.query(
      `SELECT pr.record_id, pr.product_type, pr.provider_name, pr.annual_cost
       FROM product_records pr
       WHERE pr.user_id = $1
       ORDER BY pr.annual_cost DESC`,
      [req.user.user_id]
    )

    const products = productsResult.rows
    let totalSavings = 0
    const productSummaries: Array<{
      record_id: string
      product_type: string
      provider_name: string
      annual_cost: number
      best_provider: string
      best_cost: number
      saving: number
    }> = []

    // For each product, find the best available rate
    for (const product of products) {
      const rateResult = await pool.query(
        `SELECT provider, annual_cost
         FROM rate_records
         WHERE product_type = $1
         ORDER BY annual_cost ASC
         LIMIT 1`,
        [product.product_type]
      )

      const bestRate = rateResult.rows[0]
      let saving = 0
      let bestProvider = 'Unknown'
      let bestCost = 0

      if (bestRate) {
        bestProvider = bestRate.provider
        bestCost = parseFloat(bestRate.annual_cost)
        saving = parseFloat(product.annual_cost) - bestCost
        if (saving > 0) {
          totalSavings += saving
        }
      }

      productSummaries.push({
        record_id: product.record_id,
        product_type: product.product_type,
        provider_name: product.provider_name,
        annual_cost: parseFloat(product.annual_cost),
        best_provider: bestProvider,
        best_cost: bestCost,
        saving: saving > 0 ? saving : 0,
      })
    }

    // Get recent switch events
    const switchesResult = await pool.query(
      `SELECT COUNT(*) as switch_count, SUM(saving) as total_switched_savings
       FROM switch_events
       WHERE user_id = $1 AND status = 'confirmed'`,
      [req.user.user_id]
    )

    const switchCount = parseInt(switchesResult.rows[0].switch_count) || 0
    const switchedSavings = parseFloat(switchesResult.rows[0].total_switched_savings) || 0

    // Get product count by type
    const typeResult = await pool.query(
      `SELECT product_type, COUNT(*) as count
       FROM product_records
       WHERE user_id = $1
       GROUP BY product_type`,
      [req.user.user_id]
    )

    const productCounts: Record<string, number> = {}
    typeResult.rows.forEach((row) => {
      productCounts[row.product_type] = parseInt(row.count)
    })

    logger.info('Dashboard summary generated', {
      userId: req.user.user_id,
      productCount: products.length,
      totalSavings,
    })

    res.json({
      totalSavings,
      switchedSavings,
      switchCount,
      productCounts,
      products: productSummaries,
      lastUpdated: new Date().toISOString(),
    })
  } catch (err) {
    logger.error('Dashboard summary generation failed', err)
    res.status(500).json({ error: 'Failed to generate dashboard summary' })
  }
})

export default router
