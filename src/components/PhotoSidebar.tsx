'use client'

import Image from 'next/image'
import { Photo } from '@/types'
import { useRef, useState } from 'react'

interface PhotoSidebarProps {
  photos: Photo[]
  selectedPhoto: Photo | null
  onSelectPhoto: (photo: Photo) => void
  hiddenPhotoIds: Set<string>
  onToggleMapVisibility: (photoId: string) => void
  onPhotosChanged: () => void
  loading: boolean
}

export default function PhotoSidebar({
  photos,
  selectedPhoto,
  onSelectPhoto,
  hiddenPhotoIds,
  onToggleMapVisibility,
  onPhotosChanged,
  loading,
}: PhotoSidebarProps) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null)
  const [tagDraft, setTagDraft] = useState('')
  const [savingTags, setSavingTags] = useState(false)
  const lastTapRef = useRef<{ photoId: string; time: number } | null>(null)
  const suppressNextClickRef = useRef(false)

  const handleRowPointerUp = (event: React.PointerEvent, photoId: string) => {
    if ((event.target as HTMLElement).closest('button, input, form')) {
      lastTapRef.current = null
      return
    }
    if (event.pointerType === 'mouse' && event.button !== 0) return

    const now = Date.now()
    const lastTap = lastTapRef.current
    if (lastTap?.photoId === photoId && now - lastTap.time < 450) {
      event.preventDefault()
      lastTapRef.current = null
      suppressNextClickRef.current = true
      onToggleMapVisibility(photoId)
      return
    }
    lastTapRef.current = { photoId, time: now }
  }

  const handleDelete = async (e: React.MouseEvent, photoId: string) => {
    e.stopPropagation()
    if (!confirm('この写真を削除してもよろしいですか？')) return

    setDeleting(photoId)
    try {
      const res = await fetch(`/api/photos?id=${photoId}`, { method: 'DELETE' })
      if (res.ok) {
        onPhotosChanged()
      } else {
        alert('削除に失敗しました')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('削除に失敗しました')
    } finally {
      setDeleting(null) // ✅ バグ修正: photoId → null にリセット
    }
  }

  const saveTags = async (event: React.FormEvent, photoId: string) => {
    event.preventDefault()
    event.stopPropagation()
    const tags = [...new Set(tagDraft.split(',').map((tag) => tag.trim()).filter(Boolean))]
    setSavingTags(true)
    try {
      const res = await fetch(`/api/photos?id=${photoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags }),
      })
      if (!res.ok) throw new Error('タグの保存に失敗しました')
      setEditingPhotoId(null)
      onPhotosChanged()
    } catch (error) {
      console.error('Tag update error:', error)
      alert('タグの保存に失敗しました')
    } finally {
      setSavingTags(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-stone-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="p-6 text-center text-stone-400">
        <div className="text-3xl mb-2">📷</div>
        <p className="text-sm">写真がありません</p>
        <p className="text-xs mt-1">アップロードページから写真を追加してください</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-stone-100">
      <p className="px-3 py-2 text-[10px] text-stone-400">
        写真をダブルタップ／ダブルクリックして地図表示を切替
      </p>
      {photos.map((photo, index) => {
        const isSelected = selectedPhoto?.id === photo.id
        const date = photo.taken_at
          ? new Date(photo.taken_at).toLocaleDateString('ja-JP', {
              month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })
          : null

        return (
          <div
            key={photo.id}
            onPointerUp={(event) => handleRowPointerUp(event, photo.id)}
            onClick={() => {
              if (suppressNextClickRef.current) {
                suppressNextClickRef.current = false
                return
              }
              onSelectPhoto(photo)
            }}
            onDoubleClick={(event) => event.preventDefault()}
            style={{ touchAction: 'manipulation' }}
            className={`flex gap-3 p-3 cursor-pointer transition-colors group ${
              isSelected ? 'bg-sky-50' : hiddenPhotoIds.has(photo.id) ? 'opacity-60 hover:bg-stone-50' : 'hover:bg-stone-50'
            }`}
          >
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${isSelected ? 'bg-orange-400' : 'bg-sky-400'}`}>
              {index + 1}
            </div>
            <div className="w-14 h-14 rounded-md overflow-hidden flex-shrink-0 bg-stone-100">
              <Image
                src={photo.storage_url}
                alt={photo.file_name}
                width={56}
                height={56}
                unoptimized
                className="object-cover w-full h-full"
              />
            </div>
            <div className="flex-1 min-w-0">
              {date && <p className="text-xs text-stone-400 mb-1">{date}</p>}
              {photo.location_name && (
                <p className="text-xs text-stone-600 font-medium truncate mb-1">
                  📍 {photo.location_name}
                </p>
              )}
              {photo.latitude === null && (
                <p className="text-xs text-amber-500">GPS情報なし</p>
              )}
              {photo.latitude !== null && (
                <p className={`text-[10px] ${hiddenPhotoIds.has(photo.id) ? 'text-stone-400' : 'text-teal-600'}`}>
                  {hiddenPhotoIds.has(photo.id) ? '地図に非表示' : '地図に表示中'}
                </p>
              )}
              {editingPhotoId === photo.id ? (
                <form
                  className="mt-2 space-y-1.5"
                  onSubmit={(event) => saveTags(event, photo.id)}
                  onClick={(event) => event.stopPropagation()}
                >
                  <input
                    value={tagDraft}
                    onChange={(event) => setTagDraft(event.target.value)}
                    placeholder="例: 山, 旅行"
                    aria-label={`${photo.file_name}のタグ。カンマ区切り`}
                    className="w-full min-w-0 rounded border border-stone-200 px-2 py-1 text-xs outline-none focus:border-sky-400"
                  />
                  <div className="flex gap-2">
                    <button type="submit" disabled={savingTags} className="text-xs text-sky-600 disabled:opacity-50">
                      {savingTags ? '保存中...' : '保存'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingPhotoId(null)}
                      disabled={savingTags}
                      className="text-xs text-stone-400"
                    >
                      キャンセル
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(photo.tags || []).map((tag) => (
                      <span key={tag} className="text-xs bg-sky-50 text-sky-600 rounded px-1.5 py-0.5">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      setTagDraft((photo.tags || []).join(', '))
                      setEditingPhotoId(photo.id)
                    }}
                    className="mt-1 text-xs text-stone-400 hover:text-sky-600"
                  >
                    タグを編集
                  </button>
                </>
              )}
            </div>
            <button
              onClick={(e) => handleDelete(e, photo.id)}
              disabled={deleting === photo.id}
              className="flex-shrink-0 w-6 h-6 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-red-500 hover:bg-red-50 disabled:opacity-50"
              title="この写真を削除"
            >
              {deleting === photo.id ? (
                <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              ) : '×'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
