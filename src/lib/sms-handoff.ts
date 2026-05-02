/**
 * RRP-branded SMS to the lead within 60 seconds of form submission.
 * Uses GHL sub-account conversation API to send SMS from the publication's number.
 * All SMS are sent from RRP's number — NOT from the partner's number.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const GHL_BASE    = 'https://services.leadconnectorhq.com'
const GHL_VERSION = '2021-07-28'

function getToken(): string | null {
  return process.env.GHL_PIT_RRP ?? null
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return null
}

export interface SMSHandoffParams {
  offerType: string
  offerHeadline?: string | null
  leadFirstName?: string | null
  partnerName: string
  partnerPhone?: string | null
  discountCode?: string | null
  bookingUrl?: string | null
  urgencyText?: string | null
  contactId: string
  leadPhone: string
}

function buildSMSMessage(params: SMSHandoffParams): string {
  const name = params.leadFirstName ? `, this is` : ' — '
  const offerLine = params.offerHeadline ? `"${params.offerHeadline}"` : 'your request'

  switch (params.offerType) {
    case 'discount_code':
      return `Hi ${params.leadFirstName ?? 'there'}, your ${params.partnerName} discount code is: ${params.discountCode ?? '[code pending]'}. Show this at the front desk. ${params.urgencyText ? `Note: ${params.urgencyText}.` : ''} — River Region Parents`

    case 'booking_link':
      return `Hi ${params.leadFirstName ?? 'there'}, here's your ${params.partnerName} booking link for ${offerLine}: ${params.bookingUrl ?? '[link pending]'}. Need help? Call ${params.partnerPhone ?? 'the office'}. — River Region Parents`

    case 'info_request':
      return `Hi ${params.leadFirstName ?? 'there'}, thanks for reaching out about ${params.partnerName} via River Region Parents. They'll be in touch within 24 hours. Direct line: ${params.partnerPhone ?? 'see email'}. — Jason at RRP`

    case 'limited_promo':
      return `Hi ${params.leadFirstName ?? 'there'}, you're confirmed for ${offerLine} from ${params.partnerName}! Their direct line: ${params.partnerPhone ?? 'see email'}. They'll reach out with next steps. — River Region Parents`

    case 'schedule_consult':
    default:
      return `Hi ${params.leadFirstName ?? 'there'}, River Region Parents received your ${offerLine} request for ${params.partnerName}. They'll call you within 24 hours. Direct line: ${params.partnerPhone ?? 'see email'} if you'd like to reach out first. — Jason at RRP`
  }
}

export async function sendLeadSMS(params: SMSHandoffParams): Promise<{ success: boolean; error?: string }> {
  const token = getToken()
  if (!token) {
    console.error('[sms-handoff] GHL_PIT_RRP not configured')
    return { success: false, error: 'GHL_PIT_RRP not configured' }
  }

  const normalizedPhone = normalizePhone(params.leadPhone)
  if (!normalizedPhone) {
    return { success: false, error: `Could not normalize phone: ${params.leadPhone}` }
  }

  const message = buildSMSMessage(params)

  try {
    const res = await fetch(`${GHL_BASE}/conversations/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Version: GHL_VERSION,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        type: 'SMS',
        contactId: params.contactId,
        message,
      }),
    })

    const data = await res.json().catch(() => null)
    console.error('[sms-handoff debug]', { status: res.status, ok: res.ok, data })

    if (!res.ok) {
      return { success: false, error: `GHL SMS HTTP ${res.status}: ${JSON.stringify(data)}` }
    }

    // Log to Supabase
    try {
      const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      )
      await supabase.from('integration_log').insert({
        event_type: 'partner_engine_sms_handoff',
        publication_slug: 'rrp',
        payload: { contactId: params.contactId, partnerName: params.partnerName, offerType: params.offerType },
        status: 'ok',
      })
    } catch { /* non-blocking */ }

    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}
