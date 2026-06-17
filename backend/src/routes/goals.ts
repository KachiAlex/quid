import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { authenticateToken } from '../middleware/auth'
import { logger } from '../config/logger'
import { pool } from '../db'

const router = Router()

/* GET /api/goals — list user savings goals */
router.get('/', authenticateToken, async (req, res) => {
  if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return }

  try {
    const result = await pool.query(
      `SELECT goal_id, name, target_amount, current_amount, icon_category, deadline, created_at
       FROM user_goals
       WHERE user_id = $1
       ORDER BY created_at ASC`,
      [req.user.user_id]
    )
    res.json({ goals: result.rows })
  } catch (err) {
    logger.error('Goals fetch failed', { userId: req.user.user_id, err })
    res.status(500).json({ error: 'Failed to fetch goals' })
  }
})

/* POST /api/goals — create a new goal */
router.post('/', authenticateToken, [
  body('name').notEmpty().isLength({ max: 255 }),
  body('targetAmount').isDecimal({ decimal_digits: '0,2' }),
  body('currentAmount').optional().isDecimal({ decimal_digits: '0,2' }),
  body('deadline').optional().isISO8601(),
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return }
  if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return }

  const { name, targetAmount, currentAmount, iconCategory, deadline } = req.body

  try {
    const result = await pool.query(
      `INSERT INTO user_goals (user_id, name, target_amount, current_amount, icon_category, deadline)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING goal_id`,
      [req.user.user_id, name, targetAmount, currentAmount || 0, iconCategory || 'generic', deadline || null]
    )
    res.status(201).json({ goalId: result.rows[0].goal_id })
  } catch (err) {
    logger.error('Goal creation failed', { err })
    res.status(500).json({ error: 'Failed to create goal' })
  }
})

/* PATCH /api/goals/:id — update goal (name, currentAmount, deadline) */
router.patch('/:id', authenticateToken, async (req, res) => {
  if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return }

  const { name, currentAmount, deadline } = req.body
  const fields: string[] = []
  const values: (string | number | null)[] = []
  let idx = 1

  if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name) }
  if (currentAmount !== undefined) { fields.push(`current_amount = $${idx++}`); values.push(currentAmount) }
  if (deadline !== undefined) { fields.push(`deadline = $${idx++}`); values.push(deadline || null) }

  if (fields.length === 0) { res.status(400).json({ error: 'No fields to update' }); return }

  values.push(req.params.id, req.user.user_id)

  try {
    await pool.query(
      `UPDATE user_goals SET ${fields.join(', ')} WHERE goal_id = $${idx} AND user_id = $${idx + 1}`,
      values
    )
    res.json({ message: 'Goal updated' })
  } catch (err) {
    logger.error('Goal update failed', { err })
    res.status(500).json({ error: 'Failed to update goal' })
  }
})

/* DELETE /api/goals/:id — delete a goal */
router.delete('/:id', authenticateToken, async (req, res) => {
  if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return }

  try {
    await pool.query(
      'DELETE FROM user_goals WHERE goal_id = $1 AND user_id = $2',
      [req.params.id, req.user.user_id]
    )
    res.json({ message: 'Goal deleted' })
  } catch (err) {
    logger.error('Goal deletion failed', { err })
    res.status(500).json({ error: 'Failed to delete goal' })
  }
})

export default router
