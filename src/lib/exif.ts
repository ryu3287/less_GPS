import exifr from 'exifr'
import { ExifData } from '@/types'

export async function extractExifFromBuffer(buffer: Buffer): Promise<ExifData> {
  try {
    const exif = await exifr.parse(buffer, {
      gps: true,
      pick: ['DateTimeOriginal', 'GPSLatitude', 'GPSLongitude', 'GPSLatitudeRef', 'GPSLongitudeRef'],
    })

    if (!exif) return { latitude: null, longitude: null, taken_at: null }

    const gps = await exifr.gps(buffer)

    return {
      latitude: gps?.latitude ?? null,
      longitude: gps?.longitude ?? null,
      taken_at: exif.DateTimeOriginal
        ? new Date(exif.DateTimeOriginal).toISOString()
        : null,
    }
  } catch (error) {
    console.error('EXIF extraction failed:', error)
    return { latitude: null, longitude: null, taken_at: null }
  }
}
