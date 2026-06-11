import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { upsertContact, triggerWorkflow } from '@/lib/ghl'
import { ALL_MARKET_SLUGS } from '@/lib/markets'
import { checkRateLimit } from '@/lib/rate-limit'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

export async function POST(req: NextRequest) {
  // 10/min/IP — typo-and-retry is fine, scripted abuse is not.
  const allowed = await checkRateLimit({ scope: 'newsletter.subscribe', req, max: 10 })
  if (!allowed) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 })

  try {
    const body = await req.json() as {
      email?: string; first_name?: string; source?: string;
      context?: Record<string, unknown>; ghl_tags?: string[];
      brand_slug?: string; device_token?: string;
    }
    const { email, first_name, source, context, ghl_tags } = body
    const brandSlug = body.brand_slug && ALL_MARKET_SLUGS.includes(body.brand_slug) ? body.brand_slug : 'rrp'

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    // Resolve per-brand GHL routing (migration 164). Falls back to the
    // legacy single-brand defaults when the brand has no row yet OR has
    // empty fields, so existing RRP signups keep working unchanged.
    let brandTag: string | null = null
    let workflowId: string | null = null
    try {
      const { data } = await supabase
        .from('brand_voice')
        .select('ghl_subscriber_tag, ghl_welcome_workflow_id')
        .eq('brand_slug', brandSlug)
        .maybeSingle()
      const row = data as { ghl_subscriber_tag: string | null; ghl_welcome_workflow_id: string | null } | null
      brandTag   = row?.ghl_subscriber_tag       ?? null
      workflowId = row?.ghl_welcome_workflow_id  ?? null
    } catch { /* pre-migration; falls through */ }

    // Tag set sent to GHL — combine legacy/page-supplied tags with the
    // brand-scoped tag so editorial can target each brand individually.
    const baseTags = Array.isArray(ghl_tags) && ghl_tags.length > 0
      ? ghl_tags
      : [`${brandSlug}-main-email`]
    const fullTagSet = brandTag ? Array.from(new Set([...baseTags, brandTag])) : baseTags

    // Upsert subscriber (update tags if already exists)
    const { data: subscriber, error: dbError } = await supabase
      .from('newsletter_subscribers')
      .upsert({
        email:           email.toLowerCase().trim(),
        first_name:      first_name ?? null,
        source:          source ?? 'unknown',
        context_data:    { ...(context ?? {}), brand_slug: brandSlug },
        tags:            fullTagSet,
        is_subscribed:   true,
        subscribed_at:   new Date().toISOString(),
      }, { onConflict: 'email' })
      .select('id, ghl_contact_id')
      .single()

    if (dbError) {
      console.error('[newsletter/subscribe] DB error:', dbError)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    // Link any anonymous favorites this device collected to the new email.
    // Means once a reader subscribes, all their saved articles + listings
    // are reachable from any device they sign in on later.
    if (body.device_token) {
      try {
        await supabase
          .from('reader_favorites')
          .update({ email: email.toLowerCase().trim() })
          .eq('device_token', body.device_token)
          .is('email', null)
        await supabase
          .from('reader_engagement')
          .update({ email: email.toLowerCase().trim(), nudge_silenced_until: new Date(Date.now() + 30 * 86_400_000).toISOString() })
          .eq('device_token', body.device_token)
      } catch { /* migration 164 may not be applied yet */ }
    }

    // Sync to GHL (fire-and-forget — don't block the response)
    void (async () => {
      try {
        const ghlRes = await upsertContact({
          publicationSlug: brandSlug,
          email:           email.toLowerCase().trim(),
          firstName:       first_name ?? undefined,
          tags:            fullTagSet,
        })

        if (ghlRes.success && ghlRes.contactId && subscriber?.id) {
          await supabase
            .from('newsletter_subscribers')
            .update({ ghl_contact_id: ghlRes.contactId })
            .eq('id', subscriber.id)

          // Optional welcome workflow per brand.
          if (workflowId) {
            await triggerWorkflow({
              publicationSlug: brandSlug,
              contactId:       ghlRes.contactId,
              workflowId,
            }).catch(() => undefined)
          }
        }
      } catch (ghlErr) {
        // GHL sync failure is non-blocking — subscriber is saved in DB
        console.warn('[newsletter/subscribe] GHL sync failed (non-blocking):', (ghlErr as Error).message)
      }
    })()

    return NextResponse.json({ success: true, subscriberId: subscriber?.id ?? null })
  } catch (e) {
    console.error('[newsletter/subscribe] error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
