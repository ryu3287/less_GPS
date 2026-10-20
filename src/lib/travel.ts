import { Photo, SensorLog } from '@/types'

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

function estimateSensorSegment(start: Photo, end: Photo, logs: SensorLog[]): TravelPathPoint[] {
  const direct = [start, end].map((photo) => ({
    lat: photo.latitude as number,
    lng: photo.longitude as number,
    photoId: photo.id,
    timestamp: photo.taken_at ?? undefined,
  }))
  const startTime = start.taken_at ? new Date(start.taken_at).getTime() : NaN
  const endTime = end.taken_at ? new Date(end.taken_at).getTime() : NaN
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) return direct

  const logsInRange = logs
    .filter((log) => log.label === '歩行中')
    .map((log) => ({ ...log, time: new Date(log.timestamp).getTime() }))
    .filter((log) => log.time >= startTime && log.time <= endTime)
  const samples = [...logsInRange.reduce((sessions, log) => {
    const session = sessions.get(log.session_id) ?? []
    session.push(log)
    sessions.set(log.session_id, session)
    return sessions
  }, new Map<string, typeof logsInRange>()).values()]
    .sort((a, b) => b.length - a.length)[0]
    ?.sort((a, b) => a.time - b.time)
    .filter((log) => log.accel_x !== null && log.accel_y !== null && log.accel_z !== null)
    ?? []
  if (samples.length < 5) return direct

  let yaw = 0
  const readings = samples.map((sample, index) => {
    if (index > 0) {
      const previous = samples[index - 1]
      const elapsed = Math.min((sample.time - previous.time) / 1000, 1)
      const rotationRate = previous.gyro_x ?? sample.gyro_x
      if (rotationRate !== null) yaw += rotationRate * elapsed * Math.PI / 180
    }
    const magnitude = Math.hypot(sample.accel_x!, sample.accel_y!, sample.accel_z!)
    return { time: sample.time, movement: Math.abs(magnitude - 9.81), yaw }
  })

  const steps: typeof readings = []
  for (let index = 1; index < readings.length - 1; index += 1) {
    const reading = readings[index]
    if (reading.movement < 0.9 || reading.movement < readings[index - 1].movement || reading.movement <= readings[index + 1].movement) continue
    const previousStep = steps[steps.length - 1]
    if (previousStep && reading.time - previousStep.time < 350) {
      if (reading.movement > previousStep.movement) steps[steps.length - 1] = reading
    } else {
      steps.push(reading)
    }
  }
  if (steps.length < 3) return direct

  const middleLatitude = ((start.latitude as number) + (end.latitude as number)) / 2
  const metersPerLatitudeDegree = 111320
  const metersPerLongitudeDegree = metersPerLatitudeDegree * Math.cos(middleLatitude * Math.PI / 180)
  const targetEast = ((end.longitude as number) - (start.longitude as number)) * metersPerLongitudeDegree
  const targetNorth = ((end.latitude as number) - (start.latitude as number)) * metersPerLatitudeDegree
  const targetDistance = Math.hypot(targetEast, targetNorth)
  if (targetDistance < 1 || metersPerLongitudeDegree < 1) return direct

  const stepLength = 0.7
  const relativePath = steps.map((step, index) => {
    const east = stepLength * Math.cos(step.yaw)
    const north = stepLength * Math.sin(step.yaw)
    return { east, north }
  })
  let predictedEast = 0
  let predictedNorth = 0
  for (const point of relativePath) {
    predictedEast += point.east
    predictedNorth += point.north
  }
  const predictedDistance = Math.hypot(predictedEast, predictedNorth)
  if (predictedDistance < targetDistance * 0.15) return direct

  const rotation = Math.atan2(targetNorth, targetEast) - Math.atan2(predictedNorth, predictedEast)
  const scale = targetDistance / predictedDistance
  let east = 0
  let north = 0
  const points: TravelPathPoint[] = [direct[0]]

  for (const point of relativePath) {
    const rotatedEast = point.east * Math.cos(rotation) - point.north * Math.sin(rotation)
    const rotatedNorth = point.east * Math.sin(rotation) + point.north * Math.cos(rotation)
    east += rotatedEast * scale
    north += rotatedNorth * scale
    points.push({
      lat: (start.latitude as number) + north / metersPerLatitudeDegree,
      lng: (start.longitude as number) + east / metersPerLongitudeDegree,
      timestamp: steps[points.length - 1]?.time
        ? new Date(steps[points.length - 1].time).toISOString()
        : undefined,
    })
  }

  points[points.length - 1] = direct[1]
  return points
}

export function buildTravelPath(photos: Photo[], sensorLogs: SensorLog[] = []): TravelPathPoint[] {
  const ordered = getOrderedPhotos(photos)
  if (ordered.length === 0) return []

  if (ordered.length === 1) {
    const photo = ordered[0]
    return [{ lat: photo.latitude as number, lng: photo.longitude as number, photoId: photo.id, timestamp: photo.taken_at ?? undefined }]
  }

  return ordered.slice(1).flatMap((photo, index) => {
    const segment = estimateSensorSegment(ordered[index], photo, sensorLogs)
    return index === 0 ? segment : segment.slice(1)
  })
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
