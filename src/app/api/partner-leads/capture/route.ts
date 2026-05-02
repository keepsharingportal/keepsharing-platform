import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { upsertContact } from '@/lib/ghl'
import { sendLeadSMS } from '@/lib/sms-handoff'
import { sendPartnerNotification } from '@/lib/partner-notification'
import { enrollInNurtureSequence } from '@/lib/nurture-sequence'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

const CONFIRM_MESSAGES: Record<string, (phone: string, code?: string, bookingUrl?: string) => string> = {
  schedule_consult: (p) => `We've sent you a text with ${p}'s direct line. They'll reach out within 24 hours.`,
  discount_code: (_p, code) => `Your discount code${code ? ` (${code})` : ''} has been texted to your phone.`,
  booking_link: (_p, _c, url) => url ? `Redirecting you to book now…` : `Check your phone for the booking link.`,
  info_request: (p) => `They'll be in touch within 24 hours. Direct line: ${p}`,
  limited_promo: () => `You're confirmed! Check your phone for next steps.`,
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      offerId, advertiserId, advertiserSlug,
      offerType, leadFirstName, leadLastName,
      leadEmail, leadPhone, leadMetadata,
      sourcePage, referrerUrl, utmSource, utmMedium, utmCampaign,
    } = body

    if (!advertiserId) return NextResponse.json({ error: 'advertiserId required' }, { status: 400 })

    const supabase = supabaseAdmin()

    // 1. Insert partner_lead row
    const { data: lead, error: leadError } = await supabase
      .from('partner_leads')
      .insert({
        advertiser_id: advertiserId,
        offer_id: offerId ?? null,
        lead_first_name: leadFirstName ?? null,
        lead_last_name: leadLastName ?? null,
        lead_email: leadEmail ?? null,
        lead_phone: leadPhone ?? null,
        lead_metadata: leadMetadata ?? {},
        source_page: sourcePage ?? null,
        referrer_url: referrerUrl ?? null,
        utm_source: utmSource ?? null,
        utm_medium: utmMedium ?? null,
        utm_campaign: utmCampaign ?? null,
      })
      .select('id')
      .single()

    if (leadError) {
      console.error('[partner-leads/capture] DB insert error:', leadError)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    const leadId = lead.id

    // 2. Fetch advertiser + offer details for handoff
    const { data: advertiserData } = await supabase
      .from('advertiser_accounts')
      .select('*, partner_offers!advertiser_accounts_current_offer_id_fkey(*)')
      .eq('id', advertiserId)
      .maybeSingle()

    const account = advertiserData
    const offer = advertiserData?.partner_offers

    // 3. GHL contact upsert + tagging — fire-and-forget
    const ghlPromise = (async () => {
      try {
        const tags = [
          'partner-engine-lead',
          `partner-${advertiserSlug ?? 'unknown'}`,
          `category-${account?.category ?? 'unknown'}`,
          `offer-type-${offerType ?? 'unknown'}`,
        ]
        if (offerId) tags.push(`offer-${offerId}`)

        const parts = `${leadFirstName ?? ''} ${leadLastName ?? ''}`.trim().split(/\s+/)
        const ghlRes = await upsertContact({
          publicationSlug: 'rrp',
          email: leadEmail ?? '',
          firstName: parts[0] ?? undefined,
          lastName: parts.slice(1).join(' ') || undefined,
          phone: leadPhone ?? undefined,
          businessName: account?.business_name,
          tags,
        })

        if (ghlRes.success && ghlRes.contactId) {
          // Update lead with GHL contact ID
          await supabase.from('partner_leads').update({ ghl_contact_id: ghlRes.contactId }).eq('id', leadId)

          // 4. SMS handoff to lead
          if (leadPhone) {
            const smsRes = await sendLeadSMS({
              offerType: offerType ?? 'schedule_consult',
              offerHeadline: offer?.offer_headline,
              leadFirstName,
              partnerName: account?.business_name ?? 'our partner',
              partnerPhone: account?.contact_phone,
              discountCode: offer?.discount_code,
              bookingUrl: offer?.booking_url,
              urgencyText: offer?.urgency_text,
              contactId: ghlRes.contactId,
              leadPhone,
            })
            await supabase.from('partner_leads').update({
              lead_to_sms_status: smsRes.success ? 'sent' : 'failed',
              lead_to_sms_sent_at: smsRes.success ? new Date().toISOString() : null,
            }).eq('id', leadId)
          }

          // 5. Nurture sequence enrollment
          const nurtureRes = await enrollInNurtureSequence(ghlRes.contactId)
          await supabase.from('partner_leads').update({
            nurture_sequence_status: nurtureRes.pending ? 'pending' : nurtureRes.success ? 'enrolled' : 'pending',
            nurture_enrolled_at: nurtureRes.success ? new Date().toISOString() : null,
          }).eq('id', leadId)
        }

        // 6. Partner notification email
        if (account?.contact_email) {
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://riverregionparents.com'
          const notifRes = await sendPartnerNotification({
            partnerContactEmail: account.contact_email,
            partnerContactName: account.contact_name ?? account.business_name,
            partnerName: account.business_name,
            partnerPhone: account.contact_phone,
            partnerDashboardUrl: `${siteUrl}/advertiser-portal`,
            leadFirstName,
            leadLastName,
            leadEmail,
            leadPhone,
            leadMetadata,
            offerHeadline: offer?.offer_headline,
            offerSubheadline: offer?.offer_subheadline,
            offerType: offerType ?? 'schedule_consult',
            utmSource,
          })
          await supabase.from('partner_leads').update({
            partner_notification_status: notifRes.success ? 'sent' : 'failed',
            partner_notification_sent_at: notifRes.success ? new Date().toISOString() : null,
          }).eq('id', leadId)
        }
      } catch (e) {
        console.error('[partner-leads/capture] async handoff error:', e)
      }
    })()

    // Don't await ghlPromise — return success to client immediately
    void ghlPromise

    // 7. Build confirmation message
    const phone = account?.contact_phone ?? ''
    const code = offer?.discount_code ?? undefined
    const bookingUrl = offer?.booking_url ?? undefined
    const confirmMessage = CONFIRM_MESSAGES[offerType ?? 'schedule_consult']?.(phone, code, bookingUrl) ?? 'Request received!'

    return NextResponse.json({
      success: true,
      leadId,
      confirmationMessage: confirmMessage,
      redirectUrl: offerType === 'booking_link' && bookingUrl ? bookingUrl : null,
    })
  } catch (e) {
    console.error('[partner-leads/capture] error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
