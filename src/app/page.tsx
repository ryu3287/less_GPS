'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Photo } from '@/types'
import MapView from '@/components/MapView'
import PhotoSidebar from '@/components/PhotoSidebar'
import TagFilter from '@/components/TagFilter'
import { useFinishedSensorLogs, useMapPhotoVisibility } from '@/components/SensorRecorderProvider'
import { buildTravelPath, summarizeTravelMode } from '@/lib/travel'
import { SensorLog } from '@/types'

export default function HomePage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagRefreshKey, setTagRefreshKey] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [loading, setLoading] = useState(true)
  const [storedSensorLogs, setStoredSensorLogs] = useState<SensorLog[]>([])
  const finishedSensorLogs = useFinishedSensorLogs()
  const {
    hiddenPhotoIds,
    isMapVisibilityReady,
    togglePhotoVisibility,
    setPhotoVisibility,
  } = useMapPhotoVisibility()
  // スマホ用：サイドバー表示切り替え
  const [showSidebar, setShowSidebar] = useState(false)

  const sensorLogRange = useMemo(() => {
    const timestamps = photos
      .map((photo) => photo.taken_at ? new Date(photo.taken_at).getTime() : NaN)
      .filter(Number.isFinite)
    if (timestamps.length === 0) return null
    return {
      from: new Date(Math.min(...timestamps)).toISOString(),
      to: new Date(Math.max(...timestamps)).toISOString(),
    }
  }, [photos])

  const routeSensorLogs = useMemo(() => {
    const uniqueLogs = new Map<string, SensorLog>()
    for (const log of [...storedSensorLogs, ...finishedSensorLogs]) {
      uniqueLogs.set(`${log.session_id}:${log.timestamp}`, log)
    }
    return [...uniqueLogs.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  }, [storedSensorLogs, finishedSensorLogs])
  const travelSummary = useMemo(() => summarizeTravelMode(photos), [photos])

  const fetchPhotos = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      selectedTags.forEach((tag) => params.append('tag', tag))
      const query = params.toString()
      const res = await fetch(`/api/photos${query ? `?${query}` : ''}`)
      const data = await res.json()
      setPhotos(data.photos || [])
    } catch (err) {
      console.error('Failed to fetch photos:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedTags])

  useEffect(() => { fetchPhotos() }, [fetchPhotos])

  const handlePhotosChanged = useCallback(() => {
    setTagRefreshKey((key) => key + 1)
    void fetchPhotos()
  }, [fetchPhotos])

  useEffect(() => {
    if (!sensorLogRange) {
      setStoredSensorLogs([])
      return
    }
    let cancelled = false
    const params = new URLSearchParams(sensorLogRange)
    fetch(`/api/sensor-logs?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error('センサーログの取得に失敗しました')
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setStoredSensorLogs(data.logs || [])
      })
      .catch((error) => console.error('Failed to fetch sensor logs:', error))
    return () => { cancelled = true }
  }, [sensorLogRange])

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase('ja')
  const searchedPhotos = normalizedSearch
    ? photos.filter((photo) => [photo.file_name, photo.location_name, ...(photo.tags || [])]
        .some((value) => value?.toLocaleLowerCase('ja').includes(normalizedSearch)))
    : photos
  const photosWithLocation = searchedPhotos.filter(
    (p) => p.latitude !== null && p.longitude !== null
  )
  const mapPhotos = isMapVisibilityReady
    ? photosWithLocation.filter((photo) => !hiddenPhotoIds.has(photo.id))
    : []
  const toggleMapVisibility = useCallback((photoId: string) => {
    const hiding = !hiddenPhotoIds.has(photoId)
    togglePhotoVisibility(photoId)
    if (hiding && selectedPhoto?.id === photoId) setSelectedPhoto(null)
  }, [hiddenPhotoIds, selectedPhoto, togglePhotoVisibility])
  const visibleRoutePoints = useMemo(
    () => buildTravelPath(mapPhotos, routeSensorLogs),
    [mapPhotos, routeSensorLogs],
  )
  const toggleAllMapPhotos = () => {
    const showAll = mapPhotos.length === 0
    setPhotoVisibility(photosWithLocation.map((photo) => photo.id), showAll)
    if (!showAll) setSelectedPhoto(null)
  }

  return (
    <div className="relative h-[calc(100dvh-56px)] min-h-[480px] overflow-hidden bg-stone-100">
      <MapView
        photos={mapPhotos}
        selectedPhoto={selectedPhoto}
        routePoints={visibleRoutePoints}
        onSelectPhoto={(photo) => {
          setSelectedPhoto(photo)
          setShowSidebar(true)
        }}
      />

      {(loading || !isMapVisibilityReady) && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/55 backdrop-blur-[2px]">
          <div className="rounded-full bg-white px-4 py-2 text-sm text-stone-600 shadow-md">地図を準備しています...</div>
        </div>
      )}

      {/* Desktop floating search and photo panel */}
      <aside className="absolute bottom-4 left-4 top-4 z-10 hidden w-[360px] max-w-[calc(100%-32px)] flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/95 shadow-[0_8px_32px_rgba(15,23,42,0.18)] backdrop-blur-xl sm:flex">
        <div className="border-b border-stone-100 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold text-stone-900">旅の写真</h1>
              <p className="mt-0.5 text-xs text-stone-500">{mapPhotos.length} / {photosWithLocation.length} 地点を地図に表示</p>
            </div>
            <Link href="/upload" className="rounded-full bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700">
              写真を追加
            </Link>
          </div>
          <label className="flex h-11 items-center gap-2 rounded-xl bg-stone-100 px-3 focus-within:ring-2 focus-within:ring-sky-500/30">
            <span className="text-lg leading-none text-stone-400" aria-hidden="true">⌕</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="写真・場所・タグを検索"
              aria-label="写真、場所、タグを検索"
              className="min-w-0 flex-1 bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400"
            />
            {searchQuery && <button type="button" onClick={() => setSearchQuery('')} className="text-stone-400" aria-label="検索をクリア">×</button>}
          </label>
          <div className="mt-3">
            <TagFilter selectedTags={selectedTags} onTagsChange={setSelectedTags} refreshKey={tagRefreshKey} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <PhotoSidebar
            photos={searchedPhotos}
            selectedPhoto={selectedPhoto}
            onSelectPhoto={(photo) => {
              if (!hiddenPhotoIds.has(photo.id)) setSelectedPhoto(photo)
            }}
            hiddenPhotoIds={hiddenPhotoIds}
            onToggleMapVisibility={toggleMapVisibility}
            onPhotosChanged={handlePhotosChanged}
            loading={loading || !isMapVisibilityReady}
          />
        </div>
        <div className="flex items-center justify-between border-t border-stone-100 px-4 py-3">
          <span className="text-xs text-stone-500">{searchedPhotos.length} 枚の写真</span>
          <button
            type="button"
            onClick={toggleAllMapPhotos}
            disabled={photosWithLocation.length === 0 || !isMapVisibilityReady}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-sky-700 transition hover:bg-sky-50 disabled:opacity-40"
          >
            {mapPhotos.length === 0 ? '全ピンを表示' : '全ピンを非表示'}
          </button>
        </div>
      </aside>

      {/* Mobile floating search and filters */}
      <div className="absolute left-3 right-3 top-3 z-10 space-y-2 sm:hidden">
        <div className="flex h-12 items-center gap-2 rounded-2xl bg-white/95 px-3 shadow-[0_4px_18px_rgba(15,23,42,0.18)] backdrop-blur-xl">
          <span className="text-xl leading-none text-stone-400" aria-hidden="true">⌕</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onFocus={() => setShowSidebar(true)}
            placeholder="写真・場所・タグを検索"
            aria-label="写真、場所、タグを検索"
            className="min-w-0 flex-1 bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400"
          />
          {searchQuery && <button type="button" onClick={() => setSearchQuery('')} className="text-lg text-stone-400" aria-label="検索をクリア">×</button>}
          <Link href="/upload" className="shrink-0 rounded-full bg-sky-600 px-3 py-2 text-xs font-semibold text-white">追加</Link>
        </div>
        <div className="max-h-16 overflow-y-auto rounded-xl bg-white/90 p-2 shadow-md backdrop-blur-xl">
          <TagFilter selectedTags={selectedTags} onTagsChange={setSelectedTags} refreshKey={tagRefreshKey} />
        </div>
      </div>

      <div className="absolute bottom-4 left-3 z-10 max-w-[min(70vw,340px)] rounded-2xl border border-white/80 bg-white/95 px-3.5 py-3 shadow-[0_4px_18px_rgba(15,23,42,0.18)] backdrop-blur-xl sm:bottom-4 sm:left-[392px]">
        <div className="flex items-start gap-2">
          <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
          <div>
            <p className="text-xs font-semibold text-stone-800">低GPSモード</p>
            <p className="mt-0.5 text-[11px] leading-4 text-stone-500">
              GPSアンカー {typeof travelSummary === 'object' ? travelSummary.anchorCount : 0} 点 · センサーログ {routeSensorLogs.length} 件
            </p>
          </div>
          <button
            type="button"
            onClick={toggleAllMapPhotos}
            disabled={photosWithLocation.length === 0 || !isMapVisibilityReady}
            className="ml-1 shrink-0 rounded-lg bg-stone-100 px-2 py-1.5 text-[10px] font-medium text-stone-700 hover:bg-stone-200 disabled:opacity-40 sm:hidden"
          >
            {mapPhotos.length === 0 ? '全表示' : '全解除'}
          </button>
        </div>
      </div>

      {/* Mobile photo sheet */}
      {showSidebar && (
        <>
          <div
            className="sm:hidden fixed inset-0 z-20 bg-black/25 backdrop-blur-[1px]"
            onClick={() => setShowSidebar(false)}
          />
          <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 flex max-h-[78dvh] flex-col rounded-t-[24px] bg-white shadow-[0_-8px_32px_rgba(15,23,42,0.16)]">
            <div className="flex justify-center pb-2 pt-3">
              <div className="h-1 w-9 rounded-full bg-stone-300" />
            </div>
            <div className="flex items-center justify-between border-b border-stone-100 px-4 pb-3">
              <div>
                <h2 className="text-sm font-semibold text-stone-900">写真</h2>
                <p className="mt-0.5 text-xs text-stone-500">{searchedPhotos.length} 枚 · {mapPhotos.length} 地点を表示中</p>
              </div>
              <button
                type="button"
                onClick={toggleAllMapPhotos}
                disabled={photosWithLocation.length === 0}
                className="rounded-full bg-stone-100 px-3 py-2 text-xs font-medium text-stone-700 disabled:opacity-40"
              >
                {mapPhotos.length === 0 ? '全ピンを表示' : '全解除'}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <PhotoSidebar
                photos={searchedPhotos}
                selectedPhoto={selectedPhoto}
                onSelectPhoto={(photo) => {
                  if (!hiddenPhotoIds.has(photo.id)) {
                    setSelectedPhoto(photo)
                    setShowSidebar(false)
                  }
                }}
                hiddenPhotoIds={hiddenPhotoIds}
                onToggleMapVisibility={toggleMapVisibility}
                onPhotosChanged={handlePhotosChanged}
                loading={loading || !isMapVisibilityReady}
              />
            </div>
            <div className="safe-bottom border-t border-stone-100 px-4 py-2 text-center text-[10px] text-stone-400">
              写真を2回タップすると地図上の表示を切り替え
            </div>
          </div>
        </>
      )}

      {/* Mobile photo list control */}
      <button
        type="button"
        onClick={() => setShowSidebar(true)}
        className="sm:hidden absolute bottom-[76px] right-3 z-10 flex h-12 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-stone-700 shadow-[0_4px_18px_rgba(15,23,42,0.2)]"
      >
        <span aria-hidden="true">▤</span>
        写真 {searchedPhotos.length}
      </button>
    </div>
  )
}
