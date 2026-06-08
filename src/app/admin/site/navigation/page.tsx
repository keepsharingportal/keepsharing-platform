// /admin/site/navigation — show/hide individual items in the public
// site's header and footer navigation. Each item in the catalog
// (src/lib/site-nav/items.ts) gets a toggle; flipping it writes a row
// into nav_visibility and the public-side cache invalidates so the
// change shows up within ~30 seconds.
//
// Use case: launch week. Some links go to pages that aren't ready yet.
// Hide them without a deploy until they are.

import type { Metadata } from 'next'
import { Navigation as NavIcon } from 'lucide-react'
import { NAV_CATALOG } from '@/lib/site-nav/items'
import { NavToggleList } from './NavToggleList'

export const metadata: Metadata = { title: 'Site Navigation — Admin' }
export const dynamic  = 'force-dynamic'

export default function NavigationAdminPage() {
  // Match the standard admin page chrome — flex-1 overflow-y-auto at
  // the top level. The admin layout uses overflow-hidden on its <main>
  // shell, so every page has to provide its own scroll container or
  // long content just clips at the viewport.
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16">
      <div className="max-w-[1000px] mx-auto space-y-6">
        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <NavIcon className="h-5 w-5 text-portal-blue" />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Site Navigation</h1>
          </div>
          <p className="text-sm text-gray-500 max-w-2xl">
            Show or hide individual links in the public site&apos;s header and
            footer. Hidden items disappear from every public page within ~30
            seconds — handy for launch week when some destinations aren&apos;t
            live yet. To rename, reorder, or add new items, edit{' '}
            <code className="bg-gray-100 px-1 rounded">src/lib/site-nav/items.ts</code>{' '}
            and redeploy.
          </p>
        </header>

        <NavToggleList catalog={NAV_CATALOG} />
      </div>
    </div>
  )
}
