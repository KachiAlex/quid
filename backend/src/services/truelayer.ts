import axios from 'axios'
import { pool } from '../db'
import { logger } from '../config/logger'

const TL_AUTH_BASE = process.env.TRUELAYER_SANDBOX === 'true'
  ? 'https://auth.truelayer-sandbox.com'
  : 'https://auth.truelayer.com'
const TL_API_BASE = process.env.TRUELAYER_SANDBOX === 'true'
  ? 'https://api.truelayer-sandbox.com'
  : 'https://api.truelayer.com'

const CLIENT_ID = process.env.TRUELAYER_CLIENT_ID || ''
const CLIENT_SECRET = process.env.TRUELAYER_CLIENT_SECRET || ''
const REDIRECT_URI = process.env.TRUELAYER_REDIRECT_URI || 'http://localhost:3000/api/banking/callback'

export function getTrueLayerAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: 'accounts transactions balance',
    redirect_uri: REDIRECT_URI,
    state,
    providers: 'uk-oauth-all',
  })
  return `${TL_AUTH_BASE}/?${params.toString()}`
}

export async function exchangeCode(code: string) {
  const tokenRes = await axios.post(
    `${TL_AUTH_BASE}/connect/token`,
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )
  return tokenRes.data as {
    access_token: string
    refresh_token: string
    expires_in: number
    token_type: string
  }
}

export async function refreshAccessToken(refreshToken: string) {
  const tokenRes = await axios.post(
    `${TL_AUTH_BASE}/connect/token`,
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )
  return tokenRes.data as {
    access_token: string
    refresh_token: string
    expires_in: number
    token_type: string
  }
}

export async function getAccounts(accessToken: string) {
  const res = await axios.get(`${TL_API_BASE}/data/v1/accounts`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return res.data.results as Array<{
    account_id: string
    display_name?: string
    account_type?: string
    currency?: string
    provider?: { display_name: string; provider_id: string }
  }>
}

export async function getTransactions(accessToken: string, accountId: string, from?: string, to?: string) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const url = `${TL_API_BASE}/data/v1/accounts/${accountId}/transactions?${params.toString()}`
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return res.data.results as Array<{
    transaction_id: string
    account_id: string
    timestamp: string
    description: string
    transaction_type: 'DEBIT' | 'CREDIT'
    transaction_category?: string
    amount: number
    currency: string
    running_balance?: { amount: number; currency: string }
    meta?: { provider_transaction_category?: string; provider_reference_number?: string }
    merchant_name?: string
  }>
}

export async function storeTokens(
  userId: string,
  bankName: string,
  bankId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
) {
  const expiresAt = new Date(Date.now() + expiresIn * 1000)
  const result = await pool.query(
    `INSERT INTO bank_connections (user_id, bank_name, bank_id, truelayer_token_encrypted, truelayer_refresh_token_encrypted, expires_at, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'active')
     RETURNING connection_id`,
    [userId, bankName, bankId, accessToken, refreshToken, expiresAt]
  )
  return result.rows[0].connection_id as string
}

export async function refreshConnectionTokens(connectionId: string, refreshToken: string) {
  const tokenData = await refreshAccessToken(refreshToken)
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)
  await pool.query(
    `UPDATE bank_connections
     SET truelayer_token_encrypted = $1,
         truelayer_refresh_token_encrypted = $2,
         expires_at = $3,
         status = 'active',
         last_sync_at = NOW(),
         updated_at = NOW()
     WHERE connection_id = $4`,
    [tokenData.access_token, tokenData.refresh_token, expiresAt, connectionId]
  )
  return tokenData
}

export async function getConnectionByUser(userId: string, connectionId: string) {
  const result = await pool.query(
    'SELECT * FROM bank_connections WHERE connection_id = $1 AND user_id = $2',
    [connectionId, userId]
  )
  return result.rows[0] || null
}

export async function getUserConnections(userId: string) {
  const result = await pool.query(
    `SELECT connection_id, bank_name, bank_id, status, connected_at, expires_at, last_sync_at
     FROM bank_connections
     WHERE user_id = $1 AND deleted_at IS NULL
     ORDER BY connected_at DESC`,
    [userId]
  )
  return result.rows
}

export async function revokeConnection(userId: string, connectionId: string) {
  const conn = await getConnectionByUser(userId, connectionId)
  if (!conn) return false

  // Attempt to revoke with TrueLayer if token exists
  if (conn.truelayer_token_encrypted) {
    try {
      await axios.post(
        `${TL_AUTH_BASE}/connect/revoke`,
        new URLSearchParams({
          token: conn.truelayer_token_encrypted,
          token_type_hint: 'access_token',
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      )
    } catch (err: any) {
      logger.warn('TrueLayer token revocation failed (may already be expired)', err.message)
    }
  }

  await pool.query(
    `UPDATE bank_connections SET status = 'revoked', updated_at = NOW() WHERE connection_id = $1`,
    [connectionId]
  )
  return true
}

export async function insertRawTransactions(
  connectionId: string,
  userId: string,
  transactions: Array<{
    transaction_id: string
    account_id: string
    timestamp: string
    description: string
    transaction_type: 'DEBIT' | 'CREDIT'
    transaction_category?: string
    amount: number
    currency: string
    running_balance?: { amount: number; currency: string }
    meta?: any
    merchant_name?: string
  }>,
  accountId: string
) {
  const values: any[] = []
  const placeholders: string[] = []
  let idx = 1
  for (const tx of transactions) {
    placeholders.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`)
    values.push(
      connectionId,
      userId,
      tx.transaction_id,
      accountId,
      tx.amount,
      tx.currency,
      tx.description,
      tx.merchant_name || null,
      tx.transaction_type,
      tx.transaction_category || null,
      tx.timestamp.split('T')[0],
      tx.running_balance?.amount || null,
      JSON.stringify(tx.meta || {})
    )
  }
  if (placeholders.length === 0) return
  await pool.query(
    `INSERT INTO raw_transactions
     (connection_id, user_id, truelayer_transaction_id, account_id, amount, currency, description, merchant_name, transaction_type, transaction_category, transaction_date, running_balance, meta)
     VALUES ${placeholders.join(', ')}`,
    values
  )
}

export async function purgeOldRawTransactions() {
  await pool.query("DELETE FROM raw_transactions WHERE created_at < NOW() - INTERVAL '24 hours'")
}
