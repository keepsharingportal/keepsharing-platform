'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X, MapPin } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Family Guide', href: '/newcomer-guide' },
  { label: 'Summer Fun Guide', href: '/summer-fun-guide' },
  { label: 'Advertise', href: '/advertise' },
]

export function PublicHeader() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const isGuide = pathname.startsWith('/newcomer-guide')

  return (
    <header style={{
      backgroundColor: 'white',
      borderBottom: '1px solid rgba(0,0,0,0.07)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 1px 12px rgba(0,0,0,0.06)',
      fontFamily: 'var(--font-dm-sans, sans-serif)',
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>

        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontFamily: 'var(--font-fraunces, serif)',
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--fg-navy, #1a2744)',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}>
            River Region <span style={{ color: 'var(--fg-sky, #4a90d9)' }}>Parents</span>
          </span>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 3,
            fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
            color: 'var(--fg-sky, #4a90d9)',
          }}
          className="hidden sm:flex">
            <MapPin size={11} /> Montgomery, AL
          </span>
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="hidden md:flex">
          {NAV_LINKS.map(link => {
            const active = pathname === link.href || pathname.startsWith(link.href + '/')
            const isFeatured = link.href === '/newcomer-guide'
            return (
              <Link key={link.href} href={link.href} style={{
                padding: '7px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: isFeatured ? 700 : 500,
                textDecoration: 'none',
                transition: 'all 0.15s',
                backgroundColor: isFeatured
                  ? (active ? 'var(--fg-terra, #c4622d)' : 'var(--fg-terra, #c4622d)')
                  : (active ? 'rgba(74,144,217,0.1)' : 'transparent'),
                color: isFeatured
                  ? 'white'
                  : (active ? 'var(--fg-sky, #4a90d9)' : 'var(--fg-mid, #666)'),
              }}>
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Mobile menu toggle */}
        <button onClick={() => setMobileOpen(!mobileOpen)}
          style={{ padding: 8, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: '#666', display: 'flex', alignItems: 'center' }}
          className="md:hidden">
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile nav panel */}
      {mobileOpen && (
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', backgroundColor: 'white', padding: '12px 20px 16px' }}
          className="md:hidden">
          {NAV_LINKS.map(link => {
            const isFeatured = link.href === '/newcomer-guide'
            return (
              <Link key={link.href} href={link.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'block',
                  padding: '10px 16px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: isFeatured ? 700 : 500,
                  textDecoration: 'none',
                  marginBottom: 4,
                  backgroundColor: isFeatured ? 'var(--fg-terra, #c4622d)' : 'transparent',
                  color: isFeatured ? 'white' : 'var(--fg-text, #1a1a1a)',
                }}>
                {link.label}
              </Link>
            )
          })}
        </div>
      )}
    </header>
  )
}
