// /renew/[token] — public subscription-mode Stripe Checkout for ad
// placement renewals. The publisher generates a renewal token via the
// admin placement editor and emails it to the advertiser; the advertiser
// clicks to authorize a monthly/quarterly/annual subscription. Stripe
// Customer Portal handles changes + cancellations after that — we just
// mirror state via the webhook.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { RenewButton } from './RenewButton'

export const metadata: Metadata = {
  title: 'Renew your ad placement',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

interface Props {
  params:       Promise<{ token: string }>
  searchParams: Promise<{ success?: string; canceled?: string }>
}

interface PlacementRow {
  id:                       string
  placement_type:           string
  context_type:             string | null
  context_slug:             string | null
  ad_headline:              string | null
  advertiser_account_id:    string | null
  stripe_subscription_id:   string | null
  subscription_status:      string | null
  subscription_period_end:  string | null
}

interface ProductRow {
  id:                  string
  stripe_price_id:     string
  price_cents:         number
  interval:            string | null
  display_name:        string
  display_description: string | null
}

interface AdvertiserRow {
  business_name: string
  contact_name:  string | null
  contact_email: string | null
}

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export default async function RenewalPage({ params, searchParams }: Props) {
  const { token } = await params
  const { success: successFlag } = await searchParams
  const sb = supabaseAdmin()

  // Look the placement up by renewal token. Index is partial-unique so the
  // lookup is a simple eq.
  const { data: pData } = await sb
    .from('ad_placements')
    .select('id, placement_type, context_type, context_slug, ad_headline, advertiser_account_id, stripe_subscription_id, subscription_status, subscription_period_end')
    .eq('renewal_token', token)
    .maybeSingle()
  const placement = pData as PlacementRow | null
  if (!placement) notFound()

  // Resolve the subscription-mode product for this placement. The publisher
  // creates this via the admin Stripe page (target_table='ad_placements',
  // target_id=<placement.id>, kind='ad_placement', interval='month' etc.).
  const { data: prodData } = await sb
    .from('stripe_products')
    .select('id, stripe_price_id, price_cents, interval, display_name, display_description')
    .eq('target_table', 'ad_placements')
    .eq('target_id', placement.id)
    .eq('is_active', true)
    .not('interval', 'is', null)
    .maybeSingle()
  const product = prodData as ProductRow | null

  // Advertiser context — pre-fills email in Stripe Checkout when available.
  let advertiser: AdvertiserRow | null = null
  if (placement.advertiser_account_id) {
    const { data } = await sb
      .from('advertiser_accounts')
      .select('business_name, contact_name, contact_email')
      .eq('id', placement.advertiser_account_id)
      .maybeSingle()
    advertiser = (data as AdvertiserRow | null) ?? null
  }

  // Success branch: Stripe redirected back with ?success=1. Show a thanks
  // page while the webhook catches up.
  if (successFlag) {
    return (
      <Shell>
        <h1 className="text-3xl font-bold text-portal-text mb-3">Thanks — your subscription is active.</h1>
        <p className="text-portal-sub leading-relaxed">
          Your card will be charged at the renewal date and your placement stays live as long as the subscription is active.
          Manage or cancel anytime from the Stripe portal in your confirmation email.
        </p>
      </Shell>
    )
  }

  if (placement.stripe_subscription_id && placement.subscription_status === 'active') {
    return (
      <Shell>
        <h1 className="text-3xl font-bold text-portal-text mb-3">You&apos;re already subscribed.</h1>
        <p className="text-portal-sub leading-relaxed">
          Subscription status: <strong>{placement.subscription_status}</strong>
          {placement.subscription_period_end && (
            <> · next renewal {new Date(placement.subscription_period_end).toLocaleDateString()}</>
          )}
        </p>
        <p className="text-portal-sub mt-3">
          To make changes, reach out and we&apos;ll send you a Stripe Customer Portal link.
        </p>
      </Shell>
    )
  }

  if (!product) {
    return (
      <Shell>
        <h1 className="text-3xl font-bold text-portal-text mb-3">Almost ready.</h1>
        <p className="text-portal-sub">We&apos;re finalizing the subscription product for this placement. Reach out and we&apos;ll send a working link.</p>
      </Shell>
    )
  }

  return (
    <Shell>
      <p className="text-[11px] uppercase tracking-widest text-portal-blue font-bold mb-2">Renewal · monthly subscription</p>
      <h1 className="text-3xl sm:text-4xl font-bold text-portal-text leading-tight">{product.display_name}</h1>
      {advertiser?.business_name && (
        <p className="text-portal-sub mt-1">For {advertiser.business_name}</p>
      )}
      {product.display_description && (
        <p className="text-portal-sub text-base mt-3 leading-relaxed">{product.display_description}</p>
      )}

      <div className="mt-6 bg-white border border-portal-border rounded-lg p-5">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-portal-text">${(product.price_cents / 100).toFixed(0)}</span>
          <span className="text-portal-sub">/ {product.interval}</span>
        </div>
        <p className="text-[11px] text-portal-muted mt-1">
          Auto-renews each {product.interval}. Cancel anytime from the Stripe Customer Portal.
        </p>
        <div className="mt-4">
          <RenewButton
            token={token}
            productId={product.id}
            placementId={placement.id}
            customerEmail={advertiser?.contact_email ?? undefined}
          />
        </div>
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
