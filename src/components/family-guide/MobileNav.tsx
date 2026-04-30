'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, BookOpen, Star, Search } from 'lucide-react'

const TABS = [
  { label: 'Home',       href: '/newcomer-guide',         Icon: Home },
  { label: 'Events',     href: '/events',                  Icon: Calendar },
  { label: 'Guides',     href: '/newcomer-guide',          Icon: BookOpen },
  { label: 'Spotlights', href: '/newcomer-guide#directory',Icon: Star },
  { label: 'Search',     href: '/newcomer-guide#directory',Icon: Search },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      backgroundColor: 'white',
      borderTop: '1px solid rgba(0,0,0,0.07)',
      display: 'flex',
      padding: '6px 0 calc(6px + env(safe-area-inset-bottom, 0px))',
      zIndex: 200,
    }}
    className="md:hidden">
      {TABS.map(({ label, href, Icon }) => {
        const active = label === 'Guides'
          ? pathname.startsWith('/newcomer-guide')
          : pathname === href

        return (
          <Link key={label} href={href} style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            padding: '4px 0',
            textDecoration: 'none',
            color: active ? 'var(--fg-sky, #4a90d9)' : 'var(--fg-dim, #999)',
          }}>
            <Icon size={22} strokeWidth={active ? 2.2 : 1.7} />
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: '0.02em' }}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
