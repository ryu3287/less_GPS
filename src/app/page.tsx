'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Photo } from '@/types'
import MapView from '@/components/MapView'
import PhotoSidebar from '@/components/PhotoSidebar'
import TagFilter from '@/components/TagFilter'
import { buildTravelPath, summarizeTravelMode } from '@/lib/travel'

export default function HomePage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [loading, setLoading] = useState(true)
  // スマホ用：サイドバー表示切り替え
  const [showSidebar, setShowSidebar] = useState(false)

  const routePoints = useMemo(() => buildTravelPath(photos), [photos])
  const travelSummary = useMemo(() => summarizeTravelMode(photos), [photos])

  const fetchPhotos = useCallback(async () => {
    setLoading(true)
    try {
      const params = selectedTag ? `?tag=${encodeURIComponent(selectedTag)}` : ''
      const res = await fetch(`/api/photos${params}`)
      const data = await res.json()
      setPhotos(data.photos || [])
    } catch (err) {
      console.error('Failed to fetch photos:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedTag])

  useEffect(() => { fetchPhotos() }, [fetchPhotos])

  const photosWithLocation = photos.filter(
    (p) => p.latitude !== null && p.longitude !== null
  )

  return (
    <div className="flex h-[calc(100vh-56px)] relative overflow-hidden">

      {/* ========== PC: サイドバー（常時表示） ========== */}
      <div className="hidden sm:flex w-80 flex-shrink-0 bg-white border-r border-stone-200 flex-col overflow-hidden">
        <div className="p-4 border-b border-stone-100">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
            タグフィルター
          </h2>
          <TagFilter selectedTag={selectedTag} onTagSelect={setSelectedTag} />
        </div>
        <div className="flex-1 overflow-y-auto">
          <PhotoSidebar
            photos={photos}
            selectedPhoto={selectedPhoto}
            onSelectPhoto={setSelectedPhoto}
            onPhotoDeleted={fetchPhotos}
            loading={loading}
          />
        </div>
        <div className="p-3 border-t border-stone-100 text-xs text-stone-400 text-center">
          {photosWithLocation.length} 枚の写真が地図上に表示
        </div>
      </div>

      {/* ========== マップ（PC・スマホ共通） ========== */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 bg-stone-50/80 flex items-center justify-center z-10">
            <div className="text-stone-400 text-sm">読み込み中...</div>
          </div>
        )}

        <div className="absolute left-4 top-4 z-10 max-w-xs rounded-2xl border border-orange-100 bg-white/90 px-3 py-2 shadow-sm backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-500">Low GPS Mode</p>
          <p className="mt-1 text-xs text-stone-600">
            写真撮影時のみGPSを使い、{typeof travelSummary === 'object' ? travelSummary.anchorCount : 0}件のアンカーから経路を再構成
          </p>
        </div>

        <MapView
          photos={photosWithLocation}
          selectedPhoto={selectedPhoto}
          routePoints={routePoints}
          onSelectPhoto={(photo) => {
            setSelectedPhoto(photo)
            setShowSidebar(true) // スマホ：写真タップでサイドバー表示
          }}
        />

        {/* ========== スマホ用フローティングボタン ========== */}
        <div className="sm:hidden absolute bottom-5 right-4 flex flex-col gap-2 z-10">
          {/* 写真リスト表示ボタン */}
          <button
            onClick={() => setShowSidebar(true)}
            className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-stone-600 border border-stone-200 active:bg-stone-50"
          >
            <span className="text-xl">📋</span>
          </button>
        </div>

        {/* スマホ用：写真枚数バッジ */}
        <div className="sm:hidden absolute bottom-5 left-4 z-10">
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm border border-stone-200">
            <p className="text-xs text-stone-500">
              📍 {photosWithLocation.length}枚
            </p>
          </div>
        </div>
      </div>

      {/* ========== スマホ用：ボトムシート（サイドバー） ========== */}
      {showSidebar && (
        <>
          {/* オーバーレイ */}
          <div
            className="sm:hidden fixed inset-0 bg-black/30 z-20"
            onClick={() => setShowSidebar(false)}
          />
          {/* ボトムシート本体 */}
          <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white rounded-t-2xl shadow-2xl max-h-[75vh] flex flex-col">
            {/* ドラッグハンドル */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-stone-300 rounded-full" />
            </div>
            {/* タグフィルター */}
            <div className="px-4 py-3 border-b border-stone-100">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  タグフィルター
                </h2>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="text-stone-400 text-sm"
                >
                  閉じる
                </button>
              </div>
              <TagFilter selectedTag={selectedTag} onTagSelect={setSelectedTag} />
            </div>
            {/* 写真リスト */}
            <div className="flex-1 overflow-y-auto">
              <PhotoSidebar
                photos={photos}
                selectedPhoto={selectedPhoto}
                onSelectPhoto={(photo) => {
                  setSelectedPhoto(photo)
                  setShowSidebar(false)
                }}
                onPhotoDeleted={fetchPhotos}
                loading={loading}
              />
            </div>
            {/* 枚数表示 */}
            <div className="p-3 border-t border-stone-100 text-xs text-stone-400 text-center safe-bottom">
              {photosWithLocation.length} 枚の写真が地図上に表示
            </div>
          </div>
        </>
      )}
    </div>
  )
}
