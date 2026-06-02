/**
 * Redis Caching Layer
 * Uses @upstash/redis for serverless-compatible caching.
 * Falls back to in-memory Map if Redis is not configured (dev mode).
 */

import { logger } from '../config/logger'

let redis: any = null

async function initRedis() {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!redisUrl || !redisToken) return

  try {
    const mod = await import('@upstash/redis' as any)
    const Redis = mod.Redis
    redis = new Redis({ url: redisUrl, token: redisToken })
    logger.info('Redis cache connected')
  } catch {
    logger.warn('@upstash/redis not installed — using in-memory fallback')
  }
}

initRedis()

// In-memory fallback for local dev
const memoryCache = new Map<string, { value: any; expiresAt: number }>()

function memoryGet<T>(key: string): T | null {
  const entry = memoryCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key)
    return null
  }
  return entry.value
}

function memorySet<T>(key: string, value: T, ttlSeconds: number): void {
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
}

function memoryDel(key: string): void {
  memoryCache.delete(key)
}

function memoryDelPattern(pattern: string): void {
  const regex = new RegExp(pattern.replace('*', '.*'))
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) memoryCache.delete(key)
  }
}

/**
 * Get a cached value by key
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    if (redis) {
      const val = await redis.get(key)
      return val as T ?? null
    }
    return memoryGet(key) as T | null
  } catch (err) {
    logger.error('Cache get failed', { key, err })
    return null
  }
}

/**
 * Set a cached value with TTL (seconds)
 */
export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  try {
    if (redis) {
      await redis.setex(key, ttlSeconds, value)
    } else {
      memorySet(key, value, ttlSeconds)
    }
  } catch (err) {
    logger.error('Cache set failed', { key, err })
  }
}

/**
 * Delete a cached key
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    if (redis) {
      await redis.del(key)
    } else {
      memoryDel(key)
    }
  } catch (err) {
    logger.error('Cache delete failed', { key, err })
  }
}

/**
 * Delete keys by pattern (memory fallback only; Redis requires SCAN)
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  try {
    if (redis) {
      // Upstash Redis does not support KEYS; use scan if available
      // For simplicity, skip pattern deletion in Redis mode
      logger.warn('Pattern cache deletion not supported in Redis mode')
    } else {
      memoryDelPattern(pattern)
    }
  } catch (err) {
    logger.error('Cache pattern delete failed', { pattern, err })
  }
}

/**
 * Cache-aware wrapper for async functions
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await getCache<T>(key)
  if (cached !== null) {
    return cached
  }

  const data = await fetcher()
  await setCache(key, data, ttlSeconds)
  return data
}

/**
 * Dashboard-specific helpers
 */
export function dashboardCacheKey(userId: string): string {
  return `dashboard:summary:${userId}`
}

export function ratesCacheKey(productType: string): string {
  return `rates:${productType}`
}

export function invalidateDashboardCache(userId: string): Promise<void> {
  return deleteCache(dashboardCacheKey(userId))
}
