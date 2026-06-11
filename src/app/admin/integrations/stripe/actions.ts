'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { recordAuditEvent } from '@/lib/admin/audit'
import { fetchAccount, createProductWithPrice, StripeApiError } from '@/lib/integrations/stripe/client'

interface ConnectInput {
  secretKey:             string
  publishableKey:        string
  webhookSigningSecret:  string
  isTestMode:            boolean
}

export async function connectStripeAction(input: ConnectInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  if (!input.secretKey || (!input.secretKey.startsWith('sk_test_') && !input.secretKey.startsWith('sk_live_'))) {
    return { ok: false, error: 'Secret key must start with sk_test_ or sk_live_.' }
  }
  if (!input.publishableKey || (!input.publishableKey.startsWith('pk_test_') && !input.publishableKey.startsWith('pk_live_'))) {
    return { ok: false, error: 'Publishable key must start with pk_test_ or pk_live_.' }
  }
  const testKey = input.secretKey.startsWith('sk_test_')
  if (testKey !== input.isTestMode) {
    return { ok: false, error: testKey ? 'sk_test_ key requires test mode ON.' : 'sk_live_ key requires test mode OFF.' }
  }

  // Validate the key by fetching account info from Stripe.
  let accountId: string
  let accountName: string | null
  try {
    const acct = await fetchAccount(input.secretKey)
    accountId   = acct.id
    accountName = acct.settings?.dashboard?.display_name ?? acct.business_profile?.name ?? null
  } catch (e) {
    return { ok: false, error: e instanceof StripeApiError ? `Stripe rejected key: ${e.message}` : String(e) }
  }

  const sr = createAdminClient()
  // Deactivate any prior row first (partial unique index allows only one is_active=true).
  await sr.from('stripe_integrations').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000')
  const { error } = await sr.from('stripe_integrations').insert({
    account_id:             accountId,
    account_name:           accountName,
    secret_key:             input.secretKey,
    publishable_key:        input.publishableKey,
    webhook_signing_secret: input.webhookSigningSecret || null,
    is_test_mode:           input.isTestMode,
    is_active:              true,
    connected_at:           new Date().toISOString(),
    connected_by:           ctx.adminId,
  })
  if (error) return { ok: false, error: error.message }

  await recordAuditEvent({
    ctx,
    action:       'stripe.connected',
    target_table: 'stripe_integrations',
    target_id:    accountId,
    after:        { account_id: accountId, account_name: accountName, is_test_mode: input.isTestMode },
  })
  revalidatePath('/admin/integrations/stripe')
  revalidatePath('/admin/integrations')
  return { ok: true }
}

export async function disconnectStripeAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  const sr = createAdminClient()
  const { error } = await sr.from('stripe_integrations').update({ is_active: false }).eq('is_active', true)
  if (error) return { ok: false, error: error.message }
  await recordAuditEvent({
    ctx,
    action:       'stripe.disconnected',
    target_table: 'stripe_integrations',
    target_id:    'active',
    before:       { is_active: true },
  })
  revalidatePath('/admin/integrations/stripe')
  revalidatePath('/admin/integrations')
  return { ok: true }
}

interface CreateProductInput {
  kind:                'ad_placement' | 'featured_upgrade' | 'sponsor_tier' | 'event_listing' | 'one_time'
  displayName:        string
  displayDescription?: string
  priceCents:         number
  interval?:          'month' | 'year' | null
  /** When kind='ad_placement', this should be an ad_placements.id so the
   *  webhook knows which spot to activate on checkout completion. */
  targetTable?:       'ad_placements' | 'advertiser_packages' | 'calendar_events'
  targetId?:          string
}

export async function createStripeProductAction(input: CreateProductInput): Promise<{ ok: true; productId: string } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  const sr = createAdminClient()
  const { data: integration } = await sr
    .from('stripe_integrations')
    .select('secret_key')
    .eq('is_active', true)
    .maybeSingle()
  const stripe = integration as { secret_key: string } | null
  if (!stripe) return { ok: false, error: 'No active Stripe integration. Connect one first.' }
  if (input.priceCents <= 0) return { ok: false, error: 'Price must be greater than zero.' }

  // Validate the target row actually exists before minting the Stripe
  // product. Without this check, a typo'd UUID in target_id silently
  // breaks the webhook side-effect (claim_spot can't activate a missing
  // placement) and we'd only find out when a customer paid and got
  // nothing. The same target_table / target_id pair powers the
  // /claim/[id] public flow, so the validation is load-bearing.
  if (input.targetTable && input.targetId) {
    const allowedTables: Array<NonNullable<CreateProductInput['targetTable']>> = [
      'ad_placements', 'advertiser_packages', 'calendar_events',
    ]
    if (!allowedTables.includes(input.targetTable)) {
      return { ok: false, error: `Unsupported target_table: ${input.targetTable}` }
    }
    const { data: existing, error: lookupErr } = await sr
      .from(input.targetTable)
      .select('id')
      .eq('id', input.targetId)
      .maybeSingle()
    if (lookupErr) return { ok: false, error: `Could not verify target: ${lookupErr.message}` }
    if (!existing) {
      return { ok: false, error: `No ${input.targetTable} row with id ${input.targetId}. Double-check the UUID — a typo here silently breaks the checkout webhook.` }
    }
  }
  if (input.kind === 'ad_placement' && (!input.targetTable || !input.targetId)) {
    return { ok: false, error: 'Ad-placement products require a target row so the webhook can activate the spot on checkout completion.' }
  }

  // Create the product + price in Stripe.
  let productId: string, priceId: string
  try {
    const result = await createProductWithPrice(stripe.secret_key, {
      name:        input.displayName,
      description: input.displayDescription,
      priceCents:  input.priceCents,
      currency:    'usd',
      interval:    input.interval ?? null,
    })
    productId = result.productId
    priceId   = result.priceId
  } catch (e) {
    return { ok: false, error: e instanceof StripeApiError ? `Stripe: ${e.message}` : String(e) }
  }

  const { data: row, error } = await sr.from('stripe_products').insert({
    stripe_product_id:    productId,
    stripe_price_id:      priceId,
    kind:                 input.kind,
    target_table:         input.targetTable ?? null,
    target_id:            input.targetId ?? null,
    display_name:         input.displayName,
    display_description:  input.displayDescription ?? null,
    price_cents:          input.priceCents,
    currency:             'usd',
    interval:             input.interval ?? null,
    is_active:            true,
    created_by:           ctx.adminId,
  }).select('id').single()
  if (error) return { ok: false, error: error.message }

  await recordAuditEvent({
    ctx,
    action:       'stripe.product_created',
    target_table: 'stripe_products',
    target_id:    (row as { id: string }).id,
    after:        { kind: input.kind, display_name: input.displayName, price_cents: input.priceCents },
  })
  revalidatePath('/admin/integrations/stripe')
  return { ok: true, productId }
}

export async function deactivateStripeProductAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdmin()
  const sr = createAdminClient()
  const { error } = await sr.from('stripe_products').update({ is_active: false }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  await recordAuditEvent({
    ctx,
    action:       'stripe.product_deactivated',
    target_table: 'stripe_products',
    target_id:    id,
  })
  revalidatePath('/admin/integrations/stripe')
  return { ok: true }
}
