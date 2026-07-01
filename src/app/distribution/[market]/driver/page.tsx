// /distribution/[market]/driver — driver entry point.
//
// Routing:
//   ?route=<id>  → renders the per-route checklist (DriverPortal)
//   (no route)   → redirects to /distribution/[market]/driver/dashboard
//                  so drivers land on their My Routes overview first
//
// This differs from v3 (which landed on the checklist directly) because
// the user wants Dashboard as the login landing so drivers see stats,
// invoice history, and can pick a route before diving in.

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Navigation as NavIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ALL_MARKET_SLUGS, marketDisplayName } from '@/lib/markets'
import { DriverPortal } from './DriverPortal'

export const dynamic = 'force-dynamic'

interface PageProps {
  params:       Promise<{ market: string }>
  searchParams: Promise<{ route?: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { market } = await params
  if (!ALL_MARKET_SLUGS.includes(market)) return {}
  return {
    title: `${marketDisplayName(market)} — Driver Portal`,
  }
}

export default async function DriverPortalPage({ params, searchParams }: PageProps) {
  const { market } = await params
  const sp = await searchParams
  if (!ALL_MARKET_SLUGS.includes(market)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <LoggedOut market={market} />
  }

  // Look up the driver row server-side. We don't ship sensitive bits to
  // the client component — just full_name and market for chrome.
  const admin = createAdminClient()
  const { data: driverRow } = await admin
    .from('circulation_drivers')
    .select('user_id, market, full_name, active')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!driverRow || !driverRow.active) {
    return <NotADriver email={user.email ?? ''} market={market} />
  }
  if (driverRow.market !== market) {
    // Driver registered for a different brand — redirect them to the right one.
    return (
      <Centered>
        <p className="text-sm text-gray-600 mb-3">
          Your driver account is registered for <span className="font-semibold">{marketDisplayName(driverRow.market)}</span>.
        </p>
        <Link
          href={`/distribution/${driverRow.market}/driver`}
          className="inline-flex items-center gap-1.5 text-sm px-4 py-2 bg-primary text-primary-foreground rounded-full font-semibold"
        >
          Go to my portal
        </Link>
      </Centered>
    )
  }

  // Dashboard is the landing page. Only render the checklist when the
  // driver explicitly navigates to a specific route via ?route=<id>.
  const routeParam = sp.route?.trim()
  if (!routeParam) redirect(`/distribution/${market}/driver/dashboard`)

  return <DriverPortal market={market} driverName={driverRow.full_name} />
}

// ── Logged-out gate ──────────────────────────────────────────────────────────
function LoggedOut({ market }: { market: string }) {
  return (
    <Centered>
      <NavIcon className="h-8 w-8 text-primary mx-auto mb-3" />
      <h1 className="text-xl font-bold mb-2">{marketDisplayName(market)} Driver Portal</h1>
      <p className="text-sm text-gray-600 mb-5">Sign in to see your route and check off stops.</p>
      <Link
        href={`/distribution/login?next=${encodeURIComponent(`/distribution/${market}/driver`)}`}
        className="inline-flex items-center gap-1.5 text-sm px-5 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold"
      >
        Sign In
      </Link>
    </Centered>
  )
}

// ── Wrong account ────────────────────────────────────────────────────────────
function NotADriver({ email, market }: { email: string; market: string }) {
  return (
    <Centered>
      <p className="text-sm text-gray-700 mb-1">Signed in as <span className="font-semibold">{email}</span></p>
      <p className="text-sm text-gray-500 mb-5">
        This account isn&apos;t a driver for {marketDisplayName(market)}.<br />
        If this is a mistake, contact the distribution manager.
      </p>
      <Link href="/" className="text-xs text-blue-600 hover:underline">Back to site</Link>
    </Centered>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background public-page flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 text-center shadow-sm">
        {children}
      </div>
    </div>
  )
}
