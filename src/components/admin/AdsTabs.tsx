'use client'

// AdsTabs — shared sub-section tab bar for the Ads & Sponsors family of
// admin pages. Sits at the top of each page (All Bookings, Slot Map,
// Section Sponsors, Renewal Reminders) so the editor can flip between
// them without going back to the sidebar — and so every page in this
// area looks like part of the same workspace.
//
// Active state matches the pathname. Section Sponsors lives at its
// historical URL (/admin/section-sponsors) but visually it's part of
// this tab set — the page itself adopts the same shell + this header.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Star, Map, Bookmark, Mail } from 'lucide-react'

const TABS = [
  { href: '/admin/ads',              label: 'All Bookings',       icon: Star     },
  { href: '/admin/ads/map',          label: 'Slot Map',           icon: Map      },
  { href: '/admin/section-sponsors', label: 'Section Sponsors',   icon: Bookmark },
  { href: '/admin/ads/renewals',     label: 'Renewal Reminders',  icon: Mail     },
]

export function AdsTabs() {
  const pathname = usePathname()

  function isActive(href: string): boolean {
    if (href === '/admin/ads') {
      // The base /admin/ads must NOT match /admin/ads/map or /ads/renewals
      // or it'd appear active on every child page.
      return pathname === '/admin/ads' || /^\/admin\/ads\/[a-f0-9-]+(\/edit)?$/.test(pathname)
    }
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-1 inline-flex items-center gap-0.5 flex-wrap">
      {TABS.map(tab => {
        const active = isActive(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
              active
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
