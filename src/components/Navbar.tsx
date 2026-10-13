'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function Navbar() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const links = [
    { href: '/', label: '🗺️ 地図' },
    { href: '/upload', label: '📸 アップロード' },
    { href: '/sensor', label: '📡 センサー計測' },
  ]

  return (
    <nav className="h-14 bg-white border-b border-stone-200 flex items-center px-4 relative z-20">
      {/* ロゴ */}
      <Link href="/" className="flex items-center gap-1.5 font-bold text-stone-800 text-sm shrink-0">
        <span className="text-lg">🗺️</span>
        <span className="hidden sm:inline">旅行記録マップ</span>
      </Link>

      {/* PC用ナビ */}
      <div className="hidden sm:flex items-center gap-1 ml-6">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              pathname === href
                ? 'bg-stone-100 text-stone-800 font-medium'
                : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* PC用右端ボタン */}
      <div className="hidden sm:flex ml-auto">
        <Link
          href="/upload"
          className="px-4 py-1.5 bg-sky-500 text-white text-sm rounded-lg hover:bg-sky-600 transition-colors font-medium"
        >
          + 写真を追加
        </Link>
      </div>

      {/* スマホ用：現在ページ名 */}
      <span className="sm:hidden ml-3 text-sm font-medium text-stone-600">
        {links.find(l => l.href === pathname)?.label ?? '旅行記録マップ'}
      </span>

      {/* スマホ用ハンバーガーメニュー */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="sm:hidden ml-auto p-2 rounded-lg text-stone-500 hover:bg-stone-100 transition-colors"
        aria-label="メニュー"
      >
        <div className={`w-5 h-0.5 bg-stone-600 transition-all ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
        <div className={`w-5 h-0.5 bg-stone-600 mt-1 transition-all ${menuOpen ? 'opacity-0' : ''}`} />
        <div className={`w-5 h-0.5 bg-stone-600 mt-1 transition-all ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
      </button>

      {/* スマホ用ドロップダウン */}
      {menuOpen && (
        <>
          {/* 背景オーバーレイ */}
          <div
            className="sm:hidden fixed inset-0 top-14 bg-black/20 z-10"
            onClick={() => setMenuOpen(false)}
          />
          {/* メニュー本体 */}
          <div className="sm:hidden absolute top-14 right-0 left-0 bg-white border-b border-stone-200 z-20 shadow-lg">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center px-5 py-4 text-sm border-b border-stone-100 transition-colors ${
                  pathname === href
                    ? 'bg-stone-50 text-stone-800 font-medium'
                    : 'text-stone-600 active:bg-stone-50'
                }`}
              >
                {label}
                {pathname === href && (
                  <span className="ml-auto text-teal-500">✓</span>
                )}
              </Link>
            ))}
            <Link
              href="/upload"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center mx-4 my-3 py-3 bg-sky-500 text-white rounded-xl text-sm font-medium active:bg-sky-600 transition-colors"
            >
              + 写真を追加
            </Link>
          </div>
        </>
      )}
    </nav>
  )
}
