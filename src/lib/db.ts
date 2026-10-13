import { neon } from '@neondatabase/serverless'

export const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null

export function requireDb() {
  if (!sql) {
    throw new Error('DATABASE_URL is not configured. Set it in Vercel environment variables.')
  }
  return sql
}
