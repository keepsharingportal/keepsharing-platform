// POST /api/admin/school-news/schools/bulk-import
// Body: { csv: string }
//
// CSV columns (header row required):
//   name, area, is_private, district, grade_band, contact_email, facebook_url, city, address
//
// - area MUST be one of: montgomery, autauga, elmore, pike-road
// - is_private accepts: yes/no, true/false, 1/0, private/public
// - grade_band (optional) MUST be one of: elementary, middle, high, k12, other
// - All other fields are optional and may be left blank
//
// Behavior: upsert by (market, name). Existing schools with the same name
// in the same market are UPDATED with the new fields (so re-importing a
// corrected sheet works cleanly).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { isValidArea, isValidGradeBand, parseBoolish } from '@/lib/school-news/areas'

export const runtime = 'nodejs'
export const maxDuration = 60

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

const MARKET = 'rrp'
const ALLOWED_COLUMNS = [
  'name', 'area', 'is_private', 'district', 'grade_band',
  'contact_email', 'facebook_url', 'city', 'address',
] as const

// Minimal RFC-4180-ish CSV parser. Handles quoted fields (including embedded
// commas, quotes-as-doubled-quotes, and newlines inside quotes). For real
// human-edited spreadsheets this is enough; we don't need a full library.
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  while (i < text.length) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue }
        inQuotes = false; i++; continue
      }
      field += c; i++; continue
    }
    if (c === '"')      { inQuotes = true; i++; continue }
    if (c === ',')      { row.push(field); field = ''; i++; continue }
    if (c === '\r')     { i++; continue }
    if (c === '\n')     { row.push(field); rows.push(row); row = []; field = ''; i++; continue }
    field += c; i++
  }
  // Flush trailing field/row
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { csv?: string } | null
  const csv = body?.csv ?? ''
  if (!csv.trim()) return NextResponse.json({ error: 'csv body is required' }, { status: 400 })

  const rows = parseCsv(csv).filter(r => r.some(cell => cell.trim().length > 0))
  if (rows.length < 2) {
    return NextResponse.json({ error: 'CSV needs at least a header row + 1 data row' }, { status: 400 })
  }

  const header = rows[0].map(h => h.trim().toLowerCase())
  const idx: Partial<Record<typeof ALLOWED_COLUMNS[number], number>> = {}
  for (const col of ALLOWED_COLUMNS) {
    const i = header.indexOf(col)
    if (i >= 0) idx[col] = i
  }
  if (idx.name === undefined || idx.area === undefined) {
    return NextResponse.json({
      error: `CSV must include at minimum "name" and "area" columns. Found: ${header.join(', ')}`,
    }, { status: 400 })
  }

  type Row = {
    name:          string
    area:          string
    is_private:    boolean
    district:      string | null
    grade_band:    string | null
    contact_email: string | null
    facebook_url:  string | null
    city:          string | null
    address:       string | null
  }
  const valid:   Row[]          = []
  const skipped: { line: number; reason: string }[] = []

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    const get = (col: typeof ALLOWED_COLUMNS[number]): string => {
      const i = idx[col]
      if (i === undefined) return ''
      return (cells[i] ?? '').trim()
    }

    const name = get('name')
    if (!name) { skipped.push({ line: r + 1, reason: 'missing name' }); continue }

    const area = get('area').toLowerCase()
    if (!isValidArea(area)) {
      skipped.push({ line: r + 1, reason: `invalid area "${area}" — must be montgomery/autauga/elmore/pike-road` })
      continue
    }

    const gradeBand = get('grade_band').toLowerCase()
    if (gradeBand && !isValidGradeBand(gradeBand)) {
      skipped.push({ line: r + 1, reason: `invalid grade_band "${gradeBand}"` })
      continue
    }

    valid.push({
      name,
      area,
      is_private:    parseBoolish(get('is_private')),
      district:      get('district')      || null,
      grade_band:    gradeBand            || null,
      contact_email: get('contact_email') || null,
      facebook_url:  get('facebook_url')  || null,
      city:          get('city')          || null,
      address:       get('address')       || null,
    })
  }

  if (valid.length === 0) {
    return NextResponse.json({
      error:   'No valid rows in CSV.',
      skipped,
    }, { status: 400 })
  }

  const supabase = supabaseAdmin()
  const upsertRows = valid.map(v => ({
    market: MARKET,
    name:          v.name,
    area:          v.area,
    is_private:    v.is_private,
    district:      v.district,
    grade_band:    v.grade_band,
    contact_email: v.contact_email,
    facebook_url:  v.facebook_url,
    city:          v.city,
    address:       v.address,
    status:        'active',
  }))

  const { data, error } = await supabase
    .from('schools')
    .upsert(upsertRows, { onConflict: 'market,name' })
    .select('id, name')
  if (error) {
    return NextResponse.json({ error: error.message, skipped }, { status: 500 })
  }

  revalidatePath('/admin/school-news/schools')
  revalidatePath('/admin/school-news')
  return NextResponse.json({
    success:  true,
    upserted: data?.length ?? 0,
    skipped,
  })
}
