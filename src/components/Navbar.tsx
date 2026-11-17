'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function Navbar() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const links = [
    { href: '/', label: '地図' },
    { href: '/upload', label: '写真' },
    { href: '/sensor', label: 'センサー' },
  ]

  return (
    <nav className="relative z-20 flex h-14 items-center border-b border-stone-200/80 bg-white/95 px-3 backdrop-blur-xl sm:px-5">
      <Link href="/" className="flex shrink-0 items-center gap-2 text-sm font-semibold text-stone-900">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">旅</span>
        <span className="hidden sm:inline">旅の記録</span>
      </Link>

      <div className="ml-5 hidden items-center gap-1 sm:flex">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              pathname === href
                ? 'bg-sky-50 font-medium text-sky-700'
                : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="ml-auto hidden sm:flex">
        <Link
          href="/upload"
          className="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700"
        >
          写真を追加
        </Link>
      </div>

      <span className="sm:hidden ml-3 text-sm font-medium text-stone-600">
        {links.find(l => l.href === pathname)?.label ?? '旅の記録'}
      </span>

      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="ml-auto rounded-full p-2 text-stone-600 transition-colors hover:bg-stone-100 sm:hidden"
        aria-label={menuOpen ? 'メニューを閉じる' : 'メニューを開く'}
        aria-expanded={menuOpen}
      >
        <div className={`w-5 h-0.5 bg-stone-600 transition-all ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
        <div className={`w-5 h-0.5 bg-stone-600 mt-1 transition-all ${menuOpen ? 'opacity-0' : ''}`} />
        <div className={`w-5 h-0.5 bg-stone-600 mt-1 transition-all ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
      </button>

      {menuOpen && (
        <>
          <div
            className="sm:hidden fixed inset-0 top-14 bg-black/20 z-10"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute left-3 right-3 top-14 z-20 rounded-2xl border border-stone-200/80 bg-white p-2 shadow-xl sm:hidden">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center rounded-xl px-4 py-3 text-sm transition-colors ${
                  pathname === href
                    ? 'bg-sky-50 font-medium text-sky-700'
                    : 'text-stone-700 active:bg-stone-50'
                }`}
              >
                {label}
                {pathname === href && (
                  <span className="ml-auto text-sky-600">✓</span>
                )}
              </Link>
            ))}
            <Link
              href="/upload"
              onClick={() => setMenuOpen(false)}
              className="mx-1 my-1 flex items-center justify-center rounded-xl bg-sky-600 py-3 text-sm font-medium text-white active:bg-sky-700"
            >
              写真を追加
            </Link>
          </div>
        </>
      )}
    </nav>
  )
}
