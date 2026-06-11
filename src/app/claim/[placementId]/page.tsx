// ── /claim/[placementId] ────────────────────────────────────────────────────
// Public "Claim This Spot" landing page. Looks up an unclaimed ad
// placement + its associated stripe_products row, surfaces the pitch, and
// hands off to Stripe Checkout via /api/claim/[placementId]/checkout.
//
// Flow:
//   1. Editorial creates a placeholder ad_placements row (advertiser_account_id NULL).
//   2. Editorial creates a stripe_products row (kind='ad_placement',
//      target_table='ad_placements', target_id=<placement.id>).
//   3. The spot's "Claim This Spot" button on the public site links here.
//   4. Visitor clicks "Claim it" → Stripe Checkout.
//   5. Webhook handler activates the placement + captures their email.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { ClaimSpotButton } from './ClaimSpotButton'

export const metadata: Metadata = { title: 'Claim this spot — RRP' }
export const dynamic = 'force-dynamic'

interface Props {
  params:       Promise<{ placementId: string }>
  searchParams: Promise<{ success?: string; canceled?: string }>
}

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

interface PlacementRow {
  id:                    string
  placement_type:        string
  context_type:          string | null
  context_slug:          string | null
  advertiser_account_id: string | null
  is_active:             boolean
  claimed_at:            string | null
}

interface ProductRow {
  id:                   string
  display_name:         string
  display_description:  string | null
  price_cents:          number
  interval:             string | null
  is_active:            boolean
}

export default async function ClaimSpotPage({ params, searchParams }: Props) {
  const { placementId } = await params
  const { success: successFlag } = await searchParams
  const sb = supabaseAdmin()

  const { data: pData } = await sb
    .from('ad_placements')
    .select('id, placement_type, context_type, context_slug, advertiser_account_id, is_active, claimed_at')
    .eq('id', placementId)
    .maybeSingle()
  const placement = pData as PlacementRow | null
  if (!placement) notFound()

  // Stripe redirects to ?success=1 immediately on payment, but the webhook
  // that flips advertiser_account_id / claimed_at may be 1-5 seconds behind.
  // When that race happens, the old code rendered "This spot is taken" right
  // after the customer paid — which reads as a duplicate-charge anxiety
  // moment. Now we explicitly handle the success case: if the URL says
  // success and the DB hasn't caught up, we show a "Thanks, we're activating
  // this" page that polls itself until the webhook lands.
  if (successFlag) {
    return <SuccessLanding placementId={placementId} alreadyClaimed={!!(placement.advertiser_account_id || placement.claimed_at)} />
  }

  // Already claimed (no success flag → this is someone else hitting the URL).
  if (placement.advertiser_account_id || placement.claimed_at) {
    return (
      <Shell>
        <h1 className="text-3xl font-bold text-portal-text mb-3">This spot is taken.</h1>
        <p className="text-portal-sub leading-relaxed">
          Someone beat you to it. Reach out and we&apos;ll find you another spot that fits.
        </p>
        <p className="mt-4">
          <a href="mailto:hello@riverregionparents.com" className="text-portal-blue hover:underline font-bold">
            hello@riverregionparents.com
          </a>
        </p>
      </Shell>
    )
  }

  const { data: prodData } = await sb
    .from('stripe_products')
    .select('id, display_name, display_description, price_cents, interval, is_active')
    .eq('target_table', 'ad_placements')
    .eq('target_id', placementId)
    .eq('is_active', true)
    .maybeSingle()
  const product = prodData as ProductRow | null
  if (!product) {
    return (
      <Shell>
        <h1 className="text-3xl font-bold text-portal-text mb-3">Almost ready.</h1>
        <p className="text-portal-sub leading-relaxed">
          We&apos;re still wiring this spot up. Drop us a line and we&apos;ll get it activated for you.
        </p>
        <p className="mt-4">
          <a href="mailto:hello@riverregionparents.com" className="text-portal-blue hover:underline font-bold">
            hello@riverregionparents.com
          </a>
        </p>
      </Shell>
    )
  }

  return (
    <Shell>
      <p className="text-[11px] uppercase tracking-widest text-portal-blue font-bold mb-2">River Region Parents · Available spot</p>
      <h1 className="text-3xl sm:text-4xl font-bold text-portal-text leading-tight">{product.display_name}</h1>
      {product.display_description && (
        <p className="text-portal-sub text-base mt-3 leading-relaxed">{product.display_description}</p>
      )}

      <div className="mt-6 bg-white border border-portal-border rounded-lg p-5">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-portal-text">${(product.price_cents / 100).toFixed(0)}</span>
          <span className="text-portal-sub">{product.interval ? `/ ${product.interval}` : 'one-time'}</span>
        </div>
        {placement.context_type && placement.context_slug && (
          <p className="text-[11px] text-portal-muted mt-1">
            Placement: {placement.placement_type} · {placement.context_type} / {placement.context_slug}
          </p>
        )}
        <div className="mt-4">
          <ClaimSpotButton placementId={placement.id} productId={product.id} />
        </div>
        <p className="text-[11px] text-portal-muted mt-3">
          Secure checkout via Stripe. You&apos;ll add the creative + dial in copy with our team after checkout.
        </p>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-portal-bg">
      <div className="max-w-2xl mx-auto px-6 py-12">{children}</div>
    </main>
  )
}

import { ClaimSuccessPoller } from './ClaimSuccessPoller'

function SuccessLanding({ placementId, alreadyClaimed }: { placementId: string; alreadyClaimed: boolean }) {
  return (
    <Shell>
      <p className="text-[11px] uppercase tracking-widest text-portal-green font-bold mb-2">River Region Parents</p>
      <h1 className="text-3xl sm:text-4xl font-bold text-portal-text leading-tight">Thanks — your payment came through.</h1>
      <p className="text-portal-sub text-base mt-3 leading-relaxed">
        We&apos;re activating your spot now. You&apos;ll see it live within a few minutes. We&apos;ll email you with next steps
        on the creative and copy.
      </p>
      {/* Optimistic state for the race between Stripe's redirect and the
          webhook. The poller refreshes every 3s for up to 30s; once the DB
          shows claimed_at, the page is in a stable state. */}
      {!alreadyClaimed && <ClaimSuccessPoller placementId={placementId} />}
      <p className="mt-6 text-[11px] text-portal-muted">
        Need help right now? <a href="mailto:hello@riverregionparents.com" className="text-portal-blue hover:underline">hello@riverregionparents.com</a>
      </p>
    </Shell>
  )
}
