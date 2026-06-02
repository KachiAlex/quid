/**
 * Field-Level Encryption Service for PII
 * Encrypts sensitive data before storing in the database
 * Uses AES-256-GCM for authenticated encryption
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'
import { logger } from '../config/logger'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || ''

if (!ENCRYPTION_KEY) {
  logger.error('ENCRYPTION_KEY or JWT_SECRET environment variable is required for field-level encryption')
}

// Derive a 32-byte key from the environment variable
const getKey = () => {
  const key = scryptSync(ENCRYPTION_KEY, 'quid-salt', 32)
  return key
}

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

/**
 * Encrypt a string value
 * @param text - The plaintext to encrypt
 * @returns Encrypted string in format: iv:authTag:ciphertext (base64)
 */
export function encrypt(text: string): string {
  if (!text) return text

  try {
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, getKey(), iv)

    let encrypted = cipher.update(text, 'utf8', 'base64')
    encrypted += cipher.final('base64')

    const authTag = cipher.getAuthTag()

    // Store as: iv:authTag:ciphertext
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
  } catch (err) {
    logger.error('Encryption failed', err)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypt an encrypted string
 * @param encryptedText - The encrypted string in format: iv:authTag:ciphertext
 * @returns The decrypted plaintext
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText
  if (!encryptedText.includes(':')) return encryptedText // Already plaintext

  try {
    const [ivBase64, authTagBase64, ciphertext] = encryptedText.split(':')

    const iv = Buffer.from(ivBase64, 'base64')
    const authTag = Buffer.from(authTagBase64, 'base64')

    const decipher = createDecipheriv(ALGORITHM, getKey(), iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(ciphertext, 'base64', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (err) {
    logger.error('Decryption failed', err)
    throw new Error('Failed to decrypt data')
  }
}

/**
 * Check if a value is encrypted
 * @param value - The value to check
 * @returns True if the value appears to be encrypted
 */
export function isEncrypted(value: string): boolean {
  if (!value || typeof value !== 'string') return false
  // Encrypted values contain two colons separating iv, authTag, and ciphertext
  const parts = value.split(':')
  return parts.length === 3 && parts.every((p) => p.length > 0)
}

/**
 * Encrypt object fields selectively
 * @param obj - The object to encrypt fields on
 * @param fields - Array of field names to encrypt
 * @returns Object with specified fields encrypted
 */
export function encryptFields(
  obj: Record<string, any>,
  fields: string[]
): Record<string, any> {
  const result = { ...obj }

  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = encrypt(result[field])
    }
  }

  return result
}

/**
 * Decrypt object fields selectively
 * @param obj - The object with encrypted fields
 * @param fields - Array of field names to decrypt
 * @returns Object with specified fields decrypted
 */
export function decryptFields(
  obj: Record<string, any>,
  fields: string[]
): Record<string, any> {
  const result = { ...obj }

  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = decrypt(result[field])
    }
  }

  return result
}

/**
 * PII fields that should be encrypted
 */
export const PII_FIELDS = [
  'email',
  'first_name',
  'last_name',
  'address',
  'phone_number',
  'postcode',
]

/**
 * Encrypt user PII data
 * @param userData - User data object
 * @returns User data with PII fields encrypted
 */
export function encryptUserPII(userData: Record<string, any>): Record<string, any> {
  return encryptFields(userData, PII_FIELDS)
}

/**
 * Decrypt user PII data
 * @param userData - User data object with encrypted fields
 * @returns User data with PII fields decrypted
 */
export function decryptUserPII(userData: Record<string, any>): Record<string, any> {
  return decryptFields(userData, PII_FIELDS)
}
