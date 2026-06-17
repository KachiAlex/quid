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
  logger.info('SMS MFA code sent', { phoneNumber: phoneNumber.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2') })
}

export async function verifySmsMfa(phoneNumber: string, code: string): Promise<boolean> {
  if (!twilioClient || !TWILIO_VERIFY_SID) {
    return false
  }
  const check = await twilioClient.verify.v2.services(TWILIO_VERIFY_SID).verificationChecks.create({
    to: phoneNumber,
    code,
  })
  logger.info('SMS MFA verification attempted', { 
    phoneNumber: phoneNumber.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2'),
    status: check.status 
  })
  return check.status === 'approved'
}

export async function enableSmsMfa(userId: string, phoneNumber: string): Promise<void> {
  // First verify the phone number can receive SMS
  await sendSmsMfa(phoneNumber)
  
  // Store the phone number temporarily (will be verified later)
  await pool.query(
    'UPDATE users SET phone_number = $1, mfa_method = $2 WHERE user_id = $3',
    [phoneNumber, 'sms', userId]
  )
}

export async function confirmSmsMfa(userId: string, code: string): Promise<boolean> {
  const result = await pool.query(
    'SELECT phone_number FROM users WHERE user_id = $1',
    [userId]
  )
  
  if (result.rows.length === 0 || !result.rows[0].phone_number) {
    throw new Error('Phone number not found')
  }
  
  const isValid = await verifySmsMfa(result.rows[0].phone_number, code)
  
  if (isValid) {
    await pool.query(
      `UPDATE users 
       SET mfa_enabled = true, 
           phone_number_verified_at = NOW(),
           mfa_secret_encrypted = NULL
       WHERE user_id = $1`,
      [userId]
    )
    logger.info('SMS MFA enabled for user', { userId })
  }
  
  return isValid
}

export async function switchMfaMethod(userId: string, method: 'totp' | 'sms'): Promise<void> {
  const result = await pool.query(
    'SELECT phone_number, phone_number_verified_at FROM users WHERE user_id = $1',
    [userId]
  )
  
  if (method === 'sms' && (!result.rows[0].phone_number || !result.rows[0].phone_number_verified_at)) {
    throw new Error('Phone number must be verified before switching to SMS MFA')
  }
  
  await pool.query(
    'UPDATE users SET mfa_method = $1, mfa_enabled = false, mfa_secret_encrypted = NULL WHERE user_id = $2',
    [method, userId]
  )
  
  logger.info('MFA method switched', { userId, method })
}

export async function getMfaMethod(userId: string): Promise<string | null> {
  const result = await pool.query(
    'SELECT mfa_method, mfa_enabled FROM users WHERE user_id = $1',
    [userId]
  )
  
  if (result.rows.length === 0 || !result.rows[0].mfa_enabled) {
    return null
  }
  
  return result.rows[0].mfa_method
}

export async function verifyMfaForLogin(userId: string, token: string): Promise<boolean> {
  const result = await pool.query(
    'SELECT mfa_method, phone_number, mfa_secret_encrypted FROM users WHERE user_id = $1',
    [userId]
  )
  
  if (result.rows.length === 0) {
    return false
  }
  
  const { mfa_method, phone_number, mfa_secret_encrypted } = result.rows[0]
  
  if (mfa_method === 'totp') {
    return speakeasy.totp.verify({
      secret: mfa_secret_encrypted,
      encoding: 'base32',
      token,
      window: 1,
    }) ?? false
  } else if (mfa_method === 'sms') {
    if (!phone_number) {
      return false
    }
    return await verifySmsMfa(phone_number, token)
  }
  
  return false
}

export async function sendMfaCode(userId: string): Promise<void> {
  const result = await pool.query(
    'SELECT mfa_method, phone_number FROM users WHERE user_id = $1',
    [userId]
  )
  
  if (result.rows.length === 0) {
    throw new Error('User not found')
  }
  
  const { mfa_method, phone_number } = result.rows[0]
  
  if (mfa_method === 'sms') {
    if (!phone_number) {
      throw new Error('Phone number not configured for SMS MFA')
    }
    await sendSmsMfa(phone_number)
  } else {
    throw new Error('Cannot send code for TOTP MFA method')
  }
}
