'use client'

import Image from 'next/image'
import { Photo } from '@/types'
import { useState } from 'react'

interface PhotoSidebarProps {
  photos: Photo[]
  selectedPhoto: Photo | null
  onSelectPhoto: (photo: Photo) => void
  onPhotoDeleted: () => void
  loading: boolean
}

export default function PhotoSidebar({
  photos,
  selectedPhoto,
  onSelectPhoto,
  onPhotoDeleted,
  loading,
}: PhotoSidebarProps) {
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (e: React.MouseEvent, photoId: string) => {
    e.stopPropagation()
    if (!confirm('この写真を削除してもよろしいですか？')) return

    setDeleting(photoId)
    try {
      const res = await fetch(`/api/photos?id=${photoId}`, { method: 'DELETE' })
      if (res.ok) {
        onPhotoDeleted()
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
            onClick={() => onSelectPhoto(photo)}
            className={`flex gap-3 p-3 cursor-pointer transition-colors group ${
              isSelected ? 'bg-sky-50' : 'hover:bg-stone-50'
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
              <div className="flex flex-wrap gap-1 mt-1">
                {(photo.tags || []).slice(0, 3).map((tag) => (
                  <span key={tag} className="text-xs bg-sky-50 text-sky-600 rounded px-1.5 py-0.5">
                    {tag}
                  </span>
                ))}
              </div>
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
