import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import { pool } from '../db'
import { logger } from '../config/logger'

const twilioClient = process.env.TWILIO_ACCOUNT_SID
  ? require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null
const TWILIO_VERIFY_SID = process.env.TWILIO_VERIFY_SERVICE_SID

export async function generateTotpSecret(userId: string): Promise<{ secret: string; qrUrl: string }> {
  const secret = speakeasy.generateSecret({
    name: `Quid (${userId})`,
    length: 32,
  })

  await pool.query(
    'UPDATE users SET mfa_secret_encrypted = $1 WHERE user_id = $2',
    [secret.base32, userId]
  )

  const otpauthUrl = speakeasy.otpauthURL({
    secret: secret.ascii,
    label: `Quid`,
    issuer: 'Quid',
    encoding: 'ascii',
  })

  const qrUrl = await QRCode.toDataURL(otpauthUrl)
  return { secret: secret.base32, qrUrl }
}

export async function verifyTotp(userId: string, token: string): Promise<boolean> {
  const result = await pool.query('SELECT mfa_secret_encrypted FROM users WHERE user_id = $1', [userId])
  if (result.rows.length === 0 || !result.rows[0].mfa_secret_encrypted) {
    return false
  }
  return speakeasy.totp.verify({
    secret: result.rows[0].mfa_secret_encrypted,
    encoding: 'base32',
    token,
    window: 1,
  }) ?? false
}

export async function enableTotp(userId: string): Promise<void> {
  await pool.query('UPDATE users SET mfa_enabled = true WHERE user_id = $1', [userId])
}

export async function disableTotp(userId: string): Promise<void> {
  await pool.query('UPDATE users SET mfa_enabled = false, mfa_secret_encrypted = NULL WHERE user_id = $1', [userId])
}

export async function sendSmsMfa(phoneNumber: string): Promise<void> {
  if (!twilioClient || !TWILIO_VERIFY_SID) {
    logger.warn('Twilio not configured; skipping SMS MFA')
    throw new Error('SMS MFA not configured')
  }
  await twilioClient.verify.v2.services(TWILIO_VERIFY_SID).verifications.create({
    to: phoneNumber,
    channel: 'sms',
  })
}

export async function verifySmsMfa(phoneNumber: string, code: string): Promise<boolean> {
  if (!twilioClient || !TWILIO_VERIFY_SID) {
    return false
  }
  const check = await twilioClient.verify.v2.services(TWILIO_VERIFY_SID).verificationChecks.create({
    to: phoneNumber,
    code,
  })
  return check.status === 'approved'
}
