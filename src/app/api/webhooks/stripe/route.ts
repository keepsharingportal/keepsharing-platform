import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { onSelfServeBookingComplete, upsertContact, addTag, triggerWorkflow } from '@/lib/ghl'
import { loadStripe } from '@/lib/integrations/stripe/client'

/** Resolve credentials per-request: integration row first (lets admin rotate
 *  the signing secret via /admin/integrations/stripe without redeploy),
 *  STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET env vars as fallback (legacy
 *  + pre-migration safety). */
async function resolveStripe(): Promise<{ stripe: Stripe; signingSecret: string } | null> {
  const integration = await loadStripe()
  const secretKey     = integration?.secret_key             ?? process.env.STRIPE_SECRET_KEY     ?? ''
  const signingSecret = integration?.webhook_signing_secret ?? process.env.STRIPE_WEBHOOK_SECRET ?? ''
  if (!secretKey || !signingSecret) return null
  return {
    stripe: new Stripe(secretKey, { apiVersion: '2026-04-22.dahlia' }),
    signingSecret,
  }
}

// ── Generic mirror handlers (migration 151) ─────────────────────────────────
// Run alongside the legacy per-meta routing below so subscriptions, charges,
// and the new generic stripe_checkout_sessions table stay in sync. All
// migration-tolerant: a relation-does-not-exist error here is silently
// swallowed so pre-151 environments don't see webhook 500s.

async function mirrorCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const sr = createAdminClient()
  try {
    // Mark the local session row complete + capture customer details.
    const { data } = await sr.from('stripe_checkout_sessions')
      .update({
        status:         'completed',
        completed_at:   new Date().toISOString(),
        customer_email: session.customer_details?.email ?? null,
        customer_name:  session.customer_details?.name  ?? null,
      })
      .eq('stripe_session_id', session.id)
      .select('source, target_table, target_id')
      .maybeSingle()
    const local = data as null | { source: string; target_table: string | null; target_id: string | null }
    if (!local) return

    // Source-specific side effects.
    if (local.source === 'claim_spot' && local.target_table === 'ad_placements' && local.target_id) {
      await sr.from('ad_placements').update({
        is_active:         true,
        claimed_email:     session.customer_details?.email ?? null,
        claimed_at:        new Date().toISOString(),
        stripe_session_id: session.id,
      }).eq('id', local.target_id)

      // Notify VA queue.
      await sr.from('notifications').insert({
        type:        'ad_placement_claimed',
        title:       'Ad spot claimed via Stripe',
        body:        `${session.customer_details?.email ?? '(no email)'} claimed an open ad spot. Onboard them.`,
        urgency:     'incoming',
        publication: 'RRP',
        metadata:    { placement_id: local.target_id, session_id: session.id },
      }).then(() => undefined, () => undefined)
    }

    // Placement renewal (Phase 2 subscriptions, migration 168). The
    // customer.subscription.created event arrives separately and stamps
    // stripe_subscription_id; here we just notify the VA so they can
    // welcome the renewal and confirm creative is up to date.
    if (local.source === 'placement_renewal' && local.target_table === 'ad_placements' && local.target_id) {
      await sr.from('notifications').insert({
        type:        'ad_placement_renewed',
        title:       'Ad placement subscription activated',
        body:        `${session.customer_details?.email ?? '(no email)'} activated a monthly subscription. Confirm creative + next-month layout.`,
        urgency:     'incoming',
        publication: 'RRP',
        metadata:    { placement_id: local.target_id, session_id: session.id },
      }).then(() => undefined, () => undefined)
    }
  } catch { /* pre-migration; ignore */ }
}

async function mirrorSubscription(sub: Stripe.Subscription): Promise<void> {
  const sr = createAdminClient()
  try {
    const priceId = sub.items?.data?.[0]?.price?.id
    let productId: string | null = null
    if (priceId) {
      const { data } = await sr.from('stripe_products').select('id').eq('stripe_price_id', priceId).maybeSingle()
      productId = (data as { id: string } | null)?.id ?? null
    }
    const advertiserId = sub.metadata?.advertiser_account_id ?? null
    // The 2026 SDK shifted current_period_* / cancel_at to a wider shape;
    // read defensively via an indexed view so we work across versions.
    const ext = sub as unknown as { current_period_start?: number; current_period_end?: number; cancel_at?: number | null }
    await sr.from('stripe_subscriptions').upsert({
      stripe_subscription_id: sub.id,
      stripe_customer_id:     typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
      advertiser_account_id:  advertiserId,
      product_id:             productId,
      status:                 sub.status,
      current_period_start:   ext.current_period_start ? new Date(ext.current_period_start * 1000).toISOString().slice(0, 10) : null,
      current_period_end:     ext.current_period_end   ? new Date(ext.current_period_end   * 1000).toISOString().slice(0, 10) : null,
      cancel_at:              ext.cancel_at            ? new Date(ext.cancel_at            * 1000).toISOString().slice(0, 10) : null,
      canceled_at:            sub.canceled_at          ? new Date(sub.canceled_at          * 1000).toISOString() : null,
      updated_at:             new Date().toISOString(),
    }, { onConflict: 'stripe_subscription_id' })

    // Placement subscription mirror (Phase 2, migration 168). When the
    // subscription's metadata names a placement_id, write the live status
    // + period end + Stripe subscription id back to ad_placements so the
    // admin placement editor + the public /renew/<token> page can show
    // the correct state without hitting Stripe directly.
    const placementId = sub.metadata?.placement_id ?? null
    if (placementId) {
      try {
        const updates: Record<string, unknown> = {
          stripe_subscription_id:  sub.id,
          subscription_status:     sub.status,
          subscription_period_end: ext.current_period_end ? new Date(ext.current_period_end * 1000).toISOString().slice(0, 10) : null,
        }
        // On the initial activation, also flip is_active true + extend
        // ends_at so the placement renders live until the subscription
        // period ends.
        if (sub.status === 'active' || sub.status === 'trialing') {
          updates.is_active = true
          if (ext.current_period_end) {
            updates.ends_at = new Date(ext.current_period_end * 1000).toISOString()
          }
        }
        await sr.from('ad_placements').update(updates).eq('id', placementId)
      } catch { /* pre-migration; ignore */ }
    }
  } catch { /* pre-migration; ignore */ }
}

async function mirrorCharge(charge: Stripe.Charge, status: string): Promise<void> {
  const sr = createAdminClient()
  try {
    const advertiserId = (charge.metadata as Record<string, string> | null | undefined)?.advertiser_account_id ?? null
    const ext = charge as unknown as { invoice?: string | { id: string } | null }
    const invoiceId = typeof ext.invoice === 'string' ? ext.invoice : (ext.invoice?.id ?? null)
    await sr.from('stripe_charges_log').upsert({
      stripe_charge_id:      charge.id,
      stripe_invoice_id:     invoiceId,
      stripe_customer_id:    typeof charge.customer === 'string' ? charge.customer : (charge.customer?.id ?? ''),
      advertiser_account_id: advertiserId,
      amount_cents:          charge.amount ?? 0,
      currency:              charge.currency ?? 'usd',
      status,
      description:           charge.description ?? null,
      receipt_url:           charge.receipt_url ?? null,
      occurred_at:           new Date().toISOString(),
    }, { onConflict: 'stripe_charge_id' })
  } catch { /* pre-migration; ignore */ }
}

async function stampLastWebhook(): Promise<void> {
  const sr = createAdminClient()
  try {
    await sr.from('stripe_integrations').update({ last_webhook_at: new Date().toISOString() }).eq('is_active', true)
  } catch { /* pre-migration; ignore */ }
}

function fmt$(cents: number) { return '$' + ((cents ?? 0) / 100).toFixed(0) }

// ── Featured-listing provisioning ─────────────────────────────────
// Called from the checkout.session.completed handler when metadata
// type='featured_listing'. Find-or-create the advertiser_account,
// promote its guide_listings row to tier-1-featured-listing, mint
// an onboarding token, and email the wizard URL.
async function provisionFeaturedListing(input: {
  business_name:  string
  email:          string
  guide_slug:     string
  customerId:     string | null
  subscriptionId: string | null
}): Promise<void> {
  const { randomUUID } = await import('node:crypto')
  const { Resend } = await import('resend')
  const { slugifyForUrl } = await import('@/lib/articles/slug')

  if (!input.business_name || !input.email) {
    console.warn('[provisionFeaturedListing] missing business_name or email — skipping')
    return
  }

  const supabase = createAdminClient()

  // Find or create the advertiser_account
  const { data: existing } = await supabase
    .from('advertiser_accounts')
    .select('id')
    .ilike('business_name', input.business_name)
    .maybeSingle()

  let advertiserId: string
  if (existing) {
    advertiserId = existing.id
  } else {
    // Slug with collision handling
    const base = slugifyForUrl(input.business_name) || 'business'
    let slug = base
    for (let i = 1; i <= 50; i++) {
      const candidate = i === 1 ? base : `${base}-${i}`
      const { data: dupe } = await supabase.from('advertiser_accounts').select('id').eq('slug', candidate).maybeSingle()
      if (!dupe) { slug = candidate; break }
    }
    const { data: created, error } = await supabase
      .from('advertiser_accounts')
      .insert({
        business_name: input.business_name,
        slug,
        contact_email: input.email,
        is_active:     true,
      })
      .select('id').single()
    if (error || !created) {
      console.error('[provisionFeaturedListing] create failed:', error?.message)
      return
    }
    advertiserId = created.id
  }

  // Find or create the guide_listings row, promote to featured tier
  const { data: gl } = await supabase
    .from('guide_listings')
    .select('id')
    .eq('advertiser_account_id', advertiserId)
    .eq('guide_type_slug', input.guide_slug)
    .maybeSingle()
  if (gl) {
    await supabase.from('guide_listings').update({
      listing_tier: 'tier-1-featured-listing',
      is_published: true,
    }).eq('id', gl.id)
  } else {
    await supabase.from('guide_listings').insert({
      advertiser_account_id: advertiserId,
      guide_type_slug:       input.guide_slug,
      listing_tier:          'tier-1-featured-listing',
      is_published:          true,
      display_order:         0,
    })
  }

  // Mint onboarding token (1 year — matches the subscription window)
  const token     = randomUUID()
  const now       = new Date()
  const expiresAt = new Date(now.getTime() + 365 * 86_400_000)
  await supabase.from('advertiser_accounts').update({
    onboarding_token:            token,
    onboarding_token_issued_at:  now.toISOString(),
    onboarding_token_expires_at: expiresAt.toISOString(),
    onboarding_status:           'invited',
  }).eq('id', advertiserId)

  // Email the magic link
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[provisionFeaturedListing] RESEND_API_KEY missing — wizard link NOT emailed; admin must hand-deliver')
    return
  }
  const publicOrigin = process.env.NEXT_PUBLIC_PUBLIC_ORIGIN
                    ?? process.env.NEXT_PUBLIC_SITE_URL
                    ?? 'https://riverregionparents.com'
  const wizardUrl = `${publicOrigin}/advertise/edit/${token}?guide=${encodeURIComponent(input.guide_slug)}`
  try {
    await new Resend(apiKey).emails.send({
      from:    process.env.ADVERTISER_FROM_EMAIL ?? 'River Region Parents <hello@riverregionparents.com>',
      to:      input.email,
      subject: `Welcome aboard — your featured ${input.business_name} listing is ready`,
      html: `
        <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <h1 style="font-size:22px;color:#1a1a1a;margin:0 0 16px;">Welcome to River Region Parents!</h1>
          <p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 16px;">Your payment is confirmed — <strong>${input.business_name}</strong> is set up as a Featured Partner. Use the button below to open your private listing editor.</p>
          <p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 24px;">Fill out as many sections as you like; everything auto-saves. Come back any time using this same link.</p>
          <p style="text-align:center;margin:0 0 24px;">
            <a href="${wizardUrl}" style="display:inline-block;background:#ff7a59;color:#fff;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;font-size:15px;">Open Your Listing Editor</a>
          </p>
          <p style="font-size:13px;color:#666;line-height:1.6;margin:0 0 8px;">Or paste this URL into your browser:</p>
          <p style="font-size:12px;color:#888;word-break:break-all;background:#f7f7f7;padding:10px 12px;border-radius:6px;margin:0 0 24px;">${wizardUrl}</p>
          <p style="font-size:13px;color:#666;line-height:1.6;margin:0;">— River Region Parents</p>
        </div>
      `,
    })
  } catch (e) {
    console.error('[provisionFeaturedListing] Resend failed:', e)
  }
}

export async function POST(req: NextRequest) {
  const body      = await req.text()
  const sig       = req.headers.get('stripe-signature') ?? ''

  // Resolve credentials per-request — integration row wins, env-var fallback.
  // Rotating the signing secret in /admin/integrations/stripe takes effect on
  // the next webhook without a redeploy.
  const resolved = await resolveStripe()
  if (!resolved) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }
  const { stripe, signingSecret } = resolved

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, signingSecret)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Webhook signature failed: ${msg}` }, { status: 400 })
  }

  // Generic mirror (migration 151) — runs alongside the legacy handlers below
  // so subscriptions, charges, and generic checkout sessions stay in sync.
  // All migration-tolerant; pre-151 environments silently no-op.
  await stampLastWebhook()
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await mirrorCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await mirrorSubscription(event.data.object as Stripe.Subscription)
        break
      case 'charge.succeeded':
        await mirrorCharge(event.data.object as Stripe.Charge, 'succeeded')
        break
      case 'charge.failed':
        await mirrorCharge(event.data.object as Stripe.Charge, 'failed')
        break
      case 'charge.refunded':
        await mirrorCharge(event.data.object as Stripe.Charge, 'refunded')
        break
      case 'invoice.payment_failed': {
        const inv = event.data.object as unknown as { subscription?: string | { id: string } | null }
        const sub = inv.subscription
        if (sub) {
          const subId = typeof sub === 'string' ? sub : sub.id
          try {
            await createAdminClient().from('stripe_subscriptions')
              .update({ status: 'past_due', updated_at: new Date().toISOString() })
              .eq('stripe_subscription_id', subId)
            // Also mirror to ad_placements so the placement editor +
            // public renewal page reflect the past_due state. The
            // subscription stays attached but the publisher knows to
            // reach out to the advertiser before the placement lapses.
            await createAdminClient().from('ad_placements')
              .update({ subscription_status: 'past_due' })
              .eq('stripe_subscription_id', subId)
          } catch { /* pre-migration */ }
        }
        break
      }
      // Placement subscription extensions on successful renewal. Each
      // invoice.payment_succeeded for a recurring subscription bumps
      // the placement's end date so it stays active for the new period.
      // Phase 2 (migration 168).
      case 'invoice.payment_succeeded': {
        const inv = event.data.object as unknown as {
          subscription?: string | { id: string } | null;
          lines?: { data?: Array<{ period?: { end?: number } }> };
          period_end?: number;
        }
        const sub = inv.subscription
        if (!sub) break
        const subId = typeof sub === 'string' ? sub : sub.id
        // Stripe puts the new period end on the invoice line for
        // subscription invoices. Fall back to the top-level period_end.
        const periodEnd = inv.lines?.data?.[0]?.period?.end ?? inv.period_end ?? null
        if (!periodEnd) break
        try {
          const isoDay = new Date(periodEnd * 1000).toISOString().slice(0, 10)
          await createAdminClient().from('ad_placements').update({
            subscription_status:     'active',
            subscription_period_end: isoDay,
            is_active:               true,
            ends_at:                 new Date(periodEnd * 1000).toISOString(),
          }).eq('stripe_subscription_id', subId)
        } catch { /* pre-migration */ }
        break
      }
    }
  } catch (e) {
    console.error('[stripe-webhook] mirror handler error:', e instanceof Error ? e.message : String(e))
  }

  if (event.type === 'checkout.session.completed') {
    const session  = event.data.object as Stripe.Checkout.Session
    const meta     = session.metadata ?? {}

    if (meta.type === 'featured_listing') {
      try {
        await provisionFeaturedListing({
          business_name: meta.business_name ?? '',
          email:         meta.email ?? '',
          guide_slug:    meta.guide_slug ?? 'birthday-party',
          customerId:    typeof session.customer === 'string' ? session.customer : null,
          subscriptionId: typeof session.subscription === 'string' ? session.subscription : null,
        })
      } catch (e) {
        console.error('[stripe-webhook/featured_listing]', e)
      }
    }

    if (meta.type === 'birthday_spotlight') {
      try {
        const supabase = await createClient()

        // Update existing record or insert new one
        await supabase
          .from('birthday_spotlights')
          .upsert({
            child_name:       meta.child_name,
            child_age:        parseInt(meta.child_age, 10),
            birthday_date:    meta.birthday_date,
            parent_name:      meta.parent_name,
            parent_email:     meta.parent_email,
            parent_phone:     meta.parent_phone,
            message:          meta.message ?? '',
            tier:             meta.tier,
            amount:           (session.amount_total ?? 0) / 100,
            status:           'paid',
            stripe_session_id: session.id,
            publication:      meta.publication ?? 'RRP',
            paid_at:          new Date().toISOString(),
          }, { onConflict: 'stripe_session_id' })

        // Insert notification for VA queue (shows in Today screen)
        await supabase.from('notifications').insert({
          type:      'birthday_spotlight_paid',
          title:     `Birthday Spotlight paid — ${meta.child_name}`,
          body:      `${meta.tier} package · ${meta.parent_name} · ${meta.parent_email}`,
          urgency:   'incoming',
          publication: meta.publication ?? 'RRP',
          metadata:  meta,
        })
      } catch (dbErr) {
        console.error('Webhook DB error:', dbErr)
      }
    }

    if (meta.type === 'business_spotlight') {
      try {
        const supabase = await createClient()
        await supabase
          .from('business_spotlights')
          .update({ status: 'paid', stripe_session_id: session.id, paid_at: new Date().toISOString() })
          .eq('id', meta.spotlight_id)
      } catch (dbErr) {
        console.error('Business spotlight webhook DB error:', dbErr)
      }
    }

    // Self-serve advertiser campaign (from /advertise funnel)
    if (meta.type === 'advertiser_campaign') {
      try {
        const supabase = await createClient()

        // Mark lead as paid
        if (meta.lead_id) {
          await supabase
            .from('advertiser_leads')
            .update({
              status:            'paid',
              stripe_session_id: session.id,
              paid_at:           new Date().toISOString(),
            })
            .eq('id', meta.lead_id)
        }

        // GHL: create/update contact, trigger welcome sequence
        // Parse firstName/lastName from business_name as fallback — real name is in meta.email
        await onSelfServeBookingComplete({
          firstName:        meta.first_name ?? meta.business_name ?? 'Advertiser',
          lastName:         meta.last_name ?? undefined,
          businessName:     meta.business_name ?? '',
          email:            meta.email ?? session.customer_email ?? '',
          publication:      'RRP',
          adSize:           meta.ad_size ?? undefined,
          commitmentMonths: meta.commitment_months ? parseInt(meta.commitment_months, 10) : undefined,
          totalAmount:      (session.amount_total ?? 0) / 100,
          source:           'campaign',
        })
      } catch (err) {
        console.error('advertiser_campaign webhook error:', err)
      }
    }

    // Ad inventory booking (from /advertise booking tool)
    if (meta.type === 'ad_booking') {
      try {
        const supabase = await createClient()

        // Mark booking as paid and inventory as booked
        if (meta.booking_id) {
          await supabase
            .from('ad_bookings')
            .update({ status: 'paid', stripe_session_id: session.id })
            .eq('id', meta.booking_id)

          await supabase
            .from('ad_inventory')
            .update({ status: 'booked' })
            .eq('booking_id', meta.booking_id)
        }

        // GHL: create/update contact, trigger welcome sequence
        await onSelfServeBookingComplete({
          firstName:    meta.contact_name ?? meta.business_name ?? 'Advertiser',
          businessName: meta.business_name ?? '',
          email:        meta.email ?? session.customer_email ?? '',
          publication:  meta.publication ?? 'RRP',
          source:       'ad_booking',
        })
      } catch (err) {
        console.error('ad_booking webhook error:', err)
      }
    }

    // Summer Fun Guide Enhanced upgrade
    if (meta.type === 'sfg_enhanced_upgrade') {
      try {
        const supabase = await createClient()

        // Upgrade existing listing to featured=true if slug provided
        if (meta.existing_slug) {
          await supabase
            .from('summer_fun_guide')
            .update({ featured: true })
            .eq('slug', meta.existing_slug)
        }

        // Notify VA in Today screen
        await supabase.from('notifications').insert({
          type:      'sfg_enhanced_upgrade',
          title:     `Summer Guide upgrade paid — ${meta.business_name}`,
          body:      `${meta.contact_name} (${meta.email}) upgraded to Enhanced tier. Send profile completion link.`,
          urgency:   'incoming',
          publication: 'RRP',
          metadata:  meta,
        })
      } catch (err) {
        console.error('sfg_enhanced_upgrade webhook error:', err)
      }
    }

    // ── Self-serve spot booking (new /advertise spot picker flow) ─────────────
    if (meta.type === 'spot_booking') {
      try {
        const supabase = await createClient()

        // 1. Confirm the booking row
        if (meta.booking_id) {
          await supabase
            .from('bookings')
            .update({ status: 'confirmed', stripe_session_id: session.id })
            .eq('id', meta.booking_id)
        }

        // 2. GHL: upsert contact with publication + tier tags
        const adSizeTag = `${(meta.ad_size ?? 'unknown').toLowerCase()}-advertiser`
        const tags: string[] = ['advertiser', 'rrp-advertiser', adSizeTag, 'new-advertiser', 'self-serve']

        // 3. Newcomer Issue 2026 tag — any booking that includes June 2026
        const includesJune = meta.include_june_2026 === 'true'
        if (includesJune) tags.push('newcomer-issue-2026')

        const ghlRes = await upsertContact({
          publicationSlug: 'rrp',
          email:           meta.email ?? session.customer_email ?? '',
          firstName:       meta.first_name ?? meta.business_name ?? '',
          lastName:        meta.last_name  ?? undefined,
          businessName:    meta.business_name ?? '',
          tags,
        })

        // 4. Trigger welcome workflow (logs pending until real ID is set)
        if (ghlRes.success && ghlRes.contactId) {
          await triggerWorkflow({
            publicationSlug: 'rrp',
            contactId:       ghlRes.contactId,
            workflowId:      process.env.GHL_WORKFLOW_ADVERTISER_WELCOME ?? 'wf_new_advertiser_welcome',
          })

          // Store GHL contact ID on the booking
          if (meta.booking_id) {
            await supabase.from('bookings').update({ ghl_contact_id: ghlRes.contactId }).eq('id', meta.booking_id)
          }
        }

        // 5. Notify VA in Today screen
        await supabase.from('notifications').insert({
          type:        'new_advertiser',
          title:       `New advertiser booked — ${meta.business_name}`,
          body:        `${meta.ad_size?.toUpperCase() ?? '?'} page · ${meta.months ?? ''} · ${fmt$(session.amount_total ?? 0)}${includesJune ? ' · Newcomer Issue' : ''}`,
          urgency:     'incoming',
          publication: meta.publication ?? 'RRP',
          metadata:    meta,
        })
      } catch (err) {
        console.error('[webhook] spot_booking error:', err)
      }
    }

    // Anniversary spotlight paid
    if (meta.type === 'anniversary_spotlight') {
      try {
        const supabase = await createClient()
        await supabase
          .from('anniversary_spotlights')
          .upsert({
            person1_name:     meta.person1_name,
            person2_name:     meta.person2_name,
            couple_name:      `${meta.person1_name} & ${meta.person2_name}`,
            years_together:   parseInt(meta.years_together ?? '0', 10),
            anniversary_date: meta.anniversary_date,
            short_message:    meta.short_message ?? '',
            email:            meta.email,
            tier:             meta.tier,
            amount:           (session.amount_total ?? 0) / 100,
            status:           'pending',
            stripe_session_id: session.id,
            print_flag:       meta.tier === 'premium',
          }, { onConflict: 'stripe_session_id' })
      } catch (err) {
        console.error('anniversary_spotlight webhook error:', err)
      }
    }
  }

  return NextResponse.json({ received: true })
}
