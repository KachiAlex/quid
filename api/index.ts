import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'

import { errorHandler } from '../backend/src/middleware/errorHandler'
import { csrfProtection, getCsrfToken } from '../backend/src/middleware/csrf'
import routes from '../backend/src/routes'
import { testConnection } from '../backend/src/db'
import { logger } from '../backend/src/config/logger'
import { handleDemoRequest } from './demo-data'

// Demo mode fallback for missing environment variables
if (!process.env.DATABASE_URL) {
  console.log('DATABASE_URL not configured, using demo mode')
  process.env.DATABASE_URL = 'postgresql://demo:demo@localhost:5432/demo'
}

if (!process.env.JWT_SECRET) {
  console.log('JWT_SECRET not configured, using demo secret')
  process.env.JWT_SECRET = 'demo-jwt-secret-for-development-only'
}

if (!process.env.JWT_REFRESH_SECRET) {
  console.log('JWT_REFRESH_SECRET not configured, using demo secret')
  process.env.JWT_REFRESH_SECRET = 'demo-refresh-secret-for-development-only'
}

if (!process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL = 'https://quid.vercel.app'
}

const app = express()

app.set('trust proxy', 1)

app.use(helmet())

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
app.use(express.json())
app.use(cookieParser())

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/', limiter)

app.use('/api', csrfProtection)

app.get('/api/csrf-token', getCsrfToken)

// Demo middleware - intercept requests in demo mode
app.use('/api', (req, res, next) => {
  if (process.env.DATABASE_URL?.includes('demo')) {
    const demoResponse = handleDemoRequest(req.path, req.query)
    if (demoResponse) {
      console.log(`Demo mode: Serving ${req.path}`)
      res.json(demoResponse)
      return
    }
  }
  next()
})

app.use('/api', routes)

app.get('/api/health', async (_req, res) => {
  try {
    // For demo mode, always return ok
    if (process.env.DATABASE_URL?.includes('demo')) {
      res.json({
        status: 'demo',
        timestamp: new Date().toISOString(),
        database: 'demo-mode',
        message: 'Running in demo mode - database not required'
      })
      return
    }
    
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

app.use(errorHandler)

export default app
