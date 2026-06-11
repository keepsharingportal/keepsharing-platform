// ── /admin/integrations/stripe ──────────────────────────────────────────────
// Stripe setup + product catalog + recent activity. Lives alongside the
// existing /api/webhooks/stripe handler which routes the legacy per-meta
// flows (birthday spotlight, ad booking, etc.). This page surfaces the
// new generic mirror tables (151) so admins can manage products + see
// recurring revenue at a glance.

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, CreditCard, AlertCircle } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { StripeClient } from './StripeClient'

export const metadata: Metadata = { title: 'Stripe — Admin' }
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export interface StripeIntegrationRow {
  id:                     string
  account_id:             string | null
  account_name:           string | null
  publishable_key:        string
  webhook_signing_secret: string | null
  is_test_mode:           boolean
  is_active:              boolean
  last_webhook_at:        string | null
  connected_at:           string
}

export interface StripeProductRow {
  id:                  string
  stripe_product_id:   string
  stripe_price_id:     string
  kind:                'ad_placement' | 'featured_upgrade' | 'sponsor_tier' | 'event_listing' | 'one_time'
  display_name:        string
  display_description: string | null
  price_cents:         number
  interval:            string | null
  is_active:           boolean
  created_at:          string
}

export interface StripeSubscriptionRow {
  id:                       string
  stripe_subscription_id:   string
  advertiser_account_id:    string | null
  status:                   string
  current_period_end:       string | null
  updated_at:               string
}

export interface StripeChargeRow {
  id:                     string
  stripe_charge_id:       string
  amount_cents:           number
  currency:               string
  status:                 string
  description:            string | null
  occurred_at:            string
  advertiser_account_id:  string | null
}

export default async function StripePage() {
  const sb = supabaseAdmin()
  const envFallbackOk = !!process.env.STRIPE_SECRET_KEY

  let migrated = true
  let row: StripeIntegrationRow | null = null
  let products: StripeProductRow[] = []
  let subscriptions: StripeSubscriptionRow[] = []
  let charges: StripeChargeRow[] = []
  let mtdRevenueCents = 0

  try {
    const probe = await sb.from('stripe_integrations').select('id').limit(1)
    if (probe.error && /relation .* does not exist/i.test(probe.error.message)) {
      migrated = false
    } else if (!probe.error) {
      const { data: rData } = await sb.from('stripe_integrations').select('*').eq('is_active', true).maybeSingle()
      row = (rData as StripeIntegrationRow | null) ?? null

      const { data: pData } = await sb.from('stripe_products').select('*').order('created_at', { ascending: false }).limit(50)
      products = (pData ?? []) as StripeProductRow[]

      const { data: sData } = await sb.from('stripe_subscriptions').select('*').order('updated_at', { ascending: false }).limit(20)
      subscriptions = (sData ?? []) as StripeSubscriptionRow[]

      const { data: cData } = await sb.from('stripe_charges_log').select('*').order('occurred_at', { ascending: false }).limit(20)
      charges = (cData ?? []) as StripeChargeRow[]

      // Month-to-date revenue (succeeded charges).
      const since = new Date(); since.setUTCDate(1); since.setUTCHours(0, 0, 0, 0)
      const { data: mtd } = await sb
        .from('stripe_charges_log')
        .select('amount_cents')
        .eq('status', 'succeeded')
        .gte('occurred_at', since.toISOString())
      for (const r of (mtd ?? []) as Array<{ amount_cents: number }>) mtdRevenueCents += r.amount_cents
    }
  } catch { /* fall through */ }

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href="/admin/integrations" className="inline-flex items-center gap-1 text-[11px] text-portal-blue hover:text-portal-blue-dk mb-1">
          <ArrowLeft size={11} /> Integrations
        </Link>
        <h1 className="portal-page-title">Stripe</h1>
        <p className="portal-page-subtitle">
          Self-serve checkout, recurring subscriptions, charge log. Lives alongside the existing per-product flows (birthday spotlight, ad booking, etc.).
        </p>
      </div>

      <div className="p-6 max-w-5xl space-y-6">
        {!migrated && (
          <div className="bg-portal-amber-lt border border-portal-amber/30 rounded-lg p-4 text-portal-text text-xs">
            <strong>Migration 151 pending.</strong> Apply <code className="bg-white px-1 py-0.5 rounded border border-portal-border">supabase/migrations/151_stripe.sql</code> to enable the products catalog + subscription mirror.
          </div>
        )}

        {migrated && !row && envFallbackOk && (
          <div className="bg-portal-blue-lt border border-portal-blue/30 rounded-lg p-4 text-portal-text text-xs leading-relaxed">
            <strong>Env-var keys detected.</strong> The legacy webhook flow is working with <code className="bg-white px-1 py-0.5 rounded border border-portal-border">STRIPE_SECRET_KEY</code> + <code className="bg-white px-1 py-0.5 rounded border border-portal-border">STRIPE_WEBHOOK_SECRET</code> from env. Connect via the form below to enable the products catalog, subscription mirror, and key rotation through this page.
          </div>
        )}

        {migrated && (
          <StripeClient
            row={row}
            products={products}
            subscriptions={subscriptions}
            charges={charges}
            mtdRevenueCents={mtdRevenueCents}
          />
        )}

        {migrated && (
          <div className="bg-white border border-portal-border rounded-lg p-5 text-xs text-portal-sub leading-relaxed">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard size={14} className="text-portal-blue" />
              <h3 className="text-sm font-bold text-portal-text">Webhook endpoint</h3>
            </div>
            <p>Set Stripe webhook destination to:</p>
            <code className="block bg-portal-bg px-2 py-1.5 rounded border border-portal-border mt-1 text-[11px]">https://riverregionparents.com/api/webhooks/stripe</code>
            <p className="mt-2">Events to enable: <code className="bg-portal-bg px-1 rounded">checkout.session.completed</code>, <code className="bg-portal-bg px-1 rounded">customer.subscription.*</code>, <code className="bg-portal-bg px-1 rounded">charge.succeeded</code>, <code className="bg-portal-bg px-1 rounded">charge.failed</code>, <code className="bg-portal-bg px-1 rounded">charge.refunded</code>, <code className="bg-portal-bg px-1 rounded">invoice.payment_failed</code>.</p>
          </div>
        )}
      </div>
    </div>
  )
}
