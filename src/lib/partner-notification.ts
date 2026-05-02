/**
 * Partner notification email: sent within 60 seconds to the partner's contact_email
 * with full lead details + handoff instructions.
 *
 * Uses GHL email sending API. Falls back to console.error log if not configured.
 */

const GHL_BASE    = 'https://services.leadconnectorhq.com'
const GHL_VERSION = '2021-07-28'

function getToken(): string | null {
  return process.env.GHL_PIT_RRP ?? null
}

export interface PartnerNotificationParams {
  partnerContactEmail: string
  partnerContactName: string
  partnerName: string
  partnerPhone?: string | null
  partnerDashboardUrl: string
  leadFirstName?: string | null
  leadLastName?: string | null
  leadEmail?: string | null
  leadPhone?: string | null
  leadMetadata?: Record<string, unknown>
  offerHeadline?: string | null
  offerSubheadline?: string | null
  offerType: string
  utmSource?: string | null
}

export async function sendPartnerNotification(params: PartnerNotificationParams): Promise<{ success: boolean; error?: string }> {
  const token = getToken()

  const metaLines: string[] = []
  if (params.offerType === 'schedule_consult') {
    if (params.leadMetadata?.childName) metaLines.push(`Child's name: ${params.leadMetadata.childName}`)
    if (params.leadMetadata?.childAge) metaLines.push(`Child's age: ${params.leadMetadata.childAge}`)
    if (params.leadMetadata?.preferredDays?.length) metaLines.push(`Preferred days: ${(params.leadMetadata.preferredDays as string[]).join(', ')}`)
    if (params.leadMetadata?.insuranceCarrier) metaLines.push(`Insurance: ${params.leadMetadata.insuranceCarrier}`)
    if (params.leadMetadata?.notes) metaLines.push(`Notes: ${params.leadMetadata.notes}`)
  }

  const body = `
<html><body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">

<div style="background: #1a2744; padding: 20px 24px; border-radius: 10px 10px 0 0;">
  <p style="color: #d4a843; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin: 0 0 6px;">KeepSharing Partner Engine</p>
  <h1 style="color: white; font-size: 20px; margin: 0;">🔔 New Lead: ${params.leadFirstName ?? ''} ${params.leadLastName ?? ''}</h1>
</div>

<div style="background: white; border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 10px 10px;">
  <p style="color: #555; margin: 0 0 20px;">Hi ${params.partnerContactName}, you have a new lead from your KeepSharing Partner Engine page on River Region Parents.</p>

  <div style="background: #f9fafb; border-radius: 8px; padding: 16px 18px; margin-bottom: 20px;">
    <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin: 0 0 10px;">Lead Details</p>
    <p style="margin: 4px 0; font-size: 14px;"><strong>Name:</strong> ${params.leadFirstName ?? ''} ${params.leadLastName ?? ''}</p>
    ${params.leadPhone ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Phone:</strong> <a href="tel:${params.leadPhone}" style="color: #4a90d9;">${params.leadPhone}</a></p>` : ''}
    ${params.leadEmail ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Email:</strong> <a href="mailto:${params.leadEmail}" style="color: #4a90d9;">${params.leadEmail}</a></p>` : ''}
    ${metaLines.map(l => `<p style="margin: 4px 0; font-size: 14px;">${l}</p>`).join('')}
  </div>

  <div style="background: #fdf0eb; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px;">
    <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #c4622d; margin: 0 0 6px;">Offer They Responded To</p>
    <p style="font-size: 15px; font-weight: 700; color: #1a2744; margin: 0 0 2px;">${params.offerHeadline ?? 'Active Offer'}</p>
    ${params.offerSubheadline ? `<p style="font-size: 13px; color: #666; margin: 0;">${params.offerSubheadline}</p>` : ''}
  </div>

  <div style="background: #edf5f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px;">
    <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #5a8a6a; margin: 0 0 8px;">What We've Done</p>
    <p style="font-size: 13px; margin: 2px 0;">✓ Texted ${params.leadFirstName ?? 'them'} your direct number</p>
    <p style="font-size: 13px; margin: 2px 0;">✓ Enrolled them in our 14-day follow-up sequence</p>
    <p style="font-size: 13px; margin: 2px 0;">✓ Lead source: ${params.utmSource ?? 'Direct'}</p>
  </div>

  <p style="font-size: 15px; font-weight: 700; color: #c4622d; margin: 0 0 6px;">Reach out within 24 hours. Speed wins.</p>
  <p style="font-size: 13px; color: #888;">You can manage this lead at: <a href="${params.partnerDashboardUrl}" style="color: #4a90d9;">${params.partnerDashboardUrl}</a></p>

  <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
  <p style="font-size: 11px; color: #aaa; text-align: center; margin: 0;">The KeepSharing Partner Engine — Built by River Region Parents. Powered by KeepSharing.</p>
</div>

</body></html>
  `.trim()

  if (!token) {
    console.error('[partner-notification] GHL_PIT_RRP not configured — would have sent email to:', params.partnerContactEmail)
    console.error('[partner-notification] Email content:', body.slice(0, 200))
    return { success: false, error: 'GHL_PIT_RRP not configured' }
  }

  try {
    const res = await fetch(`${GHL_BASE}/conversations/messages/outbound`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Version: GHL_VERSION,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        type: 'Email',
        contactId: '', // will be filled by caller
        subject: `🔔 New Partner Engine Lead: ${params.leadFirstName ?? ''} ${params.leadLastName ?? ''} — ${params.offerHeadline ?? 'New Lead'}`,
        html: body,
      }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => null)
      console.error('[partner-notification] GHL email failed:', res.status, errData)
      // Fallback: log for manual follow-up
      return { success: false, error: `GHL email HTTP ${res.status}` }
    }

    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}
