import dotenv from 'dotenv'
import app from './app'
import { logger } from './config/logger'
import { testConnection } from './db'
import scheduler from './services/scheduler'

dotenv.config()

const PORT = process.env.PORT || 3000

async function startServer() {
  try {
    // Validate required environment variables
    const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL']
    const missing = required.filter(key => !process.env[key])
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
    }

    // Validate TrueLayer configuration
    if (!process.env.TRUELAYER_CLIENT_ID || !process.env.TRUELAYER_CLIENT_SECRET) {
      logger.warn('TrueLayer CLIENT_ID and/or CLIENT_SECRET not configured. Bank connections will fail.')
    } else {
      logger.info('TrueLayer configuration verified')
    }

    // Test database connection
    logger.info('Testing database connection...')
    const dbConnected = await testConnection()
    if (!dbConnected) {
      throw new Error('Failed to connect to database')
    }
    logger.info('Database connection successful')

    app.listen(PORT, () => {
      logger.info(`Quid backend running on port ${PORT}`)
      
      // Start the background job scheduler
      scheduler.startScheduler()
      logger.info('Background job scheduler started')
    })
  } catch (err) {
    logger.error('Failed to start server', err)
    process.exit(1)
  }
}

startServer()
