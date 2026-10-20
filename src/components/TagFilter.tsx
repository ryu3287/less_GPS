'use client'

import { useEffect, useState } from 'react'

interface TagFilterProps {
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  refreshKey: number
}

interface TagItem {
  tag: string
  count: number
}

export default function TagFilter({ selectedTags, onTagsChange, refreshKey }: TagFilterProps) {
  const [tags, setTags] = useState<TagItem[]>([])

  useEffect(() => {
    fetch('/api/tags')
      .then((r) => r.json())
      .then((d) => setTags(d.tags || []))
      .catch(() => {})
  }, [refreshKey])

  if (tags.length === 0) {
    return <p className="text-xs text-stone-400">タグなし</p>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={() => onTagsChange([])}
        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
          selectedTags.length === 0 ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
        }`}
      >
        すべて
      </button>
      {tags.map(({ tag, count }) => (
        <button
          key={tag}
          onClick={() => onTagsChange(
            selectedTags.includes(tag)
              ? selectedTags.filter((selected) => selected !== tag)
              : [...selectedTags, tag],
          )}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            selectedTags.includes(tag) ? 'bg-sky-500 text-white' : 'bg-sky-50 text-sky-600 hover:bg-sky-100'
          }`}
        >
          {tag}
          <span className="ml-1 opacity-70">{count}</span>
        </button>
      ))}
    </div>
  )
}
