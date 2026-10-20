import { NextRequest, NextResponse } from 'next/server'
import { requireDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const db = requireDb()
    const { searchParams } = new URL(request.url)
    const session_id = searchParams.get('session_id')
    const fromValue = searchParams.get('from')
    const toValue = searchParams.get('to')
    const from = fromValue ? new Date(fromValue) : null
    const to = toValue ? new Date(toValue) : null

    if ((fromValue && (!from || !Number.isFinite(from.getTime()))) ||
      (toValue && (!to || !Number.isFinite(to.getTime())))) {
      return NextResponse.json({ error: 'Invalid time range' }, { status: 400 })
    }

    const rows = session_id
      ? await db`
          SELECT *
          FROM sensor_logs
          WHERE session_id = ${session_id}
          ORDER BY timestamp ASC
        `
      : from && to
        ? await db`
            SELECT *
            FROM sensor_logs
            WHERE timestamp >= ${from.toISOString()}::timestamptz
              AND timestamp <= ${to.toISOString()}::timestamptz
            ORDER BY timestamp ASC
          `
      : await db`
          SELECT *
          FROM sensor_logs
          ORDER BY timestamp ASC
        `

    return NextResponse.json({ logs: rows || [] })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = requireDb()
    const body = await request.json()
    const { logs } = body

    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      return NextResponse.json({ error: 'No logs provided' }, { status: 400 })
    }

    for (const log of logs) {
      await db`
        INSERT INTO sensor_logs (
          session_id,
          timestamp,
          accel_x,
          accel_y,
          accel_z,
          gyro_x,
          gyro_y,
          gyro_z,
          pressure,
          altitude,
          label
        ) VALUES (
          ${log.session_id},
          ${log.timestamp},
          ${log.accel_x},
          ${log.accel_y},
          ${log.accel_z},
          ${log.gyro_x},
          ${log.gyro_y},
          ${log.gyro_z},
          ${log.pressure},
          ${log.altitude},
          ${log.label}
        )
      `
    }

    return NextResponse.json({ success: true, count: logs.length })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = requireDb()
    const { searchParams } = new URL(request.url)
    const session_id = searchParams.get('session_id')

    if (!session_id) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 })
    }

    await db`
      DELETE FROM sensor_logs
      WHERE session_id = ${session_id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
