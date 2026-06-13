/**
 * GoHighLevel (GHL) — Sub-account Private Integration Tokens (one PIT per publication)
 *
 * Each publication has its own sub-account PIT that carries the operational scopes
 * (contacts, tags, workflows, conversations). Agency-level tokens only cover admin
 * scopes and cannot be used for contact operations.
 *
 * All public functions are non-throwing and return { success, error? }.
 * Every call is recorded in integration_log so failures are debuggable.
 *
 * Auth model: Bearer <GHL_PIT_<SLUG>>  — no Location-Id header required for sub-account PITs.
 * locationId is sent in the request body for contact upsert, and in query strings for lookups.
 *
 * Env var naming:
 *   PIT tokens:   GHL_PIT_RRP, GHL_PIT_RR50PLUS, GHL_PIT_AOP, GHL_PIT_MBP, GHL_PIT_ESP, GHL_PIT_GPP
 *   Location IDs: GHL_LOCATION_ID_RRP, GHL_LOCATION_ID_RR50PLUS, … (same pattern)
 *   (GHL_PIT_BOOM and GHL_LOCATION_ID_BOOM remain as legacy aliases.)
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const GHL_BASE    = 'https://services.leadconnectorhq.com'
const GHL_VERSION = '2021-07-28'

// ── Location ID resolution ────────────────────────────────────────────────────

const SLUG_TO_LOC_ENV: Record<string, string> = {
  rrp:      'GHL_LOCATION_ID_RRP',
  // River Region 50+ (formerly BOOM, renamed in migration 169). The new
  // slug 'rr50plus' resolves to its own dedicated env var; 'boom' and
  // 'rrb' stay as legacy aliases so any pre-rename data still routes.
  // Both can point at the same GHL location until the sub-account is
  // forked, or the operator can set GHL_LOCATION_ID_RR50PLUS to a new
  // sub-account when the rebrand is fully cut over.
  rr50plus: 'GHL_LOCATION_ID_RR50PLUS',
  boom:     'GHL_LOCATION_ID_BOOM',
  rrb:      'GHL_LOCATION_ID_BOOM',
  aop:      'GHL_LOCATION_ID_AOP',
  mbp:      'GHL_LOCATION_ID_MBP',
  esp:      'GHL_LOCATION_ID_ESP',
  gpp:      'GHL_LOCATION_ID_GPP',
}

function resolveLocationId(publicationSlug: string): string | null {
  const key = publicationSlug.toLowerCase().trim()
  const envVar = SLUG_TO_LOC_ENV[key]
  if (!envVar) return null
  return process.env[envVar] ?? null
}

// ── Sub-account PIT resolution ────────────────────────────────────────────────

const SLUG_TO_PIT_ENV: Record<string, string> = {
  rrp:      'GHL_PIT_RRP',
  // See SLUG_TO_LOC_ENV above — same rename pattern. Set GHL_PIT_RR50PLUS
  // when the new sub-account PIT is provisioned; falls back to NULL until
  // then and the integration call cleanly errors instead of leaking BOOM's
  // PIT under the rebrand slug.
  rr50plus: 'GHL_PIT_RR50PLUS',
  boom:     'GHL_PIT_BOOM',
  rrb:      'GHL_PIT_BOOM',
  aop:      'GHL_PIT_AOP',
  mbp:      'GHL_PIT_MBP',
  esp:      'GHL_PIT_ESP',
  gpp:      'GHL_PIT_GPP',
}

function resolvePit(publicationSlug: string): string | null {
  const key = publicationSlug.toLowerCase().trim()
  const envVar = SLUG_TO_PIT_ENV[key]
  if (!envVar) return null
  return process.env[envVar] ?? null
}

// Keep uppercase abbreviations working too (for legacy callers)
const ABBREV_SLUG: Record<string, string> = {
  RRP: 'rrp', RR50PLUS: 'rr50plus',
  // Legacy aliases — BOOM was renamed to River Region 50+ in migration 169.
  RRB: 'rr50plus', BOOM: 'rr50plus',
  AOP: 'aop', MBP: 'mbp', ESP: 'esp', GPP: 'gpp',
}
export function getLocationId(publication: string): string {
  const slug = ABBREV_SLUG[publication.toUpperCase()] ?? publication.toLowerCase()
  const id = resolveLocationId(slug)
  if (!id) throw new Error(`No GHL location configured for: ${publication}`)
  return id
}

// ── Integration log ───────────────────────────────────────────────────────────

type LogEntry = {
  event_type: string
  publication_slug?: string
  payload?: Record<string, unknown>
  response?: Record<string, unknown>
  error_message?: string
  status?: 'ok' | 'error' | 'pending_workflow_id'
}

async function log(entry: LogEntry): Promise<void> {
  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    )
    await supabase.from('integration_log').insert({
      event_type:       entry.event_type,
      publication_slug: entry.publication_slug ?? null,
      payload:          entry.payload ?? null,
      response:         entry.response ?? null,
      error_message:    entry.error_message ?? null,
      status:           entry.status ?? 'ok',
    })
  } catch (e) {
    // Never crash because logging failed
    console.error('[GHL log] failed to write integration_log:', e)
  }
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

type GHLResponse = { ok: boolean; status: number; data: unknown }

// slug is required — used to look up the per-publication sub-account PIT.
// Sub-account PITs authenticate as that sub-account; no Location-Id header needed.
async function ghlFetch(
  path: string,
  options: { method: string; body?: string },
  slug: string,
): Promise<GHLResponse> {
  const pit = resolvePit(slug)
  if (!pit) throw new Error(`No GHL PIT configured for publication: ${slug} (expected env var GHL_PIT_${slug.toUpperCase()})`)

  const headers: Record<string, string> = {
    Authorization:  `Bearer ${pit}`,
    Version:        GHL_VERSION,
    'Accept':       'application/json',
    'Content-Type': 'application/json',
  }

  const res = await fetch(`${GHL_BASE}${path}`, {
    ...options,
    headers,
  })
  const data = await res.json().catch(() => null)

  console.error('[GHL DEBUG]', {
    url:              `${GHL_BASE}${path}`,
    method:           options.method,
    status:           res.status,
    ok:               res.ok,
    responseBody:     data,
    hasAuth:          !!pit,
    pitPrefix:        pit ? pit.substring(0, 8) : null,
    locationIdInBody: options.body ? (() => { try { return JSON.parse(options.body).locationId } catch { return null } })() : null,
  })

  return { ok: res.ok, status: res.status, data }
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface UpsertContactParams {
  publicationSlug: string
  email: string
  phone?: string
  firstName?: string
  lastName?: string
  businessName?: string
  tags?: string[]
  customFields?: Record<string, string>
}

export interface GHLResult {
  success: boolean
  error?: string
  contactId?: string
}

/**
 * Create or update a contact by email in the publication's GHL location.
 */
export async function upsertContact(params: UpsertContactParams): Promise<GHLResult> {
  const locationId = resolveLocationId(params.publicationSlug)

  if (!locationId) {
    const error = `No GHL location configured for: ${params.publicationSlug}`
    await log({ event_type: 'upsert_contact', publication_slug: params.publicationSlug, payload: { email: params.email }, error_message: error, status: 'error' })
    return { success: false, error }
  }

  try {
    const body: Record<string, unknown> = {
      locationId,
      email: params.email,
    }
    if (params.firstName)   body.firstName   = params.firstName
    if (params.lastName)    body.lastName    = params.lastName
    if (params.phone)       body.phone       = params.phone
    if (params.businessName) body.companyName = params.businessName
    if (params.tags?.length) body.tags        = params.tags
    if (params.customFields) body.customFields = Object.entries(params.customFields).map(([key, value]) => ({ key, field_value: value }))

    const result = await ghlFetch('/contacts/upsert', { method: 'POST', body: JSON.stringify(body) }, params.publicationSlug)
    const contactId = (result.data as { contact?: { id?: string } })?.contact?.id ?? undefined

    if (!result.ok) {
      const error = `GHL upsert_contact HTTP ${result.status}`
      await log({ event_type: 'upsert_contact', publication_slug: params.publicationSlug, payload: { email: params.email, tags: params.tags }, response: { status: result.status, data: result.data } as Record<string, unknown>, error_message: error, status: 'error' })
      return { success: false, error }
    }

    await log({ event_type: 'upsert_contact', publication_slug: params.publicationSlug, payload: { email: params.email, tags: params.tags }, status: 'ok' })
    return { success: true, contactId }
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : String(e)
    await log({ event_type: 'upsert_contact', publication_slug: params.publicationSlug, payload: { email: params.email }, error_message: error, status: 'error' })
    return { success: false, error }
  }
}

/**
 * Add a single tag to an existing contact.
 */
export async function addTag(publicationSlug: string, contactId: string, tag: string): Promise<GHLResult> {
  const locationId = resolveLocationId(publicationSlug)
  if (!locationId) {
    const error = `No GHL location configured for: ${publicationSlug}`
    await log({ event_type: 'add_tag', publication_slug: publicationSlug, payload: { contactId, tag }, error_message: error, status: 'error' })
    return { success: false, error }
  }

  try {
    const result = await ghlFetch(`/contacts/${contactId}/tags`, { method: 'POST', body: JSON.stringify({ tags: [tag] }) }, publicationSlug)

    if (!result.ok) {
      const error = `GHL add_tag HTTP ${result.status}`
      await log({ event_type: 'add_tag', publication_slug: publicationSlug, payload: { contactId, tag }, error_message: error, status: 'error' })
      return { success: false, error }
    }

    await log({ event_type: 'add_tag', publication_slug: publicationSlug, payload: { contactId, tag }, status: 'ok' })
    return { success: true }
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : String(e)
    await log({ event_type: 'add_tag', publication_slug: publicationSlug, payload: { contactId, tag }, error_message: error, status: 'error' })
    return { success: false, error }
  }
}

/**
 * Remove a tag from an existing contact.
 */
export async function removeTag(publicationSlug: string, contactId: string, tag: string): Promise<GHLResult> {
  const locationId = resolveLocationId(publicationSlug)
  if (!locationId) {
    const error = `No GHL location configured for: ${publicationSlug}`
    await log({ event_type: 'remove_tag', publication_slug: publicationSlug, payload: { contactId, tag }, error_message: error, status: 'error' })
    return { success: false, error }
  }

  try {
    const result = await ghlFetch(`/contacts/${contactId}/tags`, { method: 'DELETE', body: JSON.stringify({ tags: [tag] }) }, publicationSlug)

    if (!result.ok) {
      const error = `GHL remove_tag HTTP ${result.status}`
      await log({ event_type: 'remove_tag', publication_slug: publicationSlug, payload: { contactId, tag }, error_message: error, status: 'error' })
      return { success: false, error }
    }

    await log({ event_type: 'remove_tag', publication_slug: publicationSlug, payload: { contactId, tag }, status: 'ok' })
    return { success: true }
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : String(e)
    await log({ event_type: 'remove_tag', publication_slug: publicationSlug, payload: { contactId, tag }, error_message: error, status: 'error' })
    return { success: false, error }
  }
}

export interface TriggerWorkflowParams {
  publicationSlug: string
  contactId: string
  workflowId: string
}

/**
 * Enroll a contact into a GHL workflow.
 * If workflowId is empty/placeholder, logs pending_workflow_id without calling GHL.
 */
export async function triggerWorkflow(params: TriggerWorkflowParams): Promise<GHLResult> {
  if (!params.workflowId || params.workflowId.startsWith('TODO') || params.workflowId.startsWith('wf_')) {
    await log({
      event_type:       'trigger_workflow',
      publication_slug: params.publicationSlug,
      payload:          { contactId: params.contactId, workflowId: params.workflowId },
      status:           'pending_workflow_id',
      error_message:    'Workflow ID not yet configured — set real ID in env or code',
    })
    return { success: false, error: 'pending_workflow_id' }
  }

  const locationId = resolveLocationId(params.publicationSlug)
  if (!locationId) {
    const error = `No GHL location configured for: ${params.publicationSlug}`
    await log({ event_type: 'trigger_workflow', publication_slug: params.publicationSlug, payload: { contactId: params.contactId, workflowId: params.workflowId }, error_message: error, status: 'error' })
    return { success: false, error }
  }

  try {
    const result = await ghlFetch(
      `/contacts/${params.contactId}/workflow/${params.workflowId}`,
      { method: 'POST', body: JSON.stringify({ eventStartTime: new Date().toISOString() }) },
      params.publicationSlug,
    )

    if (!result.ok) {
      const error = `GHL trigger_workflow HTTP ${result.status}`
      await log({ event_type: 'trigger_workflow', publication_slug: params.publicationSlug, payload: { contactId: params.contactId, workflowId: params.workflowId }, error_message: error, status: 'error' })
      return { success: false, error }
    }

    await log({ event_type: 'trigger_workflow', publication_slug: params.publicationSlug, payload: { contactId: params.contactId, workflowId: params.workflowId }, status: 'ok' })
    return { success: true }
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : String(e)
    await log({ event_type: 'trigger_workflow', publication_slug: params.publicationSlug, payload: params as unknown as Record<string, unknown>, error_message: error, status: 'error' })
    return { success: false, error }
  }
}

export interface GHLContact {
  id: string
  email: string
  firstName?: string
  lastName?: string
  companyName?: string
  tags?: string[]
}

/**
 * Look up a contact by email within a publication's location.
 */
export async function getContactByEmail(publicationSlug: string, email: string): Promise<GHLResult & { contact?: GHLContact }> {
  const locationId = resolveLocationId(publicationSlug)
  if (!locationId) {
    return { success: false, error: `No GHL location for: ${publicationSlug}` }
  }

  try {
    const result = await ghlFetch(
      `/contacts/search/duplicate?locationId=${locationId}&email=${encodeURIComponent(email)}`,
      { method: 'GET' },
      publicationSlug,
    )

    if (!result.ok) {
      return { success: false, error: `GHL get_contact HTTP ${result.status}` }
    }

    const contact = (result.data as { contact?: GHLContact })?.contact ?? undefined
    return { success: true, contact }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ── Legacy adapters (used by existing webhook handlers) ───────────────────────

const PUB_TAGS: Record<string, string> = {
  RRP: 'rrp-advertiser', RRB: 'boom-advertiser', AOP: 'aop-advertiser',
  MBP: 'mbp-advertiser', ESP: 'esp-advertiser',  GPP: 'gpp-advertiser',
}

// For code that still calls _upsertContactByLocationId — internal use
export async function _upsertContactByLocationId(
  publicationSlug: string,
  contact: { email: string; firstName?: string; lastName?: string; phone?: string; companyName?: string; tags?: string[] }
): Promise<string | null> {
  const locationId = resolveLocationId(publicationSlug) ?? ''
  try {
    const body = { locationId, ...contact }
    const result = await ghlFetch('/contacts/upsert', { method: 'POST', body: JSON.stringify(body) }, publicationSlug)
    if (!result.ok) { console.error('[GHL] _upsertContactByLocationId failed', result.status); return null }
    return (result.data as { contact?: { id?: string } })?.contact?.id ?? null
  } catch (e) {
    console.error('[GHL] _upsertContactByLocationId error:', e)
    return null
  }
}

export async function addTags(contactId: string, tags: string[], publicationSlug: string): Promise<void> {
  try {
    const result = await ghlFetch(`/contacts/${contactId}/tags`, { method: 'POST', body: JSON.stringify({ tags }) }, publicationSlug)
    if (!result.ok) console.error('[GHL] addTags failed', result.status)
  } catch (e) { console.error('[GHL] addTags error:', e) }
}

export async function addToWorkflow(contactId: string, workflowId: string, publicationSlug: string, eventStartTime?: string): Promise<void> {
  try {
    const result = await ghlFetch(
      `/contacts/${contactId}/workflow/${workflowId}`,
      { method: 'POST', body: JSON.stringify({ eventStartTime: eventStartTime ?? new Date().toISOString() }) },
      publicationSlug,
    )
    if (!result.ok) console.error('[GHL] addToWorkflow failed', result.status)
  } catch (e) { console.error('[GHL] addToWorkflow error:', e) }
}

function splitName(fullName: string): { firstName: string; lastName?: string } {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0] }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

export interface AdvertiserAgreementParams {
  contactName: string
  businessName: string
  email: string
  phone?: string
  publication: string
}

export async function onAdvertiserAgreementSigned(params: AdvertiserAgreementParams): Promise<void> {
  try {
    const slug   = ABBREV_SLUG[params.publication.toUpperCase()] ?? params.publication.toLowerCase()
    const { firstName, lastName } = splitName(params.contactName)
    const pubTag = PUB_TAGS[params.publication.toUpperCase()] ?? `${params.publication.toLowerCase()}-advertiser`
    const tags = ['advertiser', pubTag, 'agreement-signed', 'new-advertiser']

    const res = await upsertContact({ publicationSlug: slug, email: params.email, firstName, lastName, phone: params.phone, businessName: params.businessName, tags })
    if (!res.success || !res.contactId) return

    const workflowId = process.env.GHL_WORKFLOW_ADVERTISER_WELCOME
    if (workflowId) await addToWorkflow(res.contactId, workflowId, slug)
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

export async function onSelfServeBookingComplete(params: SelfServeBookingParams): Promise<void> {
  try {
    const slug      = ABBREV_SLUG[params.publication.toUpperCase()] ?? params.publication.toLowerCase()
    const pubTag    = PUB_TAGS[params.publication.toUpperCase()] ?? `${params.publication.toLowerCase()}-advertiser`
    const sourceTag = params.source === 'ad_booking' ? 'ad-booking' : 'self-serve'
    const tags = ['advertiser', pubTag, sourceTag, 'new-advertiser']

    const res = await upsertContact({ publicationSlug: slug, email: params.email, firstName: params.firstName, lastName: params.lastName, phone: params.phone, businessName: params.businessName, tags })
    if (!res.success || !res.contactId) return

    const workflowId = process.env.GHL_WORKFLOW_ADVERTISER_WELCOME
    if (workflowId) await addToWorkflow(res.contactId, workflowId, slug)
  } catch (err) {
    console.error('[GHL] onSelfServeBookingComplete error:', err)
  }
}
