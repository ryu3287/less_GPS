import { Photo } from '@/types'

export interface TravelPathPoint {
  lat: number
  lng: number
  photoId?: string
  timestamp?: string
}

export function getOrderedPhotos(photos: Photo[]): Photo[] {
  return [...photos]
    .filter((photo) => photo.latitude !== null && photo.longitude !== null)
    .sort((a, b) => {
      const aTime = a.taken_at ? new Date(a.taken_at).getTime() : 0
      const bTime = b.taken_at ? new Date(b.taken_at).getTime() : 0
      return aTime - bTime
    })
}

export function buildTravelPath(photos: Photo[]): TravelPathPoint[] {
  const ordered = getOrderedPhotos(photos)
  if (ordered.length === 0) return []

  const rawPoints = ordered.map((photo) => ({
    lat: photo.latitude as number,
    lng: photo.longitude as number,
    photoId: photo.id,
    timestamp: photo.taken_at ?? undefined,
  }))

  if (rawPoints.length === 1) return rawPoints

  const smoothed: TravelPathPoint[] = [rawPoints[0]]

  for (let i = 1; i < rawPoints.length - 1; i += 1) {
    const prev = rawPoints[i - 1]
    const current = rawPoints[i]
    const next = rawPoints[i + 1]

    smoothed.push({
      lat: (prev.lat + current.lat + next.lat) / 3,
      lng: (prev.lng + current.lng + next.lng) / 3,
      photoId: current.photoId,
      timestamp: current.timestamp,
    })
  }

  smoothed.push(rawPoints[rawPoints.length - 1])
  return smoothed
}

export function summarizeTravelMode(photos: Photo[]) {
  const ordered = getOrderedPhotos(photos)
  if (ordered.length === 0) return '未記録'

  const first = ordered[0]
  const last = ordered[ordered.length - 1]
  const durationMs = first.taken_at && last.taken_at
    ? new Date(last.taken_at).getTime() - new Date(first.taken_at).getTime()
    : 0

  return {
    anchorCount: ordered.length,
    durationMinutes: Math.max(1, Math.round(durationMs / 60000)),
    firstShotAt: first.taken_at ?? null,
    lastShotAt: last.taken_at ?? null,
  }
}
