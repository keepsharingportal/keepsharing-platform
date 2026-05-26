// GET /api/admin/school-news/export-print?issue_month=YYYY-MM
//   OR /api/admin/school-news/export-print?status=approved
//
// Streams back a ZIP containing:
//   - High-res JPEG for every approved bit (from school-bits-orig bucket)
//   - bits.csv — manifest InDesign Data Merge can ingest directly
//
// Filename convention: bit-{issue-month}-{county}-{school-slug}-{id8}.jpg
// CSV columns: image_file, school_name, area, district, title, blurb

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import JSZip from 'jszip'

export const runtime  = 'nodejs'
export const maxDuration = 120

const MARKET     = 'rrp'
const BUCKET_ORIG = 'school-bits-orig'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

interface BitRow {
  id:               string
  school_id:        string | null
  school_name:      string
  title:            string
  blurb:            string
  image_orig_path:  string | null
  issue_month:      string | null
}

interface SchoolRow {
  id:       string
  area:     string
  district: string | null
}

function csvEscape(s: string | null | undefined): string {
  if (s === null || s === undefined) return ''
  const needsQuoting = /[",\n\r]/.test(s)
  const escaped = s.replace(/"/g, '""')
  return needsQuoting ? `"${escaped}"` : escaped
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const issueMonth = searchParams.get('issue_month')?.trim() || null
  const statusFilter = (searchParams.get('status') ?? 'approved').trim() || 'approved'

  if (issueMonth && !/^\d{4}-\d{2}$/.test(issueMonth)) {
    return NextResponse.json({ error: 'issue_month must be YYYY-MM' }, { status: 400 })
  }

  const supabase = supabaseAdmin()

  // Pull eligible bits
  let q = supabase
    .from('school_bits')
    .select('id, school_id, school_name, title, blurb, image_orig_path, issue_month')
    .eq('market', MARKET)
    .in('status', statusFilter === 'all' ? ['approved', 'published'] : [statusFilter])
    .not('image_orig_path', 'is', null)
    .order('school_name', { ascending: true })
    .order('created_at',  { ascending: false })

  if (issueMonth) q = q.eq('issue_month', issueMonth)

  const { data: bitsData, error: bitsErr } = await q
  if (bitsErr) return NextResponse.json({ error: bitsErr.message }, { status: 500 })
  const bits = (bitsData ?? []) as BitRow[]

  if (bits.length === 0) {
    return NextResponse.json({
      error: 'No exportable bits found',
      hint:  issueMonth
        ? `No ${statusFilter} bits with images for ${issueMonth}.`
        : `No ${statusFilter} bits with images.`,
    }, { status: 404 })
  }

  // Pull school area + district for each unique school_id (used in CSV)
  const schoolIds = Array.from(new Set(bits.map(b => b.school_id).filter(Boolean) as string[]))
  const schoolMap = new Map<string, SchoolRow>()
  if (schoolIds.length > 0) {
    const { data: schools } = await supabase
      .from('schools')
      .select('id, area, district')
      .in('id', schoolIds)
    for (const s of (schools ?? []) as SchoolRow[]) schoolMap.set(s.id, s)
  }

  const zip = new JSZip()

  // CSV manifest header
  const csvLines = ['image_file,school_name,area,district,issue_month,title,blurb']

  for (const bit of bits) {
    if (!bit.image_orig_path) continue
    const school = bit.school_id ? schoolMap.get(bit.school_id) : null
    const area    = school?.area     ?? ''
    const district = school?.district ?? ''
    const slug    = slugify(bit.school_name)
    const ext     = bit.image_orig_path.split('.').pop()?.toLowerCase() === 'png' ? 'png' : 'jpg'
    const idShort = bit.id.slice(0, 8)
    const filename = bit.issue_month
      ? `bit-${bit.issue_month}-${area || 'na'}-${slug}-${idShort}.${ext}`
      : `bit-${area || 'na'}-${slug}-${idShort}.${ext}`

    // Download from private bucket
    const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET_ORIG).download(bit.image_orig_path)
    if (dlErr || !blob) {
      // Skip but record the failure in the manifest so the operator can investigate
      csvLines.push([
        `# MISSING ${filename} — ${dlErr?.message ?? 'download failed'}`,
        csvEscape(bit.school_name), csvEscape(area), csvEscape(district),
        csvEscape(bit.issue_month), csvEscape(bit.title), csvEscape(bit.blurb),
      ].join(','))
      continue
    }
    zip.file(`images/${filename}`, await blob.arrayBuffer())

    csvLines.push([
      csvEscape(filename),
      csvEscape(bit.school_name),
      csvEscape(area),
      csvEscape(district),
      csvEscape(bit.issue_month),
      csvEscape(bit.title),
      csvEscape(bit.blurb),
    ].join(','))
  }

  // Manifest CSV at the root of the ZIP — InDesign Data Merge points at this
  zip.file('bits.csv', csvLines.join('\n'))

  // README for the operator
  zip.file('README.txt', [
    `River Region Parents — School Bits Print Export`,
    ``,
    `Generated:    ${new Date().toISOString()}`,
    `Filter:       status=${statusFilter}${issueMonth ? ` · issue_month=${issueMonth}` : ''}`,
    `Bits in ZIP:  ${bits.length}`,
    ``,
    `Contents:`,
    `  bits.csv      — manifest for InDesign Data Merge`,
    `  images/       — high-res JPEGs (one per bit)`,
    ``,
    `InDesign Data Merge:`,
    `  1. Window → Utilities → Data Merge`,
    `  2. Panel menu → Select Data Source… → bits.csv`,
    `  3. Drag fields onto your template — including @image_file as a picture`,
    `     placeholder; InDesign will resolve relative paths to images/`,
    ``,
    `Lines beginning with "# MISSING" mean an image failed to download from`,
    `storage — verify the path in the admin DB before re-running.`,
  ].join('\n'))

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })

  const filename = issueMonth
    ? `school-bits-${issueMonth}.zip`
    : `school-bits-${new Date().toISOString().slice(0, 10)}.zip`

  return new NextResponse(zipBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type':        'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      String(zipBuffer.byteLength),
    },
  })
}
