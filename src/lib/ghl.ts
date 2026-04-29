/**
 * GoHighLevel (GHL) service — agency-level private integration token (pit-…)
 *
 * All public helpers are non-throwing: errors are logged but never bubble up
 * to caller code, so a GHL outage never breaks a user-facing payment/sign flow.
 *
 * Tag-based workflow triggers
 * ───────────────────────────
 * GHL workflows fire when a specific tag is applied to a contact.
 * Configure the trigger in GHL then add the corresponding tag here.
 * Tag names used:
 *   - "new-advertiser"       → welcome sequence (agreement signed OR self-serve paid)
 *   - "agreement-signed"     → triggers agreement-signed automation
 *   - "self-serve"           → came through /advertise funnel
 *   - "ad-booking"           → came through inventory booking tool
 *   - "rrp-advertiser"       → publication tag (one per pub)
 *   - "boom-advertiser"
 *   - "aop-advertiser" / "mbp-advertiser" / "esp-advertiser" / "gpp-advertiser"
 */

const GHL_BASE    = 'https://services.leadconnectorhq.com'
const GHL_VERSION = '2021-07-28'

// ── Publication → Location ID map ────────────────────────────────────────────

const LOCATION_IDS: Record<string, string | undefined> = {
  RRP: process.env.GHL_LOCATION_ID_RRP,
  RRB: process.env.GHL_LOCATION_ID_BOOM,
  AOP: process.env.GHL_LOCATION_ID_AOP,
  MBP: process.env.GHL_LOCATION_ID_MBP,
  ESP: process.env.GHL_LOCATION_ID_ESP,
  GPP: process.env.GHL_LOCATION_ID_GPP,
}

const PUB_TAGS: Record<string, string> = {
  RRP: 'rrp-advertiser',
  RRB: 'boom-advertiser',
  AOP: 'aop-advertiser',
  MBP: 'mbp-advertiser',
  ESP: 'esp-advertiser',
  GPP: 'gpp-advertiser',
}

export function getLocationId(publication: string): string {
  const id = LOCATION_IDS[publication.toUpperCase()]
  if (!id) throw new Error(`No GHL location configured for publication: ${publication}`)
  return id
}

// ── Internal HTTP helper ──────────────────────────────────────────────────────

async function ghlFetch(
  path: string,
  options: RequestInit & { method: string; body?: string }
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const apiKey = process.env.GHL_API_KEY
  if (!apiKey) throw new Error('GHL_API_KEY is not configured')

  const res = await fetch(`${GHL_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Version:        GHL_VERSION,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })

  const data = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, data }
}

// ── Core primitives ───────────────────────────────────────────────────────────

/**
 * Create or update a contact by email within a GHL location.
 * Returns the contact ID, or null on failure.
 */
export async function upsertContact(
  locationId: string,
  contact: {
    email: string
    firstName?: string
    lastName?: string
    phone?: string
    companyName?: string
    tags?: string[]
  }
): Promise<string | null> {
  const result = await ghlFetch('/contacts/upsert', {
    method: 'POST',
    body: JSON.stringify({ locationId, ...contact }),
  })

  if (!result.ok) {
    console.error('[GHL] upsertContact failed', result.status, result.data)
    return null
  }

  const contactId = (result.data as { contact?: { id?: string } })?.contact?.id ?? null
  if (!contactId) console.error('[GHL] upsertContact: no contact.id in response', result.data)
  return contactId
}

/**
 * Add tags to an existing contact. Tags trigger GHL workflow automations.
 */
export async function addTags(
  contactId: string,
  tags: string[]
): Promise<void> {
  const result = await ghlFetch(`/contacts/${contactId}/tags`, {
    method: 'POST',
    body: JSON.stringify({ tags }),
  })

  if (!result.ok) {
    console.error('[GHL] addTags failed', result.status, result.data)
  }
}

/**
 * Enroll a contact into a GHL workflow by ID.
 * Only needed if you want direct workflow enrollment rather than tag-based triggers.
 * workflowId comes from GHL → Automations → Workflows → workflow URL.
 */
export async function addToWorkflow(
  contactId: string,
  workflowId: string,
  eventStartTime?: string
): Promise<void> {
  const result = await ghlFetch(`/contacts/${contactId}/workflow/${workflowId}`, {
    method: 'POST',
    body: JSON.stringify({ eventStartTime: eventStartTime ?? new Date().toISOString() }),
  })

  if (!result.ok) {
    console.error('[GHL] addToWorkflow failed', result.status, result.data)
  }
}

// ── Name parsing helper ───────────────────────────────────────────────────────

function splitName(fullName: string): { firstName: string; lastName?: string } {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0] }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

// ── High-level event handlers ─────────────────────────────────────────────────

export interface AdvertiserAgreementParams {
  contactName: string       // full name from agreement form
  businessName: string
  email: string
  phone?: string
  publication: string       // pub abbreviation for location routing (e.g. 'RRP')
}

/**
 * Fire when a new advertiser agreement is signed (admin-generated agreement).
 * Creates/updates contact, applies publication + agreement-signed tags,
 * which triggers the new-advertiser welcome sequence in GHL.
 */
export async function onAdvertiserAgreementSigned(
  params: AdvertiserAgreementParams
): Promise<void> {
  try {
    const locationId = getLocationId(params.publication)
    const { firstName, lastName } = splitName(params.contactName)

    const pubTag  = PUB_TAGS[params.publication.toUpperCase()] ?? `${params.publication.toLowerCase()}-advertiser`
    const tags    = ['advertiser', pubTag, 'agreement-signed', 'new-advertiser']

    const contactId = await upsertContact(locationId, {
      email:       params.email,
      firstName,
      lastName,
      phone:       params.phone,
      companyName: params.businessName,
      tags,
    })

    if (!contactId) return

    // Optional: direct workflow enrollment if env var is configured
    const workflowId = process.env.GHL_WORKFLOW_ADVERTISER_WELCOME
    if (workflowId) {
      await addToWorkflow(contactId, workflowId)
    }
  } catch (err) {
    console.error('[GHL] onAdvertiserAgreementSigned error:', err)
  }
}

export interface SelfServeBookingParams {
  firstName: string
  lastName?: string
  businessName: string
  email: string
  phone?: string
  publication: string
  adSize?: string
  commitmentMonths?: number
  totalAmount?: number
  source?: 'campaign' | 'ad_booking'
}

/**
 * Fire when a self-serve advertiser completes Stripe payment.
 * Creates/updates contact, applies publication + self-serve tags.
 */
export async function onSelfServeBookingComplete(
  params: SelfServeBookingParams
): Promise<void> {
  try {
    const locationId = getLocationId(params.publication)
    const pubTag     = PUB_TAGS[params.publication.toUpperCase()] ?? `${params.publication.toLowerCase()}-advertiser`
    const sourceTag  = params.source === 'ad_booking' ? 'ad-booking' : 'self-serve'
    const tags       = ['advertiser', pubTag, sourceTag, 'new-advertiser']

    const contactId = await upsertContact(locationId, {
      email:       params.email,
      firstName:   params.firstName,
      lastName:    params.lastName,
      phone:       params.phone,
      companyName: params.businessName,
      tags,
    })

    if (!contactId) return

    const workflowId = process.env.GHL_WORKFLOW_ADVERTISER_WELCOME
    if (workflowId) {
      await addToWorkflow(contactId, workflowId)
    }
  } catch (err) {
    console.error('[GHL] onSelfServeBookingComplete error:', err)
  }
}
