// /distribution/[market]/driver/run — Full Run combined checklist.
//
// For drivers assigned to multiple routes, this view merges every assigned
// route's stops into one continuous list (in route order). A single
// Submit-All button at the bottom fires all drafts at once. Auth-gated
// the same way /driver is.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Navigation as NavIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ALL_MARKET_SLUGS, marketDisplayName } from '@/lib/markets'
import { FullRunPortal } from './FullRunPortal'

export const dynamic = 'force-dynamic'

interface PageProps { params: Promise<{ market: string }> }

export async function generateMetadata({ params }: PageProps) {
  const { market } = await params
  if (!ALL_MARKET_SLUGS.includes(market)) return {}
  return { title: `Full Run — ${marketDisplayName(market)}` }
}

export default async function FullRunPage({ params }: PageProps) {
  const { market } = await params
  if (!ALL_MARKET_SLUGS.includes(market)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return <Centered>
      <p className="text-sm text-gray-600 mb-3">Sign in to see your route.</p>
      <Link
        href={`/login?next=${encodeURIComponent(`/distribution/${market}/driver/run`)}`}
        className="inline-flex items-center gap-1.5 text-sm px-4 py-2 bg-primary text-primary-foreground rounded-full font-semibold"
      >
        Sign in
      </Link>
    </Centered>
  }

  const admin = createAdminClient()
  const { data: drv } = await admin
    .from('circulation_drivers')
    .select('user_id, market, full_name, active')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!drv || !drv.active || drv.market !== market) {
    return <Centered>
      <p className="text-sm text-gray-600">This account isn&apos;t a driver for {marketDisplayName(market)}.</p>
    </Centered>
  }

  return <FullRunPortal market={market} driverName={drv.full_name} />
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background public-page flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 text-center shadow-sm">
        <NavIcon className="h-8 w-8 text-primary mx-auto mb-3" />
        {children}
      </div>
    </div>
  )
}
