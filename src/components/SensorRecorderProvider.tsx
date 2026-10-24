'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export interface SensorEntry {
  session_id: string
  timestamp: string
  accel_x: number | null
  accel_y: number | null
  accel_z: number | null
  gyro_x: number | null
  gyro_y: number | null
  gyro_z: number | null
  pressure: number | null
  altitude: number | null
  label: string
}

interface SensorRecorderContextValue {
  isRecording: boolean
  label: string
  setLabel: (label: string) => void
  logs: SensorEntry[]
  sessionId: string
  accel: { x: number; y: number; z: number } | null
  gyro: { x: number; y: number; z: number } | null
  pressure: number | null
  error: string | null
  startRecording: () => Promise<void>
  stopRecording: () => void
  clearLogs: () => void
}

const SensorRecorderContext = createContext<SensorRecorderContextValue | null>(null)
const FinishedSensorLogsContext = createContext<SensorEntry[]>([])

export function SensorRecorderProvider({ children }: { children: ReactNode }) {
  const [isRecording, setIsRecording] = useState(false)
  const [label, setLabelState] = useState('歩行中')
  const [logs, setLogs] = useState<SensorEntry[]>([])
  const [sessionId] = useState(() => `session_${Date.now()}`)
  const [accel, setAccel] = useState<{ x: number; y: number; z: number } | null>(null)
  const [gyro, setGyro] = useState<{ x: number; y: number; z: number } | null>(null)
  const [pressure, setPressure] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [finishedLogs, setFinishedLogs] = useState<SensorEntry[]>([])

  const accelRef = useRef<{ x: number; y: number; z: number } | null>(null)
  const gyroRef = useRef<{ x: number; y: number; z: number } | null>(null)
  const pressureRef = useRef<number | null>(null)
  const logsRef = useRef<SensorEntry[]>([])
  const labelRef = useRef(label)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pressureSensorRef = useRef<{ stop?: () => void } | null>(null)

  useEffect(() => {
    labelRef.current = label
  }, [label])

  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    if (event.accelerationIncludingGravity) {
      const value = {
        x: event.accelerationIncludingGravity.x ?? 0,
        y: event.accelerationIncludingGravity.y ?? 0,
        z: event.accelerationIncludingGravity.z ?? 0,
      }
      accelRef.current = value
      setAccel(value)
    }
    if (event.rotationRate) {
      const value = {
        x: event.rotationRate.alpha ?? 0,
        y: event.rotationRate.beta ?? 0,
        z: event.rotationRate.gamma ?? 0,
      }
      gyroRef.current = value
      setGyro(value)
    }
  }, [])

  const startPressureSensor = useCallback(() => {
    try {
      // @ts-expect-error Sensor API
      const PressureSensor = window.AbsolutePressureSensor || window.PressureSensor
      if (!PressureSensor) return
      const sensor = new PressureSensor({ frequency: 1 })
      sensor.addEventListener('reading', () => {
        pressureRef.current = sensor.pressure
        setPressure(sensor.pressure)
      })
      sensor.start()
      pressureSensorRef.current = sensor
    } catch {
      // 非対応端末は無視
    }
  }, [])

  const startRecording = useCallback(async () => {
    setError(null)
    if (typeof DeviceMotionEvent !== 'undefined' &&
      // @ts-expect-error iOS専用
      typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        // @ts-expect-error iOS専用
        const permission = await DeviceMotionEvent.requestPermission()
        if (permission !== 'granted') {
          setError('センサーの使用が許可されませんでした。設定から位置情報・モーションを許可してください。')
          return
        }
      } catch {
        setError('センサーの許可リクエストに失敗しました。')
        return
      }
    }

    window.addEventListener('devicemotion', handleMotion)
    startPressureSensor()
    setIsRecording(true)
    intervalRef.current = setInterval(() => {
      const next = [...logsRef.current, {
        session_id: sessionId,
        timestamp: new Date().toISOString(),
        accel_x: accelRef.current?.x ?? null,
        accel_y: accelRef.current?.y ?? null,
        accel_z: accelRef.current?.z ?? null,
        gyro_x: gyroRef.current?.x ?? null,
        gyro_y: gyroRef.current?.y ?? null,
        gyro_z: gyroRef.current?.z ?? null,
        pressure: pressureRef.current,
        altitude: pressureRef.current ? 44330 * (1 - Math.pow(pressureRef.current / 1013.25, 1 / 5.255)) : null,
        label: labelRef.current,
      }]
      logsRef.current = next
      setLogs(next)
    }, 200)
  }, [handleMotion, sessionId, startPressureSensor])

  const stopRecording = useCallback(() => {
    window.removeEventListener('devicemotion', handleMotion)
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
    pressureSensorRef.current?.stop?.()
    pressureSensorRef.current = null
    setFinishedLogs(logsRef.current)
    setIsRecording(false)
  }, [handleMotion])

  useEffect(() => () => {
    window.removeEventListener('devicemotion', handleMotion)
    if (intervalRef.current) clearInterval(intervalRef.current)
    pressureSensorRef.current?.stop?.()
  }, [handleMotion])

  const setLabel = (nextLabel: string) => {
    labelRef.current = nextLabel
    setLabelState(nextLabel)
  }

  const clearLogs = () => {
    logsRef.current = []
    setLogs([])
    setFinishedLogs([])
  }

  return (
    <FinishedSensorLogsContext.Provider value={isRecording ? logs : finishedLogs}>
      <SensorRecorderContext.Provider value={{
        isRecording,
        label,
        setLabel,
        logs,
        sessionId,
        accel,
        gyro,
        pressure,
        error,
        startRecording,
        stopRecording,
        clearLogs,
      }}>
        {children}
      </SensorRecorderContext.Provider>
    </FinishedSensorLogsContext.Provider>
  )
}

export function useSensorRecorder() {
  const context = useContext(SensorRecorderContext)
  if (!context) throw new Error('useSensorRecorder must be used within SensorRecorderProvider')
  return context
}

export function useFinishedSensorLogs() {
  return useContext(FinishedSensorLogsContext)
}