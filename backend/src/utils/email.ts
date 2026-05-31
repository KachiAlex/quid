import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { logger } from '../config/logger'

const sesClient = new SESClient({ region: process.env.AWS_REGION || 'eu-west-2' })
const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'noreply@quid.co.uk'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text: string
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  if (process.env.NODE_ENV === 'development' && !process.env.AWS_ACCESS_KEY_ID) {
    logger.info(`[DEV EMAIL] To: ${options.to}\nSubject: ${options.subject}\n${options.text}`)
    return
  }

  try {
    await sesClient.send(
      new SendEmailCommand({
        Source: FROM_EMAIL,
        Destination: { ToAddresses: [options.to] },
        Message: {
          Subject: { Data: options.subject },
          Body: {
            Text: { Data: options.text },
            Html: { Data: options.html },
          },
        },
      })
    )
  } catch (err) {
    logger.error('Failed to send email', { error: err, to: options.to })
    throw err
  }
}

export function getVerificationEmailHtml(token: string, baseUrl: string): string {
  const link = `${baseUrl}/verify-email?token=${token}`
  return `
    <h1>Verify your Quid account</h1>
    <p>Click the link below to verify your email address:</p>
    <a href="${link}" style="display:inline-block;padding:12px 24px;background:#0284c7;color:#fff;text-decoration:none;border-radius:6px;">Verify Email</a>
    <p>Or copy and paste this URL: ${link}</p>
    <p>This link expires in 24 hours.</p>
  `
}

export function getPasswordResetEmailHtml(token: string, baseUrl: string): string {
  const link = `${baseUrl}/reset-password?token=${token}`
  return `
    <h1>Reset your Quid password</h1>
    <p>Click the link below to reset your password:</p>
    <a href="${link}" style="display:inline-block;padding:12px 24px;background:#0284c7;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a>
    <p>Or copy and paste this URL: ${link}</p>
    <p>This link expires in 1 hour.</p>
  `
}
