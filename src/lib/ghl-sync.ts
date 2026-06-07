// GHL sync — pushes advertiser_accounts + advertiser_contacts → GHL.
//
// Built on top of /src/lib/ghl (existing upsertContact + addTag + workflow
// machinery). This module owns the higher-level "sync this advertiser to
// GHL" operation: every contact on the advertiser gets upserted with a
// consistent tag set, the returned GHL contact id is written back to
// advertiser_contacts.ghl_contact_id, and a status summary returns to
// the caller for UI feedback.
//
// Tags applied (all lowercased, kebab-case so they group cleanly in GHL):
//   - 'advertiser'                  — universal
//   - '<publication>-advertiser'    — e.g. 'rrp-advertiser'
//   - 'role-<role>'                 — e.g. 'role-ad-rep', 'role-billing'
//   - 'tier-<package_tier>'         — e.g. 'tier-1-found' (when set)
//   - 'lifecycle-<lifecycle_stage>' — e.g. 'lifecycle-active'
//
// Expiration tagging is handled separately by syncExpiredAdTags() and
// the cron route that wraps it — keeps the surface-level sync from
// having to know the ad_placements schema.

import { createClient } from '@supabase/supabase-js'
import { upsertContact, addTag, removeTag } from './ghl'

// ── Types ──────────────────────────────────────────────────────────────────

export interface SyncResult {
  ok:           boolean
  contactsSynced: number
  errors:       Array<{ contactId: string; email: string | null; error: string }>
}

interface AdvertiserRow {
  id:              string
  business_name:   string
  package_tier:    string | null
  lifecycle_stage: string | null
}

interface ContactRow {
  id:                    string
  advertiser_account_id: string
  name:                  string
  email:                 string | null
  phone:                 string | null
  role:                  string
  is_primary:            boolean
  ghl_contact_id:        string | null
}

// ── Supabase admin (service-role) ──────────────────────────────────────────

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

// ── Tag builder ────────────────────────────────────────────────────────────

function buildTagsFor(advertiser: AdvertiserRow, contact: ContactRow, publication: string): string[] {
  const tags = [
    'advertiser',
    `${publication.toLowerCase()}-advertiser`,
    `role-${contact.role.replace(/_/g, '-')}`,
  ]
  if (advertiser.package_tier)    tags.push(`tier-${advertiser.package_tier}`)
  if (advertiser.lifecycle_stage) tags.push(`lifecycle-${advertiser.lifecycle_stage}`)
  if (contact.is_primary)         tags.push('primary-contact')
  return tags
}

function splitName(fullName: string): { firstName: string; lastName?: string } {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0] }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

// ── Sync one advertiser (all their contacts) ───────────────────────────────

export async function syncAdvertiser(
  advertiserId: string,
  publication = 'rrp',
): Promise<SyncResult> {
  const supabase = adminClient()
  const result: SyncResult = { ok: true, contactsSynced: 0, errors: [] }

  // 1. Load advertiser (for tier + lifecycle tags).
  const accRes = await supabase
    .from('advertiser_accounts')
    .select('id, business_name, package_tier, lifecycle_stage')
    .eq('id', advertiserId)
    .single()
  if (accRes.error || !accRes.data) {
    return { ok: false, contactsSynced: 0, errors: [{ contactId: '', email: null, error: accRes.error?.message ?? 'advertiser not found' }] }
  }
  const advertiser = accRes.data as AdvertiserRow

  // 2. Load contacts. Skip rows with no email — GHL keys on email, so
  // an emailless contact has nowhere to land.
  const conRes = await supabase
    .from('advertiser_contacts')
    .select('id, advertiser_account_id, name, email, phone, role, is_primary, ghl_contact_id')
    .eq('advertiser_account_id', advertiserId)
  if (conRes.error) {
    return { ok: false, contactsSynced: 0, errors: [{ contactId: '', email: null, error: conRes.error.message }] }
  }
  const contacts = (conRes.data ?? []) as ContactRow[]
  const syncable = contacts.filter(c => c.email)
  if (syncable.length === 0) {
    return { ok: true, contactsSynced: 0, errors: [] }
  }

  // 3. Upsert each contact + store the returned GHL id.
  for (const c of syncable) {
    const { firstName, lastName } = splitName(c.name)
    const upsertRes = await upsertContact({
      publicationSlug: publication,
      email:           c.email as string,
      firstName,
      lastName,
      phone:           c.phone ?? undefined,
      businessName:    advertiser.business_name,
      tags:            buildTagsFor(advertiser, c, publication),
    })
    if (!upsertRes.success || !upsertRes.contactId) {
      result.ok = false
      result.errors.push({ contactId: c.id, email: c.email, error: upsertRes.error ?? 'unknown' })
      continue
    }
    result.contactsSynced++
    // Write the GHL contact id back if it changed. Cheap UPDATE; one
    // round-trip per contact is fine for the volume here.
    if (upsertRes.contactId !== c.ghl_contact_id) {
      await supabase
        .from('advertiser_contacts')
        .update({ ghl_contact_id: upsertRes.contactId })
        .eq('id', c.id)
    }
  }
  return result
}

// ── Expiration tagging ─────────────────────────────────────────────────────

/** Find ad placements that ended in the past N days and tag the GHL
 *  contact on the linked advertiser with rrp-expired-<MONYY>. Idempotent:
 *  re-running won't add the same tag twice (GHL ignores dupes). */
export async function syncExpiredAdTags(
  publication = 'rrp',
  windowDays = 7,
): Promise<{ ok: boolean; tagsApplied: number; errors: string[] }> {
  const supabase = adminClient()
  const errors: string[] = []
  let tagsApplied = 0

  // 1. Recently-expired placements grouped by advertiser. ends_at <= now
  // AND ends_at >= now - windowDays so we don't re-tag history every run.
  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString()
  const nowIso      = new Date().toISOString()
  const placementsRes = await supabase
    .from('ad_placements')
    .select('id, advertiser_account_id, ends_at')
    .gte('ends_at', windowStart)
    .lte('ends_at', nowIso)
    .not('advertiser_account_id', 'is', null)
  if (placementsRes.error) {
    return { ok: false, tagsApplied: 0, errors: [placementsRes.error.message] }
  }
  const placements = (placementsRes.data ?? []) as Array<{ id: string; advertiser_account_id: string; ends_at: string }>
  if (placements.length === 0) return { ok: true, tagsApplied: 0, errors: [] }

  // 2. Index by advertiser_account_id → tag (one tag per expiration month).
  // Most advertisers will only have one placement expiring per month, so
  // the dedup is mostly cosmetic but worth doing.
  const tagsByAdv = new Map<string, Set<string>>()
  for (const p of placements) {
    const d   = new Date(p.ends_at)
    const mon = d.toLocaleString('en-US', { month: 'short' }).toLowerCase()
    const yr  = String(d.getFullYear()).slice(-2)
    const tag = `${publication.toLowerCase()}-expired-${mon}${yr}`
    const set = tagsByAdv.get(p.advertiser_account_id) ?? new Set<string>()
    set.add(tag)
    tagsByAdv.set(p.advertiser_account_id, set)
  }

  // 3. For each advertiser, pull primary contact's ghl_contact_id and tag.
  for (const [advId, tags] of tagsByAdv) {
    const conRes = await supabase
      .from('advertiser_contacts')
      .select('ghl_contact_id')
      .eq('advertiser_account_id', advId)
      .eq('is_primary', true)
      .maybeSingle()
    const ghlId = conRes.data?.ghl_contact_id as string | undefined
    if (!ghlId) {
      // Primary contact never synced — no GHL id to tag. Not a hard
      // error; the next manual sync will populate it.
      errors.push(`advertiser ${advId}: primary contact has no ghl_contact_id (sync first)`)
      continue
    }
    for (const tag of tags) {
      const tagRes = await addTag(publication, ghlId, tag)
      if (!tagRes.success) {
        errors.push(`advertiser ${advId} tag ${tag}: ${tagRes.error}`)
        continue
      }
      tagsApplied++
    }
  }
  return { ok: errors.length === 0, tagsApplied, errors }
}

// ── Clearing tags (e.g. when an ad gets renewed before expiration) ─────────

/** Remove the expired tag for a given month — useful when an advertiser
 *  renews a placement that was previously expired. Quiet on failure. */
export async function clearExpiredTag(
  advertiserId: string,
  ghlContactId: string,
  expiredMonth: { mon: string; year: number },
  publication = 'rrp',
): Promise<void> {
  const yr  = String(expiredMonth.year).slice(-2)
  const tag = `${publication.toLowerCase()}-expired-${expiredMonth.mon.toLowerCase()}${yr}`
  await removeTag(publication, ghlContactId, tag)
  // advertiserId is unused here but kept for symmetry / future logging.
  void advertiserId
}
