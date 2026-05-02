/**
 * Guide CSV Import
 * Imports 7 guide CSVs + calendar into guide_listings and calendar_events.
 *
 * Usage: npm run import-guides
 *
 * CSV files expected in:
 *   imports/guides/*.csv
 *   imports/calendar/*.csv
 *
 * Run migration 028 in Supabase before running this script.
 */

import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'
import { createClient } from '@supabase/supabase-js'

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dotenv = require('dotenv')
  dotenv.config({ path: path.join(process.cwd(), '.env.local') })
  dotenv.config({ path: path.join(process.cwd(), '.env') })
} catch {
  // dotenv not installed — env vars must be set in shell
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const LISTING_YEAR = 2026
const GUIDES_DIR = path.join(process.cwd(), 'imports', 'guides')
const CALENDAR_DIR = path.join(process.cwd(), 'imports', 'calendar')

const GUIDE_CSV_MAP: Record<string, string> = {
  'private-school': 'private-school-guide.csv',
  'childcare':      'childcare-guide.csv',
  'healthy-kids':   'healthy-kids-guide.csv',
  'summer-fun':     'summer-fun-guide.csv',
  'birthday-party': 'birthday-party-guide.csv',
  'afterschool':    'afterschool-guide.csv',
  'special-needs':  'special-needs-guide.csv',
}

// Core fields that go into advertiser_accounts — exclude from guide_data
const CORE_FIELDS = new Set([
  'advertiser', 'business', 'name', 'address', 'city', 'state', 'zip',
  'phone', 'website', 'email', 'contact',
])

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

function tryParseDate(raw: string): string | null {
  if (!raw) return null
  // Handle range like "Now-May 10, 2026" — take the last part
  if (/^now/i.test(raw) && raw.includes('-')) {
    raw = raw.replace(/^now-?/i, '').trim()
  }
  const d = new Date(raw)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  return null
}

async function findOrCreateAdvertiser(row: Record<string, string>): Promise<string> {
  const businessName = (row.business ?? row.name ?? '').trim()
  if (!businessName) throw new Error('No business name in row')

  const slug = slugify(businessName)

  const { data: existing } = await supabase
    .from('advertiser_accounts')
    .select('id')
    .eq('slug', slug)
    .single()

  if (existing) return existing.id

  const cityStateZip = [row.city, row.state, row.zip].filter(Boolean).join(', ').trim() || null
  const contactName  = (row.contact ?? row.leadership ?? '').trim() || null

  const { data: created, error } = await supabase
    .from('advertiser_accounts')
    .insert({
      business_name:       businessName,
      slug,
      address:             (row.address ?? '').trim() || null,
      city_state_zip:      cityStateZip,
      website_url:         (row.website ?? '').trim() || null,
      office_phone:        (row.phone ?? '').trim() || null,
      contact_email:       (row.email ?? '').trim() || null,
      contact_name:        contactName,
      contact_person_name: contactName,
      is_active:           true,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Create advertiser "${businessName}": ${error.message}`)
  return created!.id
}

async function importGuide(guideSlug: string, csvFile: string): Promise<void> {
  console.log(`\n  Importing ${guideSlug}...`)

  const filePath = path.join(GUIDES_DIR, csvFile)
  const content  = fs.readFileSync(filePath, 'utf-8')

  const rows: Record<string, string>[] = parse(content, {
    columns:          true,
    skip_empty_lines: true,
    trim:             true,
    relax_column_count: true,
  })

  let upserted = 0
  let errCount = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const businessName = (row.business ?? '').trim()
    if (!businessName) continue

    try {
      const advertiserId = await findOrCreateAdvertiser(row)
      const isFeatured   = row.advertiser === 'a'

      // Store all non-core CSV fields in guide_data
      const guideData: Record<string, string> = {}
      for (const [key, val] of Object.entries(row)) {
        if (!CORE_FIELDS.has(key) && val && val.trim()) {
          guideData[key] = val.trim()
        }
      }

      const { error } = await supabase
        .from('guide_listings')
        .upsert(
          {
            advertiser_account_id: advertiserId,
            guide_type_slug:       guideSlug,
            listing_year:          LISTING_YEAR,
            listing_tier:          isFeatured ? 'featured' : 'free',
            category:              (row.category ?? '').trim() || null,
            guide_data:            guideData,
            is_published:          true,
            source_csv_filename:   csvFile,
            source_csv_row_number: i + 2,
            imported_at:           new Date().toISOString(),
          },
          { onConflict: 'advertiser_account_id,guide_type_slug,listing_year' },
        )

      if (error) {
        console.error(`    row ${i + 2} "${businessName}": ${error.message}`)
        errCount++
      } else {
        upserted++
      }
    } catch (e: unknown) {
      console.error(`    row ${i + 2} "${businessName}": ${e instanceof Error ? e.message : String(e)}`)
      errCount++
    }
  }

  console.log(`    ${upserted} upserted, ${errCount} errors`)
}

async function importCalendar(csvFile: string): Promise<void> {
  console.log(`\n  Importing calendar: ${csvFile}...`)

  const filePath = path.join(CALENDAR_DIR, csvFile)
  const content  = fs.readFileSync(filePath, 'utf-8')

  const rows: Record<string, string>[] = parse(content, {
    columns:          true,
    skip_empty_lines: true,
    trim:             true,
    relax_column_count: true,
  })

  let inserted = 0
  let errCount = 0

  for (let i = 0; i < rows.length; i++) {
    const row   = rows[i]
    const title = (row.title ?? '').trim()
    if (!title) continue

    const startDate = tryParseDate(row.start_date ?? '')
    const endDate   = tryParseDate(row.end_date ?? '') ?? tryParseDate(row.start_date ?? '')

    const costText = (row.cost ?? '').trim()
    const isFree   = !costText || /free/i.test(costText) || costText === '0' || costText === '$0'

    // Unique slug per event + import batch to avoid conflicts on re-runs
    const baseSlug = slugify(title)
    const slug     = `${baseSlug}-${Date.now()}-${i}`

    const { error } = await supabase
      .from('calendar_events')
      .insert({
        slug,
        title,
        start_date:          startDate,
        end_date:            endDate,
        start_time:          (row.start_time ?? '').trim() || null,
        end_time:            (row.end_time ?? '').trim() || null,
        location_name:       (row.location ?? '').trim() || null,
        address:             (row.address ?? '').trim() || null,
        email:               (row.email ?? '').trim() || null,
        phone:               (row.phone ?? '').trim() || null,
        website:             (row.website ?? '').trim() || null,
        cost_text:           costText || null,
        is_free:             isFree,
        description:         (row.description ?? '').trim() || null,
        source_csv_filename: csvFile,
        status:              'published',
        imported_at:         new Date().toISOString(),
      })

    if (error) {
      console.error(`    row ${i + 2} "${title}": ${error.message}`)
      errCount++
    } else {
      inserted++
    }
  }

  console.log(`    ${inserted} inserted, ${errCount} errors`)
}

async function main(): Promise<void> {
  console.log('Guide CSV Import — starting\n')

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL — add to .env.local')
    process.exit(1)
  }

  console.log('Guide listings:')
  for (const [guideSlug, csvFile] of Object.entries(GUIDE_CSV_MAP)) {
    const filePath = path.join(GUIDES_DIR, csvFile)
    if (!fs.existsSync(filePath)) {
      console.log(`  Skipping ${guideSlug}: file not found`)
      continue
    }
    await importGuide(guideSlug, csvFile)
  }

  console.log('\nCalendar events:')
  if (fs.existsSync(CALENDAR_DIR)) {
    const calFiles = fs.readdirSync(CALENDAR_DIR).filter(f => f.endsWith('.csv'))
    for (const f of calFiles) {
      await importCalendar(f)
    }
  } else {
    console.log('  No calendar directory found — skipping')
  }

  console.log('\nImport complete.')
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
