/**
 * Automatic 90-Day Reclassification Job
 * Re-runs product classification on existing bank connections to refresh
 * product records with updated transaction data and improved accuracy
 */

import { pool } from '../db'
import { logger } from '../config/logger'
import { classifyConnection } from '../services/classification'

interface ReclassificationResult {
  userId: string
  connectionId: string
  bankName: string
  productsReclassified: number
  previousProductsCount: number
  newProductsCount: number
  reclassificationTime: Date
}

/**
 * Find connections that need reclassification (older than 90 days or never reclassified)
 */
async function findConnectionsForReclassification(): Promise<any[]> {
  const result = await pool.query(
    `SELECT 
       bc.connection_id,
       bc.user_id,
       bc.bank_name,
       bc.created_at,
       bc.last_sync_at,
       pr.last_verified as last_reclassified,
       EXTRACT(EPOCH FROM (NOW() - pr.last_verified)) / 86400 as days_since_reclassification
     FROM bank_connections bc
     LEFT JOIN product_records pr ON bc.connection_id = pr.connection_id
     WHERE bc.status = 'active'
       AND bc.last_sync_at IS NOT NULL
       AND (
         pr.last_verified IS NULL 
         OR pr.last_verified < NOW() - INTERVAL '90 days'
         OR bc.last_sync_at > pr.last_verified
       )
     GROUP BY bc.connection_id, bc.user_id, bc.bank_name, bc.created_at, bc.last_sync_at, pr.last_verified
     ORDER BY bc.user_id, bc.last_sync_at DESC`
  )
  
  return result.rows
}

/**
 * Get product count before reclassification for comparison
 */
async function getProductCount(connectionId: string): Promise<number> {
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM product_records WHERE connection_id = $1',
    [connectionId]
  )
  return parseInt(result.rows[0].count)
}

/**
 * Run reclassification for a specific connection
 */
async function reclassifyConnection(
  userId: string, 
  connectionId: string, 
  bankName: string
): Promise<ReclassificationResult> {
  const startTime = new Date()
  
  // Get current product count
  const previousProductsCount = await getProductCount(connectionId)
  
  try {
    // Run classification on the connection
    await classifyConnection(userId, connectionId)
    
    // Get new product count
    const newProductsCount = await getProductCount(connectionId)
    
    const result: ReclassificationResult = {
      userId,
      connectionId,
      bankName,
      productsReclassified: newProductsCount,
      previousProductsCount,
      newProductsCount,
      reclassificationTime: startTime,
    }
    
    logger.info('Connection reclassified successfully', {
      connectionId,
      userId,
      bankName,
      previousCount: previousProductsCount,
      newCount: newProductsCount,
      change: newProductsCount - previousProductsCount,
    })
    
    return result
  } catch (error) {
    logger.error('Failed to reclassify connection', {
      connectionId,
      userId,
      bankName,
      error,
    })
    throw error
  }
}

/**
 * Log reclassification results to audit log
 */
async function logReclassificationResults(results: ReclassificationResult[]): Promise<void> {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    for (const result of results) {
      await client.query(
        `INSERT INTO audit_logs 
         (user_id, action, entity_type, entity_id, metadata, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          result.userId,
          'automatic_reclassification',
          'bank_connection',
          result.connectionId,
          JSON.stringify({
            bankName: result.bankName,
            previousProductsCount: result.previousProductsCount,
            newProductsCount: result.newProductsCount,
            productsReclassified: result.productsReclassified,
            reclassificationTime: result.reclassificationTime,
          }),
          null, // IP address not applicable for background job
          'quid-background-job',
        ]
      )
    }
    
    await client.query('COMMIT')
    logger.info(`Logged ${results.length} reclassification results to audit log`)
  } catch (error) {
    await client.query('ROLLBACK')
    logger.error('Failed to log reclassification results', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Send notification to users about reclassification changes
 */
async function sendReclassificationNotifications(results: ReclassificationResult[]): Promise<void> {
  for (const result of results) {
    const productChange = result.newProductsCount - result.previousProductsCount
    
    // Only notify if there's a meaningful change
    if (Math.abs(productChange) >= 1) {
      try {
        // This would integrate with the email service
        // For now, just log the notification
        logger.info('Reclassification notification ready', {
          userId: result.userId,
          connectionId: result.connectionId,
          bankName: result.bankName,
          productChange,
          message: productChange > 0 
            ? `We found ${productChange} new product(s) in your ${result.bankName} account`
            : `We removed ${Math.abs(productChange)} product(s) from your ${result.bankName} account`,
        })
      } catch (error) {
        logger.error('Failed to send reclassification notification', {
          userId: result.userId,
          error,
        })
      }
    }
  }
}

/**
 * Main automatic reclassification job
 * Should be run daily to check for connections needing reclassification
 */
export async function runAutomaticReclassificationJob(): Promise<{
  totalConnections: number
  successfulReclassifications: number
  failedReclassifications: number
  results: ReclassificationResult[]
}> {
  logger.info('Starting automatic reclassification job')
  
  const results: ReclassificationResult[] = []
  let successfulReclassifications = 0
  let failedReclassifications = 0
  
  try {
    // Find connections that need reclassification
    const connectionsToReclassify = await findConnectionsForReclassification()
    
    logger.info(`Found ${connectionsToReclassify.length} connections needing reclassification`)
    
    if (connectionsToReclassify.length === 0) {
      return {
        totalConnections: 0,
        successfulReclassifications: 0,
        failedReclassifications: 0,
        results: [],
      }
    }
    
    // Process each connection
    for (const connection of connectionsToReclassify) {
      try {
        const result = await reclassifyConnection(
          connection.user_id,
          connection.connection_id,
          connection.bank_name
        )
        
        results.push(result)
        successfulReclassifications++
        
        // Add a small delay between connections to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        logger.error('Failed to reclassify connection', {
          connectionId: connection.connection_id,
          userId: connection.user_id,
          bankName: connection.bank_name,
          error,
        })
        failedReclassifications++
      }
    }
    
    // Log results to audit trail
    if (results.length > 0) {
      await logReclassificationResults(results)
    }
    
    // Send notifications for significant changes
    await sendReclassificationNotifications(results)
    
    const summary = {
      totalConnections: connectionsToReclassify.length,
      successfulReclassifications,
      failedReclassifications,
      results,
    }
    
    logger.info('Automatic reclassification job completed', {
      totalConnections: summary.totalConnections,
      successful: summary.successfulReclassifications,
      failed: summary.failedReclassifications,
      totalProductsReclassified: results.reduce((sum, r) => sum + r.productsReclassified, 0),
    })
    
    return summary
    
  } catch (error) {
    logger.error('Automatic reclassification job failed', error)
    throw error
  }
}

/**
 * Manual trigger for reclassification (for testing or on-demand reclassification)
 */
export async function triggerManualReclassification(userId?: string): Promise<{
  success: boolean
  message: string
  reclassifiedConnections: number
}> {
  try {
    logger.info('Starting manual reclassification', { userId })
    
    let connectionsToReclassify: any
    
    if (userId) {
      // Reclassify specific user's connections
      connectionsToReclassify = await pool.query(
        `SELECT 
           bc.connection_id,
           bc.user_id,
           bc.bank_name,
           bc.created_at,
           bc.last_sync_at
         FROM bank_connections bc
         WHERE bc.status = 'active'
           AND bc.user_id = $1
           AND bc.last_sync_at IS NOT NULL`,
        [userId]
      )
    } else {
      // Get all connections (for admin/manual trigger)
      connectionsToReclassify = await pool.query(
        `SELECT 
           bc.connection_id,
           bc.user_id,
           bc.bank_name,
           bc.created_at,
           bc.last_sync_at
         FROM bank_connections bc
         WHERE bc.status = 'active'
           AND bc.last_sync_at IS NOT NULL
         LIMIT 10` // Limit for manual trigger to avoid overwhelming
      )
    }
    
    if (connectionsToReclassify.rows.length === 0) {
      return {
        success: true,
        message: 'No connections found for reclassification',
        reclassifiedConnections: 0,
      }
    }
    
    let reclassifiedCount = 0
    for (const connection of connectionsToReclassify.rows) {
      try {
        await reclassifyConnection(
          connection.user_id,
          connection.connection_id,
          connection.bank_name
        )
        reclassifiedCount++
      } catch (error) {
        logger.error('Manual reclassification failed for connection', {
          connectionId: connection.connection_id,
          error,
        })
      }
    }
    
    return {
      success: true,
      message: `Successfully reclassified ${reclassifiedCount} connections`,
      reclassifiedConnections: reclassifiedCount,
    }
    
  } catch (error) {
    logger.error('Manual reclassification failed', error)
    return {
      success: false,
      message: 'Manual reclassification failed',
      reclassifiedConnections: 0,
    }
  }
}

/**
 * Get reclassification statistics
 */
export async function getReclassificationStatistics(): Promise<{
  totalConnections: number
  connectionsNeedingReclassification: number
  lastReclassificationTime: string | null
  averageDaysBetweenReclassifications: number
}> {
  const totalResult = await pool.query(
    "SELECT COUNT(*) as count FROM bank_connections WHERE status = 'active'"
  )
  
  const needingResult = await pool.query(
    `SELECT COUNT(*) as count 
     FROM bank_connections bc
     LEFT JOIN product_records pr ON bc.connection_id = pr.connection_id
     WHERE bc.status = 'active'
       AND (
         pr.last_verified IS NULL 
         OR pr.last_verified < NOW() - INTERVAL '90 days'
         OR bc.last_sync_at > pr.last_verified
       )`
  )
  
  const lastReclassificationResult = await pool.query(
    `SELECT MAX(created_at) as last_reclassification 
     FROM audit_logs 
     WHERE action = 'automatic_reclassification'`
  )
  
  const avgDaysResult = await pool.query(
    `SELECT AVG(EXTRACT(EPOCH FROM (pr.last_verified - bc.created_at)) / 86400) as avg_days
     FROM bank_connections bc
     JOIN product_records pr ON bc.connection_id = pr.connection_id
     WHERE bc.status = 'active'
       AND pr.last_verified IS NOT NULL`
  )
  
  return {
    totalConnections: parseInt(totalResult.rows[0].count),
    connectionsNeedingReclassification: parseInt(needingResult.rows[0].count),
    lastReclassificationTime: lastReclassificationResult.rows[0].last_reclassification,
    averageDaysBetweenReclassifications: parseFloat(avgDaysResult.rows[0].avg_days || '0'),
  }
}
