import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { onSelfServeBookingComplete, upsertContact, addTag, triggerWorkflow } from '@/lib/ghl'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-04-22.dahlia',
})

function fmt$(cents: number) { return '$' + ((cents ?? 0) / 100).toFixed(0) }

export async function POST(req: NextRequest) {
  const body      = await req.text()
  const sig       = req.headers.get('stripe-signature') ?? ''
  const secret    = process.env.STRIPE_WEBHOOK_SECRET ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Webhook signature failed: ${msg}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session  = event.data.object as Stripe.Checkout.Session
    const meta     = session.metadata ?? {}

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
