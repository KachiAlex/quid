import { Router } from 'express'
import { authenticateToken } from '../middleware/auth'
import { logger } from '../config/logger'
import { pool } from '../db'
import {
  getTrueLayerAuthUrl,
  exchangeCode,
  getAccounts,
  getTransactions,
  storeTokens,
  refreshConnectionTokens,
  getUserConnections,
  revokeConnection,
  insertRawTransactions,
  purgeOldRawTransactions,
} from '../services/truelayer'
import { classifyConnection } from '../services/classification'

const router = Router()
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

// Generate TrueLayer auth URL
router.get('/connect', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const state = Buffer.from(JSON.stringify({ userId: req.user.user_id, nonce: Math.random().toString(36).slice(2) })).toString('base64url')
    const url = getTrueLayerAuthUrl(state)
    res.json({ url })
  } catch (err: any) {
    logger.error('Bank connect error', err)
    res.status(500).json({ error: 'connect_failed', message: err.message || 'Unable to start the bank connect flow' })
  }
})

router.post('/connections/:connectionId/classify', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const { connectionId } = req.params
  try {
    await classifyConnection(req.user.user_id, connectionId)
    res.json({ message: 'Classification queued' })
  } catch (err) {
    logger.error('Classification error', err)
    res.status(500).json({ error: 'Failed to classify transactions' })
  }
})

// TrueLayer OAuth callback
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query
  if (error || !code || typeof code !== 'string' || !state || typeof state !== 'string') {
    res.redirect(`${FRONTEND_URL}/connect-bank?error=auth_failed`)
    return
  }

  let userId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    userId = decoded.userId
    if (!userId) throw new Error('Missing userId in state')
  } catch {
    res.redirect(`${FRONTEND_URL}/connect-bank?error=invalid_state`)
    return
  }

  try {
    const tokenData = await exchangeCode(code)
    const accounts = await getAccounts(tokenData.access_token)
    if (accounts.length === 0) {
      res.redirect(`${FRONTEND_URL}/connect-bank?error=no_accounts`)
      return
    }

    const primary = accounts[0]
    const bankName = primary.provider?.display_name || primary.display_name || 'Unknown Bank'
    const bankId = primary.provider?.provider_id || 'unknown'

    const connectionId = await storeTokens(
      userId,
      bankName,
      bankId,
      tokenData.access_token,
      tokenData.refresh_token,
      tokenData.expires_in
    )

    // Log consent grant
    await pool.query(
      `INSERT INTO consent_logs (user_id, connection_id, action, ip_address, user_agent)
       VALUES ($1, $2, 'granted', $3, $4)`,
      [userId, connectionId, req.ip, req.headers['user-agent'] || '']
    )

    // Fetch 12 months of transactions for all accounts
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
    const fromDate = twelveMonthsAgo.toISOString().split('T')[0]
    const toDate = new Date().toISOString().split('T')[0]

    for (const account of accounts) {
      try {
        const transactions = await getTransactions(tokenData.access_token, account.account_id, fromDate, toDate)
        await insertRawTransactions(connectionId, userId, transactions, account.account_id)
      } catch (txErr: any) {
        logger.warn(`Failed to fetch transactions for account ${account.account_id}`, txErr.message)
      }
    }

    await purgeOldRawTransactions()

    // Run classification in the background so products are available immediately
    classifyConnection(userId, connectionId).catch((err) => {
      logger.warn('Background classification failed after callback', err)
    })

    res.redirect(`${FRONTEND_URL}/connect-bank/success`)
  } catch (err: any) {
    logger.error('TrueLayer callback error', err)
    res.redirect(`${FRONTEND_URL}/connect-bank?error=callback_failed`)
  }
})

// List user bank connections
router.get('/connections', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const connections = await getUserConnections(req.user.user_id)
    res.json({ connections })
  } catch (err) {
    logger.error('Get connections error', err)
    res.status(500).json({ error: 'Failed to fetch connections' })
  }
})

// Revoke a connection
router.delete('/connections/:connectionId', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const success = await revokeConnection(req.user.user_id, req.params.connectionId)
    if (!success) {
      res.status(404).json({ error: 'Connection not found' })
      return
    }
    await pool.query(
      `INSERT INTO consent_logs (user_id, connection_id, action, ip_address, user_agent)
       VALUES ($1, $2, 'revoked', $3, $4)`,
      [req.user.user_id, req.params.connectionId, req.ip, req.headers['user-agent'] || '']
    )
    res.json({ message: 'Connection revoked' })
  } catch (err) {
    logger.error('Revoke connection error', err)
    res.status(500).json({ error: 'Failed to revoke connection' })
  }
})

// Trigger sync (fetch latest transactions)
router.post('/connections/:connectionId/sync', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const connRow = await pool.query(
      'SELECT * FROM bank_connections WHERE connection_id = $1 AND user_id = $2 AND status = $3',
      [req.params.connectionId, req.user.user_id, 'active']
    )
    if (connRow.rows.length === 0) {
      res.status(404).json({ error: 'Connection not found or not active' })
      return
    }
    const conn = connRow.rows[0]

    // Refresh token if needed (expiring within 5 minutes)
    let accessToken = conn.truelayer_token_encrypted
    if (new Date(conn.expires_at) < new Date(Date.now() + 5 * 60 * 1000)) {
      const refreshed = await refreshConnectionTokens(conn.connection_id, conn.truelayer_refresh_token_encrypted)
      accessToken = refreshed.access_token
    }

    const accounts = await getAccounts(accessToken)
    const fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const toDate = new Date().toISOString().split('T')[0]

    for (const account of accounts) {
      try {
        const transactions = await getTransactions(accessToken, account.account_id, fromDate, toDate)
        await insertRawTransactions(conn.connection_id, req.user.user_id, transactions, account.account_id)
      } catch (txErr: any) {
        logger.warn(`Sync failed for account ${account.account_id}`, txErr.message)
      }
    }

    await pool.query('UPDATE bank_connections SET last_sync_at = NOW() WHERE connection_id = $1', [conn.connection_id])
    res.json({ message: 'Sync complete' })
  } catch (err) {
    logger.error('Sync error', err)
    res.status(500).json({ error: 'Failed to sync transactions' })
  }
})

// Revoke all connections
router.delete('/connections', authenticateToken, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const result = await pool.query(
      'SELECT connection_id FROM bank_connections WHERE user_id = $1 AND status = $2',
      [req.user.user_id, 'active']
    )
    for (const row of result.rows) {
      await revokeConnection(req.user.user_id, row.connection_id)
      await pool.query(
        `INSERT INTO consent_logs (user_id, connection_id, action, ip_address, user_agent)
         VALUES ($1, $2, 'revoked', $3, $4)`,
        [req.user.user_id, row.connection_id, req.ip, req.headers['user-agent'] || '']
      )
    }
    res.json({ message: 'All connections revoked' })
  } catch (err) {
    logger.error('Revoke all connections error', err)
    res.status(500).json({ error: 'Failed to revoke connections' })
  }
})

export default router
