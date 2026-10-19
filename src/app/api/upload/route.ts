import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { requireDb } from '@/lib/db'
import { analyzeImageWithVision } from '@/lib/vision'
import { extractExifFromBuffer } from '@/lib/exif'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const db = requireDb()
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const exif = await extractExifFromBuffer(buffer)
    const latitudeValue = formData.get('latitude')
    const longitudeValue = formData.get('longitude')
    const latitude = typeof latitudeValue === 'string' ? Number(latitudeValue) : NaN
    const longitude = typeof longitudeValue === 'string' ? Number(longitudeValue) : NaN
    const hasBrowserLocation = Number.isFinite(latitude) && Number.isFinite(longitude)
      && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180

    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const blob = await put(fileName, buffer, {
      access: 'public',
      contentType: file.type,
    })

    const base64 = buffer.toString('base64')
    const tags = await analyzeImageWithVision(base64)

    const rows = await db`
      INSERT INTO photos (
        file_name,
        storage_url,
        taken_at,
        latitude,
        longitude,
        tags
      ) VALUES (
        ${file.name},
        ${blob.url},
        ${exif.taken_at},
        ${exif.latitude ?? (hasBrowserLocation ? latitude : null)},
        ${exif.longitude ?? (hasBrowserLocation ? longitude : null)},
        ${tags}
      ) RETURNING *
    `

    return NextResponse.json({ success: true, photo: rows[0] })
  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
