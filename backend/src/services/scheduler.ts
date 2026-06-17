/**
 * Background Job Scheduler
 * Manages periodic execution of background jobs like reclassification, rate updates, etc.
 */

import { logger } from '../config/logger'
import { runAutomaticReclassificationJob } from '../jobs/reclassificationJob'
import { runRateUpdateJob } from '../jobs/rateUpdater'
import { runRenewalDetectionJob } from '../jobs/renewalDetection'
import { runDuplicateDetectionJob } from '../jobs/duplicateDetection'
import { runDormantSubscriptionDetectionJob } from '../jobs/dormantSubscriptionDetection'
import { runRateSeeding } from '../scripts/seedRates'
import { runDailyRateUpdateJob } from '../jobs/dailyRateUpdate'
import { renewalAlertJob } from '../jobs/renewalAlertJob'

interface ScheduledJob {
  name: string
  interval: number // in milliseconds
  lastRun: Date | null
  running: boolean
  job: () => Promise<void>
}

class JobScheduler {
  private jobs: Map<string, ScheduledJob> = new Map()
  private intervals: Map<string, NodeJS.Timeout> = new Map()
  private isRunning = false

  constructor() {
    this.setupDefaultJobs()
  }

  private setupDefaultJobs() {
    // Automatic reclassification job - runs daily
    this.scheduleJob({
      name: 'automatic-reclassification',
      interval: 24 * 60 * 60 * 1000, // 24 hours
      lastRun: null,
      running: false,
      job: async () => {
        logger.info('Running scheduled automatic reclassification job')
        try {
          await runAutomaticReclassificationJob()
        } catch (error) {
          logger.error('Scheduled reclassification job failed', error)
        }
      },
    })

    // Rate update job - runs daily
    this.scheduleJob({
      name: 'rate-update',
      interval: 24 * 60 * 60 * 1000, // 24 hours
      lastRun: null,
      running: false,
      job: async () => {
        logger.info('Running scheduled rate update job')
        try {
          await runRateUpdateJob()
        } catch (error) {
          logger.error('Scheduled rate update job failed', error)
        }
      },
    })

    // Renewal detection job - runs daily
    this.scheduleJob({
      name: 'renewal-detection',
      interval: 24 * 60 * 60 * 1000, // 24 hours
      lastRun: null,
      running: false,
      job: async () => {
        logger.info('Running scheduled renewal detection job')
        try {
          await runRenewalDetectionJob()
        } catch (error) {
          logger.error('Scheduled renewal detection job failed', error)
        }
      },
    })

    // Duplicate charge detection job - runs daily
    this.scheduleJob({
      name: 'duplicate-detection',
      interval: 24 * 60 * 60 * 1000, // 24 hours
      lastRun: null,
      running: false,
      job: async () => {
        logger.info('Running scheduled duplicate detection job')
        try {
          await runDuplicateDetectionJob()
        } catch (error) {
          logger.error('Scheduled duplicate detection job failed', error)
        }
      },
    })

    // Dormant subscription detection job - runs daily
    this.scheduleJob({
      name: 'dormant-subscription-detection',
      interval: 24 * 60 * 60 * 1000, // 24 hours
      lastRun: null,
      running: false,
      job: async () => {
        logger.info('Running scheduled dormant subscription detection job')
        try {
          await runDormantSubscriptionDetectionJob()
        } catch (error) {
          logger.error('Scheduled dormant subscription detection job failed', error)
        }
      },
    })

    // Rate database seeding job - runs weekly
    this.scheduleJob({
      name: 'rate-seeding',
      interval: 7 * 24 * 60 * 60 * 1000, // 7 days (weekly)
      lastRun: null,
      running: false,
      job: async () => {
        logger.info('Running scheduled rate seeding job')
        try {
          await runRateSeeding()
        } catch (error) {
          logger.error('Scheduled rate seeding job failed', error)
        }
      },
    })

    // Daily rate update job - runs daily
    this.scheduleJob({
      name: 'daily-rate-update',
      interval: 24 * 60 * 60 * 1000, // 24 hours (daily)
      lastRun: null,
      running: false,
      job: async () => {
        logger.info('Running scheduled daily rate update job')
        try {
          await runDailyRateUpdateJob()
        } catch (error) {
          logger.error('Scheduled daily rate update job failed', error)
        }
      },
    })

    // Renewal alert job - runs daily
    this.scheduleJob({
      name: 'renewal-alert',
      interval: 24 * 60 * 60 * 1000, // 24 hours (daily)
      lastRun: null,
      running: false,
      job: async () => {
        logger.info('Running scheduled renewal alert job')
        try {
          await renewalAlertJob.run()
        } catch (error) {
          logger.error('Scheduled renewal alert job failed', error)
        }
      },
    })
  }

  scheduleJob(jobConfig: ScheduledJob) {
    this.jobs.set(jobConfig.name, jobConfig)
  }

  async startJob(jobName: string): Promise<void> {
    const job = this.jobs.get(jobName)
    if (!job) {
      throw new Error(`Job '${jobName}' not found`)
    }

    if (job.running) {
      logger.warn(`Job '${jobName}' is already running`)
      return
    }

    job.running = true
    job.lastRun = new Date()

    try {
      await job.job()
      logger.info(`Job '${jobName}' completed successfully`)
    } catch (error) {
      logger.error(`Job '${jobName}' failed`, error)
      throw error
    } finally {
      job.running = false
    }
  }

  startScheduler() {
    if (this.isRunning) {
      logger.warn('Scheduler is already running')
      return
    }

    this.isRunning = true
    logger.info('Starting job scheduler')

    // Set up intervals for each job
    for (const [jobName, job] of this.jobs) {
      const interval = setInterval(async () => {
        if (!job.running) {
          try {
            await this.startJob(jobName)
          } catch (error) {
            logger.error(`Scheduled job '${jobName}' failed`, error)
          }
        } else {
          logger.warn(`Job '${jobName}' skipped - still running from previous execution`)
        }
      }, job.interval)

      this.intervals.set(jobName, interval)
    }

    logger.info(`Scheduler started with ${this.jobs.size} jobs`)
  }

  stopScheduler() {
    if (!this.isRunning) {
      logger.warn('Scheduler is not running')
      return
    }

    this.isRunning = false
    logger.info('Stopping job scheduler')

    // Clear all intervals
    for (const [jobName, interval] of this.intervals) {
      clearInterval(interval)
    }
    this.intervals.clear()

    logger.info('Scheduler stopped')
  }

  getJobStatus() {
    const status: Record<string, {
      interval: number
      lastRun: Date | null
      running: boolean
      nextRun: Date | null
    }> = {}

    for (const [jobName, job] of this.jobs) {
      status[jobName] = {
        interval: job.interval,
        lastRun: job.lastRun,
        running: job.running,
        nextRun: job.lastRun ? new Date(job.lastRun.getTime() + job.interval) : null,
      }
    }

    return status
  }

  async runJobNow(jobName: string): Promise<void> {
    logger.info(`Running job '${jobName}' on demand`)
    await this.startJob(jobName)
  }
}

// Create singleton instance
export const scheduler = new JobScheduler()

// Start scheduler when this module is imported (in production)
// In development, you might want to start it manually
if (process.env.NODE_ENV === 'production') {
  scheduler.startScheduler()
}

export default scheduler
