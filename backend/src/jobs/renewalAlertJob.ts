/**
 * Renewal Alert Background Job
 * Automatically sends renewal alerts to users
 */

import { logger } from '../config/logger'
import { emailAlertService } from '../services/emailAlertService'
import { renewalDetection } from '../services/renewalDetection'

class RenewalAlertJob {
  private isRunning = false
  private lastRun: Date | null = null

  /**
   * Run the renewal alert job
   */
  async run(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Renewal alert job is already running')
      return
    }

    try {
      this.isRunning = true
      logger.info('Starting renewal alert job')

      // Detect upcoming renewals
      const alerts = await renewalDetection.detectUpcomingRenewals()
      logger.info(`Detected ${alerts.length} renewal alerts`)

      // Store alerts in database
      await renewalDetection.storeRenewalAlerts(alerts)

      // Send email alerts
      const emailResults = await emailAlertService.sendRenewalAlerts()
      logger.info('Email alert results', emailResults)

      // Cleanup old data
      const cleanedCount = await renewalDetection.cleanupOldAlerts(90)
      logger.info(`Cleaned up ${cleanedCount} old renewal alerts`)

      this.lastRun = new Date()
      logger.info('Renewal alert job completed successfully')

    } catch (error) {
      logger.error('Renewal alert job failed', error)
      throw error
    } finally {
      this.isRunning = false
    }
  }

  /**
   * Get job status
   */
  getStatus(): {
    isRunning: boolean
    lastRun: Date | null
    nextRun: Date | null
  } {
    const now = new Date()
    const nextRun = this.lastRun ? 
      new Date(this.lastRun.getTime() + 24 * 60 * 60 * 1000) : // 24 hours after last run
      new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now if never run

    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      nextRun,
    }
  }

  /**
   * Force run the job (for testing/admin)
   */
  async forceRun(): Promise<void> {
    logger.info('Force running renewal alert job')
    await this.run()
  }
}

// Export singleton instance
export const renewalAlertJob = new RenewalAlertJob()
