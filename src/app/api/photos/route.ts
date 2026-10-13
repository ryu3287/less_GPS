import { NextRequest, NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import { requireDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const db = requireDb()
    const { searchParams } = new URL(request.url)
    const tag = searchParams.get('tag')

    const rows = tag
      ? await db`
          SELECT *
          FROM photos
          WHERE ${tag} = ANY(tags)
          ORDER BY taken_at ASC
        `
      : await db`
          SELECT *
          FROM photos
          ORDER BY taken_at ASC
        `

    return NextResponse.json({ photos: rows || [] })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = requireDb()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const rows = await db`
      SELECT storage_url
      FROM photos
      WHERE id = ${id}
      LIMIT 1
    `

    if (rows[0]?.storage_url) {
      await del(rows[0].storage_url)
    }

    await db`
      DELETE FROM photos
      WHERE id = ${id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
