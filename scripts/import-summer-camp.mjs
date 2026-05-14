// ── scripts/import-summer-camp.mjs ────────────────────────────────────────────
// One-shot importer for RRP Summer Camp Guide CSV.
//
//   node --env-file=.env.local scripts/import-summer-camp.mjs
//
// Mirrors import-summer-fun.mjs but the CSV has an extra `location` column
// between `business` and `address`. guide_type_slug = 'summer-camp'.

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const CSV_PATH        = 'imports/guides/summer-camp-guide.csv'
const GUIDE_TYPE_SLUG = 'summer-camp'
const SOURCE_TAG      = 'RRP Summer Camp Guide CSV'
const LISTING_YEAR    = 2026

// ── CSV parser (RFC 4180-ish) ─────────────────────────────────────────────────
function parseCSV(text) {
  const rows = []
  let row = [], cell = '', inQ = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], nx = text[i + 1]
    if (inQ) {
      if (ch === '"' && nx === '"') { cell += '"'; i++ }
      else if (ch === '"') inQ = false
      else cell += ch
    } else {
      if (ch === '"') inQ = true
      else if (ch === ',') { row.push(cell); cell = '' }
      else if (ch === '\n' || (ch === '\r' && nx === '\n')) {
        row.push(cell); cell = ''
        rows.push(row); row = []
        if (ch === '\r') i++
      } else cell += ch
    }
  }
  row.push(cell)
  if (row.some(c => c !== '')) rows.push(row)
  return rows
}

function toSlug(s) {
  return String(s)
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

function isBlank(v) { return v == null || String(v).trim() === '' }
function clean(v)   { return isBlank(v) ? null : String(v).trim() }

// ── Main ──────────────────────────────────────────────────────────────────────
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPA_URL || !SUPA_KEY) {
  console.error('Missing Supabase env vars. Use --env-file=.env.local')
  process.exit(1)
}
const supa = createClient(SUPA_URL, SUPA_KEY)

const raw  = readFileSync(CSV_PATH, 'utf8')
const rows = parseCSV(raw)

const [header, ...body] = rows
const idx = Object.fromEntries(header.map((h, i) => [h.trim().toLowerCase(), i]))
console.log(`CSV: ${body.length} data rows`)
console.log(`Header: ${header.map(h => h.trim()).join(' | ')}`)

const required = ['advertiser','category','business','location','address','city','state','zip','phone','website','email','ages','description']
for (const r of required) if (idx[r] === undefined) { console.error(`Missing column: ${r}`); process.exit(1) }

// ── Pass 1: parse rows, carry forward category ────────────────────────────────
let currentCategory = ''
const parsed = []
let rowNum = 1
for (const row of body) {
  rowNum++
  const cat = clean(row[idx.category])
  if (cat) currentCategory = cat

  const business = clean(row[idx.business])
  if (!business) continue   // skip blank trailer rows + "Helpful Camp Websites" row

  parsed.push({
    rowNum,
    advertiser:  clean(row[idx.advertiser]),
    category:    currentCategory || null,
    business,
    location:    clean(row[idx.location]),
    address:     clean(row[idx.address]),
    city:        clean(row[idx.city]),
    state:       clean(row[idx.state]) || 'AL',
    zip:         clean(row[idx.zip]),
    phone:       clean(row[idx.phone]),
    website:     clean(row[idx.website]),
    email:       clean(row[idx.email]),
    ages:        clean(row[idx.ages]),
    description: clean(row[idx.description]),
  })
}

const catCounts = {}
for (const p of parsed) catCounts[p.category ?? '(uncategorized)'] = (catCounts[p.category ?? '(uncategorized)'] ?? 0) + 1
console.log(`Parsed ${parsed.length} usable rows in ${Object.keys(catCounts).length} categories`)
for (const [c, n] of Object.entries(catCounts).sort((a,b) => b[1]-a[1])) console.log(`  ${c}: ${n}`)

// ── Pass 2: dedup slugs ───────────────────────────────────────────────────────
const usedSlugs = new Set()
for (const p of parsed) {
  let s = toSlug(p.business)
  if (!s) s = `summer-camp-listing-${p.rowNum}`
  if (usedSlugs.has(s)) {
    for (let i = 2; i < 200; i++) { const c = `${s}-${i}`; if (!usedSlugs.has(c)) { s = c; break } }
  }
  usedSlugs.add(s)
  p.slug = s
}

// ── Pass 3: import ────────────────────────────────────────────────────────────
let inserted = 0, updated = 0, skipped = 0, errors = []

for (const p of parsed) {
  try {
    const tier = p.advertiser === 'a' ? 'featured' : 'community'
    const csz  = p.city ? `${p.city}, ${p.state}${p.zip ? ' ' + p.zip : ''}` : (p.state || null)

    // Find existing advertiser_account by slug
    const { data: existing, error: findErr } = await supa
      .from('advertiser_accounts')
      .select('id')
      .eq('slug', p.slug)
      .maybeSingle()
    if (findErr) throw findErr

    let acctId = existing?.id

    if (!acctId) {
      const { data: newAcct, error: acctErr } = await supa
        .from('advertiser_accounts')
        .insert({
          slug:              p.slug,
          business_name:     p.business,
          office_phone:      p.phone,
          contact_email:     p.email,
          website_url:       p.website,
          address:           p.address,
          city_state_zip:    csz,
          package_tier:      null,
          onboarding_status: 'imported',
        })
        .select('id')
        .single()
      if (acctErr) throw acctErr
      acctId = newAcct.id
    }

    // Build guide_data JSONB — preserve every CSV field, plus the extra `location` column
    const guideData = {
      ages:           p.ages,
      category:       p.category,
      activity_type:  p.category,
      camp_type:      p.category,    // surfaced on detail page as "Type"
      description:    p.description,
      location:       p.location,    // e.g. "Armory Learning Arts Center"
      address:        p.address,
      city:           p.city,
      state:          p.state,
      zip:            p.zip,
      phone:          p.phone,
      website:        p.website,
      email:          p.email,
      source:         SOURCE_TAG,
    }
    for (const k of Object.keys(guideData)) if (guideData[k] == null) delete guideData[k]

    // Upsert guide_listings
    const { data: existingListing } = await supa
      .from('guide_listings')
      .select('id, guide_data')
      .eq('advertiser_account_id', acctId)
      .eq('guide_type_slug', GUIDE_TYPE_SLUG)
      .maybeSingle()

    if (existingListing) {
      const merged = { ...existingListing.guide_data, ...guideData }
      const { error: updErr } = await supa
        .from('guide_listings')
        .update({
          category:      p.category,
          listing_tier:  tier,
          is_published:  true,
          guide_data:    merged,
          updated_at:    new Date().toISOString(),
        })
        .eq('id', existingListing.id)
      if (updErr) throw updErr
      updated++
    } else {
      const { error: insErr } = await supa
        .from('guide_listings')
        .insert({
          advertiser_account_id:  acctId,
          guide_type_slug:        GUIDE_TYPE_SLUG,
          listing_year:           LISTING_YEAR,
          listing_tier:           tier,
          category:               p.category,
          guide_data:             guideData,
          is_published:           true,
          display_order:          tier === 'featured' ? 100 : 500,
          source_csv_filename:    'summer-camp-guide.csv',
          source_csv_row_number:  p.rowNum,
          imported_at:            new Date().toISOString(),
        })
      if (insErr) throw insErr
      inserted++
    }

    if ((inserted + updated) % 25 === 0) {
      console.log(`  progress: ${inserted} new, ${updated} updated, ${errors.length} errors`)
    }
  } catch (e) {
    skipped++
    errors.push({ business: p.business, message: e.message ?? String(e) })
    if (errors.length < 5) console.error(`  ERR ${p.business}: ${e.message ?? e}`)
  }
}

console.log('\n=== IMPORT COMPLETE ===')
console.log(`  inserted: ${inserted}`)
console.log(`  updated:  ${updated}`)
console.log(`  skipped:  ${skipped}`)
console.log(`  errors:   ${errors.length}`)
if (errors.length > 0) {
  console.log('\nFirst 10 errors:')
  for (const e of errors.slice(0, 10)) console.log(`  ${e.business}: ${e.message}`)
}

const { count } = await supa
  .from('guide_listings')
  .select('id', { count: 'exact', head: true })
  .eq('guide_type_slug', GUIDE_TYPE_SLUG)
console.log(`\nFinal count in DB for ${GUIDE_TYPE_SLUG}: ${count}`)
