import { Router } from 'express'
import { authenticateToken } from '../middleware/auth'
import { pool } from '../db'
import { logger } from '../config/logger'

const router = Router()

router.get('/products', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
  const result = await pool.query(
    `SELECT record_id, product_type, provider_name, annual_cost, frequency, confidence_score
     FROM product_records
     WHERE user_id = $1
     ORDER BY confidence_score DESC, annual_cost DESC`,
    [req.user.user_id]
  )
  res.json({ products: result.rows })
})

router.get('/products/:productId', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
  const result = await pool.query(
    `SELECT record_id, product_type, provider_name, annual_cost, frequency, confidence_score
     FROM product_records
     WHERE record_id = $1 AND user_id = $2`,
    [req.params.productId, req.user.user_id]
  )
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Product not found' })
  }
  res.json({ product: result.rows[0] })
})

router.get('/comparisons', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
  const result = await pool.query(
    `SELECT result_id, product_record_id, best_provider, best_cost, saving, compared_at
     FROM comparison_results
     WHERE user_id = $1
     ORDER BY compared_at DESC`,
    [req.user.user_id]
  )
  res.json({ comparisons: result.rows })
})

router.get('/comparisons/:productRecordId', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const result = await pool.query(
      `SELECT result_id, product_record_id, best_provider, best_cost, saving, compared_at
       FROM comparison_results
       WHERE product_record_id = $1 AND user_id = $2
       ORDER BY compared_at DESC
       LIMIT 1`,
      [req.params.productRecordId, req.user.user_id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comparison not found' })
    }
    res.json({ comparison: result.rows[0] })
  } catch (err) {
    logger.error('Comparison fetch failed', err)
    res.status(500).json({ error: 'Failed to fetch comparison' })
  }
})

router.get('/products/:productId/comparison', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
  const { productId } = req.params

  try {
    const productResult = await pool.query(
      `SELECT record_id, product_type, provider_name, annual_cost, frequency, confidence_score
       FROM product_records
       WHERE record_id = $1 AND user_id = $2`,
      [productId, req.user.user_id]
    )
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' })
    }
    const product = productResult.rows[0]

    const comparisonResult = await pool.query(
      `SELECT best_provider, best_cost, saving, compared_at
       FROM comparison_results
       WHERE product_record_id = $1 AND user_id = $2
       ORDER BY compared_at DESC
       LIMIT 1`,
      [productId, req.user.user_id]
    )

    const ratesResult = await pool.query(
      `SELECT provider, annual_cost
       FROM rate_records
       WHERE product_type = $1
       ORDER BY annual_cost ASC
       LIMIT 10`,
      [product.product_type]
    )

    const alternatives = ratesResult.rows.map((r: any) => ({
      provider: r.provider,
      cost: parseFloat(r.annual_cost),
      saving: Math.max(0, parseFloat(product.annual_cost) - parseFloat(r.annual_cost)),
    }))

    res.json({
      product,
      comparison: comparisonResult.rows[0] || null,
      alternatives,
    })
  } catch (err) {
    logger.error('Product comparison fetch failed', err)
    res.status(500).json({ error: 'Failed to fetch comparison' })
  }
})

export default router
