/**
 * Email Alert System for Renewals
 * Sends 60-day and 14-day renewal alerts to users
 */

import { pool } from '../db'
import { logger } from '../config/logger'
import { sendEmail } from '../utils/email'

interface AlertToSend {
  alertId: string
  userId: string
  userEmail: string
  firstName: string
  productType: string
  providerName: string
  expectedRenewalDate: Date
  currentCost: number
  daysUntilRenewal: number
  alertType: '60_day' | '14_day' | 'price_hike'
}

/**
 * Send pending renewal alerts
 * This should be run daily
 */
export async function sendPendingRenewalAlerts(): Promise<{
  sent: number
  failed: number
}> {
  const client = await pool.connect()
  let sent = 0
  let failed = 0

  try {
    await client.query('BEGIN')

    // Get pending alerts that haven't been sent yet
    const pendingAlerts = await client.query(
      `SELECT 
        ra.alert_id,
        ra.user_id,
        ra.product_record_id,
        ra.alert_type,
        ra.expected_renewal_date,
        ra.current_cost,
        ra.days_until_renewal,
        u.email,
        u.first_name,
        pr.product_type,
        pr.provider_name
       FROM renewal_alerts ra
       JOIN users u ON ra.user_id = u.user_id
       JOIN product_records pr ON ra.product_record_id = pr.record_id
       WHERE ra.status = 'pending'
       AND ra.email_sent_at IS NULL
       AND u.email_verified = true
       ORDER BY ra.days_until_renewal ASC
       LIMIT 100`
    )

    for (const alert of pendingAlerts.rows) {
      try {
        await sendRenewalEmail({
          alertId: alert.alert_id,
          userId: alert.user_id,
          userEmail: alert.email,
          firstName: alert.first_name,
          productType: alert.product_type,
          providerName: alert.provider_name,
          expectedRenewalDate: new Date(alert.expected_renewal_date),
          currentCost: parseFloat(alert.current_cost),
          daysUntilRenewal: alert.days_until_renewal,
          alertType: alert.alert_type,
        })

        // Mark alert as sent
        await client.query(
          `UPDATE renewal_alerts 
           SET email_sent_at = NOW(), status = 'sent'
           WHERE alert_id = $1`,
          [alert.alert_id]
        )

        sent++
      } catch (err) {
        logger.error(`Failed to send renewal alert ${alert.alert_id}`, err)
        failed++

        // Mark alert as failed
        await client.query(
          `UPDATE renewal_alerts 
           SET status = 'failed'
           WHERE alert_id = $1`,
          [alert.alert_id]
        )
      }
    }

    await client.query('COMMIT')

    logger.info(`Renewal alerts processed: ${sent} sent, ${failed} failed`, {
      sent,
      failed,
    })

    return { sent, failed }
  } catch (err) {
    await client.query('ROLLBACK')
    logger.error('Renewal alert sending failed', err)
    throw err
  } finally {
    client.release()
  }
}

/**
 * Send a single renewal email
 */
async function sendRenewalEmail(alert: AlertToSend): Promise<void> {
  const formattedDate = alert.expectedRenewalDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const daysText = alert.daysUntilRenewal <= 0
    ? 'today'
    : `in ${alert.daysUntilRenewal} days`

  let subject = ''
  let heading = ''
  let body = ''

  switch (alert.alertType) {
    case '60_day':
      subject = `Your ${alert.providerName} ${alert.productType} renewal is coming up`
      heading = `Renewal Alert: ${alert.daysUntilRenewal} days to go`
      body = `Your ${alert.providerName} ${alert.productType} is due for renewal on ${formattedDate}.\n\nCurrent cost: £${alert.currentCost.toFixed(2)}/year\n\nThis is a great time to check if you could get a better deal. Quid can help you compare prices and switch to save money.`
      break

    case '14_day':
      subject = `Urgent: Your ${alert.providerName} ${alert.productType} renews soon`
      heading = `Only ${alert.daysUntilRenewal} days until renewal`
      body = `Your ${alert.providerName} ${alert.productType} renews on ${formattedDate} (${daysText}).\n\nCurrent cost: £${alert.currentCost.toFixed(2)}/year\n\nDon't miss out on potential savings. Compare alternatives and switch before your renewal date to avoid paying more than you need to.`
      break

    case 'price_hike':
      subject = `Price increase detected: ${alert.providerName} ${alert.productType}`
      heading = 'Price Increase Alert'
      body = `We've detected a price increase on your ${alert.providerName} ${alert.productType}.\n\nCurrent cost: £${alert.currentCost.toFixed(2)}/year\n\nThis could be a good time to compare alternatives and find a better deal.`
      break
  }

  await sendEmail({
    to: alert.userEmail,
    subject,
    text: body,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #7c3aed;">${heading}</h2>
        <p>Hi ${alert.firstName || 'there'},</p>
        <p style="white-space: pre-line; line-height: 1.6;">${body}</p>
        <div style="margin-top: 30px; text-align: center;">
          <a href="${process.env.FRONTEND_URL}/dashboard" 
             style="display: inline-block; background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            View Your Savings
          </a>
        </div>
        <p style="margin-top: 30px; font-size: 12px; color: #666;">
          You're receiving this email because you have renewal alerts enabled in your Quid account.
          <br>
          <a href="${process.env.FRONTEND_URL}/settings">Manage alert preferences</a>
        </p>
      </div>
    `,
  })

  logger.info(`Renewal email sent to ${alert.userEmail}`, {
    alertId: alert.alertId,
    alertType: alert.alertType,
  })
}

/**
 * Get user's alert history
 */
export async function getUserAlertHistory(userId: string): Promise<{
  alerts: Array<{
    alert_id: string
    alert_type: string
    expected_renewal_date: string
    current_cost: number
    days_until_renewal: number
    status: string
    created_at: string
    email_sent_at: string | null
  }>
}> {
  const result = await pool.query(
    `SELECT 
      alert_id,
      alert_type,
      expected_renewal_date,
      current_cost,
      days_until_renewal,
      status,
      created_at,
      email_sent_at
     FROM renewal_alerts
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [userId]
  )

  return { alerts: result.rows }
}

/**
 * Mark an alert as dismissed
 */
export async function dismissAlert(alertId: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE renewal_alerts 
     SET status = 'dismissed', dismissed_at = NOW()
     WHERE alert_id = $1 AND user_id = $2
     RETURNING alert_id`,
    [alertId, userId]
  )

  return result.rows.length > 0
}

/**
 * Main email alert job
 * Should be run daily
 */
export async function runEmailAlertJob(): Promise<void> {
  logger.info('Starting email alert job')

  try {
    const result = await sendPendingRenewalAlerts()
    logger.info('Email alert job completed', result)
  } catch (err) {
    logger.error('Email alert job failed', err)
    throw err
  }
}
