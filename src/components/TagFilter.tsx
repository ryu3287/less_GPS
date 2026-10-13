'use client'

import { useEffect, useState } from 'react'

interface TagFilterProps {
  selectedTag: string | null
  onTagSelect: (tag: string | null) => void
}

interface TagItem {
  tag: string
  count: number
}

export default function TagFilter({ selectedTag, onTagSelect }: TagFilterProps) {
  const [tags, setTags] = useState<TagItem[]>([])

  useEffect(() => {
    fetch('/api/tags')
      .then((r) => r.json())
      .then((d) => setTags(d.tags || []))
      .catch(() => {})
  }, [])

  if (tags.length === 0) {
    return <p className="text-xs text-stone-400">タグなし</p>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={() => onTagSelect(null)}
        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
          selectedTag === null ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
        }`}
      >
        すべて
      </button>
      {tags.map(({ tag, count }) => (
        <button
          key={tag}
          onClick={() => onTagSelect(selectedTag === tag ? null : tag)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            selectedTag === tag ? 'bg-sky-500 text-white' : 'bg-sky-50 text-sky-600 hover:bg-sky-100'
          }`}
        >
          {tag}
          <span className="ml-1 opacity-70">{count}</span>
        </button>
      ))}
    </div>
  )
}
