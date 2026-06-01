import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'

import { errorHandler } from '../backend/src/middleware/errorHandler'
import routes from '../backend/src/routes'
import { testConnection } from '../backend/src/db'
import { logger } from '../backend/src/config/logger'

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

app.use('/api', routes)

app.get('/api/health', async (_req, res) => {
  try {
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
