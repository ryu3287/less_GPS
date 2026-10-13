export const supabase = null
export const supabaseAdmin = null

export function requireSupabaseAdmin() {
  throw new Error('This project now uses Vercel Blob + Neon. Supabase is no longer configured.')
}
