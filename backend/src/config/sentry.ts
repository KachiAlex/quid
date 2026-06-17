/**
 * Sentry Error Tracking & Performance Monitoring
 * Optional integration — safely skips if DSN is not configured.
 */

import { logger } from './logger'

let sentryInitialized = false

export async function initSentry(app: any): Promise<void> {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) {
    logger.info('Sentry DSN not configured — skipping initialization')
    return
  }

  try {
    const Sentry = await import('@sentry/node' as any)
    const profiling = await import('@sentry/profiling-node' as any)
    const nodeProfilingIntegration = profiling.nodeProfilingIntegration

    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
      integrations: [
        Sentry.integrations.httpIntegration({ tracing: true }),
        Sentry.integrations.expressIntegration({ app }),
        nodeProfilingIntegration(),
      ],
      tracesSampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE || '0.1'),
      profilesSampleRate: parseFloat(process.env.SENTRY_PROFILE_RATE || '0.05'),
    })

    sentryInitialized = true
    logger.info('Sentry initialized')
  } catch {
    logger.warn('@sentry/node not installed — skipping error tracking')
  }
}

export function sentryErrorHandler(): any {
  if (!sentryInitialized) return (_err: any, _req: any, _res: any, next: any) => next()

  try {
    const Sentry = require('@sentry/node')
    return Sentry.expressErrorHandler()
  } catch {
    return (_err: any, _req: any, _res: any, next: any) => next()
  }
}
