-- ===== photos テーブル =====
create table if not exists photos (
  id uuid default gen_random_uuid() primary key,
  file_name text not null,
  storage_url text not null,
  taken_at timestamptz,
  latitude double precision,
  longitude double precision,
  location_name text,
  tags text[] default '{}',
  created_at timestamptz default now()
);

alter table photos enable row level security;

create policy "Anyone can read photos"   on photos for select using (true);
create policy "Anyone can insert photos" on photos for insert with check (true);
create policy "Anyone can update photos" on photos for update using (true);
create policy "Anyone can delete photos" on photos for delete using (true);

-- ===== sensor_logs テーブル（新規追加） =====
-- 加速度・ジャイロ・気圧センサーのログを保存するテーブル
create table if not exists sensor_logs (
  id uuid default gen_random_uuid() primary key,
  session_id text not null,           -- 計測セッションID（同一セッションをまとめる）
  timestamp timestamptz not null,     -- 計測時刻
  -- 加速度センサー (m/s²)
  accel_x double precision,
  accel_y double precision,
  accel_z double precision,
  -- ジャイロセンサー (rad/s)
  gyro_x double precision,
  gyro_y double precision,
  gyro_z double precision,
  -- 気圧センサー (hPa)
  pressure double precision,
  -- 推定高度 (m) ※気圧から計算
  altitude double precision,
  -- メモ（歩行中・電車乗車中など手動ラベル）
  label text,
  created_at timestamptz default now()
);

alter table sensor_logs enable row level security;

create policy "Anyone can read sensor_logs"   on sensor_logs for select using (true);
create policy "Anyone can insert sensor_logs" on sensor_logs for insert with check (true);
create policy "Anyone can delete sensor_logs" on sensor_logs for delete using (true);

-- セッションIDと時刻でのインデックス（検索高速化）
create index if not exists sensor_logs_session_idx on sensor_logs(session_id, timestamp);
