import dotenv from 'dotenv'
import app from './app'
import { logger } from './config/logger'

dotenv.config()

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  logger.info(`Quid backend running on port ${PORT}`)
})
