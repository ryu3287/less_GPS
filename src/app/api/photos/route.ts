import { NextRequest, NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import { requireDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const db = requireDb()
    const { searchParams } = new URL(request.url)
    const tags = [...new Set(searchParams.getAll('tag').map((tag) => tag.trim()).filter(Boolean))]

    const rows = tags.length > 0
      ? await db`
          SELECT *
          FROM photos
          WHERE tags && ${tags}::text[]
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

export async function PATCH(request: NextRequest) {
  try {
    const db = requireDb()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json()
    const { tags } = body

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    if (!Array.isArray(tags) || tags.length > 30 || tags.some((tag) => typeof tag !== 'string' || tag.length > 60)) {
      return NextResponse.json({ error: 'Invalid tags' }, { status: 400 })
    }

    const normalizedTags = [...new Set(tags.map((tag: string) => tag.trim()).filter(Boolean))]
    const rows = await db`
      UPDATE photos
      SET tags = ${normalizedTags}::text[]
      WHERE id = ${id}
      RETURNING *
    `

    if (!rows[0]) return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    return NextResponse.json({ success: true, photo: rows[0] })
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
