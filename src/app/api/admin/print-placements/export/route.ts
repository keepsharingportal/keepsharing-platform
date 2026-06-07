// GET /api/admin/print-placements/export?issue_month=YYYY-MM&view=size|name
//
// Single-view CSV export for the print layout sheet. Two files in the
// editor's workflow (one sorted by size for the designer, one by
// business name for billing reconciliation), each downloaded
// separately so the layout team gets a clean Excel-friendly file
// without scrolling past a second section.
//
// Columns match the editor's tracking spreadsheet exactly:
//   Design, Directory, Business, Size, Layout, Price, Layout Notes
// A totals row at the bottom sums pages (size) and revenue (price).

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

interface Row {
  id:              string
  design:          string
  directory:       boolean
  size:            number
  layout:          string | null
  price:           number | null
  layout_notes:    string | null
  ad_label:        string | null
  advertiser:      { business_name: string } | { business_name: string }[] | null
}

const HEADERS = [
  'Design', 'Directory', 'Business', 'Size', 'Layout',
  'Price', 'Layout Notes',
]

function getBiz(r: Row): string {
  // Prefer ad_label when meaningfully different (e.g. 'Macon East
  // Academy Senior Ad' should land on the layout sheet under its
  // ad-specific name, not the canonical business). Falls back to the
  // canonical business_name when ad_label is null / blank / same.
  const canonical = !r.advertiser
    ? ''
    : Array.isArray(r.advertiser)
      ? r.advertiser[0]?.business_name ?? ''
      : r.advertiser.business_name ?? ''
  const label = (r.ad_label ?? '').trim()
  if (label && label.toLowerCase() !== canonical.toLowerCase()) return label
  return canonical
}

function rowToCells(r: Row): string[] {
  return [
    csvCell(r.design === 'pickup' ? 'Pick-up' : 'New'),
    r.directory ? 'X' : '',
    csvCell(getBiz(r)),
    String(r.size),
    csvCell(r.layout ? r.layout.charAt(0).toUpperCase() + r.layout.slice(1) : ''),
    r.price != null ? String(r.price) : '',
    csvCell(r.layout_notes ?? ''),
  ]
}

function totalsRow(rows: Row[]): string[] {
  const pages = rows.reduce((s, r) => s + (r.size ?? 0), 0)
  const price = rows.reduce((s, r) => s + (r.price ?? 0), 0)
  return [
    csvCell(`TOTAL — ${rows.length} placement${rows.length === 1 ? '' : 's'}`),
    '',
    '',
    pages.toFixed(2),
    '',
    price.toFixed(2),
    '',
  ]
}

export async function GET(req: NextRequest) {
  await requireAdmin()
  const url   = new URL(req.url)
  const issue = url.searchParams.get('issue_month')?.trim() ?? ''
  const view  = url.searchParams.get('view')?.trim().toLowerCase() ?? 'size'
  if (!/^[0-9]{4}-[0-9]{2}$/.test(issue)) {
    return NextResponse.json({ error: 'issue_month query param required (YYYY-MM)' }, { status: 400 })
  }
  if (view !== 'size' && view !== 'name') {
    return NextResponse.json({ error: 'view must be "size" or "name"' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('print_ad_placements')
    .select('id, design, directory, size, layout, price, layout_notes, ad_label, advertiser:advertiser_account_id (business_name)')
    .eq('issue_month', issue)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const rows = (data ?? []) as Row[]

  // Sort per requested view. Size desc puts the full / 2/3 / 1/2 ads
  // at the top (largest first). Name asc is alphabetical A→Z.
  const sorted = view === 'name'
    ? [...rows].sort((a, b) => getBiz(a).localeCompare(getBiz(b)))
    : [...rows].sort((a, b) => (b.size ?? 0) - (a.size ?? 0))

  const lines: string[] = []
  lines.push(HEADERS.join(','))
  for (const r of sorted) lines.push(rowToCells(r).join(','))
  lines.push(totalsRow(sorted).join(','))

  const filename = `print-layout-${issue}-${view === 'name' ? 'by-name' : 'by-size'}.csv`
  return new NextResponse(lines.join('\n'), {
    status: 200,
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

function csvCell(v: string): string {
  if (v == null) return ''
  const needsQuotes = /[",\n]/.test(v)
  const escaped     = v.replace(/"/g, '""')
  return needsQuotes ? `"${escaped}"` : escaped
}
