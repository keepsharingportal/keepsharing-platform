import { createClient } from '@/lib/supabase/server'
import { MOCK_ADVERTISERS, PUBLICATIONS as MOCK_PUBS } from '@/lib/mock-data'
import type { AdvertiserRecord } from '@/types'

// Supabase join shape — related rows come back as arrays
type AdRow = {
  id: string
  issue: string
  stage: string
  amount: number
  directory: boolean
  layout_notes: string | null
  social: string | null
  invoice_type: string | null
  designer: string | null
  design_status: string
  size: number
  orientation: string | null
  special_position: string | null
  specific_months: string[] | null
  expires: string | null
  description: string | null
  businesses: { name: string }[] | { name: string } | null
  contacts: { first_name: string; last_name: string | null }[] | { first_name: string; last_name: string | null } | null
  publications: { abbrev: string }[] | { abbrev: string } | null
}

function first<T>(v: T[] | T | null): T | null {
  if (v === null || v === undefined) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

function mapRow(row: AdRow): AdvertiserRecord {
  const biz = first(row.businesses)
  const con = first(row.contacts)
  const pub = first(row.publications)
  return {
    id: row.id,
    businessName: biz?.name ?? 'Unknown',
    contactName: con ? `${con.first_name} ${con.last_name ?? ''}`.trim() : '',
    publication: pub?.abbrev ?? '',
    issue: row.issue,
    stage: (row.stage as AdvertiserRecord['stage']) ?? 'Closed Won',
    amount: row.amount ?? 0,
    directory: row.directory ?? false,
    layoutNotes: row.layout_notes ?? '',
    social: row.social ?? null,
    invoiceType: (row.invoice_type as AdvertiserRecord['invoiceType']) ?? 'Invoice',
    designer: row.designer ?? '',
    designStatus: (row.design_status as AdvertiserRecord['designStatus']) ?? 'Pick-up',
    size: row.size,
    orientation: (row.orientation as AdvertiserRecord['orientation']) ?? null,
    specialPosition: (row.special_position as AdvertiserRecord['specialPosition']) ?? null,
    specificMonths: row.specific_months ?? [],
    expires: row.expires ?? '',
    description: row.description ?? '',
  }
}

const SELECT_FIELDS = `
  id, issue, stage, amount, directory, layout_notes, social,
  invoice_type, designer, design_status, size, orientation,
  special_position, specific_months, expires, description,
  businesses (name),
  contacts (first_name, last_name),
  publications (abbrev)
`

async function trySupabase<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  const isConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase.co')
  const useMock      = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'

  // Return mock only when Supabase is not configured OR explicitly requested
  if (!isConfigured || useMock) return fallback

  // Supabase IS configured and mock is disabled — let errors propagate
  // so we never show fake data when real data should be there
  return fn()
}

export async function getAdvertisersForIssue(issue: string): Promise<AdvertiserRecord[]> {
  const mock = MOCK_ADVERTISERS.filter((a) => a.issue === issue)
  return trySupabase(async () => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('advertisers')
      .select(SELECT_FIELDS)
      .eq('issue', issue)
      .order('created_at')
    // Only fall to mock when Supabase isn't configured — not on empty results
    if (error) throw error
    return (data ?? []).map(mapRow)
  }, mock)
}

export async function getAllAdvertisers(): Promise<AdvertiserRecord[]> {
  return trySupabase(async () => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('advertisers')
      .select(SELECT_FIELDS)
      .order('issue', { ascending: false })
    if (error) throw error
    return (data ?? []).map(mapRow)
  }, MOCK_ADVERTISERS)
}

export async function getAdvertisersByPub(pubAbbrev: string): Promise<AdvertiserRecord[]> {
  const mock = MOCK_ADVERTISERS.filter((a) => a.publication === pubAbbrev)
  return trySupabase(async () => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('advertisers')
      .select(SELECT_FIELDS)
      .eq('publications.abbrev', pubAbbrev)
      .order('issue', { ascending: false })
    if (error || !data?.length) return mock
    return data.map(mapRow)
  }, mock)
}

// ── Mutations (used by server actions) ────────────────────────────────────────

export async function upsertAdvertiserRecord(record: Partial<AdvertiserRecord> & { id: string }) {
  const supabase = await createClient()
  const { error } = await supabase.from('advertisers').upsert({
    id: record.id,
    issue: record.issue,
    stage: record.stage,
    amount: record.amount,
    directory: record.directory,
    layout_notes: record.layoutNotes,
    social: record.social,
    invoice_type: record.invoiceType,
    designer: record.designer,
    design_status: record.designStatus,
    size: record.size,
    orientation: record.orientation,
    special_position: record.specialPosition,
    specific_months: record.specificMonths,
    expires: record.expires,
    description: record.description,
    updated_at: new Date().toISOString(),
  })
  return error
}

// ── Import helper — upsert a batch from CSV ───────────────────────────────────

export type ImportRow = {
  businessName: string
  contactName: string
  contactEmail?: string
  contactPhone?: string
  issue: string            // e.g. "RRP MAR26"
  pubAbbrev: string
  stage: string
  amount: number
  size: number
  orientation?: string
  specialPosition?: string
  designer?: string
  designStatus: string
  directory?: boolean
  layoutNotes?: string
  social?: string
  invoiceType?: string
  expires?: string
  description?: string
}

export type ImportRowResult = {
  row: number
  name: string
  status: 'ok' | 'error' | 'skipped'
  message?: string
}

export async function importBatch(rows: ImportRow[]): Promise<{
  inserted: number
  businessesCreated: number
  skipped: number
  errors: string[]
  rowResults: ImportRowResult[]
}> {
  const supabase = await createClient()
  const errors: string[] = []
  const rowResults: ImportRowResult[] = []
  let inserted = 0
  let businessesCreated = 0
  let skipped = 0

  const pubCache: Record<string, string | null> = {}
  const bizCache: Record<string, string | null> = {}

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1
    const rowName = row.businessName?.trim() || '(no business name)'

    try {
      // 1 — resolve publication ID
      if (!(row.pubAbbrev in pubCache)) {
        const { data } = await supabase
          .from('publications')
          .select('id')
          .eq('abbrev', row.pubAbbrev)
          .maybeSingle()
        pubCache[row.pubAbbrev] = data?.id ?? null
      }
      const pubId = pubCache[row.pubAbbrev]

      // 2 — resolve business (skip creation if name is blank)
      let bizId: string | null = null
      const bizKey = row.businessName?.trim().toLowerCase() ?? ''

      if (bizKey) {
        if (bizKey in bizCache) {
          bizId = bizCache[bizKey]
        } else {
          const { data: existing } = await supabase
            .from('businesses')
            .select('id')
            .ilike('name', row.businessName.trim())
            .maybeSingle()

          if (existing) {
            bizId = existing.id
            bizCache[bizKey] = existing.id
          } else {
            const { data: newBiz, error: bizErr } = await supabase
              .from('businesses')
              .insert({ name: row.businessName.trim(), primary_publication_id: pubId })
              .select('id')
              .maybeSingle()

            if (bizErr || !newBiz) {
              // Race condition — try fetching again before giving up
              const { data: retry } = await supabase
                .from('businesses')
                .select('id')
                .ilike('name', row.businessName.trim())
                .maybeSingle()

              if (retry) {
                bizId = retry.id
                bizCache[bizKey] = retry.id
              } else {
                const msg = `Business upsert failed: ${rowName} — ${bizErr?.message ?? 'unknown error'}`
                errors.push(msg)
                rowResults.push({ row: rowNum, name: rowName, status: 'error', message: msg })
                continue
              }
            } else {
              bizId = newBiz.id
              bizCache[bizKey] = newBiz.id
              businessesCreated++
            }
          }
        }
      }

      // 3 — idempotency: skip if record already exists
      if (bizId) {
        // Primary key: same business + same issue
        const { data: existingAd } = await supabase
          .from('advertisers')
          .select('id')
          .eq('business_id', bizId)
          .eq('issue', row.issue)
          .maybeSingle()
        if (existingAd) {
          skipped++
          rowResults.push({ row: rowNum, name: rowName, status: 'skipped' })
          continue
        }
      } else {
        // No business ID — dedup by issue + amount + contact name fingerprint
        const { data: existingAd } = await supabase
          .from('advertisers')
          .select('id')
          .is('business_id', null)
          .eq('issue', row.issue)
          .eq('amount', row.amount || 0)
          .eq('layout_notes', row.layoutNotes ?? '')
          .maybeSingle()
        if (existingAd) {
          skipped++
          rowResults.push({ row: rowNum, name: rowName, status: 'skipped' })
          continue
        }
      }

      // 4 — upsert contact
      let contactId: string | null = null
      if (row.contactName && bizId) {
        const nameParts = row.contactName.trim().split(' ')
        const firstName = nameParts[0] ?? row.contactName
        const lastName  = nameParts.slice(1).join(' ') || null
        const { data: existingC } = await supabase
          .from('contacts')
          .select('id')
          .eq('business_id', bizId)
          .eq('first_name', firstName)
          .maybeSingle()
        if (existingC) {
          contactId = existingC.id
        } else {
          const { data: newC } = await supabase
            .from('contacts')
            .insert({ business_id: bizId, first_name: firstName, last_name: lastName, is_primary: true, email: row.contactEmail, phone: row.contactPhone })
            .select('id')
            .maybeSingle()
          contactId = newC?.id ?? null
        }
      }

      // 5 — insert advertiser record
      const { error: adErr } = await supabase.from('advertisers').insert({
        publication_id:   pubId ?? null,
        business_id:      bizId,
        contact_id:       contactId,
        issue:            row.issue,
        stage:            row.stage || 'Closed Won',
        amount:           row.amount || 0,
        directory:        row.directory ?? false,
        layout_notes:     row.layoutNotes ?? '',
        social:           row.social ?? null,
        invoice_type:     row.invoiceType ?? 'Invoice',
        designer:         row.designer ?? '',
        design_status:    row.designStatus || 'Pick-up',
        size:             row.size || 0.25,
        orientation:      row.orientation ?? null,
        special_position: row.specialPosition ?? null,
        specific_months:  [],
        expires:          row.expires ?? '',
        description:      row.description ?? '',
      })

      if (adErr) {
        const msg = `Insert failed: ${rowName} — ${adErr.message}`
        errors.push(msg)
        rowResults.push({ row: rowNum, name: rowName, status: 'error', message: msg })
        continue
      }
      inserted++
      rowResults.push({ row: rowNum, name: rowName, status: 'ok' })
    } catch (e: unknown) {
      const msg = `Row error: ${rowName} — ${e instanceof Error ? e.message : String(e)}`
      errors.push(msg)
      rowResults.push({ row: rowNum, name: rowName, status: 'error', message: msg })
    }
  }

  return { inserted, businessesCreated, skipped, errors, rowResults }
}
