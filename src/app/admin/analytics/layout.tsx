// Shared chrome for every /admin/analytics page — top tab strip so the
// editor can pivot between Overview · Audience · Acquisition · Content ·
// Landings · Conversion · Real-time without going back to a separate
// index page.

import Link from 'next/link'
import { headers } from 'next/headers'
import {
  Gauge, Users, MapPin, FileText, Home as HomeIcon, Target, Zap,
} from 'lucide-react'

const TABS = [
  { href: '/admin/analytics',              label: 'Overview',     icon: Gauge    },
  { href: '/admin/analytics/audience',     label: 'Audience',     icon: Users    },
  { href: '/admin/analytics/acquisition',  label: 'Acquisition',  icon: MapPin   },
  { href: '/admin/analytics/content',      label: 'Content',      icon: FileText },
  { href: '/admin/analytics/landings',     label: 'Landings',     icon: HomeIcon },
  { href: '/admin/analytics/conversion',   label: 'Conversion',   icon: Target   },
  { href: '/admin/analytics/realtime',     label: 'Real-time',    icon: Zap      },
]

export default async function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  // The proxy injects x-admin-pathname so we can highlight the active tab
  // without hooks in a layout (which is a server component).
  const pathname = (await headers()).get('x-admin-pathname') ?? '/admin/analytics'

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-portal-bg">
      <div className="bg-white border-b border-portal-border">
        <div className="px-6 pt-4 pb-0">
          <h1 className="portal-page-title">Analytics</h1>
          <p className="portal-page-subtitle">First-party reporting on the public site. Joins data Plausible can&apos;t — articles, columns, contributors, school engagement.</p>
        </div>
        <nav className="px-6 pt-3 flex items-center gap-1 overflow-x-auto">
          {TABS.map(tab => {
            const active = tab.href === '/admin/analytics'
              ? pathname === '/admin/analytics'
              : pathname.startsWith(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  active
                    ? 'text-portal-blue border-portal-blue'
                    : 'text-portal-sub hover:text-portal-text border-transparent hover:border-portal-border-2'
                }`}
              >
                <tab.icon size={13} />
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
