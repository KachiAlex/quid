import { Router } from 'express'
import { authenticateToken } from '../middleware/auth'
import { logger } from '../config/logger'
import { pool } from '../db'

const router = Router()

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 500

/**
 * GET /api/transactions
 * Cursor-based pagination for user transactions
 * Query params:
 *   cursor    - transaction_id of the last item from previous page
 *   limit     - page size (default 50, max 500)
 *   category  - optional filter by category
 */
router.get('/', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const userId = req.user.user_id
  const cursor = req.query.cursor as string | undefined
  const category = req.query.category as string | undefined
  const limit = Math.min(
    parseInt(req.query.limit as string) || DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE
  )

  try {
    const params: (string | number)[] = [userId]
    let whereClause = 'WHERE user_id = $1'
    let paramIndex = 2

    if (category) {
      whereClause += ` AND category = $${paramIndex}`
      params.push(category)
      paramIndex++
    }

    if (cursor) {
      whereClause += ` AND transaction_id < $${paramIndex}`
      params.push(cursor)
      paramIndex++
    }

    params.push(limit + 1) // fetch one extra to detect hasNextPage

    const result = await pool.query(
      `SELECT transaction_id, bank_connection_id, external_id,
              description, amount, currency, transaction_date,
              merchant_name, category, created_at
       FROM transactions
       ${whereClause}
       ORDER BY transaction_date DESC, transaction_id DESC
       LIMIT $${paramIndex}`,
      params
    )

    const rows = result.rows
    const hasNextPage = rows.length > limit
    const items = hasNextPage ? rows.slice(0, limit) : rows
    const nextCursor = hasNextPage ? items[items.length - 1].transaction_id : null

    res.json({
      items,
      nextCursor,
      hasNextPage,
      pageSize: limit,
    })
  } catch (err) {
    logger.error('Transactions fetch failed', { userId, err })
    res.status(500).json({ error: 'Failed to fetch transactions' })
  }
})

export default router
