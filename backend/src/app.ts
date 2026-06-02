import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import { randomUUID } from 'crypto'

import { errorHandler } from './middleware/errorHandler'
import { csrfProtection, getCsrfToken } from './middleware/csrf'
import routes from './routes'
import { logger } from './config/logger'
import { initSentry, sentryErrorHandler } from './config/sentry'

dotenv.config()

const app = express()
initSentry(app).catch(() => {}) // non-blocking

app.set('trust proxy', 1)

app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
}))

app.use(compression())

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
].filter(Boolean) as string[]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => origin === o || origin.endsWith('.vercel.app'))) {
      callback(null, true)
    } else {
      callback(new Error(`CORS: ${origin} not allowed`))
    }
  },
  credentials: true,
}))

// Request ID middleware
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] as string || randomUUID()
  res.setHeader('x-request-id', req.id)
  next()
})

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      requestId: req.id,
    })
  })
  next()
})

app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path })
    res.status(429).json({ error: 'Too many requests' })
  },
})
app.use('/api/', limiter)

app.use('/api', csrfProtection)

app.get('/api/csrf-token', getCsrfToken)

app.use('/api', routes)

app.get('/health', async (_req, res) => {
  try {
    const { testConnection } = await import('./db')
    const dbHealthy = await testConnection()
    res.json({
      status: dbHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: dbHealthy ? 'connected' : 'disconnected'
    })
  } catch (err) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    })
  }
})

app.use(sentryErrorHandler())
app.use(errorHandler)

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully')
  process.exit(0)
})

declare global {
  namespace Express {
    interface Request {
      id?: string
    }
  }
}

export default app
