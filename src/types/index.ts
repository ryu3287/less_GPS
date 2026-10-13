export interface Photo {
  id: string
  user_id?: string
  file_name: string
  storage_url: string
  taken_at: string | null
  latitude: number | null
  longitude: number | null
  location_name: string | null
  tags: string[]
  created_at: string
}

export interface ExifData {
  latitude: number | null
  longitude: number | null
  taken_at: string | null
}

export interface UploadResult {
  success: boolean
  photo?: Photo
  error?: string
}

// ✅ 新規追加：センサーログの型定義
export interface SensorLog {
  id?: string
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
  created_at?: string
}
