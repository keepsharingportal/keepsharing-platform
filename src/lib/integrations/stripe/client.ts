// Stripe API client — thin wrapper around the REST endpoints we actually
// use, so we don't pull the heavyweight Stripe SDK into Next.js server
// bundles (~150KB shipped).
//
// What we wrap:
//   - products + prices (create/list)
//   - checkout sessions (create)
//   - webhook signature verification (HMAC-SHA256)
//
// Auth: per-call secret_key from stripe_integrations.secret_key. Reads
// fresh on each request — supports admin key rotation without redeploy.

import { createHmac, timingSafeEqual } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export class StripeApiError extends Error {
  constructor(public status: number, message: string, public stripeCode?: string) {
    super(message)
    this.name = 'StripeApiError'
  }
}

const STRIPE_API = 'https://api.stripe.com/v1'

interface StripeRow {
  id:                     string
  secret_key:             string
  publishable_key:        string
  is_test_mode:           boolean
  is_active:              boolean
  webhook_signing_secret: string | null
}

function adminDb(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

export async function loadStripe(): Promise<StripeRow | null> {
  const db = adminDb()
  try {
    const { data, error } = await db
      .from('stripe_integrations')
      .select('id, secret_key, publishable_key, is_test_mode, is_active, webhook_signing_secret')
      .eq('is_active', true)
      .maybeSingle()
    if (error) {
      // Pre-migration fall through to env-var keys so existing webhooks keep working.
      if (/relation .* does not exist/i.test(error.message)) return envFallback()
      return envFallback()
    }
    return (data as StripeRow | null) ?? envFallback()
  } catch {
    return envFallback()
  }
}

/** Env-var fallback row — used when no integration is connected yet. The
 *  webhook + admin probes can keep working with the legacy STRIPE_SECRET_KEY +
 *  STRIPE_WEBHOOK_SECRET env vars that the existing app already reads. */
function envFallback(): StripeRow | null {
  const secret_key      = process.env.STRIPE_SECRET_KEY
  const publishable_key = process.env.STRIPE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!secret_key) return null
  return {
    id:                     'env',
    secret_key,
    publishable_key:        publishable_key ?? '',
    is_test_mode:           secret_key.startsWith('sk_test_'),
    is_active:              true,
    webhook_signing_secret: process.env.STRIPE_WEBHOOK_SECRET ?? null,
  }
}

async function stripeFetch(path: string, secretKey: string, init: RequestInit & { form?: Record<string, string | undefined> } = {}): Promise<unknown> {
  const { form, headers, ...rest } = init
  const body = form
    ? new URLSearchParams(
        Object.entries(form).flatMap(([k, v]) => v === undefined ? [] : [[k, String(v)]]) as Array<[string, string]>,
      ).toString()
    : init.body
  const res = await fetch(`${STRIPE_API}${path}`, {
    ...rest,
    headers: {
      'authorization': `Bearer ${secretKey}`,
      ...(form ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
      ...headers,
    },
    body,
  })
  const text = await res.text()
  let json: unknown = null
  try { json = text ? JSON.parse(text) : null } catch { /* leave null */ }
  if (!res.ok) {
    const obj = json as { error?: { message?: string; code?: string } } | null
    const msg = obj?.error?.message ?? text.slice(0, 300) ?? `HTTP ${res.status}`
    throw new StripeApiError(res.status, msg, obj?.error?.code)
  }
  return json
}

// ─── Account ──────────────────────────────────────────────────────────────

export async function fetchAccount(secretKey: string): Promise<{ id: string; business_profile?: { name?: string }; settings?: { dashboard?: { display_name?: string } } }> {
  const json = await stripeFetch('/account', secretKey, { method: 'GET' })
  return json as { id: string; business_profile?: { name?: string }; settings?: { dashboard?: { display_name?: string } } }
}

// ─── Products + prices ────────────────────────────────────────────────────

export interface CreateProductInput {
  name:           string
  description?:   string
  priceCents:     number
  currency:       string
  interval?:      'month' | 'year' | null
}

export async function createProductWithPrice(secretKey: string, input: CreateProductInput): Promise<{ productId: string; priceId: string }> {
  const product = await stripeFetch('/products', secretKey, {
    method: 'POST',
    form: { name: input.name, description: input.description },
  }) as { id: string }

  const priceForm: Record<string, string | undefined> = {
    product:      product.id,
    unit_amount:  String(input.priceCents),
    currency:     input.currency,
  }
  if (input.interval) {
    priceForm['recurring[interval]'] = input.interval
  }
  const price = await stripeFetch('/prices', secretKey, { method: 'POST', form: priceForm }) as { id: string }
  return { productId: product.id, priceId: price.id }
}

// ─── Checkout sessions ────────────────────────────────────────────────────

export interface CreateCheckoutSessionInput {
  priceId:         string
  mode:            'payment' | 'subscription'
  successUrl:      string
  cancelUrl:       string
  customerEmail?:  string
  metadata?:       Record<string, string>
}

export async function createCheckoutSession(secretKey: string, input: CreateCheckoutSessionInput): Promise<{ id: string; url: string }> {
  const form: Record<string, string | undefined> = {
    'mode':                                  input.mode,
    'line_items[0][price]':                  input.priceId,
    'line_items[0][quantity]':               '1',
    'success_url':                           input.successUrl,
    'cancel_url':                            input.cancelUrl,
    'allow_promotion_codes':                 'true',
  }
  if (input.customerEmail) form.customer_email = input.customerEmail
  if (input.metadata) {
    for (const [k, v] of Object.entries(input.metadata)) {
      form[`metadata[${k}]`] = v
    }
  }
  const session = await stripeFetch('/checkout/sessions', secretKey, { method: 'POST', form }) as { id: string; url: string }
  return { id: session.id, url: session.url }
}

// ─── Webhook signature verification ───────────────────────────────────────

/** Verify the t= timestamp + v1= signature in a Stripe-Signature header.
 *  Returns the parsed event payload, or throws StripeApiError(400, ...). */
export function verifyWebhookSignature(payload: string, signatureHeader: string, signingSecret: string, toleranceSeconds: number = 300): unknown {
  // Header format: "t=TS,v1=SIG[,v0=SIG]"
  const parts = signatureHeader.split(',').map(p => p.trim())
  let ts: string | null = null
  const v1Sigs: string[] = []
  for (const p of parts) {
    const [k, v] = p.split('=', 2)
    if (k === 't') ts = v
    if (k === 'v1') v1Sigs.push(v)
  }
  if (!ts || v1Sigs.length === 0) throw new StripeApiError(400, 'Malformed Stripe-Signature header')

  const tsNum = Number(ts)
  if (!Number.isFinite(tsNum)) throw new StripeApiError(400, 'Bad timestamp in Stripe-Signature')
  const age = Math.floor(Date.now() / 1000) - tsNum
  if (Math.abs(age) > toleranceSeconds) throw new StripeApiError(400, `Stale Stripe-Signature (age=${age}s)`)

  const signed = `${ts}.${payload}`
  const expected = createHmac('sha256', signingSecret).update(signed).digest('hex')
  const matches = v1Sigs.some(sig => {
    if (sig.length !== expected.length) return false
    try { return timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) } catch { return false }
  })
  if (!matches) throw new StripeApiError(400, 'Stripe signature mismatch')

  try { return JSON.parse(payload) } catch { throw new StripeApiError(400, 'Webhook payload is not JSON') }
}
