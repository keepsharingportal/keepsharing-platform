/**
 * Generates supabase/seed/family-guide-v2-generated.sql from the 2026 CSV.
 *
 * If SUPABASE_SERVICE_ROLE_KEY is set in .env.local, also applies to DB directly.
 * If not, outputs SQL for Jason to paste into the Supabase SQL editor.
 *
 * Usage:
 *   npx tsx scripts/seed-family-guide-from-csv.ts
 *   npm run seed:family-guide
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// ── Load .env.local ────────────────────────────────────────────────────────────

function loadEnvFile(file: string): void {
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim()
  }
}
loadEnvFile(path.join(process.cwd(), '.env.local'))

// ── CSV parser ─────────────────────────────────────────────────────────────────

function parseCSV(raw: string): Record<string, string>[] {
  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQ = false
  let i = 0

  while (i < text.length) {
    const ch = text[i]
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 2; continue }
      if (ch === '"') { inQ = false; i++; continue }
      cell += ch; i++
    } else {
      if (ch === '"') { inQ = true; i++; continue }
      if (ch === ',') { row.push(cell.trim()); cell = ''; i++; continue }
      if (ch === '\n') {
        row.push(cell.trim()); cell = ''
        if (row.some(c => c !== '')) rows.push(row)
        row = []; i++; continue
      }
      cell += ch; i++
    }
  }
  row.push(cell.trim())
  if (row.some(c => c !== '')) rows.push(row)

  if (rows.length < 2) return []
  const headers = rows[0]
  return rows.slice(1).map(cells => {
    const obj: Record<string, string> = {}
    headers.forEach((h, idx) => { obj[h.trim()] = (cells[idx] ?? '').trim() })
    return obj
  })
}

// ── Slug helpers ───────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name.toLowerCase()
    .replace(/['']/g, '').replace(/[^a-z0-9\s-]/g, ' ')
    .trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 70)
}

function uniqueSlug(base: string, used: Set<string>): string {
  if (!used.has(base)) { used.add(base); return base }
  for (let n = 2; n < 200; n++) {
    const s = `${base}-${n}`
    if (!used.has(s)) { used.add(s); return s }
  }
  return `${base}-${Date.now()}`
}

// ── Mappings ───────────────────────────────────────────────────────────────────

const GROUP_ORDER: Record<string, number> = {
  'Schools': 1, 'Childcare & Preschool': 2, 'Pediatric Care': 3, 'Healthcare': 4,
  'Faith Communities': 5, 'Family Activities': 6, 'Sports & Recreation': 7,
  'Food & Dining': 8, 'Community & Connection': 9, 'Day Trips & Family Getaways': 10,
  'Date Nights & Adult Time': 11, 'Family Shopping': 12, 'Mom Self-Care': 13,
  'Family Services': 14, 'Senior & Multi-Generational': 15,
}

const GROUP_ICONS: Record<string, string> = {
  'Schools': 'GraduationCap', 'Childcare & Preschool': 'Baby', 'Pediatric Care': 'Stethoscope',
  'Healthcare': 'Hospital', 'Faith Communities': 'Church', 'Family Activities': 'MapPin',
  'Sports & Recreation': 'Trophy', 'Food & Dining': 'UtensilsCrossed',
  'Community & Connection': 'Users', 'Day Trips & Family Getaways': 'Plane',
  'Date Nights & Adult Time': 'Heart', 'Family Shopping': 'ShoppingBag',
  'Mom Self-Care': 'Sparkles', 'Family Services': 'Home',
  'Senior & Multi-Generational': 'Users2',
}

function parseTier(raw: string): string {
  const t = raw.toLowerCase().trim()
  return t === 'featured' ? 'featured' : t === 'enhanced' ? 'enhanced' : 'free'
}

function sqlStr(s: string | null | undefined): string {
  if (s === null || s === undefined || s === '') return 'NULL'
  const escaped = s.replace(/'/g, "''").replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
  return `'${escaped}'`
}

function sqlArr(items: string[]): string {
  if (!items.length) return `'{}'`
  return `ARRAY[${items.map(i => sqlStr(i)).join(',')}]::text[]`
}

function sqlBool(b: boolean): string { return b ? 'TRUE' : 'FALSE' }

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const seedDir = path.join(process.cwd(), 'docs', 'seed')
  const csvFiles = fs.readdirSync(seedDir).filter(f => f.includes('family-guide-listings') && f.endsWith('.csv'))
  if (!csvFiles.length) { console.error('❌  No CSV found in docs/seed/'); process.exit(1) }

  const csvPath = path.join(seedDir, csvFiles[0])
  console.log(`📄 Reading: ${csvFiles[0]}`)
  const rows = parseCSV(fs.readFileSync(csvPath, 'utf-8'))
  console.log(`   Parsed ${rows.length} rows`)

  // ── Collect unique categories preserving CSV order ─────────────────────────
  type CatInfo = { group: string; category: string; slug: string; displayOrder: number }
  const catMap = new Map<string, CatInfo>()  // "group|||category" → CatInfo
  const usedCatSlugs = new Set<string>()
  let needsResearchCount = 0

  for (const row of rows) {
    const { group, category, business_name } = row
    if (!group || !category) continue
    if (business_name?.startsWith('[')) { needsResearchCount++; }
    const key = `${group}|||${category}`
    if (!catMap.has(key)) {
      const slug = uniqueSlug(toSlug(category), usedCatSlugs)
      const displayOrder = (GROUP_ORDER[group] ?? 99) * 100 + catMap.size
      catMap.set(key, { group, category, slug, displayOrder })
    }
  }
  console.log(`   Categories: ${catMap.size}, [NEEDS RESEARCH]: ${needsResearchCount}`)

  // ── Generate SQL ────────────────────────────────────────────────────────────
  const lines: string[] = []
  lines.push('-- ============================================================')
  lines.push('-- River Region Family Resource Guide — 2026 Real Data Seed')
  lines.push(`-- Generated: ${new Date().toISOString()}`)
  lines.push(`-- Source:    ${csvFiles[0]}`)
  lines.push('-- Run AFTER migrations 012 and 013 in the Supabase SQL editor')
  lines.push('-- ============================================================')
  lines.push('')
  lines.push('-- Clear existing guide data (safe to re-run)')
  lines.push(`DELETE FROM guide_listings`)
  lines.push(`  WHERE category_id IN (`)
  lines.push(`    SELECT id FROM guide_categories WHERE guide_slug = 'newcomer-guide'`)
  lines.push(`  );`)
  lines.push(`DELETE FROM guide_categories WHERE guide_slug = 'newcomer-guide';`)
  lines.push('')
  lines.push('-- ── Categories ──────────────────────────────────────────────────')
  lines.push(`INSERT INTO guide_categories`)
  lines.push(`  (guide_slug, publication_id, slug, name, parent_group, display_order, icon_name, show_in_print)`)
  lines.push(`VALUES`)

  const catValues: string[] = []
  for (const { group, category, slug, displayOrder } of catMap.values()) {
    const icon = GROUP_ICONS[group] ?? 'Folder'
    catValues.push(
      `  ('newcomer-guide', (SELECT id FROM publications WHERE abbrev='RRP'), ` +
      `${sqlStr(slug)}, ${sqlStr(category)}, ${sqlStr(group)}, ${displayOrder}, ${sqlStr(icon)}, TRUE)`
    )
  }
  lines.push(catValues.join(',\n'))
  lines.push('ON CONFLICT (guide_slug, publication_id, slug) DO UPDATE SET')
  lines.push('  parent_group = EXCLUDED.parent_group,')
  lines.push('  name = EXCLUDED.name,')
  lines.push('  display_order = EXCLUDED.display_order;')
  lines.push('')

  // ── Build listing insert rows ───────────────────────────────────────────────
  lines.push('-- ── Listings ────────────────────────────────────────────────────')
  const usedListingSlugs = new Set<string>()
  const catOrderCount = new Map<string, number>()
  let insertedCount = 0
  let skippedCount = 0

  const listingRows: string[] = []

  for (const row of rows) {
    const { group, category, subcategory, business_name } = row
    if (!group || !category || !business_name) continue
    if (business_name.startsWith('[')) { skippedCount++; continue }

    const catKey = `${group}|||${category}`
    const catInfo = catMap.get(catKey)
    if (!catInfo) continue

    const slug = uniqueSlug(toSlug(business_name), usedListingSlugs)
    const order = catOrderCount.get(catKey) ?? 0
    catOrderCount.set(catKey, order + 1)

    const tier = parseTier(row.tier_2026)
    const acceptsNew = row.accepting_new_patients?.trim()
      ? (row.accepting_new_patients.trim().toUpperCase() === 'YES' ? 'TRUE' : 'FALSE')
      : 'NULL'
    const servesPeds = sqlStr(row.serves_pediatrics || null)
    const military   = sqlStr(row.offers_military_discount || null)
    const tags       = row.tags?.trim()
      ? sqlArr(row.tags.split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean))
      : `'{}'`
    const needsResearch = 'FALSE'
    const website = row.website ? row.website.split('\n')[0].trim() : ''

    listingRows.push(
      `  ((SELECT id FROM guide_categories WHERE guide_slug='newcomer-guide' AND slug=${sqlStr(catInfo.slug)}), ` +
      `${sqlStr(slug)}, ${sqlStr(business_name)}, ${sqlStr(row.address||null)}, ` +
      `${sqlStr(row.city||null)}, ${sqlStr(row.zip||null)}, ${sqlStr(row.phone||null)}, ` +
      `${sqlStr(website||null)}, ${sqlStr(row.email||null)}, ` +
      `${sqlStr(row.description?.replace(/\n/g,' ')||null)}, ${sqlStr(row.editorial_blurb||null)}, ` +
      `${sqlStr(tier)}, ${acceptsNew}, ${servesPeds}, ${military}, ` +
      `${tags}, ${sqlStr(subcategory||null)}, ${needsResearch}, ${sqlStr(row.notes||null)}, ${order})`
    )
    insertedCount++
  }

  lines.push(`INSERT INTO guide_listings`)
  lines.push(`  (category_id, slug, business_name, address, city, zip, phone, website, email,`)
  lines.push(`   description, editorial_blurb, listing_tier, accepting_new_patients,`)
  lines.push(`   serves_pediatrics, offers_military_discount, tags, subcategory,`)
  lines.push(`   needs_research, notes, display_order)`)
  lines.push(`VALUES`)
  lines.push(listingRows.join(',\n'))
  lines.push('ON CONFLICT (slug) DO NOTHING;')
  lines.push('')
  lines.push(`-- Summary: ${catMap.size} categories, ${insertedCount} listings, ${skippedCount} [NEEDS RESEARCH] skipped`)

  // ── Write output SQL ────────────────────────────────────────────────────────
  const outPath = path.join(process.cwd(), 'supabase', 'seed', 'family-guide-v2-generated.sql')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, lines.join('\n'), 'utf-8')
  console.log(`\n✅ SQL written to: supabase/seed/family-guide-v2-generated.sql`)
  console.log(`   ${catMap.size} categories · ${insertedCount} listings · ${skippedCount} [NEEDS RESEARCH] skipped`)

  // ── Optionally apply via Supabase client if service role key present ────────
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL
  const srvKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && srvKey) {
    console.log('\n🔑 Service role key found — applying to database …')
    await applyToDatabase(url, srvKey, catMap, rows, usedListingSlugs)
  } else {
    console.log('\n📋 Next step: paste supabase/seed/family-guide-v2-generated.sql into')
    console.log('   Supabase dashboard → SQL editor → Run')
    console.log('   (or add SUPABASE_SERVICE_ROLE_KEY to .env.local and re-run this script)')
  }
}

async function applyToDatabase(
  url: string, srvKey: string,
  catMap: Map<string, { group: string; category: string; slug: string; displayOrder: number }>,
  rows: Record<string, string>[],
  _usedSlugs: Set<string>
) {
  const supabase: SupabaseClient = createClient(url, srvKey, { auth: { persistSession: false } })

  const { data: pub } = await supabase.from('publications').select('id').eq('abbrev', 'RRP').maybeSingle()
  if (!pub) { console.error('❌  Cannot find RRP publication'); return }
  const pubId = pub.id as string

  // Delete existing
  const { data: oldCats } = await supabase.from('guide_categories').select('id').eq('guide_slug', 'newcomer-guide')
  if (oldCats?.length) {
    await supabase.from('guide_listings').delete().in('category_id', oldCats.map((c: { id: string }) => c.id))
    await supabase.from('guide_categories').delete().in('id', oldCats.map((c: { id: string }) => c.id))
  }

  // Insert categories
  const catIdMap = new Map<string, string>()
  for (const { group, category, slug, displayOrder } of catMap.values()) {
    const { data } = await supabase.from('guide_categories')
      .insert({ guide_slug: 'newcomer-guide', publication_id: pubId, slug, name: category, parent_group: group, display_order: displayOrder, icon_name: GROUP_ICONS[group] ?? 'Folder', show_in_print: true })
      .select('id').single()
    if (data) catIdMap.set(`${group}|||${category}`, (data as { id: string }).id)
  }

  // Insert listings
  let inserted = 0
  const usedSlugs2 = new Set<string>()
  const catOrdCount = new Map<string, number>()
  for (const row of rows) {
    const { group, category, business_name } = row
    if (!group || !category || !business_name || business_name.startsWith('[')) continue
    const catId = catIdMap.get(`${group}|||${category}`)
    if (!catId) continue
    const slug = uniqueSlug(toSlug(business_name), usedSlugs2)
    const ord = catOrdCount.get(catId) ?? 0
    catOrdCount.set(catId, ord + 1)
    const { error } = await supabase.from('guide_listings').insert({
      category_id: catId, slug, business_name: business_name.trim(),
      address: row.address || null, city: row.city || null, zip: row.zip || null,
      phone: row.phone || null, website: row.website?.split('\n')[0].trim() || null,
      email: row.email || null,
      description: row.description?.replace(/\n/g,' ') || null,
      editorial_blurb: row.editorial_blurb || null,
      listing_tier: parseTier(row.tier_2026),
      accepting_new_patients: row.accepting_new_patients?.toUpperCase() === 'YES' ? true : row.accepting_new_patients?.trim() ? false : null,
      serves_pediatrics: row.serves_pediatrics || null,
      offers_military_discount: row.offers_military_discount || null,
      tags: row.tags?.trim() ? row.tags.split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean) : [],
      subcategory: row.subcategory || null,
      needs_research: false, notes: row.notes || null, display_order: ord,
    })
    if (!error) inserted++
  }
  console.log(`✅ DB applied: ${inserted} listings inserted`)
}

main().catch(err => { console.error(err); process.exit(1) })
