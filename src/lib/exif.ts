import exifr from 'exifr'
import { ExifData } from '@/types'

export async function extractExifFromBuffer(buffer: Buffer): Promise<ExifData> {
  const [exifResult, gpsResult] = await Promise.all([
    exifr.parse(buffer, {
      gps: true,
      pick: ['DateTimeOriginal', 'GPSLatitude', 'GPSLongitude', 'GPSLatitudeRef', 'GPSLongitudeRef'],
    }).catch((error) => {
      console.error('EXIF metadata parsing failed:', error)
      return null
    }),
    exifr.gps(buffer).catch((error) => {
      console.error('EXIF GPS parsing failed:', error)
      return null
    }),
  ])

  const exif = exifResult as (typeof exifResult & { latitude?: number; longitude?: number }) | null
  const date = exif?.DateTimeOriginal ? new Date(exif.DateTimeOriginal) : null

  return {
    latitude: gpsResult?.latitude ?? exif?.latitude ?? null,
    longitude: gpsResult?.longitude ?? exif?.longitude ?? null,
    taken_at: date && Number.isFinite(date.getTime()) ? date.toISOString() : null,
  }
}
