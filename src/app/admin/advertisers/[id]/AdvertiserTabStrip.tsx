'use client'

// AdvertiserTabStrip — client component so the active tab updates
// from usePathname without a server round trip. Underline indicates
// the active tab; counts appear in tiny pills next to the label
// when > 0.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Megaphone, BookOpen, BarChart3, FileText } from 'lucide-react'

interface Tab {
  href:    (id: string) => string
  match:   (path: string, id: string) => boolean
  label:   string
  icon:    React.ReactNode
  /** Optional pill count for the tab. 0 hides the pill. */
  count?:  number
}

export function AdvertiserTabStrip({ id, counts }: {
  id:     string
  counts: { ads: number; listings: number; proposals: number }
}) {
  const pathname = usePathname() ?? ''
  const base = `/admin/advertisers/${id}`

  // Tab matching: 'Overview' matches the exact base path only;
  // every other tab matches the base + suffix prefix so deeper
  // routes (e.g. /ads/[someTodo]) stay highlighted on the right tab.
  const tabs: Tab[] = [
    { href: () => base,                  match: p => p === base,                       label: 'Overview',  icon: <Home size={13} /> },
    { href: () => `${base}/ads`,         match: p => p.startsWith(`${base}/ads`),      label: 'Ad Placements', icon: <Megaphone size={13} />, count: counts.ads },
    { href: () => `${base}/listings`,    match: p => p.startsWith(`${base}/listings`), label: 'Listings',  icon: <BookOpen size={13} />, count: counts.listings },
    { href: () => `${base}/analytics`,   match: p => p.startsWith(`${base}/analytics`),label: 'Analytics', icon: <BarChart3 size={13} /> },
    { href: () => `${base}/proposals`,   match: p => p.startsWith(`${base}/proposals`),label: 'Proposals & Agreements', icon: <FileText size={13} />, count: counts.proposals },
  ]

  return (
    <div className="px-6 border-t border-gray-100">
      <nav className="flex items-center gap-1 overflow-x-auto">
        {tabs.map(t => {
          const active = t.match(pathname, id)
          return (
            <Link
              key={t.label}
              href={t.href(id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                active
                  ? 'text-portal-blue border-portal-blue'
                  : 'text-gray-500 hover:text-gray-700 border-transparent hover:border-gray-300'
              }`}
            >
              <span className={active ? 'text-portal-blue' : 'text-gray-400'}>{t.icon}</span>
              {t.label}
              {!!t.count && t.count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-portal-blue-lt text-portal-blue' : 'bg-gray-100 text-gray-600'}`}>
                  {t.count}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
