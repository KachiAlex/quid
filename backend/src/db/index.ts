import { Pool } from 'pg'
import dotenv from 'dotenv'
dotenv.config()

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: process.env.NODE_ENV === 'production' ? 20 : 5,
})

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err.message)
})

export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect()
    await client.query('SELECT 1')
    client.release()
    return true
  } catch (err) {
    console.error('Database connection test failed:', err)
    return false
  }
}
