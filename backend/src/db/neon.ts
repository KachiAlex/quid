/**
 * Neon Serverless Postgres Adapter
 * Uses WebSocket-based connections ideal for Vercel serverless.
 * Falls back to standard pg.Pool if Neon is not configured.
 */

import { logger } from '../config/logger'

let neonSql: any = null

async function initNeon() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl || !databaseUrl.includes('neon.tech')) return

  try {
    const mod = await import('@neondatabase/serverless' as any)
    const neon = mod.neon
    neonSql = neon(databaseUrl)
    logger.info('Neon serverless database adapter initialized')
  } catch {
    logger.warn('@neondatabase/serverless not installed — using pg.Pool')
  }
}

initNeon()

export async function queryNeon(sqlTemplate: string, params?: any[]): Promise<any> {
  if (!neonSql) {
    throw new Error('Neon adapter not initialized')
  }
  if (params && params.length > 0) {
    return neonSql(sqlTemplate, params)
  }
  return neonSql(sqlTemplate)
}

export function isNeonAvailable(): boolean {
  return neonSql !== null
}
