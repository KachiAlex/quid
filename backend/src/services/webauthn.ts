import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import { pool } from '../db'

const RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost'
const RP_NAME = 'Quid'
const ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173'

export async function generateRegOpts(userId: string, email: string) {
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: Buffer.from(userId),
    userName: email,
    userDisplayName: email,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'discouraged',
      userVerification: 'preferred',
    },
    excludeCredentials: [],
  })
  await pool.query(
    'UPDATE users SET mfa_secret_encrypted = $1 WHERE user_id = $2',
    [JSON.stringify({ challenge: options.challenge }), userId]
  )
  return options
}

export async function verifyReg(userId: string, body: any) {
  const row = await pool.query(
    'SELECT mfa_secret_encrypted FROM users WHERE user_id = $1',
    [userId]
  )
  if (!row.rows[0]?.mfa_secret_encrypted) throw new Error('No challenge found')
  const expectedChallenge = JSON.parse(row.rows[0].mfa_secret_encrypted).challenge

  const verification = await verifyRegistrationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: false,
  } as any)

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('Registration verification failed')
  }

  const { credentialID, credentialPublicKey, counter } = verification.registrationInfo as any
  await pool.query(
    `INSERT INTO webauthn_credentials (user_id, credential_external_id, public_key, counter)
     VALUES ($1, $2, $3, $4)`,
    [userId, Buffer.from(credentialID).toString('base64url'), credentialPublicKey, counter]
  )

  await pool.query('UPDATE users SET mfa_secret_encrypted = NULL WHERE user_id = $1', [userId])
  return true
}

export async function generateAuthOpts(userId: string) {
  const creds = await pool.query(
    'SELECT credential_external_id FROM webauthn_credentials WHERE user_id = $1',
    [userId]
  )
  const allowCredentials = creds.rows.map((r: any) => ({
    id: r.credential_external_id,
    type: 'public-key' as const,
  })) as any

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials,
    userVerification: 'preferred',
  })

  await pool.query(
    'UPDATE users SET mfa_secret_encrypted = $1 WHERE user_id = $2',
    [JSON.stringify({ challenge: options.challenge }), userId]
  )
  return options
}

export async function verifyAuth(userId: string, body: any) {
  const row = await pool.query(
    'SELECT mfa_secret_encrypted FROM users WHERE user_id = $1',
    [userId]
  )
  if (!row.rows[0]?.mfa_secret_encrypted) throw new Error('No challenge found')
  const expectedChallenge = JSON.parse(row.rows[0].mfa_secret_encrypted).challenge

  const credRow = await pool.query(
    'SELECT * FROM webauthn_credentials WHERE user_id = $1',
    [userId]
  )
  if (credRow.rows.length === 0) throw new Error('No credentials found')
  const cred = credRow.rows[0]

  const verification = await verifyAuthenticationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    authenticator: {
      credentialID: Buffer.from(cred.credential_external_id, 'base64url'),
      credentialPublicKey: cred.public_key,
      counter: Number(cred.counter),
      transports: cred.transports || [],
    },
    requireUserVerification: false,
  } as any)

  if (!verification.verified) {
    throw new Error('Authentication verification failed')
  }

  await pool.query(
    'UPDATE webauthn_credentials SET counter = $1 WHERE credential_id = $2',
    [verification.authenticationInfo.newCounter, cred.credential_id]
  )
  await pool.query('UPDATE users SET mfa_secret_encrypted = NULL WHERE user_id = $1', [userId])
  return true
}
