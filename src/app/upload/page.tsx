'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface UploadItem {
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  tags?: string[]
}

export default function UploadPage() {
  const [items, setItems] = useState<UploadItem[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const addFiles = useCallback((files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'))
    const newItems: UploadItem[] = imageFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
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
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (data.success) {
          setItems((prev) =>
            prev.map((item, idx) => idx === i ? { ...item, status: 'done', tags: data.photo.tags } : item)
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
                  <div className="absolute inset-0 bg-green-500/20 flex items-start justify-end p-1.5">
                    <span className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">✓</span>
                  </div>
                )}
                {item.status === 'error' && (
                  <div className="absolute inset-0 bg-red-500/20 flex items-start justify-end p-1.5">
                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">✗</span>
                  </div>
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
