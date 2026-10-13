# 旅行記録マップ — 仕様書

**バージョン**: v0.2.0  
**最終更新**: 2026/09/30

---

## 1. 概要

写真のEXIFデータ（GPS座標・撮影日時）を自動抽出し、Google Maps上に時間順でルートを表示する旅行記録Webアプリ。  
Google Cloud Vision APIによるAI自動タグ付け、およびスマートフォンの低電力センサー（加速度・ジャイロ・気圧）によるデータ収集機能を搭載する。

---

## 2. 研究目的

### 背景
既存の旅行ログアプリはGPSを常時起動する設計のため、以下の問題がある。

- GPS常時起動で1日あたりバッテリーの約13〜38%を消費
- 意図しない立ち寄り先まで詳細な生活動線として記録されるプライバシー問題

### 提案コンセプト
**「GPSは写真撮影時のみ起動し、移動中はオフにする」**

- 写真を撮った瞬間だけGPSで正確な位置（確定基準点）を取得
- 移動中は低電力センサー（加速度・ジャイロ・気圧）のみで記録
- 撮影地点をアンカーにセンサーログのズレを事後補正し、綺麗なルートを再現

---

## 3. 技術スタック

| カテゴリ | 技術 |
|---|---|
| フロントエンド | Next.js 15 (App Router) + TypeScript |
| スタイル | Tailwind CSS |
| 地図 | Google Maps JavaScript API |
| 画像認識 | Google Cloud Vision API |
| EXIF解析 | exifr（サーバーサイド処理） |
| DB / Storage | Supabase (PostgreSQL + Storage) |
| デプロイ | Vercel + GitHub |

---

## 4. ファイル構成

```
travel-photo-map/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── upload/route.ts       # 写真アップロードAPI
│   │   │   ├── photos/route.ts       # 写真一覧・削除API
│   │   │   ├── tags/route.ts         # タグ一覧API
│   │   │   └── sensor-logs/route.ts  # センサーログAPI（新規）
│   │   ├── upload/page.tsx           # アップロードページ
│   │   ├── sensor/page.tsx           # センサー計測ページ（新規）
│   │   ├── page.tsx                  # メイン（地図）ページ
│   │   ├── layout.tsx                # 共通レイアウト
│   │   └── globals.css               # グローバルCSS
│   ├── components/
│   │   ├── MapView.tsx               # Googleマップ表示
│   │   ├── PhotoSidebar.tsx          # 写真リスト（バグ修正済み）
│   │   ├── TagFilter.tsx             # タグフィルター
│   │   └── Navbar.tsx                # ナビゲーション（センサーリンク追加）
│   ├── lib/
│   │   ├── supabase.ts               # Supabaseクライアント
│   │   ├── exif.ts                   # EXIF解析（サーバー専用）
│   │   └── vision.ts                 # Vision API（翻訳マップ拡充）
│   └── types/
│       └── index.ts                  # 型定義（SensorLog追加）
├── supabase-schema.sql               # DBスキーマ（sensor_logsテーブル追加）
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── postcss.config.js
├── package.json
├── .env.local.example
└── .gitignore
```

---

## 5. データベース設計

### photosテーブル

| カラム | 型 | 説明 |
|---|---|---|
| id | uuid | 主キー（自動生成） |
| file_name | text | ファイル名 |
| storage_url | text | Supabase StorageのURL |
| taken_at | timestamptz | 撮影日時（EXIFから取得） |
| latitude | double | 緯度（EXIFから取得） |
| longitude | double | 経度（EXIFから取得） |
| location_name | text | 地名（将来的に追加予定） |
| tags | text[] | AIが生成したタグ配列 |
| created_at | timestamptz | レコード作成日時 |

### sensor_logsテーブル（v0.2.0で新規追加）

| カラム | 型 | 説明 |
|---|---|---|
| id | uuid | 主キー（自動生成） |
| session_id | text | 計測セッションID |
| timestamp | timestamptz | 計測時刻 |
| accel_x/y/z | double | 加速度センサー (m/s²) |
| gyro_x/y/z | double | ジャイロセンサー (rad/s) |
| pressure | double | 気圧センサー (hPa) |
| altitude | double | 推定高度 (m)（気圧から計算） |
| label | text | 行動ラベル（歩行中・電車など） |
| created_at | timestamptz | レコード作成日時 |

---

## 6. API仕様

### POST /api/upload
写真をアップロードしてDBに保存する。

**リクエスト**: `multipart/form-data`
- `file`: 画像ファイル

**処理フロー**:
1. サーバーでBufferに変換
2. exifrでEXIF（GPS・撮影日時）を解析
3. Supabase Storageに画像を保存
4. Google Vision APIでAIタグを生成
5. photosテーブルに保存

**レスポンス**: `{ success: true, photo: Photo }`

---

### GET /api/photos
写真一覧を取得する。

**クエリパラメータ**:
- `tag`（任意）: タグでフィルタリング

**レスポンス**: `{ photos: Photo[] }`

---

### DELETE /api/photos?id={id}
写真をStorageとDBから削除する。

**レスポンス**: `{ success: true }`

---

### GET /api/tags
全写真のタグを集計して返す。

**レスポンス**: `{ tags: { tag: string, count: number }[] }`

---

### GET /api/sensor-logs?session_id={id}
センサーログを取得する。

**レスポンス**: `{ logs: SensorLog[] }`

---

### POST /api/sensor-logs
センサーログをまとめて保存する。

**リクエスト**: `{ logs: SensorLog[] }`

**レスポンス**: `{ success: true, count: number }`

---

### DELETE /api/sensor-logs?session_id={id}
セッション単位でセンサーログを削除する。

**レスポンス**: `{ success: true }`

---

## 7. 画面仕様

### 地図ページ（/）
- 左サイドバー：タグフィルター・写真リスト（撮影日時・サムネイル・タグ・削除ボタン）
- メインエリア：Google Maps（番号付きマーカー・時間順ルート線）
- 写真クリックで地図上の対応マーカーにフォーカス

### アップロードページ（/upload）
- ドラッグ&ドロップ対応の写真選択
- アップロード中はサムネイルにオーバーレイ表示
- 完了後にAIタグをサムネイル上に表示
- 「地図で見る」ボタンで地図ページへ遷移

### センサー計測ページ（/sensor）※v0.2.0新規
- 加速度・ジャイロ・気圧センサーのリアルタイム表示
- 行動ラベル選択（歩行中・電車・バス・車・静止中・その他）
- 計測開始／停止ボタン（200msごとに記録）
- DBへの保存・CSVダウンロード・クリア機能
- 直近10件のログをテーブル表示

---

## 8. v0.2.0での変更点

### バグ修正
- `PhotoSidebar.tsx`：削除後に`deleting`状態が`null`にリセットされないバグを修正

### 機能追加
- センサー計測ページ（`/sensor`）を新規追加
- センサーログAPI（`/api/sensor-logs`）を新規追加
- `sensor_logs`テーブルをDBスキーマに追加
- `SensorLog`型を`types/index.ts`に追加
- Navbar にセンサー計測ページへのリンクを追加

### 改善
- `vision.ts`：翻訳ラベルマップを20件→60件以上に拡充
- Vision APIの最大取得ラベル数を8→10に変更

---

## 9. セットアップ手順

### 1. リポジトリのクローン
```bash
git clone https://github.com/YOUR_USERNAME/travel-photo-map.git
cd travel-photo-map
npm install
```

### 2. Supabaseの設定
1. [supabase.com](https://supabase.com) でプロジェクトを作成
2. SQL Editorで `supabase-schema.sql` を実行（photosとsensor_logsの両テーブルが作成される）
3. Storage > New bucket で `travel-photos` を作成（Public: ON）

### 3. 環境変数の設定
```bash
cp .env.local.example .env.local
```
`.env.local` に各APIキーを入力する。

### 4. 開発サーバーの起動
```bash
npm run dev
```
`http://localhost:3000` でアクセス。

---

## 10. Vercelへのデプロイ

1. GitHubにpush
2. [vercel.com](https://vercel.com) でリポジトリを連携
3. Environment Variables に `.env.local` の5つの変数を設定
4. Deployをクリック → 自動デプロイ完了

---

## 11. 今後の実装予定（夏休み目標）

- 加速度・ジャイロ・気圧センサーデータの解析と精度検証
- 写真撮影地点をアンカーとした事後逆算補正アルゴリズムの設計・実装
- Python（Anaconda環境）での補正シミュレーション検証
- ユーザー認証（Supabase Auth）の実装
