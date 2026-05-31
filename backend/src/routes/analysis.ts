import { Router } from 'express'
import { authenticateToken } from '../middleware/auth'
import { pool } from '../db'

const router = Router()

router.get('/products', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
  const result = await pool.query(
    `SELECT product_type, provider_name, annual_cost, frequency, confidence_score
     FROM product_records
     WHERE user_id = $1
     ORDER BY confidence_score DESC, annual_cost DESC`,
    [req.user.user_id]
  )
  res.json({ products: result.rows })
})

router.get('/comparisons', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
  const result = await pool.query(
    `SELECT best_provider, best_cost, saving, compared_at
     FROM comparison_results
     WHERE user_id = $1
     ORDER BY compared_at DESC`,
    [req.user.user_id]
  )
  res.json({ comparisons: result.rows })
})

export default router
