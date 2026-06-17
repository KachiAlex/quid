/**
 * Email Alert Service
 * Sends timely renewal notifications to users
 */

import { pool } from '../db'
import { logger } from '../config/logger'
import { renewalDetection } from './renewalDetection'
import { RenewalAlert } from './renewalDetection'

interface EmailTemplate {
  subject: string
  htmlBody: string
  textBody: string
}

interface EmailAlert {
  id: string
  userId: string
  email: string
  firstName: string
  alertType: '60_day' | '14_day' | 'imminent' | 'overdue'
  renewalDate: Date
  providerName: string
  productType: string
  annualCost: number
  bestAlternatives?: Array<{
    providerName: string
    annualCost: number
    potentialSavings: number
    savingsPercentage: number
    rating?: number
    features?: string[]
  }>
  priceHikeDetected?: boolean
  priceHikePercentage?: number
}

class EmailAlertService {
  /**
   * Send renewal alerts to users
   */
  async sendRenewalAlerts(): Promise<{
    sent: number
    failed: number
    skipped: number
  }> {
    try {
      // Get unsent alerts
      const alerts = await renewalDetection.getUnsentAlerts()
      
      let sent = 0
      let failed = 0
      let skipped = 0

      for (const alert of alerts) {
        try {
          // Get user details
          const userResult = await pool.query(
            'SELECT email, first_name, email_preferences FROM users WHERE user_id = $1',
            [alert.userId]
          )

          if (userResult.rows.length === 0) {
            logger.warn('User not found for alert', { userId: alert.userId })
            skipped++
            continue
          }

          const user = userResult.rows[0]
          
          // Check email preferences
          const emailPrefs = user.email_preferences || {}
          if (!emailPrefs.renewal_alerts) {
            logger.info('User has opted out of renewal alerts', { userId: alert.userId })
            skipped++
            continue
          }

          // Send email
          await this.sendRenewalEmail({
            ...alert,
            email: user.email,
            firstName: user.first_name,
          })

          sent++

        } catch (error: any) {
          logger.error('Failed to send renewal alert', {
            alertId: alert.userId,
            error: error?.message || 'Unknown error'
          })
          failed++
        }
      }

      // Mark sent alerts as processed
      const sentAlertIds = alerts.slice(0, sent).map(alert => alert.userId)
      if (sentAlertIds.length > 0) {
        await renewalDetection.markAlertsAsSent(sentAlertIds)
      }

      logger.info('Renewal alert sending completed', {
        total: alerts.length,
        sent,
        failed,
        skipped,
      })

      return { sent, failed, skipped }

    } catch (error) {
      logger.error('Failed to send renewal alerts', error)
      throw error
    }
  }

  /**
   * Send individual renewal email
   */
  private async sendRenewalEmail(alert: EmailAlert): Promise<void> {
    try {
      const template = this.generateEmailTemplate(alert)
      
      // In a real implementation, this would use an email service like SendGrid, AWS SES, etc.
      // For now, we'll log the email content
      logger.info('Sending renewal email', {
        to: alert.email,
        subject: template.subject,
        alertType: alert.alertType,
        renewalDate: alert.renewalDate,
      })

      // Simulate email sending
      await this.simulateEmailSend(alert.email, template)

    } catch (error) {
      logger.error('Failed to send renewal email', error)
      throw error
    }
  }

  /**
   * Generate email template based on alert type
   */
  private generateEmailTemplate(alert: EmailAlert): EmailTemplate {
    const daysUntil = Math.ceil((alert.renewalDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    
    let subject: string
    let urgency: 'low' | 'medium' | 'high' | 'critical'
    let headline: string
    let mainMessage: string

    switch (alert.alertType) {
      case '60_day':
        subject = `🔔 Your ${alert.providerName} ${alert.productType} renewal is approaching`
        urgency = 'low'
        headline = 'Your renewal is coming up'
        mainMessage = `Your ${alert.productType} contract with ${alert.providerName} is due for renewal in ${daysUntil} days.`
        break
      case '14_day':
        subject = `⚠️ URGENT: Your ${alert.providerName} ${alert.productType} renews in 2 weeks`
        urgency = 'medium'
        headline = 'Action required: Renewal in 2 weeks'
        mainMessage = `Your ${alert.productType} contract with ${alert.providerName} will renew automatically in ${daysUntil} days.`
        break
      case 'imminent':
        subject = `🚨 CRITICAL: Your ${alert.providerName} ${alert.productType} renews this week!`
        urgency = 'high'
        headline = 'Immediate action required'
        mainMessage = `Your ${alert.productType} contract with ${alert.providerName} will renew in just ${daysUntil} days!`
        break
      case 'overdue':
        subject = `⏰ OVERDUE: Your ${alert.providerName} ${alert.productType} has renewed`
        urgency = 'critical'
        headline = 'Your contract has renewed'
        mainMessage = `Your ${alert.productType} contract with ${alert.providerName} has already renewed.`
        break
      default:
        subject = `Your ${alert.providerName} ${alert.productType} renewal notice`
        urgency = 'medium'
        headline = 'Renewal notice'
        mainMessage = `Your ${alert.productType} contract with ${alert.providerName} requires attention.`
    }

    const htmlBody = this.generateHtmlEmail(alert, {
      subject,
      urgency,
      headline,
      mainMessage,
      daysUntil,
    })

    const textBody = this.generateTextEmail(alert, {
      subject,
      urgency,
      headline,
      mainMessage,
      daysUntil,
    })

    return { subject, htmlBody, textBody }
  }

  /**
   * Generate HTML email content
   */
  private generateHtmlEmail(alert: EmailAlert, template: {
    subject: string
    urgency: 'low' | 'medium' | 'high' | 'critical'
    headline: string
    mainMessage: string
    daysUntil: number
  }): string {
    const urgencyColors = {
      low: '#3b82f6',
      medium: '#f59e0b',
      high: '#ef4444',
      critical: '#dc2626',
    }

    const renewalDate = alert.renewalDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    const alternativesHtml = alert.bestAlternatives ? alert.bestAlternatives.slice(0, 3).map(alt => {
      const ratingStars = alt.rating ? '⭐'.repeat(Math.round(alt.rating)) : ''
      const featuresList = alt.features ? alt.features.slice(0, 3).map(feature => `• ${feature}`).join('<br>') : ''
      
      return `
      <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid #3b82f6;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
          <div style="font-weight: 600; color: #1e293b; font-size: 16px;">${alt.providerName}</div>
          <div style="color: #fbbf24; font-size: 14px;">${ratingStars}</div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
          <div style="color: #64748b; font-size: 14px;">£${alt.annualCost.toFixed(2)}/year</div>
          <div style="color: #059669; font-weight: 600; font-size: 14px;">Save ${alt.savingsPercentage.toFixed(1)}%</div>
        </div>
        <div style="color: #059669; font-weight: 600; margin-bottom: 8px;">Save £${alt.potentialSavings.toFixed(2)}/year</div>
        ${featuresList ? `<div style="color: #64748b; font-size: 12px; line-height: 1.4;">${featuresList}</div>` : ''}
      </div>
    `
    }).join('') : ''

    const priceHikeHtml = alert.priceHikeDetected ? `
      <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <div style="color: #dc2626; font-weight: 600; margin-bottom: 8px;">⚠️ Price Increase Detected</div>
        <div style="color: #7f1d1d;">Your current provider has increased prices by ${alert.priceHikePercentage?.toFixed(1)}%. Now might be a good time to switch.</div>
      </div>
    ` : ''

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${template.subject}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <!-- Header -->
          <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; color: #1e293b;">Quid</h1>
            <p style="margin: 8px 0 0 0; color: #64748b; font-size: 14px;">Your Subscription Management Assistant</p>
          </div>

          <!-- Alert Banner -->
          <div style="background: ${urgencyColors[template.urgency]}; color: white; padding: 16px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
            <div style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">${template.headline}</div>
            <div style="opacity: 0.9;">${alert.productType} • ${alert.providerName}</div>
          </div>

          <!-- Main Content -->
          <div style="background: white; padding: 24px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
            <h2 style="margin: 0 0 16px 0; color: #1e293b;">${template.mainMessage}</h2>
            
            <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div>
                  <div style="color: #64748b; font-size: 14px; margin-bottom: 4px;">Current Provider</div>
                  <div style="font-weight: 600; color: #1e293b;">${alert.providerName}</div>
                </div>
                <div>
                  <div style="color: #64748b; font-size: 14px; margin-bottom: 4px;">Annual Cost</div>
                  <div style="font-weight: 600; color: #1e293b;">£${alert.annualCost.toFixed(2)}</div>
                </div>
                <div>
                  <div style="color: #64748b; font-size: 14px; margin-bottom: 4px;">Renewal Date</div>
                  <div style="font-weight: 600; color: #1e293b;">${renewalDate}</div>
                </div>
                <div>
                  <div style="color: #64748b; font-size: 14px; margin-bottom: 4px;">Days Until</div>
                  <div style="font-weight: 600; color: ${urgencyColors[template.urgency]};">${template.daysUntil} days</div>
                </div>
              </div>
            </div>

            ${priceHikeHtml}

            ${alternativesHtml ? `
              <div style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 12px 0; color: #1e293b;">💰 Better Alternatives Available</h3>
                ${alternativesHtml}
              </div>
            ` : ''}

            <div style="text-align: center;">
              <a href="${process.env.BASE_URL || 'https://quid.app'}/dashboard" 
                 style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                View Your Dashboard
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align: center; color: #64748b; font-size: 12px; margin-top: 24px;">
            <p>This is an automated message from Quid. You can manage your email preferences in your account settings.</p>
            <p style="margin-top: 8px;">© 2024 Quid. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Generate text email content
   */
  private generateTextEmail(alert: EmailAlert, template: {
    subject: string
    urgency: 'low' | 'medium' | 'high' | 'critical'
    headline: string
    mainMessage: string
    daysUntil: number
  }): string {
    const renewalDate = alert.renewalDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    let text = `${template.subject}\n\n`
    text += `${template.headline}\n`
    text += `${alert.productType} • ${alert.providerName}\n\n`
    text += `${template.mainMessage}\n\n`
    text += `Current Provider: ${alert.providerName}\n`
    text += `Annual Cost: £${alert.annualCost.toFixed(2)}\n`
    text += `Renewal Date: ${renewalDate}\n`
    text += `Days Until: ${template.daysUntil} days\n\n`

    if (alert.priceHikeDetected) {
      text += `⚠️ Price Increase Detected\n`
      text += `Your current provider has increased prices by ${alert.priceHikePercentage?.toFixed(1)}%.\n\n`
    }

    if (alert.bestAlternatives && alert.bestAlternatives.length > 0) {
      text += `💰 Better Alternatives Available:\n`
      alert.bestAlternatives.slice(0, 3).forEach(alt => {
        const rating = alt.rating ? ` (${'⭐'.repeat(Math.round(alt.rating))})` : ''
        text += `- ${alt.providerName}${rating}: £${alt.annualCost.toFixed(2)}/year\n`
        text += `  Save £${alt.potentialSavings.toFixed(2)}/year (${alt.savingsPercentage.toFixed(1)}%)\n`
        if (alt.features && alt.features.length > 0) {
          text += `  Features: ${alt.features.slice(0, 3).join(', ')}\n`
        }
        text += '\n'
      })
    }

    text += `View your dashboard: ${process.env.BASE_URL || 'https://quid.app'}/dashboard\n\n`
    text += `This is an automated message from Quid. You can manage your email preferences in your account settings.\n`
    text += `© 2024 Quid. All rights reserved.`

    return text
  }

  /**
   * Simulate email sending (for development)
   */
  private async simulateEmailSend(to: string, template: EmailTemplate): Promise<void> {
    // In a real implementation, this would use an email service
    // For development, we'll just log the email
    logger.info('Email sent (simulated)', {
      to,
      subject: template.subject,
      bodyLength: template.htmlBody.length,
    })

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  /**
   * Send test email
   */
  async sendTestEmail(userId: string, alertType: '60_day' | '14_day' | 'imminent' | 'overdue'): Promise<void> {
    try {
      // Get user details
      const userResult = await pool.query(
        'SELECT email, first_name FROM users WHERE user_id = $1',
        [userId]
      )

      if (userResult.rows.length === 0) {
        throw new Error('User not found')
      }

      const user = userResult.rows[0]

      // Create test alert
      const testAlert: EmailAlert = {
        id: 'test',
        userId,
        email: user.email,
        firstName: user.first_name,
        alertType,
        renewalDate: new Date(Date.now() + (alertType === '60_day' ? 60 : alertType === '14_day' ? 14 : alertType === 'imminent' ? 3 : -1) * 24 * 60 * 60 * 1000),
        providerName: 'Test Provider',
        productType: 'Test Product',
        annualCost: 1200,
        bestAlternatives: [
          {
            providerName: 'Alternative Provider',
            annualCost: 1000,
            potentialSavings: 200,
          },
        ],
        priceHikeDetected: true,
        priceHikePercentage: 15.5,
      }

      await this.sendRenewalEmail(testAlert)

      logger.info('Test email sent', { userId, alertType })

    } catch (error) {
      logger.error('Failed to send test email', error)
      throw error
    }
  }

  /**
   * Get email statistics
   */
  async getEmailStatistics(dateRange?: { from: Date; to: Date }): Promise<{
    totalSent: number
    totalFailed: number
    totalSkipped: number
    byAlertType: Record<string, number>
    deliveryRate: number
  }> {
    try {
      let whereClause = 'WHERE 1=1'
      const params: any[] = []

      if (dateRange) {
        whereClause += ' AND sent_at >= $1 AND sent_at <= $2'
        params.push(dateRange.from, dateRange.to)
      }

      const query = `
        SELECT 
          COUNT(*) as total_sent,
          COUNT(CASE WHEN sent_at IS NOT NULL THEN 1 END) as successful_sends,
          COUNT(CASE WHEN sent_at IS NULL THEN 1 END) as failed_sends,
          alert_type,
          COUNT(*) as count
        FROM renewal_alerts
        ${whereClause}
        GROUP BY alert_type
      `

      const result = await pool.query(query, params)
      
      let totalSent = 0
      let totalFailed = 0
      const byAlertType: Record<string, number> = {}

      result.rows.forEach(row => {
        totalSent += parseInt(row.count)
        if (row.sent_at) {
          // Successful sends
        } else {
          totalFailed += parseInt(row.count)
        }
        byAlertType[row.alert_type] = parseInt(row.count)
      })

      const totalSkipped = 0 // This would be tracked separately in a real implementation
      const totalSuccessful = totalSent - totalFailed
      const deliveryRate = totalSent > 0 ? (totalSuccessful / totalSent) * 100 : 0

      return {
        totalSent,
        totalFailed,
        totalSkipped,
        byAlertType,
        deliveryRate,
      }

    } catch (error) {
      logger.error('Failed to get email statistics', error)
      throw error
    }
  }

  /**
   * Update email preferences
   */
  async updateEmailPreferences(userId: string, preferences: {
    renewalAlerts: boolean
    priceHikeAlerts: boolean
    weeklyDigest: boolean
  }): Promise<void> {
    try {
      await pool.query(
        `UPDATE users 
         SET email_preferences = COALESCE(
           jsonb_set(
             COALESCE(email_preferences, '{}'::jsonb),
             '{renewalAlerts}',
             $1::jsonb
           ),
           email_preferences
         ),
         updated_at = NOW()
         WHERE user_id = $2`,
        [JSON.stringify(preferences), userId]
      )

      logger.info('Email preferences updated', { userId, preferences })

    } catch (error) {
      logger.error('Failed to update email preferences', error)
      throw error
    }
  }
}

// Export singleton instance
export const emailAlertService = new EmailAlertService()

// Export types for use in other modules
export type {
  EmailAlert,
  EmailTemplate,
}
