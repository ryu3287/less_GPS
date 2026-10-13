import { NextResponse } from 'next/server'
import { requireDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = requireDb()
    const rows = await db`SELECT tags FROM photos`

    const tagCounts: Record<string, number> = {}
    for (const photo of rows || []) {
      for (const tag of photo.tags || []) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      }
    }

    const tags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }))

    return NextResponse.json({ tags })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
