// POST /api/admin/print-placements/import-csv
//
// Two-pass import for the editor's historical CSVs (any past month she
// wants to back-fill — e.g. 'here's what ran in Jun 2025').
//
// Mode 1: { mode: 'plan', issue_month, rows }
//   Returns a per-row plan WITHOUT writing anything:
//     - 'matched'    → exact case-insensitive match on business_name
//     - 'fuzzy'      → no exact match, but ≥0.85 similarity candidate(s)
//                      exist; editor must pick one (or 'new') before commit
//     - 'new'        → no plausible match; will create a new advertiser
//     - 'duplicate'  → an existing placement on issue_month already covers
//                      this advertiser; will be skipped
//
// Mode 2: { mode: 'commit', issue_month, resolutions }
//   `resolutions` is the editor-confirmed per-row decision:
//     { row, advertiser_id?: string, create_new?: { business_name: string } }
//   Commits everything in one pass, returning created/skipped counts.
//
// Missing fields default to:
//   design 'pickup' (CSVs are historical = pickup-style records),
//   directory false, is_ongoing true, expires/social null, price null.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalize, similarity } from '@/lib/advertisers/dedup'
import {
  coerceBool, coerceDesign, coerceExpires, coerceLayout,
  coerceMoney, coerceSize, coerceStatus,
} from '@/app/admin/print-layout/csv-coerce'

export const runtime = 'nodejs'

const YYYYMM = /^[0-9]{4}-[0-9]{2}$/

// One row as parsed client-side from the CSV. All strings; conversion
// happens server-side so coercion rules live in one place.
export interface CsvRow {
  business:      string
  design?:       string
  directory?:    string | boolean
  size?:         string | number
  layout?:       string
  price?:        string | number
  social_budget?: string | number
  layout_notes?: string
  expires_month?: string
  status?:       string                  // 'Ongoing' | 'Check' | blank
}

interface PlanBody {
  mode:        'plan'
  issue_month: string
  rows:        CsvRow[]
}

interface CommitBody {
  mode:        'commit'
  issue_month: string
  resolutions: Array<{
    row:           CsvRow
    advertiser_id?: string                // editor picked an existing one
    create_new?:    { business_name: string }
    skip?:          boolean
  }>
}

type Body = PlanBody | CommitBody

interface PlannedRow {
  index:   number
  input:   CsvRow
  status:  'matched' | 'fuzzy' | 'new' | 'duplicate'
  matched_id?:        string
  matched_name?:      string
  fuzzy_candidates?:  Array<{ id: string; name: string; score: number }>
}


export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as Body | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  if (!YYYYMM.test(body.issue_month)) {
    return NextResponse.json({ error: 'issue_month must be YYYY-MM' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Both modes need the advertiser list to match against. Pull names +
  // ids; cheap enough at ~thousands of rows.
  const advRes = await supabase
    .from('advertiser_accounts')
    .select('id, business_name')
    .limit(5000)
  if (advRes.error) {
    return NextResponse.json({ error: advRes.error.message }, { status: 500 })
  }
  const advertisers = (advRes.data ?? []) as Array<{ id: string; business_name: string }>
  // Pre-tokenize for fuzzy matching once.
  const advTokens = advertisers.map(a => ({ ...a, tokens: normalize(a.business_name) }))
  const exactByLower = new Map<string, { id: string; business_name: string }>()
  for (const a of advertisers) exactByLower.set(a.business_name.trim().toLowerCase(), a)

  if (body.mode === 'plan') {
    return handlePlan(supabase, body, advTokens, exactByLower)
  }
  if (body.mode === 'commit') {
    return handleCommit(supabase, body, exactByLower)
  }
  return NextResponse.json({ error: 'mode must be "plan" or "commit"' }, { status: 400 })
}

async function handlePlan(
  supabase: ReturnType<typeof createAdminClient>,
  body:     PlanBody,
  advTokens: Array<{ id: string; business_name: string; tokens: string[] }>,
  exactByLower: Map<string, { id: string; business_name: string }>,
) {
  // Pull the target month's existing rows so duplicates surface in the
  // plan instead of getting silently rejected on commit. Dedup key is
  // (advertiser_id, lowercase ad_label) — same business CAN have
  // multiple ads in one issue (Macon East Academy main brand AND a
  // Senior Ad variant). Re-imports of the same CSV row still dedup
  // because both advertiser AND label match.
  const existRes = await supabase
    .from('print_ad_placements')
    .select('advertiser_account_id, ad_label')
    .eq('issue_month', body.issue_month)
  if (existRes.error) {
    return NextResponse.json({ error: existRes.error.message }, { status: 500 })
  }
  const alreadyOnKeys = new Set(
    ((existRes.data ?? []) as Array<{ advertiser_account_id: string; ad_label: string | null }>)
      .map(r => dupKey(r.advertiser_account_id, r.ad_label))
  )

  const FUZZY_THRESHOLD = 0.85
  const plan: PlannedRow[] = []
  for (let i = 0; i < body.rows.length; i++) {
    const r       = body.rows[i]
    const biz     = (r.business ?? '').trim()
    if (!biz) continue                                     // skip empty rows
    const lower   = biz.toLowerCase()
    const exact   = exactByLower.get(lower)
    if (exact) {
      // Dedup check: same business AND same ad_label already on issue
      // means re-import of the same row → skip. Different ad_label
      // (Macon East Academy main brand vs Senior Ad variant) keeps
      // both as separate placements.
      if (alreadyOnKeys.has(dupKey(exact.id, biz))) {
        plan.push({ index: i, input: r, status: 'duplicate', matched_id: exact.id, matched_name: exact.business_name })
      } else {
        plan.push({ index: i, input: r, status: 'matched',   matched_id: exact.id, matched_name: exact.business_name })
      }
      continue
    }
    const rowTokens = normalize(biz)
    const candidates: Array<{ id: string; name: string; score: number }> = []
    for (const a of advTokens) {
      const score = similarity(rowTokens, a.tokens)
      if (score >= FUZZY_THRESHOLD) {
        candidates.push({ id: a.id, name: a.business_name, score })
      }
    }
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score)
      plan.push({ index: i, input: r, status: 'fuzzy', fuzzy_candidates: candidates.slice(0, 5) })
    } else {
      plan.push({ index: i, input: r, status: 'new' })
    }
  }

  // Counts for the modal summary header.
  const counts = {
    matched:   plan.filter(p => p.status === 'matched').length,
    fuzzy:     plan.filter(p => p.status === 'fuzzy').length,
    new:       plan.filter(p => p.status === 'new').length,
    duplicate: plan.filter(p => p.status === 'duplicate').length,
  }
  return NextResponse.json({ ok: true, plan, counts })
}

// Dedup key for placements: (advertiser_id, lowercase ad_label or '').
// Pulled into a helper so plan + commit agree on the same shape.
function dupKey(advertiserId: string, adLabel: string | null | undefined): string {
  return `${advertiserId}|${(adLabel ?? '').trim().toLowerCase()}`
}

// Slug from business name. Must satisfy advertiser_accounts.slug
// (NOT NULL UNIQUE); we generate a kebab-case slug and disambiguate
// against the existing slug set with a -2, -3, ... suffix.
function makeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')                       // strip apostrophes pre-tokenize
    .replace(/[^a-z0-9]+/g, '-')                // everything else → hyphen
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'advertiser'
}

async function handleCommit(
  supabase: ReturnType<typeof createAdminClient>,
  body:     CommitBody,
  exactByLower: Map<string, { id: string; business_name: string }>,
) {
  // Pre-load every existing slug so we can disambiguate without
  // round-tripping per insert. Cheap at thousands of advertisers.
  const slugRes = await supabase
    .from('advertiser_accounts')
    .select('slug')
    .limit(10000)
  const existingSlugs = new Set<string>(
    ((slugRes.data ?? []) as Array<{ slug: string }>).map(r => r.slug)
  )
  function uniqueSlug(name: string): string {
    const base = makeSlug(name)
    if (!existingSlugs.has(base)) { existingSlugs.add(base); return base }
    let n = 2
    while (existingSlugs.has(`${base}-${n}`)) n++
    const out = `${base}-${n}`
    existingSlugs.add(out)
    return out
  }
  // Re-check duplicates at commit time — protects against another editor
  // adding rows between plan and commit. Same (advertiser, ad_label)
  // dedup as the planner; see dupKey().
  const existRes = await supabase
    .from('print_ad_placements')
    .select('advertiser_account_id, ad_label')
    .eq('issue_month', body.issue_month)
  if (existRes.error) {
    return NextResponse.json({ error: existRes.error.message }, { status: 500 })
  }
  const alreadyOnKeys = new Set(
    ((existRes.data ?? []) as Array<{ advertiser_account_id: string; ad_label: string | null }>)
      .map(r => dupKey(r.advertiser_account_id, r.ad_label))
  )

  let createdAdvertisers = 0
  let createdPlacements  = 0
  let skippedDuplicate   = 0
  let skippedByEditor    = 0
  const errors: string[] = []
  const newAdvertiserNames: string[] = []

  // Build the placement rows; advertiser ids may need creation first.
  for (const res of body.resolutions) {
    if (res.skip) { skippedByEditor++; continue }
    let advertiserId = res.advertiser_id ?? null

    if (!advertiserId && res.create_new) {
      const name = res.create_new.business_name.trim()
      if (!name) { errors.push(`Row "${res.row.business}": create_new name was blank`); continue }
      // Race-safe re-lookup: another import in the same session may have
      // just created this name. Case-insensitive exact catches it.
      const existing = exactByLower.get(name.toLowerCase())
      if (existing) {
        advertiserId = existing.id
      } else {
        const slug = uniqueSlug(name)
        const insAdv = await supabase
          .from('advertiser_accounts')
          .insert({ business_name: name, slug })
          .select('id, business_name')
          .single()
        if (insAdv.error || !insAdv.data) {
          errors.push(`Could not create advertiser "${name}": ${insAdv.error?.message ?? 'unknown'}`)
          continue
        }
        advertiserId = insAdv.data.id as string
        exactByLower.set(name.toLowerCase(), { id: advertiserId, business_name: name })
        createdAdvertisers++
        newAdvertiserNames.push(name)
      }
    }

    if (!advertiserId) {
      errors.push(`Row "${res.row.business}": no advertiser_id and no create_new — nothing to attach to`)
      continue
    }
    const r = res.row
    const placementKey = dupKey(advertiserId, r.business)
    if (alreadyOnKeys.has(placementKey)) { skippedDuplicate++; continue }
    alreadyOnKeys.add(placementKey)    // prevent same-import re-uploads
    const payload = {
      advertiser_account_id: advertiserId,
      issue_month:           body.issue_month,
      design:                coerceDesign(r.design),
      directory:             coerceBool(r.directory),
      size:                  coerceSize(r.size),
      layout:                coerceLayout(r.layout),
      price:                 coerceMoney(r.price),
      social_budget:         coerceMoney(r.social_budget),
      layout_notes:          (r.layout_notes ?? '').toString().trim() || null,
      expires_month:         coerceExpires(r.expires_month),
      is_ongoing:            coerceStatus(r.status),
      // CSV 'Business' column is the AD name (e.g. 'Macon East Academy
      // Senior Ad'), which may differ from the canonical business it
      // attaches to. Preserve it verbatim as the placement's label.
      ad_label:              (r.business ?? '').trim() || null,
    }
    const ins = await supabase.from('print_ad_placements').insert(payload)
    if (ins.error) {
      errors.push(`Row "${r.business}": ${ins.error.message}`)
      continue
    }
    createdPlacements++
  }

  return NextResponse.json({
    ok: errors.length === 0,
    createdPlacements,
    createdAdvertisers,
    newAdvertiserNames,
    skippedDuplicate,
    skippedByEditor,
    errors,
  }, { status: errors.length === 0 ? 200 : 207 })
}
