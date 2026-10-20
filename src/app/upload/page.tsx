'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface UploadItem {
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  tags?: string[]
  location?: { latitude: number; longitude: number }
  capturedAt?: string
  gpsStatus?: 'saved' | 'missing'
}

export default function UploadPage() {
  const [items, setItems] = useState<UploadItem[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [locationNotice, setLocationNotice] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const addFiles = useCallback((
    files: File[],
    location?: UploadItem['location'],
    capturedAt?: string,
  ) => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'))
    const newItems: UploadItem[] = imageFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      location,
      capturedAt,
    }))
    setItems((prev) => [...prev, ...newItems])
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    addFiles(Array.from(e.dataTransfer.files))
  }, [addFiles])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  const attachCurrentLocation = (index: number) => {
    if (!navigator.geolocation) {
      setLocationNotice('このブラウザでは位置情報を取得できません。')
      return
    }
    setLocationNotice('現在地を取得しています...')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setItems((prev) => prev.map((item, itemIndex) => itemIndex === index
          ? {
              ...item,
              location: { latitude: coords.latitude, longitude: coords.longitude },
              capturedAt: item.capturedAt ?? new Date().toISOString(),
            }
          : item))
        setLocationNotice('現在地を追加しました。EXIFに位置情報があれば、そちらを優先します。')
      },
      () => setLocationNotice('位置情報を取得できませんでした。ブラウザの許可設定を確認してください。'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const capturedAt = new Date().toISOString()
    e.target.value = ''
    setLocationNotice('撮影地点を取得しています...')

    if (!navigator.geolocation) {
      addFiles(files, undefined, capturedAt)
      setLocationNotice('このブラウザでは位置情報を取得できません。写真のEXIFに位置情報があれば使用します。')
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        addFiles(files, { latitude: coords.latitude, longitude: coords.longitude }, capturedAt)
        setLocationNotice('撮影地点を写真に記録しました。')
      },
      () => {
        addFiles(files, undefined, capturedAt)
        setLocationNotice('位置情報を取得できませんでした。許可設定を確認するか、写真のEXIF情報をご利用ください。')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
  }

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadAll = async () => {
    setUploading(true)
    for (let i = 0; i < items.length; i++) {
      if (items[i].status !== 'pending') continue
      setItems((prev) =>
        prev.map((item, idx) => idx === i ? { ...item, status: 'uploading' } : item)
      )
      try {
        const formData = new FormData()
        formData.append('file', items[i].file)
        const location = items[i].location
        if (location) {
          formData.append('latitude', String(location.latitude))
          formData.append('longitude', String(location.longitude))
        }
        const capturedAt = items[i].capturedAt
        if (capturedAt) formData.append('captured_at', capturedAt)
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (data.success) {
          setItems((prev) =>
            prev.map((item, idx) => idx === i
              ? {
                  ...item,
                  status: 'done',
                  tags: data.photo.tags,
                  gpsStatus: data.photo.latitude !== null && data.photo.longitude !== null ? 'saved' : 'missing',
                }
              : item)
          )
        } else {
          throw new Error(data.error)
        }
      } catch {
        setItems((prev) =>
          prev.map((item, idx) => idx === i ? { ...item, status: 'error' } : item)
        )
      }
    }
    setUploading(false)
  }

  const allDone = items.length > 0 && items.every((i) => i.status === 'done')
  const pendingCount = items.filter((i) => i.status === 'pending').length
  const doneCount = items.filter((i) => i.status === 'done').length

  return (
    <div className="min-h-screen bg-stone-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-stone-200 px-4 py-3 sticky top-0 z-10">
        <h1 className="text-base font-bold text-stone-800">📸 写真をアップロード</h1>
        <p className="text-xs text-stone-400 mt-0.5">
          写真を選ぶだけ。EXIF解析・AIタグ付けはサーバーが自動処理します
        </p>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        <p className="text-xs text-stone-500">
          選択した写真にGPSがない場合、撮影直後の写真だけ現在地を追加できます。過去の写真の位置は、EXIFに情報がなければ復元できません。
        </p>

        {/* ドロップゾーン（PC）/ タップゾーン（スマホ） */}
        <div
          className={`drop-zone rounded-2xl p-8 text-center cursor-pointer transition-all bg-white ${
            isDragOver ? 'drag-over' : ''
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-5xl mb-3">📷</div>
          <p className="text-stone-700 font-semibold text-sm">
            写真を選択
          </p>
          <p className="text-stone-400 text-xs mt-1 hidden sm:block">
            またはドラッグ&ドロップ
          </p>
          <p className="text-stone-400 text-xs mt-1 sm:hidden">
            タップして選択
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="w-full py-3 border border-stone-200 bg-white text-stone-700 rounded-xl text-sm font-medium active:bg-stone-50 transition-colors"
        >
          📷 カメラで撮影して位置を記録
        </button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCameraCapture}
        />
        {locationNotice && (
          <p className="text-xs text-stone-500" role="status">{locationNotice}</p>
        )}

        {/* プログレス表示（アップロード中） */}
        {uploading && (
          <div className="bg-sky-50 rounded-2xl p-4 border border-sky-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-sky-700">サーバーで処理中...</p>
            </div>
            <div className="w-full bg-sky-100 rounded-full h-1.5">
              <div
                className="bg-sky-500 h-1.5 rounded-full transition-all"
                style={{ width: `${(doneCount / items.length) * 100}%` }}
              />
            </div>
            <p className="text-xs text-sky-500 mt-1.5 text-right">
              {doneCount} / {items.length} 枚完了
            </p>
          </div>
        )}

        {/* プレビューグリッド */}
        {items.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {items.map((item, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden bg-stone-100 aspect-square">
                <Image
                  src={item.preview}
                  alt={item.file.name}
                  fill
                  className="object-cover"
                />
                {/* ステータスオーバーレイ */}
                {item.status === 'uploading' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {item.status === 'done' && (
                  <div className="absolute inset-0 bg-black/10 flex items-start justify-between p-1.5">
                    <span className={`px-1.5 py-0.5 text-[9px] rounded ${item.gpsStatus === 'saved' ? 'bg-green-600 text-white' : 'bg-amber-500 text-white'}`}>
                      {item.gpsStatus === 'saved' ? 'GPSあり' : 'GPSなし'}
                    </span>
                    <span className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">✓</span>
                  </div>
                )}
                {item.status === 'error' && (
                  <div className="absolute inset-0 bg-red-500/20 flex items-start justify-end p-1.5">
                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">✗</span>
                  </div>
                )}
                {item.status === 'pending' && !item.location && (
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); attachCurrentLocation(i) }}
                    title="撮影直後の写真に現在地を追加"
                    className="absolute bottom-1 left-1 rounded bg-black/65 px-1.5 py-1 text-[9px] text-white"
                  >
                    📍今の場所
                  </button>
                )}
                {/* AIタグ表示 */}
                {item.tags && item.tags.length > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/50">
                    <p className="text-white text-[9px] truncate">
                      {item.tags.slice(0, 2).join(' · ')}
                    </p>
                  </div>
                )}
                {/* 削除ボタン（pending のみ） */}
                {item.status === 'pending' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeItem(i) }}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center active:bg-black/80"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* アクションボタン */}
        {items.length > 0 && (
          <div className="space-y-2">
            {allDone ? (
              <button
                onClick={() => router.push('/')}
                className="w-full py-4 bg-teal-500 text-white rounded-2xl font-bold text-base active:bg-teal-600 transition-colors"
              >
                🗺️ 地図で見る
              </button>
            ) : (
              <>
                <button
                  onClick={uploadAll}
                  disabled={uploading || pendingCount === 0}
                  className="w-full py-4 bg-sky-500 text-white rounded-2xl font-bold text-base disabled:opacity-50 active:bg-sky-600 transition-colors"
                >
                  {uploading
                    ? `処理中... (${doneCount}/${items.length})`
                    : `⬆️ ${pendingCount}枚をアップロード`}
                </button>
                <button
                  onClick={() => setItems([])}
                  disabled={uploading}
                  className="w-full py-3 border border-stone-200 text-stone-500 rounded-2xl text-sm font-medium disabled:opacity-40 active:bg-stone-50 transition-colors"
                >
                  クリア
                </button>
              </>
            )}
          </div>
        )}

        {/* 完了メッセージ */}
        {allDone && (
          <div className="bg-green-50 rounded-2xl p-4 border border-green-100 text-center">
            <p className="text-green-700 font-medium text-sm">
              ✅ {items.length}枚のアップロードが完了しました
            </p>
            <p className="text-green-500 text-xs mt-1">AIタグが自動で付与されました</p>
          </div>
        )}

        {/* 下部余白（iPhone のホームバー対策） */}
        <div className="h-6 safe-bottom" />
      </div>
    </div>
  )
}
